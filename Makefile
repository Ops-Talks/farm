COMPOSE_FILE := docker-compose.docs.yml
DOCS_SERVICE := docs
TEST_IMAGE := farm:test
APP_IMAGE := farm:prod

.PHONY: help docs docs-up docs-down docs-build docs-logs test-docker up-docker down-docker down-docker-clean up-observability down-observability up-all down-all healthcheck test test-e2e test-cov lint fmt check-back check-front check release web-dev web-build web-lint web-test

help:
	@echo "Available Targets:"
	@echo "  make docs-up    # Starts the documentation server"
	@echo "  make docs-down  # Stops and removes the documentation container"
	@echo "  make docs-build # Generates the static site in ./site"
	@echo "  make docs-logs  # Displays logs from the documentation service"
	@echo "  make docs       # Alias for docs-up"
	@echo "  make test-docker # Runs Farm tests via Docker"
	@echo "  make up-docker   # Starts the Farm API in Docker (port 3000)"
	@echo "  make down-docker # Stops the Farm API container"
	@echo "  make web-dev    # Starts the front-end dev server (port 3000)"
	@echo "  make web-build  # Builds the front-end for production"
	@echo "  make web-lint   # Lints the front-end code"
	@echo "  make up-observability   # Starts the stack with Grafana, Prometheus, and Tempo"
	@echo "  make down-observability # Stops the observability stack"
	@echo "  make up-all             # Starts the full stack (API + DB + Redis + Observability + Docs)"
	@echo "  make down-all           # Stops the full stack"
	@echo "  make healthcheck # Queries the local API /api/health endpoint"
	@echo "  make test       # Runs local unit tests"
	@echo "  make test-e2e   # Runs local e2e tests"
	@echo "  make test-cov   # Runs local tests with coverage"
	@echo "  make lint       # Runs linter and fixes issues"
	@echo "  make fmt        # Formats code using Prettier"
	@echo "  make check-back  # Runs fmt, lint and all back-end tests"
	@echo "  make check-front # Runs front-end lint, build and tests"
	@echo "  make check      # Runs both check-back and check-front"
	@echo "  make release    # Creates a new release using release-it (interactive)"

docs: docs-up

docs-up:
	docker compose -f $(COMPOSE_FILE) up

docs-down:
	docker compose -f $(COMPOSE_FILE) down

docs-build:
	docker compose -f $(COMPOSE_FILE) run --rm $(DOCS_SERVICE) build

docs-logs:
	docker compose -f $(COMPOSE_FILE) logs -f $(DOCS_SERVICE)

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
	docker compose -f docker-compose.yml -f docker-compose.observability.yml up -d --build
	docker compose -f $(COMPOSE_FILE) up -d

down-all:
	docker compose -f $(COMPOSE_FILE) down
	docker compose -f docker-compose.yml -f docker-compose.observability.yml down

healthcheck:
	curl -fsS http://localhost:3000/api/health

test:
	npm run test

test-e2e:
	npm run test:e2e

test-cov:
	npm run test:cov

lint:
	npm run lint

fmt:
	npm run format

check-back: fmt lint test test-e2e

check-front: web-lint web-build web-test

check: check-back check-front

seed:
	npm run seed

release:
	npm run release

web-dev:
	cd web && npm run dev

web-build:
	cd web && npm run build

web-lint:
	cd web && npm run lint

web-test:
	cd web && npm test
