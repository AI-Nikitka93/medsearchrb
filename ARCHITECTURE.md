# ARCHITECTURE

Сегодня: `2026-03-21`

Использую данные из `RESEARCH_LOG` от `2026-03-21`, повторный поиск по рынку и legal не нужен. Выполнен только delta-поиск по free-tier, лимитам и platform constraints.

## 0. Проверка входных данных

| Пункт | Решение |
|---|---|
| Формат | `Web + Bot + Channel`: Telegram Mini App для поиска, Telegram Bot для команд и deep-link entry, Telegram Channel для публикации акций |
| Архитектурный стиль | `Modular monolith + serverless edge runtime` |
| Хранилище | `Turso (libSQL / SQLite)` |
| Backend runtime | `Cloudflare Workers` |

### Подтверждение стратегии
- География: `только Минск`
- Каталог: `все специальности`
- Источник ценности: `поиск + фильтры + агрегированные отзывы + акции + переход на оригинальную запись`
- Legal constraint: обязательны `is_hidden`, `opt_out`, `suppression_key`

### Критичные архитектурные несостыковки
1. ТЗ перечисляет только `doctors`, `clinics`, `specialties`, `doctor_specialties`, `reviews_summary`, `promotions`, но этого недостаточно.
   Причина: один врач может встречаться у нескольких клиник и на нескольких источниках с разными ссылками на запись.
   Решение: добавить `doctor_clinics`, `doctor_sources`, `clinic_sources`, иначе не будет надежного upsert и dedupe.
2. `Cloudflare Workers Free` ограничен `100,000 requests/day` и `10 ms CPU per invocation`.
   Следствие: ranking, dedupe и notification diffing нельзя выполнять в пользовательском запросе; они должны происходить на ingest-пути.
3. `Vercel Hobby` официально обозначен как `personal, non-commercial use`.
   Следствие: для коммерческого продукта на $0 это юридически и операционно слабый выбор.

## 1. Выбор бесплатного стека

### 1.1 Turso vs Supabase

| Критерий | Turso | Supabase Free | Вердикт |
|---|---|---|---|
| Модель БД | `SQLite/libSQL` | `PostgreSQL` | Оба подходят |
| Free storage | `5 GB` | `500 MB per project` | Победа `Turso` |
| Free read/write limits | `500M rows read / 10M rows written per month` | нет прямой row-based модели; упор в `500 MB DB` и platform quotas | Победа `Turso` для read-heavy каталога |
| Inactivity risk | в проверенных источниках не найден documented auto-pause free DB | Free projects могут быть paused; Supabase changelog отдельно описывает paused free projects | Победа `Turso` |
| Что мы реально используем | только каталог и upsert | Supabase дает много лишнего: auth, storage, realtime | Победа `Turso` по простоте |
| Fallback complexity | SQLite-compatible SQL и простой export | Postgres богаче, но operationally тяжелее для $0 | Победа `Turso` |

### Решение по БД
Выбираю `Turso`.

Почему:
- продукт read-heavy и не требует тяжелых server-side joins поверх больших аналитических объемов;
- free tier у Turso заметно лучше под каталог и ingest;
- для MVP критичнее `простота + отсутствие documented pause risk`, чем глубина экосистемы Postgres;
- SQLite `ON CONFLICT` достаточно для idempotent upsert;
- мы не используем realtime, storage buckets, встроенный auth и не получаем ценность от большей части Supabase surface area.

### 1.2 Cloudflare Workers vs Vercel

| Критерий | Cloudflare Workers | Vercel Hobby | Вердикт |
|---|---|---|---|
| Коммерческое использование | в проверенных источниках free plan не помечен как personal-only | Hobby plan официально `personal, non-commercial use` | Победа `Cloudflare` |
| Free requests | `100,000/day` | `1,000,000 function invocations/month` | Близко, но у Cloudflare проще прогноз |
| Static hosting | static asset requests `free and unlimited` | есть CDN и static hosting | Победа `Cloudflare` для Mini App |
| Cron | есть | есть | паритет |
| Edge runtime fit | отлично для webhook + API + static | тоже подходит | паритет |
| Budget risk | zero-cost план прозрачен по requests/day | при превышении лимитов ждать reset; плюс commercial restriction на Hobby | Победа `Cloudflare` |

### Решение по runtime
Выбираю `Cloudflare Workers`.

