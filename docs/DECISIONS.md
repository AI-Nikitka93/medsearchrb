# Scraper Decisions

## 2026-03-21 — Initial source policy
- `curl_cffi` selected as the primary HTTP transport because the current target pages return SSR HTML and do not require a browser for the first slice.
- `Nodriver` reserved as an escalation path if a source introduces JS challenge or stronger anti-bot checks.
- `103.by` is excluded from the first runnable slice because robots/ToS risk is higher than for the selected sources.

## Robots / ToS summary
- `medart.by`: public specialist and promotions pages are allowed for the selected paths; search/auth/ajax/personal endpoints are disallowed.
- `ydoc.by`: public doctor list/detail pages are allowed; `/ajax/`, `/appointment/`, `/newcomment/` and profile/update flows are disallowed.

## Content policy
- Reviews are collected only as summary metrics (`rating_value`, `review_count`).
- Full review texts are explicitly excluded.
- Output is a source batch JSON for the future ingest API, not local SQLite.

## 2026-03-22 — Doctor to Clinic Verification Model
- `doctor -> clinic` links must not be treated as trusted solely because they appear on an aggregator page.
- Official clinic sites and official clinic booking widgets are the highest-trust sources for employment and booking links.
- Aggregator-only matches (`YDoc`, similar catalogs) remain usable, but must be marked as `aggregator-only` until confirmed by an official clinic source.
- Mini App navigation must be clinic-scoped, not doctor-scoped:
  - if a doctor works in several clinics, each clinic gets its own action set;
  - CTA labels must reflect the actual destination (`Сайт клиники`, `Запись через YDoc`, `Карточка на YDoc`, etc.).
- Future schema evolution should introduce explicit verification metadata per doctor-clinic relationship:
  - `source_type`
  - `verification_status`
  - `verified_on_clinic_site`
  - `last_verified_at`
  - `official_booking_url`
  - `official_profile_url`

## 2026-03-22 — Zero-Downtime Expansion for Clinic Verification
- Schema evolution for official clinic verification is expand-only first:
  - no rename/drop in the first rollout;
  - existing `booking_url` / `profile_url` remain readable for old code paths.
- New verification metadata is attached at three layers:
  - `clinics`: official site and booking/widget trust;
  - `doctor_sources`: source-level trust and verification trace;
  - `doctor_clinics`: final clinic-scoped relation used by Mini App CTA logic.
- Migration runner now persists applied files in `schema_migrations`, because replaying every SQL file is unsafe once `ALTER TABLE ... ADD COLUMN` enters the stack.
- Default trust model:
  - `verification_status = 'aggregator_only'` for legacy relations;
  - `verified_on_clinic_site = 0` until official confirmation arrives.

## 2026-03-22 — Cloud-Only Refresh Pipeline for Doctor to Clinic Verification
- Production serving path remains split and online-first:
  - `Cloudflare Worker` serves read API, ingest API and Telegram webhook 24/7;
  - `Netlify` serves the Mini App and same-origin snapshot for fast list rendering;
  - `Turso` remains the system of record for doctors, clinics, promotions and verification metadata.
- Data refresh must be staged, not monolithic:
  1. `catalog-scrape` — collect source batches from aggregator and official sources;
  2. `catalog-ingest` — normalize and upsert into Turso;
  3. `clinic-site-backfill` — enrich clinics with official site URLs when aggregator clinic pages expose them;
  4. `doctor-clinic-verify` — confirm конкретный `doctor -> clinic` relation on the official clinic site and promote CTA targets to official URLs.
- Verification is clinic-scoped and source-priority aware:
  - aggregator data can create or refresh a relation;
  - only official clinic evidence can mark `verified_on_clinic_site = 1`;
  - aggregator refresh must never overwrite `official_profile_url` / `official_booking_url`.
- Mini App CTA order must remain deterministic:
  1. `official_booking_url`
  2. `official_profile_url`
  3. `site_url`
  4. aggregator URLs with explicit aggregator labels
- To keep the system online-only, heavy refresh jobs must run outside the user laptop:
  - preferred free path: `GitHub Actions` on a `public` repo;
  - fallback path: another cloud runner with cron support and persisted secrets;
  - local PC execution is allowed only for manual recovery, never as the main production refresh strategy.
- Operational split for future automation:
  - short interval jobs: read-only health checks and lightweight backfills;
  - long interval jobs: full scrape/re-ingest, because official clinic-site verification is slower and should be batched separately.

