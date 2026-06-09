# Article Cached API

NestJS приложение с кэшированием статей через Redis и PostgreSQL.

## Структура Docker

- **dev.docker-compose.yaml** — development окружение (hot reload, volumes)
- **docker-compose.yaml** — production окружение (оптимизированный образ)
- **dockerfile** — multi-stage сборка (development, production)

## Быстрый старт

### Development

```bash
# Одной командой: скопировать .env, запустить контейнеры и заполнить БД
make init

# Или вручную:
cp .env.example .env
make dev-build
make db-seed
```

API доступен на `http://localhost:3000`  
Swagger документация: `http://localhost:3000/api/docs`

### Production

```bash
# Убедитесь что .env настроен с production значениями
make init-prod
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
- `POST /articles` — создать статью (требует авторизации)
- `GET /articles` — список с фильтрами (публичный)
- `GET /articles/:id` — одна статья (публичный)
- `PATCH /articles/:id` — обновить (требует авторизации, только автор)
- `DELETE /articles/:id` — удалить (требует авторизации, только автор)

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

## Production Checklist

- [ ] Настроить production значения в `.env`
- [ ] Изменить все пароли
- [ ] Настроить `JWT_SECRET` (минимум 32 символа)
- [ ] Установить `NODE_ENV=production`
- [ ] Проверить `LOG_LEVEL=warn` или `error`
- [ ] Настроить backup для PostgreSQL
- [ ] Настроить reverse proxy (nginx/traefik)
- [ ] Включить HTTPS
- [ ] Настроить мониторинг
- [ ] Не экспортировать порты БД/Redis наружу (закомментировать `ports` в docker-compose.yaml)

## TODO / Roadmap

### В разработке
- [ ] **Валидация env переменных** — Zod-схема для проверки окружения при старте
- [ ] **E2E тесты (supertest)** — полное покрытие API эндпоинтов
- [ ] **Метрики** — Prometheus + Grafana для мониторинга
  - Счётчики кэш HIT/MISS
  - Latency запросов
  - Количество статей в БД
- [ ] **Health check endpoint** — `/health` для мониторинга

### Планируется
- [ ] Rate limiting (Redis-based)
- [ ] Circuit breaker для внешних сервисов
- [ ] Graceful shutdown
- [ ] OpenTelemetry трейсинг
- [ ] Redis Sentinel для HA
- [ ] Database read replicas

## Лицензия

UNLICENSED
