Primary resume doc: `docs/EXECUTION_MAP.md`

Дата и время: 2026-03-30 17:08
Статус: IN_PROGRESS
Причина: Выполнение execution-map дошло до системного исправления promo pipeline. Старые operational blockers `401 ingest token is invalid` и Windows `catalog:backfill` больше не являются активными: env-loading нормализован, `db:migrate` снова работает, а `notification_outbox` научен reclaim-ить stale `processing`. `Аква-Минск Клиника` подтвержден в live Turso, Telegram channel и live API; прежнее расхождение `3/4` на общем promotions feed оказалось не багом, а pagination artifact (`per_page` ограничен `50`, поэтому 4-я запись попадает на `page=2`). Локальный `wrangler deploy` всё ещё упирается в Cloudflare account mismatch (`66f004...` vs `64b387...`), а новый GitHub Actions deploy path уже подтверждён до реального Cloudflare запроса, но упирается в недействительный repo secret `CLOUDFLARE_API_TOKEN` (`Invalid access token [code: 9109]`).
Что уже сделано:
- Добавлена миграция `db/migrations/0005_notification_outbox_claimed_at.sql`
- Добавлена миграция `db/migrations/0006_promotions_published_at.sql`
- `notification_outbox` получил `claimed_at` и stale-processing reclaim
- promotions получили `published_at`, а channel dispatch теперь требует date evidence (`ends_at` или свежий `published_at`)
- Обновлены:
  - `apps/worker/src/repositories/notification-outbox-repository.ts`
  - `apps/worker/src/repositories/catalog-write-repository.ts`
  - `apps/worker/scripts/apply-migrations.mjs`
  - несколько worker scripts были ранее переведены на shared root env loading
- Подтверждено:
  - локальный auth smoke к `POST /internal/ingest/source-batch` больше не даёт `401`; теперь route доходит до `400 INVALID_BATCH` при пустом payload
  - локальный `npm --prefix apps/worker run catalog:backfill -- --batch-file ...latest-source-batch.json --chunk-size 50` отрабатывает успешно
  - `npm run db:migrate` снова штатно проходит на Windows
  - локальный dispatch обновлённым `PromotionChannelService` поднял stale outbox и довёл `Лазерное удаление гигромы` до `status=sent`, `attempt_count=2`
  - публичный channel `https://t.me/s/medsearch_minsk` уже содержит все 4 `Аква-Минск` заголовка:
    - `Инъекционные методы в косметологии...`
    - `Нитевой лифтинг промежности`
    - `Лазерное лечение геморроя`
    - `Лазерное удаление гигромы`
  - live DB подтверждает `4` active/visible `Аква-Минск` promotions
  - live API `GET /api/v1/promotions?clinic=akva-minsk-klinika-00cbca01bc&page=1&per_page=50` подтверждает все `4` items
  - общее `GET /api/v1/promotions?page=1&per_page=50` показывает только `3`, а 4-я запись уходит на `page=2`; это pagination artifact, а не data drift
Что осталось:
- Восстановить Cloudflare deploy path через правильный account/token и повторно выкатить worker
- Дотянуть `published_at` в promo-scraper-ы, где дата реально доступна, чтобы новый channel guard был полноценно полезен
- После deploy заново проверить `/api/v1/promotions`, Mini App и channel consistency
Следующий шаг:
- Начинать с deploy blocker по Cloudflare account, затем пройтись по promo-scraper-ам и добавить `published_at`

Дата и время: 2026-03-30 03:05
Статус: IN_PROGRESS
Причина: Следующая попытка promo expansion ушла в mixed outcome: `Аква-Минск Клиника` была локально добавлена как узкий news-based source с service-promo фильтрацией, но live ingest упёрся в auth/runtime blockers, поэтому источник пока подтвержден только локально и не должен считаться live-published.
Что уже сделано:
- Повторно проверены official candidates из нового пользовательского списка:
  - `https://aquaminskclinic.by/news/`
  - `https://profimed.by/`
  - `https://bullfinch.by/news/`
  - `https://eleos.by/akcii`
