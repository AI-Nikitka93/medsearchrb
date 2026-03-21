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
