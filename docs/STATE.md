Дата и время: 2026-03-21 23:23
Статус: READY
Причина: Production bot/API/Mini App online, локальный full-catalog backfill завершен, Turso и live API содержат `2162` видимых врачей из `2169` source records после deduplication. Подготовлен cloud workflow `catalog-sync`, который убирает зависимость будущих scraper-refresh jobs от ПК, но его реальная активация зависит от наличия GitHub-репозитория с секретами.
Что уже сделано:
- Создана group `medsearch-primary` в регионе `aws-eu-west-1`
- Создана база `medsearchrb`
- Записаны `TURSO_DATABASE_URL`, `TURSO_AUTH_TOKEN`, `INGEST_SHARED_SECRET` в `.env.txt`
- Успешно применена миграция `db/migrations/0001_init.sql`
- Подтверждены таблицы `doctors`, `clinics`, `promotions`, `doctor_sources`, `clinic_sources`, `doctor_clinics`, `reviews_summary`, `scrape_runs`
- Worker runtime переведен на `@libsql/client/web`, добавлены CORS allowlist и retry-path для `scrape_runs`
- Реальный batch из scraper output доставлен в `POST /internal/ingest/source-batch` с ответом `200`
- `GET /api/v1/doctors`, `GET /api/v1/promotions` и `GET /health` подтверждены на live Worker
- `apps/miniapp` переведен на live fetch-запросы, добавлены `loading/error/empty` состояния и route `/list`
- Повторно задеплоен production Mini App на Netlify и подтвержден ответ `HTTP 200`
- Добавлены `telegram/webhook` и `telegram/health` routes в Worker
- `deploy_worker.bat` переведен на PowerShell-backed deploy + Telegram sync
- Реально подтверждены `setWebhook`, `setMyCommands`, `setChatMenuButton`, `setMyDescription`, `setMyShortDescription`
- `getWebhookInfo` подтвердил live webhook URL `https://medsearchrb-api.aiomdurman.workers.dev/telegram/webhook`
- Тестовый POST в webhook route с корректным secret header вернул `{"ok":true}`
Что осталось:
- Опубликовать обновленный `.github/workflows/scraper.yml` в реальный GitHub-репозиторий
- Добавить GitHub Actions secrets: `TURSO_DATABASE_URL`, `TURSO_AUTH_TOKEN`, `INGEST_SHARED_SECRET`
- Проверить визуально Mini App в Telegram WebView на реальном устройстве
Следующий шаг:
- Включить GitHub Actions cloud sync для будущих обновлений каталога без участия локального ПК
