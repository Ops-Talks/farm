COMPOSE_FILE := docker-compose.yml
DOCS_SERVICE := docs
TEST_IMAGE := farm:test
APP_IMAGE := farm:prod

.PHONY: help docs docs-up docs-down docs-build docs-logs test-docker up-docker down-docker down-docker-clean up-observability down-observability up-all down-all healthcheck test test-e2e test-cov lint fmt check-back check-front check knip api-build api-test release web-dev web-build web-lint web-test web-e2e helm-lint ct-lint helm-template helm-install helm-upgrade helm-diff helm-uninstall observability-install observability-upgrade observability-uninstall sloth-generate docker-build kind-load

help:
	@echo "Available Targets:"
	@echo "  make docs-up    # Starts the documentation server"
	@echo "  make docs-down  # Stops and removes the documentation container"
	@echo "  make docs-build # Generates the static site in ./site"
	@echo "  make docs-logs  # Displays logs from the documentation service"
	@echo "  make docs       # Alias for docs-up"
	@echo "  make test-docker # Runs Farm tests via Docker"
	@echo "  make up-docker   # Starts the Farm API in Docker"
	@echo "  make down-docker # Stops the Farm API container"
	@echo "  make web-dev    # Starts the front-end dev server"
	@echo "  make web-build  # Builds the front-end for production"
	@echo "  make web-lint   # Lints the front-end code"
	@echo "  make up-observability   # Starts the stack with Grafana, Prometheus, and Tempo"
	@echo "  make down-observability # Stops the observability stack"
	@echo "  make up-all             # Starts the full stack"
	@echo "  make down-all           # Stops the full stack"
	@echo "  make healthcheck # Queries the local API /api/health endpoint"
	@echo "  make test       # Runs local unit tests (API + Web)"
	@echo "  make test-e2e   # Runs local API e2e tests"
	@echo "  make test-cov   # Runs local tests with coverage"
	@echo "  make lint       # Runs linter"
	@echo "  make fmt        # Formats code using Prettier"
	@echo "  make check-back  # Runs fmt, lint, api-test, test-e2e and api-build"
	@echo "  make check-front # Runs front-end lint, build and tests"
	@echo "  make check      # Runs both check-back and check-front"
	@echo "  make web-e2e    # Runs Playwright E2E tests (requires running dev server)"
	@echo "  make seed       # Runs database seeds"
	@echo "  make release TAG=0.8.3 # Creates a release with auto changelog generation"
	@echo "  make helm-lint         # Strict helm lint on both charts (helm only, no ct required)"
	@echo "  make ct-lint           # Full CI-equivalent lint via chart-testing (requires ct)"
	@echo "  make helm-template     # Render Helm chart templates to stdout"
	@echo "  make helm-install      # Install Farm using Helm (HELM_VALUES=path/to/values.yaml)"
	@echo "  make helm-upgrade      # Upgrade Farm release using Helm"
	@echo "  make helm-diff         # Show diff of pending Helm upgrade (requires helm-diff plugin)"
	@echo "  make helm-uninstall    # Uninstall the Farm Helm release"
	@echo "  make docker-build      # Build API and web images tagged with appVersion (for local Helm deploy)"
	@echo "  make kind-load         # Load built images into the active KinD cluster"

docs: docs-up

docs-up:
	docker compose --profile docs up -d docs

docs-down:
	docker compose --profile docs down docs

docs-build:
	docker compose --profile docs run --rm $(DOCS_SERVICE) build

docs-logs:
	docker compose --profile docs logs -f $(DOCS_SERVICE)

test-docker:
	docker build --target test -t $(TEST_IMAGE) .
	docker run --rm $(TEST_IMAGE)

up-docker:
	docker compose up -d --build

down-docker:
	docker compose down

down-docker-clean:
	docker compose down -v

up-observability:
	docker compose -f docker-compose.yml -f docker-compose.observability.yml up -d --build

down-observability:
	docker compose -f docker-compose.yml -f docker-compose.observability.yml down

up-all:
	docker compose -f docker-compose.yml -f docker-compose.observability.yml --profile docs up -d --build

down-all:
	docker compose -f docker-compose.yml -f docker-compose.observability.yml --profile docs down --rmi local

healthcheck:
	curl -fsS http://localhost:3000/api/health

test:
	npm test

test-e2e:
	@if docker ps >/dev/null 2>&1; then \
		npm run api:test:e2e; \
	else \
		echo "Skipping e2e tests — Docker daemon not available"; \
	fi

test-cov:
	npm run test:cov -w apps/api

lint:
	npm run lint

fmt:
	npm run format -w apps/api

api-test:
	npm run api:test

swagger-validate:
	npm run swagger:validate -w apps/api

columns-validate:
	npm run columns:validate -w apps/api

check-back: fmt lint api-test test-e2e swagger-validate columns-validate api-build

api-build:
	npm run api:build

check-front: web-lint web-build web-test web-e2e

knip:
	npm run knip

check: check-back check-front knip

seed:
	npm run seed -w apps/api