- Подтверждено:
  - `Аква-Минск Клиника` имеет рабочий `news`-раздел и позволяет безопасно выделить только свежие service-promo публикации
  - `Профимед` имеет живой офсайт, но явный promo/news route для ingestion не подтверждён
  - `Bullfinch` имеет news archive, но это в основном старый архив `2015-2019`, не подходящий для live expansion
  - `Элеос` имеет route `/akcii`, но страница сейчас выглядит почти пустой для автоматического promo extraction
- Добавлен новый scraper:
  - `apps/scrapers/scrapers/aquaminsk.py`
- Обновлены:
  - `apps/scrapers/scrapers/__init__.py`
  - `config.yaml`
  - `selectors.yaml`
  - `.github/workflows/promo-sync.yml`
- Локальный scrape подтвержден:
  - `aquaminsk -> 4 promotions`
  - состав локального batch: `Инъекционные методы в косметологии...`, `Нитевой лифтинг промежности`, `Лазерное лечение геморроя`, `Лазерное удаление гигромы`
- Live blockers зафиксированы отдельно:
  - direct `POST /internal/ingest/source-batch` сейчас отвечает `401 ingest token is invalid` при чтении секрета из локального env
  - локальный `npm --prefix apps/worker run catalog:backfill` по-прежнему падает на Windows-side ошибке `TypeError: resp.body?.cancel is not a function`
  - live API после попытки ingest остался без новых `Аква-Минск` записей: total всё ещё `69`, `AQUA_COUNT=0`
Что осталось:
- Разобраться, почему локальный `INGEST_SHARED_SECRET` больше не авторизует internal Worker route
- Починить или обойти Windows-local Turso backfill path, чтобы не зависеть от live secret для одиночных source batch
- Только после этого считать `aquaminsk` реально live-ready и проверять Telegram posting
Следующий шаг:
- Обновить project history и git QA journal с честной фиксацией: `aquaminsk` локально реализован и верифицирован, но live ingest пока заблокирован `401 + local backfill bug`

Дата и время: 2026-03-30 01:40
Статус: IN_PROGRESS
Причина: Следующая волна promo expansion продолжилась не через guess по news-разделам, а через повторную internet-проверку official routes. В результате были найдены и реально подтверждены новые promo-source у `ИдеалМед` и `Эра`, а кандидаты `Мерси` и `Эксана` были дополнительно перепроверены и временно отложены как менее надёжные для этой итерации.
Что уже сделано:
- Повторно проверены official promo routes и robots:
  - `https://idealmed.by/akczii-i-skidki.html`
  - `https://medera.by/promotions/`
  - `https://mercimed.by/stock/`
  - `https://eksana.by/promo/`
- Подтверждено:
  - `ИдеалМед` имеет detail-based promo archive
  - `Эра` имеет live promo landing page с множественными офферами
  - `Мерси` имеет `stock`-раздел, но он сейчас выглядит в основном архивным
  - `Эксана` имеет `promo` route, но текущая страница почти пустая и не содержит реальных promo cards
- Добавлены новые scraper-ы:
  - `apps/scrapers/scrapers/idealmed.py`
  - `apps/scrapers/scrapers/medera.py`
- Обновлены:
  - `apps/scrapers/scrapers/__init__.py`
  - `config.yaml`
  - `selectors.yaml`
  - `.github/workflows/promo-sync.yml`
- Локальный scrape подтвержден:
  - `idealmed -> 9 promotions`
  - `medera -> 10 promotions`
- Production ingest проверен через live Worker endpoint:
  - combined envelope для двух sources вернул `500`, поэтому ingestion был изолирован по одному source
  - `idealmed -> skipped=1` (source уже был зафиксирован как completed в live ingest path)
  - `medera -> inserted=10, updated=1`
