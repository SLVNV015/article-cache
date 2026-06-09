# Article Cached API

NestJS приложение с кэшированием статей через Redis и PostgreSQL.

**Задание** [Задание](https://wild-bean-19b.notion.site/Middle-NestJS-824b413a224f490cb75bd6329888f99c)

## Структура Docker

- **dev.docker-compose.yaml** — development окружение (hot reload, volumes)
- **docker-compose.yaml** — production окружение (оптимизированный образ)
- **dockerfile** — multi-stage сборка (development, production)

## Быстрый старт
*Желательно наличие make*

```bash
# Клонировать репозиторий
git clone https://github.com/sapl/article-cached.git
cd article-cached

```

```bash
# Одной командой: скопировать .env, запустить контейнеры и заполнить БД
make init-prod

# Или вручную:
cp .env.example .env
docker-compose up -d --build
npm run seed
```
*В случае повторного сида make упадет, но контейнеры будут крутится здоровыми*

API доступен на `http://localhost:3000`  
Swagger документация: `http://localhost:3000/api/docs`

### Development с hot reload

```bash
# Убедитесь что .env настроен  значениями
make init
```

## Команды Make

```bash
make help              # Показать все команды
make init              # 🚀 Dev: быстрый старт с seed
make init-prod         # 🚀 Prod: быстрый старт
make up                # Запустить dev
make stop              # Остановить контейнеры
make down              # Удалить контейнеры
make clean             # Полная очистка (volumes)
make migrate           # Запустить миграции
make seed              # Заполнить БД данными
```

## Структура проекта

```
src/
├── common/                    # Общие утилиты, фильтры, пайпы
│   ├── cache/                 # Абстрактный сервис кэширования
│   ├── decorators/            # Декораторы (@Public, @CurrentUser)
│   ├── filters/               # Exception filters
│   └── pipes/                 # Validation pipes
├── database/                  # Конфигурация БД и миграции
└── modules/                   # Модули приложения
    ├── articles/              # Модуль статей с кэшированием
    ├── auth/                  # Аутентификация (JWT, сессии)
    └── users/                 # Управление пользователями
```

## Модуль Articles

Модуль статей реализует многоуровневую архитектуру с кэшированием:

### Архитектура

```
ArticlesController
        ↓
   ArticleService ← Orchestrator (координирует работу всех слоёв)
        ↓
   ┌────┴────┬─────────────┬──────────────┐
   ↓         ↓             ↓              ↓
Database   Cache        Query         Validation
Service    Service     Service         (Zod)
```

### Компоненты

#### 1. **ArticleService** (`article.service.ts`)
Главный оркестратор, координирующий работу всех слоёв:
- **create/update/delete** → пишет в БД через `ArticlesDatabaseService`
- **getOne/getList** → читает через кэш (`ArticleCacheService`)
- При изменениях инвалидирует связанные кэши
Попытка в cqrs для бедных.

#### 2. **ArticleCacheService** (`articles-cache.service.ts`)
Умный кэш с двухуровневой стратегией:
- **Cache HIT** ✅ → возвращает данные из Redis (TTL: 300s для статьи, 60s для списка)
- **Cache MISS** ❌ → блокирует повторные запросы (mutex), идёт в БД
- **Stale cache** 🔄 → если кэш протух, но кто-то уже обновляет, отдаёт старые данные
- **Инвалидация** → удаляет по индексам (`all-list`, `author-{id}`)

**Индексы кэша:**
- `articles:123` — одна статья
- `articles:list:{hash}` — список с параметрами
- `articles:index:all-list` — все списки
- `articles:index:author-123` — списки конкретного автора

#### 3. **QueryArticleService** (`query-article.service.ts`)
Чистый слой запросов к БД (без бизнес-логики):
- **findOne** → получение статьи с автором (JOIN)
- **findMany** → фильтрация, сортировка, пагинация
- Использует TypeORM QueryBuilder

#### 4. **ArticlesDatabaseService** (`articles-database.service.ts`)
Слой записи в БД с проверками:
- **create** → создание статьи
- **update/remove** → с проверкой прав доступа (только автор может изменять)
- Логирование всех операций через Pino

#### 5. **ArticlesController** (`articles.controller.ts`)
REST API эндпоинты:

### Фичи

**Кэширование с индексами** — групповая инвалидация при изменении  
**Stale-while-revalidate** — отдаёт старые данные пока обновляет  
**Mutex на уровне Redis** — защита от thundering herd  
**Права доступа** — только автор может редактировать свои статьи  
**Валидация через Zod** — строгая типизация и автодокументация  
**Swagger документация** — автогенерация из схем  
**Пагинация и фильтры** — authorId, dateRange, search, sort  
**Логирование** — яркие логи кэш-событий (HIT/MISS/STALE)

## Технологии

- **NestJS** - фреймворк
- **TypeORM** - ORM для PostgreSQL
- **Redis** - кэширование
- **JWT** - аутентификация
- **Zod** - валидация
- **Pino** - логирование

## API Documentation

Swagger доступен на `/api/docs` после запуска.

## TODO 

### В разработке
- [ ] **Валидация env переменных** — Zod-схема для проверки окружения при старте, вынести ttl кеша и jwt отдельно - сейчас захардкожены. 
- [ ] **E2E тесты (supertest)** — полное покрытие API эндпоинтов
- [ ] **Метрики** — Prometheus + Grafana для мониторинга
  - Счётчики кэш HIT/MISS
  - Latency запросов
  - Количество статей в БД
- [ ] **Health check endpoint** — `/health` для мониторинга
- [ ] **Cors** — пока фронта нет и корс не нужен 
- [ ] Rate limiting (Redis-based)

## Миграции

```bash
# Dev окружение
make db-migrate

# Prod окружение
make db-migrate-prod
```

## Тестирование

```bash
make test              # Unit тесты
make test-cov          # С покрытием
make test-e2e          # E2E тесты
```

## Troubleshooting

```bash
# Проверить статус контейнеров
make ps

# Открыть shell в контейнере
make shell

# Подключиться к БД
make db-shell

# Очистить всё и начать заново
make clean
make dev-build
```

## Лицензия

UNLICENSED