Почему:
- `Vercel Hobby` не подходит для planned commercial product;
- на Cloudflare можно держать в одном контуре:
  - API для Mini App,
  - Telegram webhook,
  - статические assets Mini App;
- free static asset requests помогают не тратить request-budget на UI;
- для MVP хватает лимитов, если Worker остается thin и делает не более 1-2 DB операций на запрос.

### 1.3 Итоговый стек

| Слой | Выбор |
|---|---|
| Frontend | React SPA внутри Telegram Mini App |
| Backend/API | Cloudflare Workers |
| Bot webhook | тот же Cloudflare Worker |
| БД | Turso |
| Парсеры | Python scripts в GitHub Actions |
| CI / scheduler | GitHub Actions |
| Контракт API | OpenAPI YAML в репозитории |
| Локальный runtime-cache | только браузерный cache / IndexedDB / localStorage по policy |

## 1.4 Architecture Spec Card

- `Architecture Pattern`: `modular monolith`
- `Communication Pattern`: `REST + Telegram Webhook + internal ingest HTTP`
- `Data Pattern`: `CRUD + read-optimized catalog + outbox`
- `Deployment Pattern`: `serverless edge + managed DB + GitHub Actions`
- `Service decomposition not needed`: modular monolith is sufficient because один продукт, одна доменная модель, один соло-разработчик, нет независимых bounded contexts с отдельным lifecycle.

### Core Modules / Services
| Модуль | Назначение | Входы / Выходы | Хранилище | Интеграции | Что нельзя ломать |
|---|---|---|---|---|---|
| `catalog-read` | поиск, фильтры, карточки врачей/клиник | HTTP GET / JSON | Turso | Mini App, Bot | скрытые сущности не должны попадать в выдачу |
| `catalog-ingest` | прием нормализованных batch-данных от парсеров | internal HTTP POST / upsert result | Turso | GitHub Actions | idempotency, dedupe, suppression |
| `telegram-bot` | команды, deep-links, выдача ссылок на Mini App | Telegram webhook in / Bot API out | Turso read-only + outbox read | Telegram Bot API | не хранить лишние ПД |
| `channel-publisher` | публикация новых акций в канал | outbox rows in / Telegram posts out | Turso | Telegram Bot API | dedupe posts |
| `privacy-suppression` | opt-out, hidden flags, suppression check | admin/support events | Turso | support flow | скрытая сущность не должна репаблишиться |
| `reference-data` | словари специальностей, районов, источников | GET | Turso | Mini App | стабильные ids/slugs |
| `export` | CSV экспорт текущей выдачи | HTTP GET / CSV stream | Turso | Mini App | max size cap, без чувствительных полей |

### Primary Data Stores
| Store | Что хранит | Почему |
|---|---|---|
| `Turso` | каталог, связи, агрегированные отзывы, акции, users, search_history, outbox, scrape_runs, suppression | один SQL store достаточно; дешевле и проще |
| `GitHub Actions artifacts` | временные scrape-артефакты и run logs | дешево и достаточно для traceability |
| `Client-side cache` | словари и last-view snapshots | быстрее TTFB в Mini App, без server cost |

### Failure Hotspots
| Hotspot | Риск |
|---|---|
| неверный dedupe ключ | дубликаты врачей и клиник |
| ingest без suppression-check | opt-out сущность вернется после следующего scrape |
| outbox без dedupe_key | канал начнет постить дубли акций |
| Cloudflare request budget overflow | 429 на API и webhook |
| source HTML drift | частичное устаревание данных |

## 2. Слои системы

### 2.1 Presentation Layer
- Ответственность:
  - Telegram Mini App UI;
  - bot command responses;
  - channel message templates;
  - экспорт CSV по запросу.
- Входит:
  - search page;
  - filters UI;
  - doctor card page;
  - promotions feed;
  - bot handlers `/start`, `/search`, `/promo`, deep-links.
- Не входит:
  - SQL;
  - dedupe;
  - suppression logic;
  - source scraping.

### 2.2 Application Layer
- Ответственность:
  - orchestration use-cases;
  - request validation;
  - pagination;
  - outbox creation;
  - privacy filters.
- Входит:
  - `SearchDoctorsUseCase`;
  - `GetDoctorCardUseCase`;
  - `IngestBatchUseCase`;
  - `PublishPromotionBatchUseCase`;
  - `ApplySuppressionUseCase`.