## 2026-03-22 — Review / Discovery Source Classification for Belarus
- Review and discovery sources must be split by semantic role instead of being mixed into one “rating”.
- Source classes:
  1. `doctor_review_source`
     - examples: `YDoc.by`, `103.by`, `doktora.by`
     - primary payload: `doctor identity`, `rating_avg`, `review_count`, `source_page_url`, `last_seen_at`
  2. `doctor_discovery_booking_source`
     - examples: `2doc.by`, `YDoc.by`
     - primary payload: `doctor identity`, `clinic relation`, `booking CTA`, `source_page_url`, optionally `rating/review_count`
  3. `clinic_reputation_source`
     - examples: `2GIS`, `Google Maps`, `Yandex Maps`
     - primary payload: `clinic identity`, `rating_avg`, `review_count`, `source_page_url`, `last_seen_at`
  4. `self_published_source`
     - official clinic websites with testimonials
     - may be shown as low-trust secondary content, never as a primary independent rating signal
- Product rule:
  - doctor reputation and clinic reputation must be shown separately in Mini App;
  - one merged “single truth” rating is not allowed unless the UI also exposes the source breakdown.
- Implementation rule:
  - `103.by` and `doktora.by` enter the first production rollout as doctor-review sources;
  - `2doc.by` enters the roadmap as a hybrid discovery/booking source with optional review fields when available.
- Field contract for upcoming parsers:
  - `doctor_id candidate fields`: full name, specialty, city, clinic mentions, source slug
  - `review summary fields`: `rating_avg`, `review_count`, `source_name`, `source_page_url`, `captured_at`
  - `booking/discovery fields`: `clinic_name`, `clinic_slug`, `booking_url`, `source_page_url`

## 2026-03-22 — Review Layer Rollout Order
- The first production rollout of multi-source doctor reviews should prioritize:
  1. `103.by`
  2. `doktora.by`
- Reason:
  - both have live-confirmed doctor detail pages and implementation-ready markers;
  - `103.by` provides stable `ratingValue` and `reviewCount`;
  - `doktora.by` provides stable `review_count` and clinic mention, but its current `average-rating` marker is unreliable and must not be treated as trusted until a better extraction path is confirmed.
- Read-model decision:
  - top-level doctor reputation in Worker/Mini App must use `latest-per-source` rows and aggregate them by source, not simply take the latest single `reviews_summary` row.
- UI decision:
  - detail-screen should expose source breakdown explicitly, because different sources may disagree and some sources may provide only `review_count` without a trustworthy `rating_avg`.

## 2026-03-22 — Review Sync Must Be Split By Source and Windowed
- `review-sync` cannot stay as one unbounded scheduled crawl.
- Root cause:
  - `103.by` exposes a very large doctor sitemap and full crawl does not fit into a user-friendly cloud run;
  - `doktora.by` requires respectful pacing (`crawl_delay_seconds=10`), so it must not share the same critical path with faster sources.
- Operational decision:
  - keep `.github/workflows/review-sync.yml` only as a manual bounded smoke workflow;
  - move scheduled production execution into:
    - `review-sync-103.yml`
    - `review-sync-doktora.yml`
- `103.by` strategy:
  - process the sitemap in rotating windows using `BY103_URL_OFFSET` + `BY103_URL_LIMIT`;
  - one scheduled run handles one chunk, not the whole inventory.
- `doktora.by` strategy:
  - process rotating page windows using `DOKTORA_PAGE_OFFSET` + `DOKTORA_PAGE_LIMIT`;
  - keep `crawl_delay_seconds=10`, but bound each run by page window and max doctors.
- Resulting rule:
  - progress must accumulate over many bounded runs;
  - no single review-source is allowed to monopolize the whole review pipeline window again.

## 2026-03-22 — Mini App Snapshot Freshness Needs A Separate Delivery Path
- Same-origin snapshot is still the best fast path for Telegram WebView rendering.
- But snapshot freshness must not depend on manual local redeploys.
- Delivery decision:
  - use a dedicated Netlify build hook URL stored as `NETLIFY_BUILD_HOOK_URL` in GitHub secrets;
  - do not grant GitHub Actions a broad Netlify personal token if a build hook is enough.
- Workflow decision:
  - `promo-sync`, `review-sync-*`, and `doctor-catalog-sync` may trigger the build hook after successful verify-steps;
  - this is acceptable even if some builds are redundant, because the security surface is still narrower than a full Netlify auth token.
- Remaining caveat:
  - public `catalog.json` can still lag until those updated workflows complete at least once on the new configuration.

## 2026-03-23 — Netlify Build Hook Is Insufficient For The Current Mini App Site
- End-to-end verification showed:
  - GitHub Actions can reach the build hook and gets `HTTP 200`;
  - the Netlify site `medsearch-minsk-miniapp` does not create a new deploy afterwards.
- Root cause:
  - the current site is effectively a manual deploy target with empty `build_id` / `build_settings`;
  - build hooks are therefore not enough to refresh production.
- New operational decision:
  - data workflows must build `apps/miniapp` directly and run `npx netlify deploy --prod --dir apps/miniapp/out`;
  - GitHub secrets must include:
    - `NETLIFY_AUTH_TOKEN`
    - `NETLIFY_SITE_ID`
- Security rule:
  - the token is allowed only in GitHub Actions secrets;
  - it must never be echoed, persisted to artifacts, or written into repo files.
