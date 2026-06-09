.PHONY: help init init-prod up stop down clean migrate seed

help: ## Показать справку
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*?## "}; {printf "\033[36m%-15s\033[0m %s\n", $$1, $$2}'

# Quick start
init: ## 🚀 Dev: скопировать .env, запустить и заполнить БД
	@echo "📋 Копирование .env..."
	@test -f .env || cp .env.example .env
	@echo "🐳 Запуск dev..."
	@docker compose -f dev.docker-compose.yaml up -d --build
	@echo "⏳ Ожидание БД..."
	@sleep 5
	@echo "🌱 Seed данных..."
	@npm run seed
	@echo "✨ Готово! http://localhost:3000"

init-prod: ## 🚀 Prod: запустить prod и заполнить БД
	@echo "🐳 Запуск prod..."
	@docker compose -f docker-compose.yaml up -d --build
	@echo "⏳ Ожидание БД..."
	@sleep 5
	@echo "🌱 Seed данных..."
	@npm run seed
	@echo "✨ Prod запущен на :3000"

# Management
up: ## Запустить dev окружение
	docker compose -f dev.docker-compose.yaml up -d

stop: ## Остановить контейнеры (dev)
	docker compose -f dev.docker-compose.yaml stop

down: ## Удалить контейнеры (dev)
	docker compose -f dev.docker-compose.yaml down

clean: ## Полная очистка (volumes)
	docker compose -f dev.docker-compose.yaml down -v
	docker compose -f docker-compose.yaml down -v

# Database
migrate: ## Запустить миграции (dev)
	docker compose -f dev.docker-compose.yaml exec article-api npm run migration:run

seed: ## Заполнить БД тестовыми данными (dev)
	docker compose -f dev.docker-compose.yaml exec article-api npm run seed