- Live API после этой итерации уже отдает `69` акций total, из них `19` записей подтверждены для `ИдеалМед` и `Эра`
Что осталось:
- Решить, нужен ли отдельный manual flush этих новых акций в Telegram channel сейчас, или оставить отправку на существующий posting pipeline
- Зафиксировать/запушить локальные workflow/code changes, иначе новые sources не войдут в будущий scheduled `promo-sync`
- Продолжить следующую волну только после такой же ручной internet-верификации, а не по старому shortlist “как есть”
Следующий шаг:
- Обновить project history и git QA journal с evidence по `idealmed + medera`, отдельно отметить reject/hold для `merci + eksana`

Дата и время: 2026-03-30 01:12
Статус: IN_PROGRESS
Причина: Promo expansion перешёл из аудита в execution: после strict shortlist были выбраны два нейтральных official medical source, реализованы, локально проверены и уже реально доставлены в live channel. Теперь проект находится в более сильной точке: не только есть verified backlog, но и есть подтверждённый рабочий шаблон для безопасного добавления новых клиник без ломки существующего promo-layer.
Что уже сделано:
- Добавлены новые scraper-ы:
  - `apps/scrapers/scrapers/gurumed.py`
  - `apps/scrapers/scrapers/paracels.py`
- Обновлены:
  - `apps/scrapers/scrapers/__init__.py`
  - `config.yaml`
  - `selectors.yaml`
  - `.github/workflows/promo-sync.yml`
- Robots + structure были вручную перепроверены перед добавлением:
  - `https://gurumed.by/robots.txt`
  - `https://www.narkolog.by/robots.txt`
  - обе площадки отдают `200` и не содержат blanket-disallow для наших promo routes
- Локальный scrape новых источников подтвержден:
  - `gurumed -> 1 promotion`
  - `paracels -> 2 promotions`
- Live backfill подтвержден:
  - `inserted=3`
  - `updated=2`
  - `errors=0`
- Live outbox после backfill показал `pending=3`, после flush:
  - `claimed=3`
  - `sent=3`
  - `failed=0`
  - `skipped=0`
- Публичный Telegram channel уже содержит новые посты:
  - `https://t.me/medsearch_minsk/83` -> `Скидка в День рождения` (`gurumed`)
  - `https://t.me/medsearch_minsk/84` -> `Бонусы постоянным клиентам` (`paracels`)
  - `https://t.me/medsearch_minsk/85` -> `Лечение в рассрочку и в кредит` (`paracels`)
Что осталось:
- Продолжить adding sources только из verified `promotions` bucket
- Предпочитать нейтральные medical centers перед косметологией/стоматологией, если пользователь явно хочет именно медцентры
- Решить, нужна ли следующая волна источников уже сейчас, или сначала зафиксировать/push текущую волну в git и workflow
Следующий шаг:
- Выбрать ещё 1-2 медицинских verified sources из shortlist и пройти тот же безопасный цикл: robots -> local scrape -> live backfill -> channel verify

Дата и время: 2026-03-30 00:47
Статус: IN_PROGRESS
Причина: Promo coverage expansion продолжает быть главным рабочим треком, но после повторной internet-верификации основная проблема переопределена точнее: теперь важно не просто находить hosts с promo/news сигналом, а различать `confirmed promotions`, `verified news-only` и `homepage signal only`. Это критично, чтобы не завышать покрытие и не подключать ложные источники по 404/general-news маршрутам.
Что уже сделано:
- Усилен script `apps/worker/scripts/promo-web-verify.ts`:
  - added rejection for `404 / error page` false positives
  - added `promo_signal_source`
  - added `promo_page_verified`
  - added `promo_page_kind = promotions | news | unknown | none`
- Усилен script `apps/worker/scripts/promo-priority-report.ts`:
  - `ready_to_add` теперь формируется только из `verified promotions`
  - `verified_news_only` вынесен в отдельный bucket
  - `homepage_signal_only` больше не смешивается с подтвержденными акциями