release:
	@VERSION=$${TAG#v}; npm run release -w apps/api -- $${VERSION:+--ci --increment=$$VERSION}

web-dev:
	npm run web:dev

web-build:
	npm run web:build

web-lint:
	npm run web:lint

web-test:
	npm run web:test

web-e2e:
	npm run test:e2e --prefix apps/web -- --project=chromium

HELM_CHART := deploy/helm/farm
HELM_RELEASE := farm
HELM_NAMESPACE := farm
HELM_VALUES ?= $(HELM_CHART)/values-dev.yaml
APP_VERSION := $(shell grep '^appVersion' $(HELM_CHART)/Chart.yaml | awk '{print $$2}' | tr -d '"')
API_IMAGE := farm-api:$(APP_VERSION)
WEB_IMAGE := farm-web:$(APP_VERSION)

KIND_CLUSTER ?= $(shell kind get clusters 2>/dev/null | head -1)

docker-build: ## Build API and web Docker images tagged with the current appVersion (no cache)
	docker build --no-cache -t $(API_IMAGE) -f apps/api/Dockerfile .
	docker build --no-cache -t $(WEB_IMAGE) -f apps/web/Dockerfile .

kind-load: ## Load API and web images into the active KinD cluster
	@if [ -z "$(KIND_CLUSTER)" ]; then echo "ERROR: no KinD cluster found. Run 'kind create cluster' first."; exit 1; fi
	kind load docker-image $(API_IMAGE) --name $(KIND_CLUSTER)
	kind load docker-image $(WEB_IMAGE) --name $(KIND_CLUSTER)

helm-lint:
	# Strict lint for both charts using only helm — no extra tooling required.
	helm dependency build $(HELM_CHART)
	helm dependency build $(OBS_CHART)
	helm lint $(HELM_CHART) --strict -f $(HELM_VALUES)
	helm lint $(OBS_CHART) --strict -f $(OBS_CHART)/values-dev.yaml

ct-lint:
	# Full CI-equivalent lint via chart-testing: validates schema, checks version
	# bump against main, and lints both charts. Requires ct to be installed.
	# Install: https://github.com/helm/chart-testing#installation
	ct lint --config deploy/helm/ct.yaml

helm-template:
	helm dependency update $(HELM_CHART)
	helm template $(HELM_RELEASE) $(HELM_CHART) -f $(HELM_VALUES)

helm-install:
	helm dependency update $(HELM_CHART)
	helm install $(HELM_RELEASE) $(HELM_CHART) -f $(HELM_VALUES) \
		--namespace $(HELM_NAMESPACE) --create-namespace \
		--timeout 10m0s
	# Wait for post-install hooks (seed, bootstrap) so the admin user exists
	# when the command returns instead of starting a race with the API pod.
	@for job in seed bootstrap; do \
		name="$(HELM_RELEASE)-$$job"; \
		for i in 1 2 3 4 5 6 7 8 9 10 11 12 13 14 15 16 17 18 19 20 21 22 23 24 25 26 27 28 29 30; do \
			if kubectl get job "$$name" -n "$(HELM_NAMESPACE)" >/dev/null 2>&1; then \
				kubectl wait --for=condition=complete "job/$$name" -n "$(HELM_NAMESPACE)" --timeout=300s >/dev/null && \
					echo "  $$job job completed."; \
				break; \
			fi; \
			sleep 1; \
		done; \
	done
	@printf '  done (jobs may have been skipped if disabled).\n'

helm-upgrade:
	helm dependency update $(HELM_CHART)
	helm upgrade $(HELM_RELEASE) $(HELM_CHART) -f $(HELM_VALUES) \
		--namespace $(HELM_NAMESPACE) \
		--timeout 10m0s

helm-diff:
	helm dependency update $(HELM_CHART)
	helm diff upgrade $(HELM_RELEASE) $(HELM_CHART) -f $(HELM_VALUES) \
		--namespace $(HELM_NAMESPACE)

helm-uninstall:
	helm uninstall $(HELM_RELEASE) --namespace $(HELM_NAMESPACE)

OBS_CHART := deploy/helm/observability
OBS_RELEASE := farm-obs
OBS_NAMESPACE := monitoring
OBS_VALUES ?= $(OBS_CHART)/values-dev.yaml

observability-install:
	helm dependency update $(OBS_CHART)
	# --create-namespace creates the namespace when it does not exist.
	# createNamespace defaults to false so the chart does not manage the namespace
	# as a Helm resource, avoiding conflicts with pre-existing namespaces.
	helm upgrade --install $(OBS_RELEASE) $(OBS_CHART) -f $(OBS_VALUES) \
		--namespace $(OBS_NAMESPACE) --create-namespace

observability-upgrade:
	helm dependency update $(OBS_CHART)
	helm upgrade $(OBS_RELEASE) $(OBS_CHART) -f $(OBS_VALUES) \
		--namespace $(OBS_NAMESPACE)

observability-uninstall:
	helm uninstall $(OBS_RELEASE) --namespace $(OBS_NAMESPACE)

sloth-generate: ## Generate PrometheusRule SLOs from Sloth source
	sloth generate -i observability/sloth-slos.yml -o /tmp/sloth-output.yaml
	@echo "Sloth SLOs generated at /tmp/sloth-output.yaml — review and embed into templates/prometheusrule.yaml"
