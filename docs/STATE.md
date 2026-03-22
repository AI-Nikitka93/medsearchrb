Дата и время: 2026-03-22 02:53
Статус: IN_PROGRESS
Причина: Production bot/API/Mini App online и live каталог доступен без локального ПК; репозиторий `AI-Nikitka93/medsearchrb` уже переведен в `PUBLIC`, billing blocker private Actions снят, и cloud workflow уже может исполняться. Дополнительно новый promo source `Lighthouse` уже вручную добавлен в live Turso и начал поститься в канал, но код источника еще нужно запушить и прогнать отдельным cloud run, чтобы future refresh/promotions publishing тоже шли полностью online.
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
- Добавлена миграция `db/migrations/0002_read_perf.sql` с read-индексами для doctor list/detail path
- Добавлен same-origin snapshot pipeline `apps/miniapp/scripts/generate-catalog-snapshot.mjs`
- `apps/miniapp/lib/api.ts` переведен на snapshot-first чтение в production с fallback на Worker
- Live `https://medsearch-minsk-miniapp.netlify.app/data/catalog.json` подтвержден с `2162` врачами и `1` акцией
- Headless Edge screenshot подтвердил, что `/list` в production показывает карточки врачей, а не бесконечный loading
- Добавлены `telegram/webhook` и `telegram/health` routes в Worker
- `deploy_worker.bat` переведен на PowerShell-backed deploy + Telegram sync
- Реально подтверждены `setWebhook`, `setMyCommands`, `setChatMenuButton`, `setMyDescription`, `setMyShortDescription`
- `getWebhookInfo` подтвердил live webhook URL `https://medsearchrb-api.aiomdurman.workers.dev/telegram/webhook`
- Тестовый POST в webhook route с корректным secret header вернул `{"ok":true}`
- Массовый `YDoc` clinic verification показал `402` clinic cards в Turso, из них `397` уже имеют не-агрегаторный `site_url`
- Остановлен зависший локальный `python`-scraper после прерванного ручного запуска, чтобы не создавать ложное ощущение зависимости production-контура от ПК
- Worker получил online promotion-posting pipeline: protected endpoint `/internal/notifications/promotions/flush`, cron `*/20 * * * *`, и live-тест подтвердил `claimed=1`, `sent=1` с переводом `notification_outbox` в статус `sent`
- Добавлен новый official promo source `lighthouse`; локальный scrape подтвердил `17` promotions и clinic record `Маяк Здоровья`
- `Lighthouse` batch успешно прогнан через live Turso backfill (`inserted=18`, `errors=0`)
- Production Worker API `/api/v1/promotions` теперь отдает `18` акций, включая `Диагностика варикоза по выгодной стоимости`
- Promotion outbox для `Lighthouse` акций реально отправлен в Telegram channel через live flush (`sent=10`, затем `sent=7`, затем очередь опустела)
Что осталось:
- Запушить свежий код `Lighthouse` + promotion-posting pipeline в public repo
- Запустить новый `catalog-sync` cloud run уже с `lighthouse` в списке источников
- При необходимости разрезать pipeline на более короткие cloud jobs
- После стабилизации текущего run вынести `doctor-clinic-verify` в отдельный cloud step
- Проверить визуально Mini App в Telegram WebView на реальном устройстве
Следующий шаг:
- Закоммитить и запушить `Lighthouse` source, затем вручную запустить новый `catalog-sync` run и подтвердить, что scrape + backfill + promo channel posting для `Lighthouse` уже идут полностью в облаке без локального ПК