- Не входит:
  - raw HTTP framework details;
  - SQL schema definitions;
  - HTML parsing.

### 2.3 Domain Layer
- Ответственность:
  - сущности каталога и бизнес-правила;
  - canonical naming;
  - dedupe rules;
  - visibility rules;
  - promotion freshness rules.
- Входит:
  - `Doctor`, `Clinic`, `Specialty`, `Promotion`, `ReviewSummary`;
  - invariants:
    - hidden entity cannot be public;
    - promotion cannot publish twice with same dedupe key;
    - source summary must be traceable to source.
- Не входит:
  - network;
  - Workers runtime;
  - Telegram API calls.

### 2.4 Infrastructure Layer
- Ответственность:
  - Turso access;
  - Cloudflare request handlers;
  - Telegram Bot API adapter;
  - GitHub Actions ingest adapter;
  - logging.
- Входит:
  - SQL repositories;
  - HTTP adapters;
  - secret access;
  - retry policies;
  - migrations.
- Не входит:
  - UI rendering;
  - business ranking rules;
  - manual support decision logic.

## 3. Границы модулей

### `search`
- Назначение: полнотекстовый/префиксный поиск по врачам и фильтрам.
- Публичный интерфейс:
  - `GET /api/v1/search/doctors`
  - `GET /api/v1/search/clinics`
- Зависимости: `catalog-read`, `reference-data`.
- Запрещено:
  - прямой доступ UI к БД;
  - обход suppression;
  - N+1 запросы к source URLs в runtime.

### `catalog-ingest`
- Назначение: idempotent upsert normalized records.
- Публичный интерфейс:
  - `POST /internal/ingest/source-batch`
- Зависимости: `privacy-suppression`, `outbox`, `scrape_runs`.
- Запрещено:
  - публикация в канал без записи в outbox;
  - полагаться на source HTML как on-request dependency.

### `telegram-bot`
- Назначение: webhook update handling.
- Публичный интерфейс:
  - `POST /telegram/webhook`
- Зависимости: `search`, `reference-data`.
- Запрещено:
  - хранить медицинские документы;
  - писать в catalog tables напрямую.

### `channel-publisher`
- Назначение: публикация новых акций.
- Публичный интерфейс:
  - `POST /internal/outbox/drain`
- Зависимости: `outbox`, `telegram adapter`.
- Запрещено:
  - отправлять пост без `dedupe_key`;
  - повторно публиковать `sent` события.

### `privacy-suppression`
- Назначение: скрытие и блокировка репаблиша.
- Публичный интерфейс:
  - внутренний application service
- Зависимости: `doctors`, `clinics`, `promotions`, `doctor_sources`, `clinic_sources`.
- Запрещено:
  - физически удалять source-trace без audit trail;
  - оставлять `is_hidden=true` без suppression check в ingest.

## 4. Потоки данных

### 4.1 Основной пользовательский сценарий
1. Пользователь открывает Telegram Mini App.
2. UI загружает словари специальностей и фильтров.
3. Пользователь вводит запрос или выбирает специальность.
4. Worker вызывает `SearchDoctorsUseCase`.
5. Use-case читает из Turso только public rows:
   - `is_hidden = false`
   - `opt_out = false`
6. Результат отдается с пагинацией и фильтрами.
7. При открытии карточки врача UI получает:
   - базовые данные врача;
   - клиники и ссылки на запись;
   - агрегированный рейтинг и число отзывов;
   - активные акции.
8. Пользователь переходит по оригинальной ссылке записи.

### 4.2 Поток ingest от GitHub Actions
1. GitHub Actions запускает source-specific scraper.
2. Scraper нормализует данные в canonical payload:
   - clinic payloads;
   - doctor payloads;
   - specialty payloads;
   - review summary payloads;
   - promotion payloads.
3. Action отправляет batch в `POST /internal/ingest/source-batch`.
4. Worker:
   - валидирует secret;
   - создает `scrape_runs` row;
   - проверяет idempotency key batch-а;
   - запускает upsert transaction group.
5. Upsert порядок:
   - `clinic_sources` -> `clinics`
   - `doctor_sources` -> `doctors`
   - `specialties`
   - `doctor_specialties`
   - `doctor_clinics`
   - `reviews_summary`
   - `promotions`
