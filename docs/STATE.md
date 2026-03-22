Дата и время: 2026-03-22 10:00
Статус: IN_PROGRESS
Причина: Production bot/API/Mini App online и live каталог доступен без локального ПК; `promo-sync` уже стабильно работает ночью по cron и многократно завершался `success`, но новых promo-posts в канал не было, потому что последние successful flush-пуски возвращали `claimed=0, sent=0`; `doctor-catalog-sync` тоже подтвердил overnight success (`23395048832`, `3h48m43s`), однако полный `YDoc` nightly run дает в основном `updated`, а не рост итогового live total врачей.
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
- Добавлены новые official promo sources `Kravira` (`4` акции) и `LODE` (`3` promo/news записи)
- Direct ingest для `kravira + lode` подтвержден на live Worker со статусом `200`
- Production Worker API `/api/v1/promotions` вырос до `21` акций
- Новый flush outbox для `Kravira/LODE` завершился с `claimed=7`, `sent=3`, `skipped=4`
- `promo-sync` окончательно отвязан от локального `.env.txt`: backfill использует GitHub secrets напрямую
- Финальная live-проверка в GitHub Actions исправлена через `User-Agent: MedsearchRB-GitHubActions/1.0`
- Получен первый полностью успешный online run `promo-sync` (`23392262386`), включая `scrape -> backfill -> Telegram flush -> live verify -> artifact upload`
- Ночные scheduled runs `promo-sync` подтверждены как рабочие (`23394796220`, `23396230359`, `23397058481`, `23397973431`, `23398602564`, `23399367494`, `23399948455` — все `success`)
- Последний завершенный `promo-sync` (`23399948455`) показал `claimed=0`, `sent=0`, поэтому новых новостей в Telegram-канале не было
- Ночной `doctor-catalog-sync` (`23395048832`) завершился `success` за `3h48m43s`, обработал `22` batch chunks и дал итог `inserted=22`, `updated=5729`, `errors=0`
- Live totals на момент аудита: `doctors_total=2162`, `promotions_total=21`
Что осталось:
- Сформировать source inventory по оставшимся официальным promo/news pages медцентров Минска
- Продолжить разрезание и ускорение `doctor-catalog-sync`, если `ydoc` остается слишком длинным
- После стабилизации текущего run вынести `doctor-clinic-verify` в отдельный cloud step
- Проверить визуально Mini App в Telegram WebView на реальном устройстве
- Понять, почему overnight `YDoc` run добавляет/обновляет тысячи записей, но почти не увеличивает итоговое число уникальных карточек врачей
Следующий шаг:
- Продолжить source-by-source подключение остальных клиник Минска в `promo-sync` и отдельно довести `doctor-catalog-sync`, чтобы весь refresh pipeline был онлайн, а не только promotions
