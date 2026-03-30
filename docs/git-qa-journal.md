# Git QA Journal

## 2026-03-29

### Live Mini App
- Status: investigating and fixing.
- Evidence before fix:
  - Live root `?v=20260329-13` showed `Найдено 0 врачей` and loading skeleton instead of cards.
  - `catalog-overview.json` was fast and healthy: about `18 KB`, `6381` doctors.
  - `catalog.json` was healthy but heavy: about `9.7 MB`.
  - Worker endpoint `GET /api/v1/doctors?page=1&per_page=24` timed out locally at `40s`.
- Root cause:
  - First screen loaded the full catalog snapshot before rendering the first page of doctors.
  - In Telegram WebView this path is too heavy, and the worker fallback is too slow to save the first render.

### Fix in progress
- Added lightweight snapshot outputs for first-screen data:
  - `catalog-list*.json`
  - `promotions*.json`
- Changed Mini App data loading:
  - overview now prefers `catalog-overview*.json`
  - doctor list now prefers `catalog-list*.json`
  - promotions now prefer `promotions*.json`
  - full `catalog*.json` remains for doctor details and heavier search flows

### What still must be rechecked after build
- Mini App root shows doctor cards without long skeleton.
- Live GitHub Pages uses the new lightweight snapshot files.
- Telegram menu button opens the refreshed build.

### Recheck results
- Build: `npm run build` in `apps/miniapp` passed.
- Lint: `npm run lint` in `apps/miniapp` passed.
- Lightweight snapshot sizes after build:
  - `catalog-list.20260329t193735698z.json` about `2.2 MB`
  - `promotions.20260329t193735698z.json` about `17 KB`
  - `catalog-overview.20260329t193735698z.json` about `21 KB`
- Live publish:
  - `gh-pages` updated to commit `0718ed1`
  - `pages-build-deployment` run `23717969507` completed successfully
- Live evidence after publish:
  - `catalog-list.20260329t193735698z.json` returns `6386` items
  - live screenshot for `?v=20260329-14` shows doctor cards on the root screen instead of the loading skeleton

### Current status
- Mini App first screen: fixed and verified on the public URL.
- Telegram menu button: updated successfully to `https://ai-nikitka93.github.io/medsearchrb/?v=20260329-14`.
- Next step after this journal entry: keep checking from the Telegram entrypoint instead of only from the raw Pages URL.

## 2026-03-30

### Promo coverage baseline
- Built a verified clinic coverage artifact from the current Minsk catalog snapshot:
  - [promo-clinic-coverage.md](/m:/Projects/Bot/MedsearchRB/docs/promo-clinic-coverage.md)
  - [promo-clinic-coverage.json](/m:/Projects/Bot/MedsearchRB/docs/promo-clinic-coverage.json)
  - [promo-clinic-coverage.csv](/m:/Projects/Bot/MedsearchRB/docs/promo-clinic-coverage.csv)
- Verification commands:
  - `npm --prefix apps/worker run promo:coverage`
  - `npm --prefix apps/worker run check`
- Current verified baseline from the report:
  - `845` clinics in the current Minsk catalog
  - `11` clinics with live promotions
  - `41` clinics matched to promo sources already in sync
  - `46` clinics matched to any implemented promo source
  - `354` clinics with site URL but no matched promo source
  - `445` clinics without official site URL in the current snapshot
- Safe source coverage conclusion:
  - existing promo implementations in code: `19`
  - sources active in `promo-sync`: `17`
  - the only implemented but intentionally excluded sources are `happyderm` and `klinik`, both verified locally as `skipped_by_robots`

### Current status
- We now have a repo-level source of truth for promo coverage across all clinics in the current Minsk catalog.
- The next safe step is not to guess new sources, but to use the coverage report to prioritize missing clinics with official sites and add them one by one.

### Official site web-verify
- Added host-level internet verification:
  - [promo-web-verify.md](/m:/Projects/Bot/MedsearchRB/docs/promo-web-verify.md)
  - [promo-web-verify.json](/m:/Projects/Bot/MedsearchRB/docs/promo-web-verify.json)
- Verification commands:
  - `npm --prefix apps/worker run promo:web-verify`
  - `npm --prefix apps/worker run check`
- Current verified host baseline:
  - `316` unique site hosts from the current clinic catalog
  - `298` hosts were fetchable
  - `232` hosts show promo/news/discount signal on the official site
  - `72` hosts did not show a promo signal in the current web check
- Important quality note:
  - host-level promo signal is broader than current live promo ingestion
  - this means many clinics already show promo/news sections on the official site, but are still not wired into the current promo pipeline

### Priority backlog
- Added a prioritized expansion backlog:
  - [promo-priority-report.md](/m:/Projects/Bot/MedsearchRB/docs/promo-priority-report.md)
  - [promo-priority-report.json](/m:/Projects/Bot/MedsearchRB/docs/promo-priority-report.json)
  - [promo-priority-report.csv](/m:/Projects/Bot/MedsearchRB/docs/promo-priority-report.csv)
- Verification commands:
  - `npm --prefix apps/worker run promo:priority`
  - `npm --prefix apps/worker run check`
- Current verified shortlist highlights:
  - `Клиника «Мерси»`
  - `6-я городская клиническая больница`
  - `РНПЦ неврологии и нейрохирургии`
  - `Медицинский центр «Парацельс» на Маяковского`
  - `«Аква-Минск Клиника»`
  - `1-я городская клиническая больница`
  - `Медицинский центр «Эксана» на Надеждинской`