6. Для новых или materially changed promotions создается `notification_outbox`.
7. Action вызывает `POST /internal/outbox/drain`.
8. Worker публикует новые акции в Telegram channel и помечает outbox row как `sent`.

### 4.3 Где происходят проверки
| Проверка | Где |
|---|---|
| валидация webhook secret | infrastructure |
| валидация ingest secret и batch idempotency | application + infrastructure |
| suppression / opt-out | domain + application |
| dedupe doctor/clinic/source | domain |
| лимиты page/per_page | application |
| Telegram payload size | infrastructure |

### 4.4 Где происходит логирование
| Событие | Где |
|---|---|
| входящий API request | Worker structured log |
| ingest run start/finish | `scrape_runs` + Worker log |
| hidden entity skipped | Worker warning log |
| notification published | `notification_outbox.sent_at` + Worker log |
| scrape failure | GitHub Actions logs + `scrape_runs.error_message` |

## 5. Схема БД

## 5.1 Обязательные core entities

### `clinics`
| Поле | Тип | Назначение |
|---|---|---|
| `id` | text pk | canonical clinic id |
| `slug` | text unique | stable URL key |
| `name` | text | название клиники |
| `normalized_name` | text | dedupe key helper |
| `city` | text | для MVP всегда `Минск` |
| `district` | text nullable | район |
| `metro_hint` | text nullable | ближайшее метро |
| `address` | text nullable | адрес |
| `site_url` | text nullable | официальный сайт |
| `phone` | text nullable | публичный телефон |
| `has_online_booking` | integer | 0/1 |
| `is_hidden` | integer | legal/manual hide |
| `opt_out` | integer | opt-out state |
| `suppression_key` | text nullable unique | stable key for suppression |
| `created_at` | datetime | audit |
| `updated_at` | datetime | audit |

### `doctors`
| Поле | Тип | Назначение |
|---|---|---|
| `id` | text pk | canonical doctor id |
| `slug` | text unique | stable URL key |
| `full_name` | text | ФИО |
| `normalized_name` | text | dedupe key helper |
| `gender_hint` | text nullable | optional enrichment |
| `description_short` | text nullable | краткое справочное описание |
| `is_hidden` | integer | legal/manual hide |
| `opt_out` | integer | opt-out state |
| `suppression_key` | text nullable unique | stable key for suppression |
| `created_at` | datetime | audit |
| `updated_at` | datetime | audit |

### `specialties`
| Поле | Тип | Назначение |
|---|---|---|
| `id` | text pk | specialty id |
| `slug` | text unique | URL key |
| `name` | text unique | canonical specialty |
| `normalized_name` | text | matching helper |
| `synonyms_json` | text nullable | alias list |
| `sort_order` | integer | UI ordering |

### `doctor_specialties`
| Поле | Тип | Назначение |
|---|---|---|
| `doctor_id` | text fk | doctor |
| `specialty_id` | text fk | specialty |
| `is_primary` | integer | основная специализация |
| `source_count` | integer | из скольких источников подтверждено |
| `created_at` | datetime | audit |

Primary key: `(doctor_id, specialty_id)`

### `reviews_summary`
| Поле | Тип | Назначение |
|---|---|---|
| `id` | text pk | summary id |
| `doctor_id` | text nullable fk | doctor scope |
| `clinic_id` | text nullable fk | clinic scope |
| `doctor_clinic_id` | text nullable fk | listing scope |
| `source_name` | text | `103`, `ydoc`, etc. |
| `source_page_url` | text | traceability |
| `rating_avg` | real nullable | средний рейтинг |
| `reviews_count` | integer | число отзывов |
| `last_review_at` | datetime nullable | если доступно |
| `captured_at` | datetime | snapshot time |

### `promotions`
| Поле | Тип | Назначение |
|---|---|---|
| `id` | text pk | promotion id |
| `clinic_id` | text fk | clinic |
| `doctor_id` | text nullable fk | doctor if promo doctor-specific |
| `title` | text | заголовок акции |
| `description_short` | text nullable | короткое описание |
| `source_name` | text | источник |
| `source_url` | text | оригинальная страница |
| `discount_label` | text nullable | `-20%`, `скидка на прием` |
| `starts_at` | datetime nullable | начало |
| `ends_at` | datetime nullable | конец |
| `is_active` | integer | active flag |
| `is_hidden` | integer | manual moderation |
| `fingerprint_hash` | text unique | dedupe/newness |
| `last_seen_at` | datetime | freshness |
| `created_at` | datetime | audit |
| `updated_at` | datetime | audit |

