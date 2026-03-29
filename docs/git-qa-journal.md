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