- Existing-source review bucket also surfaced:
  - `Нордин`
  - `Центр здорового сна`
  - `Томография`
  - `Санте`
  - `МедАвеню`
  - `Супрамед`

### Strict promo verification refinement
- Tightened official-site verification so we now distinguish:
  - `verified promotions page`
  - `verified news-only page`
  - `homepage signal only`
- Verification commands:
  - `npm --prefix apps/worker run promo:web-verify`
  - `npm --prefix apps/worker run promo:priority`
  - `npm --prefix apps/worker run check`
- Current stricter baseline:
  - `316` unique clinic hosts checked
  - `76` hosts have a working verified promo/news page
  - only `41` hosts have a verified page of kind `promotions`
  - `35` hosts are `news`-only and should not be called confirmed promotions without extra review
  - shortlist now contains `36` clinics in `ready_to_add`, `35` in `verified_news_only`, `165` in `homepage_signal_only`
- Stronger evidence files remain:
  - [promo-web-verify.md](/m:/Projects/Bot/MedsearchRB/docs/promo-web-verify.md)
  - [promo-web-verify.json](/m:/Projects/Bot/MedsearchRB/docs/promo-web-verify.json)
  - [promo-priority-report.md](/m:/Projects/Bot/MedsearchRB/docs/promo-priority-report.md)
  - [promo-priority-report.json](/m:/Projects/Bot/MedsearchRB/docs/promo-priority-report.json)

### New live promo sources
- Added two new official sources:
  - `gurumed` -> `https://gurumed.by/sales/`
  - `paracels` -> `https://www.narkolog.by/sales/`
- Local verification:
  - `python -m apps.scrapers.main --sources gurumed paracels --output-mode file --log-level INFO`
  - result: `gurumed -> 1 promotion`, `paracels -> 2 promotions`
- Live ingestion:
  - `npm --prefix apps/worker run catalog:backfill -- --batch-file ...latest-source-batch.json --chunk-size 50`
  - result: `inserted=3`, `updated=2`, `errors=0`
- Live channel proof:
  - flush result: `claimed=3`, `sent=3`, `failed=0`, `skipped=0`
  - new public posts:
    - `https://t.me/medsearch_minsk/83`
    - `https://t.me/medsearch_minsk/84`
    - `https://t.me/medsearch_minsk/85`

### New verified sources after second-pass internet check
- Re-checked official sites instead of trusting the old shortlist blindly.
- Newly confirmed working promo routes:
  - `idealmed` -> `https://idealmed.by/akczii-i-skidki.html`
  - `medera` -> `https://medera.by/promotions/`
- Explicitly held back for now:
  - `merci` -> `https://mercimed.by/stock/` exists, but current stock section looks mostly archival
  - `eksana` -> `https://eksana.by/promo/` exists, but current page is effectively empty and has no real promo cards
- Local verification:
  - `python -m apps.scrapers.main --sources idealmed medera --output-mode file --log-level INFO`
  - result: `idealmed -> 9 promotions`, `medera -> 10 promotions`
- Live ingest note:
  - local Windows `catalog:backfill` path hit `TypeError: resp.body?.cancel is not a function`
  - fallback to live Worker ingest was used instead
  - combined envelope returned `500`
  - isolated per-source ingest succeeded:
    - `idealmed -> skipped=1`
    - `medera -> inserted=10, updated=1`
- Live data proof:
  - `GET https://medsearchrb-api.aiomdurman.workers.dev/api/v1/promotions?page=1&per_page=200`
  - total promotions now `69`
  - confirmed `19` live records for `ИдеалМед` + `Эра`
- Important operational note:
  - workflow/code updates are local only until pushed, so future scheduled `promo-sync` will not pick up `idealmed` and `medera` automatically yet

### Aqua-Minsk local expansion with live ingest blocker
- Re-checked a narrower set from the latest user-supplied clinic list:
  - `https://aquaminskclinic.by/news/`
  - `https://profimed.by/`
  - `https://bullfinch.by/news/`
  - `https://eleos.by/akcii`
- Conclusions:
  - `aquaminskclinic.by/news/` is usable as a `verified_news_only` source when filtered down to recent service-promo posts
  - `profimed.by` is live, but no clear promo/news route was confirmed for ingestion
  - `bullfinch.by/news/` is mostly an old archive (`2015-2019`) and should not be used for current live expansion
  - `eleos.by/akcii` exists, but the current page looks almost empty for automatic promo extraction
- Added local source:
  - `apps/scrapers/scrapers/aquaminsk.py`
- Updated locally:
  - `apps/scrapers/scrapers/__init__.py`
  - `config.yaml`
  - `selectors.yaml`
  - `.github/workflows/promo-sync.yml`
- Local verification:
  - `python -m apps.scrapers.main --sources aquaminsk --output-mode file --log-level INFO`
  - result: `aquaminsk -> 4 promotions`
  - batch titles:
    - `Инъекционные методы в косметологии в «Аква-Минск Клиника»`
    - `Нитевой лифтинг промежности`
    - `Лазерное лечение геморроя`
    - `Лазерное удаление гигромы`
- Live ingest blockers:
  - direct Worker ingest via `POST /internal/ingest/source-batch` returned `401 ingest token is invalid`
  - local Windows backfill path still fails with `TypeError: resp.body?.cancel is not a function`
- Live verification after both attempts:
  - `GET https://medsearchrb-api.aiomdurman.workers.dev/api/v1/promotions?page=1&per_page=200`
  - total promotions remained `69`
  - `Аква-Минск Клиника` records remained `0`
- Operational conclusion:
  - `aquaminsk` is implemented and locally verified
  - it is not yet live until ingest auth or local backfill is repaired