## 5.2 Обязательные support entities

### `doctor_clinics`
Нужна обязательно. Без нее невозможно хранить разные ссылки на запись одного врача в разных клиниках.

| Поле | Тип | Назначение |
|---|---|---|
| `id` | text pk | relation id |
| `doctor_id` | text fk | doctor |
| `clinic_id` | text fk | clinic |
| `booking_url` | text nullable | оригинальная ссылка записи |
| `profile_url` | text nullable | оригинальная страница врача |
| `position_title` | text nullable | должность/роль |
| `is_active` | integer | активная связь |
| `last_seen_at` | datetime | freshness |

Unique key: `(doctor_id, clinic_id, booking_url)`

### `clinic_sources`
| Поле | Тип |
|---|---|
| `id` | text pk |
| `clinic_id` | text fk |
| `source_name` | text |
| `external_key` | text |
| `source_url` | text |
| `checksum` | text |
| `last_seen_at` | datetime |

Unique key: `(source_name, external_key)`

### `doctor_sources`
| Поле | Тип |
|---|---|
| `id` | text pk |
| `doctor_id` | text fk |
| `clinic_id` | text nullable fk |
| `source_name` | text |
| `external_key` | text |
| `source_url` | text |
| `booking_url` | text nullable |
| `checksum` | text |
| `last_seen_at` | datetime |

Unique key: `(source_name, external_key)`

### `telegram_users`
| Поле | Тип |
|---|---|
| `id` | text pk |
| `telegram_id` | text unique |
| `username` | text nullable |
| `search_history_enabled` | integer |
| `created_at` | datetime |
| `last_seen_at` | datetime |

### `search_history`
| Поле | Тип |
|---|---|
| `id` | text pk |
| `user_id` | text fk |
| `query_text` | text |
| `filters_json` | text |
| `created_at` | datetime |
| `cleared_at` | datetime nullable |

### `notification_outbox`
| Поле | Тип |
|---|---|
| `id` | text pk |
| `event_type` | text |
| `entity_type` | text |
| `entity_id` | text |
| `dedupe_key` | text unique |
| `payload_json` | text |
| `status` | text |
| `attempt_count` | integer |
| `last_error` | text nullable |
| `created_at` | datetime |
| `sent_at` | datetime nullable |

### `scrape_runs`
| Поле | Тип |
|---|---|
| `id` | text pk |
| `source_name` | text |
| `github_run_id` | text nullable |
| `batch_id` | text unique |
| `status` | text |
| `started_at` | datetime |
| `finished_at` | datetime nullable |
| `inserted_count` | integer |
| `updated_count` | integer |
| `skipped_count` | integer |
| `error_count` | integer |
| `error_message` | text nullable |

## 5.3 Индексы
- `doctors(normalized_name)`
- `clinics(normalized_name)`
- `doctor_specialties(specialty_id, doctor_id)`
- `doctor_clinics(clinic_id, doctor_id)`
- `reviews_summary(doctor_id, source_name)`
- `promotions(clinic_id, is_active, ends_at)`
- `promotions(fingerprint_hash)`
- `search_history(user_id, created_at desc)`

## 6. Upsert и dedupe логика

### 6.1 Source identity
- Для каждого источника формируется `external_key`.
- Приоритет ключей:
  1. source-native id из URL;
  2. normalized profile URL;
  3. hash(`source_name + full_name + clinic_name + specialty`).

### 6.2 Upsert rules
1. `clinic_sources` upsert по `(source_name, external_key)`.
2. Если source row новая:
   - пытаемся match по `normalized_name + address`.
   - если match confidence высокий, привязываем к существующей clinic.
   - иначе создаем новую clinic.
3. `doctor_sources` upsert по `(source_name, external_key)`.
4. Для doctor dedupe используем:
   - `normalized_name`;
   - clinic context;
   - specialty overlap.
5. `doctor_clinics` upsert по `(doctor_id, clinic_id, booking_url)`.
6. `reviews_summary` replace latest snapshot per `(doctor/clinic/listing + source_name)`.
7. `promotions` upsert по `fingerprint_hash`.

### 6.3 Suppression rule
- Перед любым public upsert:
  - если `suppression_key` совпал с doctor/clinic в suppression state, запись не публикуется;
  - существующая сущность остается скрытой;
  - в `scrape_runs.skipped_count` пишется skip.

