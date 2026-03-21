# MedsearchRB

Telegram Mini App + бот + Worker API для агрегатора врачей Минска.

Создано Nikita (`AI_Nikitka93`).

## License and Usage

This repository is published under a proprietary `All Rights Reserved` license.

- Viewing the source on GitHub is allowed.
- Production use, copying, redistribution, relicensing, and derivative commercial use are not allowed without explicit written permission from Nikita (`AI_Nikitka93`).
- Secrets are intentionally excluded from the repository. Public source publication does not include `.env`, cloud tokens, bot tokens, or database credentials.

## Состав проекта

- `apps/miniapp` — Telegram Mini App на Next.js
- `apps/telegram_bot` — Telegram bot runtime и контракты
- `apps/worker` — Cloudflare Worker API + webhook runtime
- `apps/scrapers` — scrapers для каталогов врачей и клиник
- `db` — SQL schema и Turso migration runner

## Production URLs

- Mini App: `https://medsearch-minsk-miniapp.netlify.app`
- Worker API: `https://medsearchrb-api.aiomdurman.workers.dev`

## Cloud Sync

Workflow `.github/workflows/scraper.yml` подготовлен для cloud-only каталожного цикла:

1. запуск scrapers в GitHub Actions
2. сохранение batch-файла
3. chunked backfill в Turso через `apps/worker/scripts/backfill-from-batch.ts`

## Required GitHub Secrets

- `TURSO_DATABASE_URL`
- `TURSO_AUTH_TOKEN`
- `INGEST_SHARED_SECRET`

## Local Commands

- `run.bat` — локальный запуск бота
- `run_scraper.bat` — локальный запуск scraper batch
- `apps\\miniapp\\run.bat` — локальный запуск Mini App
- `apps\\worker\\deploy_worker.bat` — деплой Worker
