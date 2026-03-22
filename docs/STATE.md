Дата и время: 2026-03-23 01:48
Статус: IN_PROGRESS
Причина: Основной production-контур жив (`bot + worker + promo-sync + clinic-site-sync`), giant bottleneck `review-sync` уже разрезан на bounded source workflows, а freshness-path для Mini App уже подтвержден через прямой Cloudflare Pages production deploy из GitHub Actions. Netlify оказался тупиковым для freshness: текущий account hit credit limit, а build hook не давал новых production deploy; теперь активный трек — поддерживать Pages deploy как бесплатный production host и добивать review/verification coverage.
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
- Live totals на момент фикса Mini App: `doctors_total=2271`, `promotions_total=59`
- Добавлена миграция `db/migrations/0004_clinic_site_health.sql` с полями `site_health_status`, `site_last_checked_at`, `site_last_http_status`, `site_last_error`, `site_failure_count`, `site_last_final_url`
- Добавлен script `apps/worker/scripts/clinic-site-health-sync.ts`, который online проверяет официальные сайты клиник, пишет результаты в `clinic_verification_runs` и переводит явно битые/закрытые клиники в suppression после повторных провалов
- `apps/worker/scripts/verify-clinic-sites.ts` переведен на `env-first`, чтобы корректно работать в GitHub Actions без локального `.env.txt`
- Локальный smoke-test `clinics:health -- --limit 5 --all` подтвердил первый проход: `healthy=4`, `fetch_failed=1`, `hidden=0`
- Добавлен отдельный cloud workflow `.github/workflows/clinic-site-sync.yml` c шагами `db:migrate -> verify:clinics -> clinics:health`
- `apps/miniapp/lib/api.ts` переведен на production-safe `worker-first` для doctors/promotions/detail path; snapshot теперь только fallback
- Production snapshot заново собран и задеплоен: `https://medsearch-minsk-miniapp.netlify.app/data/catalog.json` уже отдает `2271` врачей и `59` акций
- Добавлены новые official promo sources `nordin`, `medavenu`, `smartmedical`, `supramed`
- Общий local live backfill новых promo sources завершился `processed_batches=4`, `inserted=43`, `errors=0`
- Cloudflare Pages project `medsearch-minsk-miniapp` подтвержден рабочим: прямой `wrangler pages deploy` создает production deployment, а run `review-sync` `23413937432` дошел до `Deploy Mini App to Cloudflare Pages` и завершился успешно
- Added `2doc.by` as a bounded hybrid review/discovery source: `review-sync-2doc` `23414212650` завершился `success`, bounded run дал `doctors_found=25`, `clinics_found=18`, `review_summaries_found=25`, а live Turso verify показал `source_name='2doc.by' -> 25 rows`
Что осталось:
- Добить review coverage: `103.by`, `doktora.by` и `2doc.by` должны заметно увеличить multi-source doctors
- После стабилизации текущих runs вынести `doctor-clinic-verify` в отдельный cloud step
- Продолжить улучшение matching между врачами и clinic pages, чтобы CTA и source breakdown были полнее
- Держать Cloudflare Pages deploy path под наблюдением и убедиться, что он стабильно срабатывает после каждого успешного data-run
- Усилить `2doc.by` matching, если появятся дополнительные doctor pages за пределами первого bounded chunk
- Понять, почему overnight `YDoc` run добавляет/обновляет тысячи записей, но почти не увеличивает итоговое число уникальных карточек врачей
Следующий шаг:
- Закоммитить и запушить promo-source expansion + Mini App live data path fix, затем вручную прогнать `promo-sync` уже в облаке и убедиться, что future updates видны без локального redeploy

Дата и время: 2026-03-22 16:06
Статус: IN_PROGRESS
Причина: Активный трек `Review Layer P1 (103.by + doktora.by)` уже переведен в online execution: код запушен в `origin/main` коммитом `1b2fc0c`, а первый cloud run `review-sync` (`23403673638`) создан и реально стартовал в GitHub Actions. Локальный bounded scrape/backfill уже подтвердил live `reviews_summary`, Worker и Mini App пересобраны и перевыкатаны, а теперь нужно дождаться первого полного cloud run и оценить performance/coverage полного crawl.
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
- Дождаться завершения первого cloud `review-sync` run `23403673638`
- Проверить, сколько врачей из `103.by + doktora.by` реально матчится к текущему каталогу, а сколько приходит как новые карточки
- При необходимости усилить matching между review-sources и существующим doctor catalog
- Вернуться к `Clinic Verification P1` после первого зеленого `review-sync`
Следующий шаг:
- Снять финальный статус `23403673638`; если run зеленый, зафиксировать `review-sync` как рабочий online pipeline и перейти к следующему треку: matching/coverage или `2doc.by`

Дата и время: 2026-03-22 20:16
Статус: IN_PROGRESS
Причина: Полная перепроверка показала, что production сам по себе живой (`2271` врачей, `59` акций, Mini App `HTTP 200`), но два cloud-пайплайна содержали реальные дефекты, из-за которых прогресс выглядел хуже, чем был. `clinic-site-sync` три последних run-а падали уже после полезной работы, потому что final summary-step запускал `tsx` из repo root и не резолвил `@libsql/client`. `review-sync` был зеленым только наполовину: `doktora.by` доезжал, а `103.by` целиком проваливался на одном битом URL `https://www.103.by/spec//` из sitemap.
Что уже сделано:
- Production endpoints перепроверены:
  - Worker `/health` -> `ok=true`
  - Worker `/api/v1/doctors?page=1&per_page=1` -> `total=2271`
  - Worker `/api/v1/promotions?page=1&per_page=5` -> `total=59`
  - Netlify Mini App `/` -> `HTTP 200`
  - Netlify snapshot `/data/catalog.json` -> `doctors=2271`, `promotions=59`, `generated_at=2026-03-22T16:06:56.961Z`
- Подтверждено, что `promo-sync` online работает стабильно:
  - последние scheduled runs `23407654470`, `23406848399`, `23406523840`, `23405736472`, `23405236511`, `23404524046` завершились `success`
- Подтверждено, что `doctor-catalog-sync` последний завершенный run `23395048832` зеленый (`3h48m43s`, `inserted=22`, `updated=5729`, `errors=0`)
- Подтверждено, что `clinic-site-sync` падал три раза подряд (`23401254824`, `23402446176`, `23403825588`) на final summary-step с ошибкой `Cannot find module '@libsql/client'`
- Исправлен workflow `.github/workflows/clinic-site-sync.yml`:
  - summary-step переведен на `cd apps/worker && npx tsx -e ...`
  - локальный smoke-test этого exact path прошел и вернул live `site_health_status` summary
- Исправлен workflow `.github/workflows/review-sync.yml`:
  - verify-step также переведен на `cd apps/worker && npx tsx -e ...`
- Исправлен scraper `apps/scrapers/scrapers/by103.py`:
  - sitemap URLs с пустым suffix `/spec//` теперь отфильтровываются
  - bounded local run снова зеленый: `doctors_found=9`, `clinics_found=8`, `review_summaries_found=9`
Что осталось:
- Закоммитить и запушить cloud-fixes (`by103` + workflow hardening) в `origin/main`
- Перезапустить `clinic-site-sync` и `review-sync`, чтобы подтвердить зеленые runs уже в GitHub Actions
- После этого переснять live coverage по review-sources и health-layer клиник
Следующий шаг:
- Зафиксировать commit с cloud pipeline fixes, запушить его и вручную прогнать оба workflow для подтверждения реального восстановления cloud execution
