COMPOSE_FILE := docker-compose.yml
DOCS_SERVICE := docs
TEST_IMAGE := farm:test
APP_IMAGE := farm:prod

.PHONY: help docs docs-up docs-down docs-build docs-logs test-docker up-docker down-docker down-docker-clean up-observability down-observability up-all down-all healthcheck test test-e2e test-cov lint fmt check-back check-front check api-build api-test release web-dev web-build web-lint web-test web-e2e

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
	docker compose -f docker-compose.yml -f docker-compose.observability.yml --profile docs down

healthcheck:
	curl -fsS http://localhost:3000/api/health

test:
	npm test

test-e2e:
	npm run api:test:e2e

test-cov:
	npm run test:cov -w apps/api

lint:
	npm run lint

fmt:
	npm run format -w apps/api

api-test:
	npm run api:test

check-back: fmt lint api-test test-e2e api-build

api-build:
	npm run api:build

check-front: web-lint web-build web-test

check: check-back check-front

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
