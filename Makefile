COMPOSE_FILE := docker-compose.docs.yml
DOCS_SERVICE := docs

.PHONY: help docs docs-up docs-down docs-build docs-logs

help:
	@echo "Targets disponíveis:"
	@echo "  make docs-up    # Sobe o servidor de documentação"
	@echo "  make docs-down  # Para e remove o container de documentação"
	@echo "  make docs-build # Gera o site estático em ./site"
	@echo "  make docs-logs  # Exibe logs do serviço de documentação"
	@echo "  make docs       # Alias para docs-up"

docs: docs-up

docs-up:
	docker compose -f $(COMPOSE_FILE) up

docs-down:
	docker compose -f $(COMPOSE_FILE) down

docs-build:
	docker compose -f $(COMPOSE_FILE) run --rm $(DOCS_SERVICE) build

docs-logs:
	docker compose -f $(COMPOSE_FILE) logs -f $(DOCS_SERVICE)