### 6.4 Material change rule for promotions
Считаем promotion новой для канала, если изменилось одно из:
- `fingerprint_hash` отсутствовал;
- `discount_label`;
- `ends_at`;
- `source_url`;
- `title`.

## 7. API / Контракты

### Public API
- `GET /api/v1/dictionaries/specialties`
- `GET /api/v1/search/doctors`
- `GET /api/v1/search/clinics`
- `GET /api/v1/doctors/{doctorId}`
- `GET /api/v1/promotions`
- `GET /api/v1/export/doctors.csv`

### Internal API
- `POST /internal/ingest/source-batch`
- `POST /internal/outbox/drain`
- `POST /telegram/webhook`

### Error model
```json
{
  "error": {
    "code": "INVALID_FILTER",
    "message": "specialty slug is invalid",
    "request_id": "req_123",
    "retryable": false
  }
}
```

### Pagination / limits
- doctor search: `page`, `per_page`
- hard cap: `per_page <= 50`
- export: max `2000` rows per export
- promotions: `page`, `per_page <= 20`

### Versioning
- Все публичные endpoints versioned через `/api/v1`
- Breaking change:
  - rename/remove field;
  - change nullability;
  - change pagination semantics;
  - change filter names.
- Source of truth: `openapi/openapi.yaml`

## 8. Нефункциональные требования

## 8.1 Производительность

Архитектурные допущения:
- Peak search load MVP: `10-20 req/s`
- Dataset first stage: `до 50k doctor-source rows`, `до 10k canonical doctors`, `до 2k active promotions`
- Scrape write load: batch writes `1-5` раз в день

Требования:
- p95 search response: `< 500 ms`
- doctor card: `< 700 ms`
- webhook ack Telegram: `< 2 s`

Узкие места:
- сложные join-ы на search;
- dedupe внутри request path;
- large export generation.

Меры:
- read queries only on precomputed tables;
- no HTML fetching during API requests;
- export streamed and capped.

## 8.2 Надежность
- Telegram webhook: immediate ack, non-blocking downstream logic.
- Ingest endpoint: idempotency by `batch_id`.
- Outbox drain: retry up to `3` attempts with exponential backoff.
- Timeouts:
  - Telegram send: `5s`
  - Turso query: `3s`
  - ingest batch transaction group: `15s`

## 8.3 Безопасность
- Secrets:
  - `TELEGRAM_BOT_TOKEN`
  - `TELEGRAM_WEBHOOK_SECRET`
  - `INGEST_SHARED_SECRET`
  - `TURSO_DATABASE_URL`
  - `TURSO_AUTH_TOKEN`
- Validation:
  - strict query param parsing;
  - allowlist on internal endpoints;
  - request body size caps.
- Attack vectors:
  - abusive search scraping;
  - forged webhook requests;
  - forged ingest calls;
  - parameter explosion in filters.

## 8.4 Логирование и наблюдаемость
- Structured JSON logs in Workers.
- `INFO`:
  - request completed;
  - ingest completed;
  - outbox drained.
- `WARN`:
  - hidden entity skipped;
  - duplicate source mapping conflict.
- `ERROR`:
  - Turso timeout;
  - Telegram publish failure;
  - ingest validation failure.
- Хранение:
  - runtime logs: Cloudflare logs;
  - run history: `scrape_runs`;
  - CI logs: GitHub Actions.

## 8.5 Distributed / Concurrency
- Distributed architecture not needed beyond:
  - GitHub Actions producer;
  - Worker ingest consumer;
  - outbox publisher.
- Idempotency:
  - `batch_id` на ingest;
  - `dedupe_key` на channel posts;
  - `fingerprint_hash` на promotions.
- Consistency:
  - strong consistency required inside one ingest batch;
  - eventual consistency acceptable between scrape completion and channel publication.

## 9. Структура проекта

```text
/apps
  /miniapp
  /worker
  /scrapers
/packages
  /domain
  /application
  /infrastructure
  /contracts
  /shared
/db
  /migrations
  /queries
/openapi
  openapi.yaml
/.github
  /workflows
/docs
  PROJECT_HISTORY.md
  RESEARCH_LOG.md
  STATE.md
ARCHITECTURE.md
PRIVACY_POLICY.md
TERMS_OF_SERVICE.md
OPT_OUT_PROCEDURE.md
COMPLIANCE_GAPS.md
```

