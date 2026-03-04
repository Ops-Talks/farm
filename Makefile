COMPOSE_FILE := docker-compose.docs.yml
DOCS_SERVICE := docs
TEST_IMAGE := farm:test
APP_IMAGE := farm:prod

.PHONY: help docs docs-up docs-down docs-build docs-logs test-docker up-docker down-docker healthcheck

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
	@echo "  make healthcheck # Queries the local API /api/health endpoint"

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
	docker build -t $(APP_IMAGE) .
	docker run --rm -d --name farm-api -p 3000:3000 $(APP_IMAGE)

down-docker:
	-docker stop farm-api

healthcheck:
	curl -fsS http://localhost:3000/api/health