- Новый internet baseline по официальным сайтам клиник Минска:
  - `316` total hosts
  - `299` fetchable
  - `222` hosts with homepage/site promo signal
  - `76` hosts with working verified promo/news page
  - `41` hosts with verified page kind `promotions`
  - `35` hosts with verified page kind `news`
- Новый priority baseline:
  - `36` clinics in `ready_to_add`
  - `35` clinics in `verified_news_only`
  - `165` clinics in `homepage_signal_only`
  - `28` clinics in `review_existing`
- Артефакты пересобраны:
  - `docs/promo-web-verify.md`
  - `docs/promo-web-verify.json`
  - `docs/promo-priority-report.md`
  - `docs/promo-priority-report.json`
  - `docs/promo-priority-report.csv`
Что осталось:
- Взять top `ready_to_add` только из bucket `verified promotions`
- Дополнительно вручную просмотреть несколько верхних кандидатов, чтобы подтвердить, что это именно медицинские центры Минска, а не пограничные косметологические/стоматологические кейсы
- Не считать `verified_news_only` и `homepage_signal_only` эквивалентом “есть акции”, пока это не подтверждено отдельно
Следующий шаг:
- Сформировать shortlist следующей волны promo-source implementation только из verified `promotions` кандидатов и отдельно пометить policy-spots, которые требуют продуктового решения

Дата и время: 2026-03-30 00:06
Статус: IN_PROGRESS
Причина: Production-контур жив, а текущий активный риск теперь формализован как backlog расширения promo-layer по клиникам Минска. После `promo:coverage` и `promo:web-verify` собран ещё и `promo:priority`, который переводит общую проблему в конкретный рабочий список: `247` verified-кандидатов на подключение и `28` existing-source кейсов для review. Это делает promo priority expansion главным рабочим треком поверх уже стабилизированного bot/worker/mini app.
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
- Live `https://medsearch-minsk-miniapp.pages.dev` является текущим Mini App host; Netlify URL исторически сохраняется, но больше не должен использоваться как primary entrypoint
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
- Production snapshot теперь публикуется через Cloudflare Pages deploy path; текущий Mini App host — `https://medsearch-minsk-miniapp.pages.dev`
- Добавлены новые official promo sources `nordin`, `medavenu`, `smartmedical`, `supramed`
- Общий local live backfill новых promo sources завершился `processed_batches=4`, `inserted=43`, `errors=0`
- Cloudflare Pages project `medsearch-minsk-miniapp` подтвержден рабочим: прямой `wrangler pages deploy` создает production deployment, а run `review-sync` `23413937432` дошел до `Deploy Mini App to Cloudflare Pages` и завершился успешно
- Added `2doc.by` as a bounded hybrid review/discovery source: `review-sync-2doc` `23414212650` завершился `success`, bounded run дал `doctors_found=25`, `clinics_found=18`, `review_summaries_found=25`, а live Turso verify показал `source_name='2doc.by' -> 25 rows`
- Добавлен baseline-аудит качества каталога `apps/worker/scripts/catalog-quality-audit.ts` и npm-команда `npm --prefix apps/worker run catalog:audit`
- Аудит зафиксировал текущие ключевые метрики: `doctors_visible=3252`, `clinics_visible=641`, `promotions_active=48`, `doctors_without_active_clinic=149`, `doctors_without_reviews=1574`, `doctors_with_multi_review_sources=48`, `doctors_with_verified_clinic_link=22`, `duplicate_doctor_name_groups=151`, `duplicate_doctor_rows=302`
Что осталось:
- Сократить doctor duplicates с baseline `151` групп
- Сократить `149` врачей без активной клиники через better matching/remediation
- Нарастить verified clinic links выше текущих `22`
- Добить review truth layer: больше multi-source doctors и честный aggregate rating
- Продолжить promo cleanup по спорным source-specific акциям
Следующий шаг:
- Взять `Catalog Trust P0` как основной remediation-трек: сначала exact duplicate/orphan analysis, затем усиление doctor identity matching и cleanup orphan doctors

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
  - Mini App: `https://medsearch-minsk-miniapp.pages.dev`
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