### Правила по папкам
- `/apps/miniapp`: только UI, Telegram bridge, client cache.
- `/apps/worker`: HTTP handlers, webhook adapters, outbox drain.
- `/apps/scrapers`: Python source parsers и normalizers.
- `/packages/domain`: сущности, invariants, suppression rules.
- `/packages/application`: use-cases.
- `/packages/infrastructure`: Turso repositories, Telegram API adapter.
- `/packages/contracts`: DTOs, schemas, OpenAPI shared types.
- `/db/migrations`: только schema migrations.
- `/db/queries`: hand-written SQL.

Что нельзя:
- runtime `.db`, `.sqlite`, `.log` внутри репозитория;
- temp scrape dumps inside project root;
- прямые SQL queries из UI.

## 10. План реализации

### Stage 1. Skeleton
- Цель: поднять монорепо и контракты.
- Готово когда:
  - есть структура каталогов;
  - есть OpenAPI skeleton;
  - есть initial DB migration;
  - есть Cloudflare Worker hello route;
  - есть Mini App shell.

### Stage 2. Catalog Core
- Цель: реализовать read model и справочники.
- Готово когда:
  - search doctors/clinics работает;
  - doctor card работает;
  - specialties dictionary загружается.

### Stage 3. Ingest
- Цель: подключить GitHub Actions -> Worker -> Turso.
- Готово когда:
  - один scraper source импортируется batch-ом;
  - работают upsert и dedupe;
  - `scrape_runs` и suppression работают.

### Stage 4. Promotions + Channel
- Цель: outbox и публикация новых акций.
- Готово когда:
  - новые акции попадают в `notification_outbox`;
  - drain endpoint публикует в канал;
  - duplicate posts не появляются.

### Stage 5. Bot + Mini App polish
- Цель: entrypoints и UX.
- Готово когда:
  - бот отвечает командами;
  - deep-links в Mini App работают;
  - last search cache и pagination работают.

### Stage 6. Hardening
- Цель: observability, privacy, export.
- Готово когда:
  - есть CSV export;
  - search history obeys privacy flags;
  - logs и error handling покрывают основные инциденты.

## 11. Точки контроля качества

### Unit tests
- domain dedupe rules
- suppression rules
- promotion fingerprinting
- filter parsing

### Integration tests
- search query against test DB
- ingest batch with upsert conflicts
- outbox drain -> Telegram adapter mock
- webhook secret verification

### Обязательно покрыть
- doctor/clinic matching
- opt-out skip on ingest
- duplicate promotion detection
- doctor card assembly across tables

### Можно оставить без тестов на первом vertical slice
- CSV formatting edge cases beyond UTF-8 baseline
- complex ranking heuristics

## 12. Потенциальные архитектурные риски

| Риск | Где возникнет | Снижение |
|---|---|---|
| Tight coupling между source HTML и canonical schema | ingest normalizers | source-specific adapters + normalized DTO layer |
| Рост технического долга в search SQL | catalog-read | хранить queries отдельно и version them |
| Bottleneck на deep joins | doctor card | read model + precomputed summaries |
| Повторная публикация скрытых сущностей | ingest + outbox | suppression check before write and before publish |
| Cloudflare free limit exhaustion | Worker runtime | aggressive caching, static assets, one-query endpoints |

## 13. Готовность к передаче программисту

### Финальный технический план
1. Базовый контур: `Cloudflare Workers + Turso + GitHub Actions`
2. Доменное ядро: `doctor`, `clinic`, `specialty`, `doctor_clinic`, `review_summary`, `promotion`
3. Обязательные legal-флаги: `is_hidden`, `opt_out`, `suppression_key`
4. Обязательные support-модули: `source refs`, `scrape_runs`, `notification_outbox`, `search_history`
5. Read path и ingest path строго разделены

### Порядок разработки
1. `db/migrations`
2. `catalog-read`
3. `catalog-ingest`
4. `privacy-suppression`
5. `channel-publisher`
6. `telegram-bot`
7. `miniapp`

### BLOCKER / TODO
- `TODO:` перед кодом зафиксировать exact implementation packages и их версии отдельным инженерным шагом с online check.
- `TODO:` отдельно подтвердить source-by-source robots/ToS для каждого scraper target перед production scrape.
