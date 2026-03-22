Дата и время: 2026-03-22 10:38
Статус: IN_PROGRESS
Причина: Production bot/API/Mini App online и live каталог доступен без локального ПК; `promo-sync` уже стабильно работает ночью по cron и многократно завершался `success`, но новых promo-posts в канал не было, потому что последние successful flush-пуски возвращали `claimed=0, sent=0`; `doctor-catalog-sync` тоже подтвердил overnight success (`23395048832`, `3h48m43s`), однако полный `YDoc` nightly run дает в основном `updated`, а не рост итогового live total врачей. Дополнительно внедрен первый online-слой качества клиник: health-check официальных `site_url` и отдельный cloud workflow для suppression битых/закрытых клиник.
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
- Добавлена миграция `db/migrations/0004_clinic_site_health.sql` с полями `site_health_status`, `site_last_checked_at`, `site_last_http_status`, `site_last_error`, `site_failure_count`, `site_last_final_url`
- Добавлен script `apps/worker/scripts/clinic-site-health-sync.ts`, который online проверяет официальные сайты клиник, пишет результаты в `clinic_verification_runs` и переводит явно битые/закрытые клиники в suppression после повторных провалов
- `apps/worker/scripts/verify-clinic-sites.ts` переведен на `env-first`, чтобы корректно работать в GitHub Actions без локального `.env.txt`
- Локальный smoke-test `clinics:health -- --limit 5 --all` подтвердил первый проход: `healthy=4`, `fetch_failed=1`, `hidden=0`
- Добавлен отдельный cloud workflow `.github/workflows/clinic-site-sync.yml` c шагами `db:migrate -> verify:clinics -> clinics:health`
Что осталось:
- Зафиксировать единый execution backlog в `docs/TODO.md` и вести работу от него, а не от разрозненных сообщений
- Сформировать source inventory по оставшимся официальным promo/news pages медцентров Минска
- Продолжить разрезание и ускорение `doctor-catalog-sync`, если `ydoc` остается слишком длинным
- После стабилизации текущего run вынести `doctor-clinic-verify` в отдельный cloud step
- Запушить и запустить новый `clinic-site-sync` workflow в GitHub, чтобы health-check жил полностью в облаке
- Проверить визуально Mini App в Telegram WebView на реальном устройстве
- Понять, почему overnight `YDoc` run добавляет/обновляет тысячи записей, но почти не увеличивает итоговое число уникальных карточек врачей
Следующий шаг:
- Держать backlog в `docs/TODO.md` как единый план выполнения; ближайшие активные задачи: завершить `clinic-site-sync`, затем внедрять `doktora.by` как первый doctor-review source

Дата и время: 2026-03-22 15:58
Статус: IN_PROGRESS
Причина: Активный трек смещен на `Review Layer P1 (103.by + doktora.by)`. Реализованы два новых production review-source, bounded scrape/backfill уже подтвердил запись новых summary-отзывов в live `reviews_summary`, Worker и Mini App пересобраны и перевыкатаны, а отдельный cloud workflow `review-sync` подготовлен для online-refresh без ПК. `Clinic Verification P1` не потерян, но временно отошел на второй план.
Что уже сделано:
- Реализован scraper `apps/scrapers/scrapers/by103.py`:
  - source `103.by`
  - crawl через `sitemap-staff.xml.gz`
  - detail-page extraction для `ratingValue`, `reviewCount`, specialty и clinic blocks
- Реализован scraper `apps/scrapers/scrapers/doktora.py`:
  - source `doktora.by`
  - crawl через paginated `/otzyvy-o-vrachah-belarusi?page=N`
  - extraction для `review_count`, specialty и clinic mention
  - `rating_avg` временно отключен, потому что текущий DOM-маркер `average-rating` дает недостоверное значение `1`
- Registry/config обновлены:
  - `apps/scrapers/scrapers/__init__.py`
  - `config.yaml`
  - `selectors.yaml`
- Worker read-model переведен на multi-source aggregation:
  - `apps/worker/src/repositories/doctors-read-repository.ts`
  - `apps/worker/src/services/doctors-service.ts`
- Snapshot generation переведена на latest-per-source + weighted aggregate:
  - `apps/miniapp/scripts/generate-catalog-snapshot.mjs`
- Mini App detail-screen теперь:
  - считает aggregate rating/review count по всем источникам
  - показывает блок `Отзывы по источникам`
  - умеет открывать source page каждого review-source
- Добавлен cloud workflow `.github/workflows/review-sync.yml` для `103.by + doktora.by`
- Bounded smoke-run подтвержден:
  - `103.by -> doctors_found=2, clinics_found=2, review_summaries_found=2`
  - `doktora.by -> doctors_found=2, clinics_found=1, review_summaries_found=2`
- Bounded live backfill подтвержден:
  - `processed_batches=2`
  - `inserted=6`
  - `updated=5`
  - `errors=0`
- Live Turso после bounded backfill уже содержит:
  - `reviews_summary source_name='103.by' -> 2 rows`
  - `reviews_summary source_name='doktora.by' -> 2 rows`
- Production deploy выполнен:
  - Worker: `https://medsearchrb-api.aiomdurman.workers.dev`
  - Mini App: `https://medsearch-minsk-miniapp.netlify.app`
- Единый backlog добавлен в `docs/TODO.md` и принят как основной execution plan
- Создан commit `645a0a4` с roadmap+workflow fix и успешно запушен в `origin/main`
- Запущен новый cloud run `clinic-site-sync` (`23402446176`) на свежем `head_sha=645a0a4`
- Новый run дошел до `Backfill official clinic sites from YDoc clinic pages` и затем до `Audit official clinic sites and suppress broken ones`
- Live Turso после cloud health-pass показывает накопленное распределение `site_health_status`: `healthy=378`, `fetch_failed=15`, `blocked=6`, `redirected_external=5`, `invalid_http=2`, `unknown=4`
- Подтверждено, что `hidden_total=0`, поэтому пользовательских визуальных изменений в Mini App пока почти нет
Что осталось:
- Закоммитить и запушить review-layer changes в `origin/main`
- Запустить первый cloud `review-sync` run уже с новыми scrapers
- Проверить, сколько врачей из `103.by + doktora.by` реально матчится к текущему каталогу, а сколько приходит как новые карточки
- При необходимости усилить matching между review-sources и существующим doctor catalog
- Вернуться к `Clinic Verification P1` после первого зеленого `review-sync`
Следующий шаг:
- Закоммитить multi-source review-layer, запушить в `origin/main` и вручную запустить новый `review-sync`, чтобы `103.by + doktora.by` начали работать полностью online, а не только через bounded local smoke-run
