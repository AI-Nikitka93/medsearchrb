## 2026-03-21 04:05 — Deep Research
**Запросы:** исследование рынка агрегаторов врачей Беларуси, review-платформ, Telegram-каналов и legal/robots рисков  
**Темы:** конкуренты, UX-паттерны, популярность сервисов, Telegram distribution, reuse отзывов, ограничения парсинга  
**Результат:** подтверждены ключевые игроки `103.by`, `talon.by`, `2doc.by`, `YDoc`; выбран стратегический вектор для узкого MVP: `Минск + частные клиники + high-intent специальности + Telegram loop`  
**Актуальность:** данные проверены на `2026-03-21`

## 2026-03-21 04:25 — Private Clinics Booking Research
**Запросы:** официальные сайты крупных частных медцентров Минска и их механика записи  
**Темы:** собственная онлайн-запись, личный кабинет, мобильные приложения, call-center, мессенджеры, предварительная заявка vs self-serve booking  
**Результат:** `ЛОДЭ` — самый digital-зрелый; `Нордин` и `Кравира` используют web-заявку с подтверждением администратором; `МедАрт` — собственный online widget; `Sante` — собственный booking CTA, но глубина сценария без интерактивной проверки не подтверждена  
**Актуальность:** данные проверены на `2026-03-21`

## 2026-03-21 04:32 — Scope Decision
**Решение:** MVP ограничиваем `только Минском`, но не режем каталог по специальностям  
**Почему:** география — главный ограничитель по парсингу и качеству данных; полный перечень специальностей в одном городе сохраняет ценность агрегатора  
**Следствие:** next scope = `Минск + все специальности + приоритет частных клиник и public source pages`  
**Риск:** ширина по специальностям увеличивает нормализацию справочника и дедупликацию врачей, даже при одной географии  

## 2026-03-21 12:19 — Legal Basis Draft
**Запросы:** белорусская правовая база для агрегатора врачей, статус ранее распространенных персональных данных, сроки ответа субъектам, режим opt-out для врача и takedown для клиники  
**Темы:** Закон РБ № 99-З, оператор ПД, субъект ПД, публичные данные врачей, история поиска пользователей, обработка обращений, suppression-механика в БД  
**Результат:** созданы `TERMS_OF_SERVICE.md`, `PRIVACY_POLICY.md`, `OPT_OUT_PROCEDURE.md`, `COMPLIANCE_GAPS.md`; зафиксированы жесткие disclaimers, правовой режим для врача vs клиники и обязательное требование к архитектуре: `is_hidden` / `opt_out`  
**Актуальность:** данные проверены на `2026-03-21`

## 2026-03-21 12:20 — Architecture Draft
**Запросы:** сравнение `Turso vs Supabase` и `Cloudflare Workers vs Vercel`, free-tier лимиты, коммерческие ограничения, runtime constraints, схема БД и ingest/outbox паттерны  
**Темы:** zero-cost стек, modular monolith, Turso quotas, Cloudflare Workers limits, Vercel Hobby restrictions, Supabase inactivity pause, core schema, upsert, suppression, channel notifications  
**Результат:** создан `ARCHITECTURE.md`; выбран стек `Cloudflare Workers + Turso + GitHub Actions`; зафиксированы core entities, обязательные support tables, ingest upsert flow, outbox pattern и Architecture Spec Card  
**Актуальность:** данные проверены на `2026-03-21`

## 2026-03-21 12:56 — Scraper Runtime Slice
**Запросы:** разведка `robots.txt`, SSR/XHR-поведения и package versions для scraper stack; живая проверка `MedArt` и `YDoc`  
**Темы:** stealth transport, parsing strategy, review summary-only policy, batch output, GitHub Actions scheduling, Windows-first запуск  
**Результат:** добавлен runnable scraper slice на `Python + curl_cffi + BeautifulSoup` с модулями `apps/scrapers`, адаптерами `MedArt` и `YDoc`, batch-оркестратором, `run.bat`, `install.bat`, `smoke_test.py`, `scraper.yml`, `docs/DECISIONS.md`, `docs/api_map.md`; smoke test подтвержден на `2026-03-21` с выводом batch в `%LOCALAPPDATA%\\MedsearchRB\\scraper\\batches\\latest-source-batch.json`  
**Актуальность:** данные и код проверены на `2026-03-21`

## 2026-03-21 13:12 — Telegram Bot Core
**Запросы:** проверка `aiogram 3.x`, текущего `Telegram Bot API`, поддержки `InlineKeyboardButton.style`, а также локальная валидация bot-shell без реального токена  
**Темы:** polling dev shell, modular bot architecture, inline web app CTA, anti-flood middleware, .env handling, Windows one-click scripts  
**Результат:** добавлен модуль `apps/telegram_bot` с командами `/start`, `/help`, `/about`, `/privacy`, inline web app кнопкой, anti-flood middleware, global error handler, `.env.example`, validator и `smoke_test_bot.py`; корневой `run.bat` теперь запускает бота по умолчанию и scraper по аргументу `scraper`; terminal validation выполнена через `python smoke_test_bot.py` и `run.bat` без `.env` (ожидаемый BLOCKED path)  
**Актуальность:** данные и код проверены на `2026-03-21`

## 2026-03-21 13:19 — Mini App Design System
**Роль:** Design System Architect  
**Сделано:** подготовлены `design-system.md`, Stitch-compatible `DESIGN.md` и governance-документы для Telegram Mini App; зафиксированы Telegram-native токены, 3 core экрана, signature elements, motion и implementation handoff  
**Изменены файлы:** `design-system.md`, `DESIGN.md`, `docs/design/brand_rules.md`, `docs/design/component_usage_rules.md`, `docs/design/token_change_policy.md`, `docs/design/deprecation_rules.md`, `docs/design/brand_drift_checklist.md`, `docs/design/implementation_review_points.md`, `docs/design/motion-tokens.md`, `docs/RESEARCH_LOG.md`, `docs/PROJECT_HISTORY.md`  
**Следующий шаг:** перейти к React/Next.js foundation layer и перенести semantic tokens `--ds-*` в frontend

## 2026-03-21 16:44 — Mini App Frontend Foundation
**Роль:** Frontend Architect  
**Сделано:** создан `apps/miniapp` на `Next.js App Router + TypeScript + Tailwind`; подключены Telegram theme tokens, Telegram SDK init, UI kit (`Button`, `HaloRating`, `PromoBadge`, `SearchInput`, `DoctorCard`), 3 экрана через `useState`, а также `install.bat` и `run.bat`; выполнены `npm run build`, `npm run lint` и smoke-run dev server  
**Изменены файлы:** `apps/miniapp/**`, `docs/RESEARCH_LOG.md`, `docs/PROJECT_HISTORY.md`  
**Следующий шаг:** подключить реальные данные врачей/клиник и заменить mock navigation на state + payload-driven screen model

## 2026-03-21 17:02 — Telegram Bot Channel Wiring
**Роль:** Telegram Bot Integrator  
**Сделано:** добавлен fallback на `.env.txt`, подключены `TELEGRAM_CHANNEL_ID` и `TELEGRAM_CHANNEL_USERNAME`, ссылка на канал встроена в клавиатуры и тексты бота, обновлен `.env.example`, создан `docs/STATE.md`; smoke-test контракта бота проходит, но runtime заблокирован из-за невалидного `WEBAPP_URL`  
**Изменены файлы:** `apps/telegram_bot/config.py`, `apps/telegram_bot/keyboards/main.py`, `apps/telegram_bot/services/copy.py`, `apps/telegram_bot/validator.py`, `smoke_test_bot.py`, `.env.example`, `docs/STATE.md`, `docs/PROJECT_HISTORY.md`  
**Следующий шаг:** исправить `WEBAPP_URL` на публичный `https://` адрес и запустить `run.bat` для живой проверки в Telegram

## 2026-03-21 17:07 — Mini App Deploy + Bot URL Wiring
**Роль:** Cloudflare Pages + Telegram Integration  
**Сделано:** mini app переведен в static export для Pages, установлен локальный `wrangler`, создан Pages project `medsearch-minsk-miniapp`, выполнен deploy, добавлена публичная страница `/privacy`, `WEBAPP_URL` и `PRIVACY_URL` записаны в `.env.txt`, `run.bat` научен принимать `.env.txt`, нормализованы форматы `TELEGRAM_CHANNEL_USERNAME` (`@`, `t.me`, `https://t.me`)  
**Изменены файлы:** `apps/miniapp/next.config.ts`, `apps/miniapp/app/privacy/page.tsx`, `apps/miniapp/package.json`, `.env.txt`, `.gitignore`, `run.bat`, `apps/telegram_bot/config.py`, `docs/STATE.md`, `docs/PROJECT_HISTORY.md`  
**Следующий шаг:** открыть бота в Telegram и проверить `/start`, кнопку Mini App и переход на канал с живым пользователем

## 2026-03-21 17:12 — Telegram Bot API Auto-Configuration
**Роль:** Telegram Bot Runtime Integrator  
**Сделано:** через Bot API настроены команды `/start`, `/help`, `/about`, `/privacy`, выставлены `description` и `short description`, а также `Menu Button` типа `web_app` с production URL mini app; подтверждено, что polling-бот не падает сразу при старте, а remaining step по `Main Mini App` требует ручного действия владельца в `@BotFather`  
**Изменены файлы:** `docs/STATE.md`, `docs/PROJECT_HISTORY.md`  
**Следующий шаг:** вручную включить `Main Mini App` в `@BotFather` и проверить открытие из профиля бота

## 2026-03-21 17:18 — Mini App Hosting Clarification
**Роль:** Telegram Mini App Research  
**Сделано:** проверено по официальным источникам, что Telegram Mini App можно делать без собственного бэкенда, но нельзя без публичного URL; зафиксирована разница между `Menu Button`, `Main Mini App` и `sendData`-сценарием  
**Изменены файлы:** `docs/RESEARCH_LOG.md`, `docs/PROJECT_HISTORY.md`  
**Следующий шаг:** при выборе UX-path решить, оставляем ли Mini App на Pages или переходим к pure bot flow без web layer

## 2026-03-21 17:26 — Netlify Token File Prepared
**Роль:** Deployment Setup  
**Сделано:** создан локальный файл для Netlify token в папке mini app; файл находится под `apps/miniapp/.gitignore` и не должен попадать в репозиторий  
**Изменены файлы:** `apps/miniapp/.env.netlify`, `docs/PROJECT_HISTORY.md`  
**Следующий шаг:** заполнить `NETLIFY_AUTH_TOKEN` и продолжить деплой mini app в Netlify

## 2026-03-21 17:31 — Netlify Production Deploy
**Роль:** Netlify Deployer  
**Сделано:** установлен `netlify-cli`, через Netlify API получен `account slug`, создан site `medsearch-minsk-miniapp`, выполнен production deploy директории `out`, получен публичный URL `https://medsearch-minsk-miniapp.netlify.app`, после чего `WEBAPP_URL` и `PRIVACY_URL` обновлены в `.env.txt`, а `Menu Button` бота перепривязан на новый URL  
**Изменены файлы:** `apps/miniapp/package.json`, `apps/miniapp/package-lock.json`, `apps/miniapp/.gitignore`, `apps/miniapp/.netlify/**`, `.env.txt`, `docs/PROJECT_HISTORY.md`  
**Следующий шаг:** проверить открытие Mini App из Telegram на реальном устройстве и при необходимости вручную обновить `Main Mini App` в `@BotFather`

## 2026-03-21 17:40 — Data Foundation Research Prep
**Роль:** Database Architect & Data Systems Engineer  
**Сделано:** прочитан `RESEARCH_LOG.md`, подтверждена свежесть архитектурных и legal-решений, собран локальный контекст по `ARCHITECTURE.md` и текущей структуре `apps/`; для текущего шага нужен только delta-research по `Turso/libSQL`, Cloudflare Worker bindings и ingest/read API implementation path  
**Изменены файлы:** `docs/PROJECT_HISTORY.md`  
**Следующий шаг:** выдать пакет deep-research запросов по Turso setup, libSQL driver/runtime и Cloudflare Worker API integration перед реализацией миграций и ingest layer

## 2026-03-21 18:01 — Turso Backend Foundation Slice
**Роль:** Database Architect & Data Systems Engineer  
**Сделано:** добавлен backend slice `apps/worker` на `Hono + @libsql/client`, реализованы SQL-миграция `db/migrations/0001_init.sql`, Windows-first runner `db/run.bat`, ingest endpoint `POST /internal/ingest/source-batch`, read endpoints `GET /api/v1/doctors`, `GET /api/v1/doctors/:id`, `GET /api/v1/promotions`, dedupe/upsert через `clinic_sources`, `doctor_sources`, `doctor_clinics`, `reviews_summary.scope_key`, `promotions.fingerprint_hash`; локально подтверждены `npm install`, `npm run build` и `wrangler deploy --dry-run`  
**Изменены файлы:** `apps/worker/**`, `db/migrations/0001_init.sql`, `db/run.bat`, `.env.example`, `docs/RESEARCH_LOG.md`, `docs/PROJECT_HISTORY.md`  
**Следующий шаг:** добавить `TURSO_DATABASE_URL`, `TURSO_AUTH_TOKEN`, `INGEST_SHARED_SECRET` в корневой `.env`/`.env.txt`, затем запустить `db\\run.bat` и протестировать ingest against live Turso

## 2026-03-21 18:20 — Turso Database Provisioning
**Роль:** Database Architect & Data Systems Engineer  
**Сделано:** через Turso Platform API создана group `medsearch-primary` в `aws-eu-west-1`, создана база `medsearchrb`, сгенерирован database token, нормализован корневой `.env.txt`, успешно выполнен `db\\run.bat`, а затем отдельным live-запросом подтверждено наличие ключевых таблиц `doctors`, `clinics`, `promotions`, `doctor_sources`, `clinic_sources`, `doctor_clinics`, `reviews_summary`, `scrape_runs`  
**Изменены файлы:** `.env.txt`, `docs/PROJECT_HISTORY.md`, `docs/STATE.md`  
**Следующий шаг:** развернуть Worker с live bindings и прогнать первый ingest batch против `POST /internal/ingest/source-batch`

## 2026-03-21 19:08 — Mini App Foundation Refresh
**Роль:** Windows Engineering Assistant  
**Сделано:** сверены `apps/miniapp`, `design-system.md` и прототипы из `Desing`; контракт кнопки приведен к `PrimaryButton` со `style="primary"`, сохранен Telegram-native token layer, усилены home/detail экраны, добавлена видимая авторская атрибуция, `install.bat` и `run.bat` получили preflight для Node.js и автоустановку зависимостей при отсутствии `node_modules`; локально подтверждены `eslint`, `tsc --noEmit`, `next build`, HTTP smoke через `run.bat`, затем production-сборка повторно задеплоена на Netlify по URL `https://medsearch-minsk-miniapp.netlify.app`  
**Изменены файлы:** `apps/miniapp/app/layout.tsx`, `apps/miniapp/app/page.tsx`, `apps/miniapp/components/ui/button.tsx`, `apps/miniapp/components/ui/search-input.tsx`, `apps/miniapp/install.bat`, `apps/miniapp/run.bat`, `docs/PROJECT_HISTORY.md`, `docs/STATE.md`  
**Следующий шаг:** подключить `apps/miniapp` к live read API Worker-а и заменить моковые данные на запросы `GET /api/v1/doctors` и `GET /api/v1/promotions`

## 2026-03-21 19:12 — Mini App Runtime Hardening
**Роль:** Windows Engineering Assistant  
**Сделано:** добавлена безопасная обработка ошибок в `TelegramInit`, повторно подтверждены `npm run lint` и `npm run build`, затем production mini app еще раз задеплоен на Netlify; публичный URL `https://medsearch-minsk-miniapp.netlify.app` ответил `HTTP 200`, а HTML содержит строку `Создано @AI_Nikitka93`, что подтверждает свежий деплой  
**Изменены файлы:** `apps/miniapp/components/telegram-init.tsx`, `docs/PROJECT_HISTORY.md`  
**Следующий шаг:** перейти от моковых экранов к интеграции с Worker API и проверить Mini App уже на живых данных каталога

## 2026-03-21 19:15 — Mini App Bootstrap Verification
**Роль:** Windows Engineering Assistant  
**Сделано:** `install.bat` и `run.bat` усилены автоустановкой `Node.js LTS` через `winget` при отсутствии runtime; затем реально выполнен `cmd /c install.bat`, который подтвердил, что зависимости актуальны, и повторно выполнен HTTP smoke через `run.bat` с ответом `HTTP 200` и заголовком `Medsearch Mini App`  
**Изменены файлы:** `apps/miniapp/install.bat`, `apps/miniapp/run.bat`, `docs/PROJECT_HISTORY.md`  
**Следующий шаг:** связать экранные состояния `home/list/detail` с live Worker API и добавить загрузочные/ошибочные состояния поверх реальных запросов

## 2026-03-21 19:48 — Worker + Mini App Live Integration
**Роль:** Windows Engineering Assistant  
**Сделано:** worker доведен до live integration path: добавлены CORS allowlist, расширены SQL-фильтры и read-contract, создан `deploy_worker.bat`, worker успешно задеплоен на `https://medsearchrb-api.aiomdurman.workers.dev`, ingest endpoint реально принял batch через `POST /internal/ingest/source-batch`, а read endpoints вернули live данные из Turso; Mini App переведен с моков на реальные fetch-запросы через общий `CatalogApp`, добавлены `loading/error/empty` состояния, создан route `app/list/page.tsx`, production mini app повторно задеплоен на Netlify и подтвержден `HTTP 200`  
**Изменены файлы:** `apps/worker/src/index.ts`, `apps/worker/src/env.ts`, `apps/worker/src/routes/api.ts`, `apps/worker/src/repositories/doctors-read-repository.ts`, `apps/worker/src/repositories/promotions-read-repository.ts`, `apps/worker/src/repositories/catalog-write-repository.ts`, `apps/worker/src/services/doctors-service.ts`, `apps/worker/src/services/promotions-service.ts`, `apps/worker/src/services/ingest-service.ts`, `apps/worker/src/lib/db.ts`, `apps/worker/wrangler.jsonc`, `apps/worker/.dev.vars.example`, `apps/worker/deploy_worker.bat`, `apps/miniapp/lib/api.ts`, `apps/miniapp/components/catalog-app.tsx`, `apps/miniapp/components/ui/doctor-card.tsx`, `apps/miniapp/components/ui/halo-rating.tsx`, `apps/miniapp/app/page.tsx`, `apps/miniapp/app/list/page.tsx`, `docs/RESEARCH_LOG.md`, `docs/PROJECT_HISTORY.md`  
**Следующий шаг:** проверить визуально Mini App в Telegram WebView и затем заменить локальный debug ingest на scheduled scraper delivery в CI

## 2026-03-21 20:02 — Bot Runtime Diagnosis
**Роль:** Windows Engineering Assistant  
**Сделано:** воспроизведена текущая работа Telegram-бота без изменений в коде: `python -m apps.telegram_bot.bot` не падает сразу и уходит в polling, `smoke_test_bot.py` проходит, `getMe`, `getWebhookInfo` и `getChatMenuButton` через Telegram Bot API отвечают успешно; подтверждено, что webhook не настроен, а текущий бот существует только как локальный polling-процесс, то есть перестает отвечать после остановки терминала  
**Изменены файлы:** без изменений  
**Следующий шаг:** если нужен 24/7 бот, развернуть его как постоянный runtime (например, webhook на Worker) вместо локального polling

## 2026-03-21 20:18 — Bot 24/7 Worker Webhook Runtime
**Роль:** Windows Engineering Assistant  
**Сделано:** бот переведен на always-on runtime через Cloudflare Worker webhook: добавлены `telegram/webhook` и `telegram/health` routes, worker получил bot secrets и webhook secret, `deploy_worker.bat` переписан на PowerShell-backed deploy + Telegram sync, после чего реально подтверждены `wrangler deploy`, `setWebhook`, `setMyCommands`, `setChatMenuButton`, `setMyDescription`, `setMyShortDescription`, live `getWebhookInfo` и тестовый POST в `telegram/webhook` c ответом `200`; локальный Python polling больше не нужен для production 24/7 работы  
**Изменены файлы:** `apps/worker/src/index.ts`, `apps/worker/src/env.ts`, `apps/worker/src/routes/telegram.ts`, `apps/worker/src/services/telegram-bot-service.ts`, `apps/worker/deploy_worker.bat`, `apps/worker/deploy_worker.ps1`, `docs/PROJECT_HISTORY.md`, `docs/RESEARCH_LOG.md`, `docs/STATE.md`  
**Следующий шаг:** открыть бота в Telegram и подтвердить пользовательский сценарий `/start -> Mini App` уже через webhook runtime, затем при необходимости подключить scheduled ingest

## 2026-03-21 20:24 — Doctor Coverage Diagnosis
**Роль:** Windows Engineering Assistant  
**Сделано:** подтверждена точная причина, почему в Mini App не видны "все врачи": live API отдает `total=10`, Turso содержит ровно `10` врачей, `0 hidden`, `0 opt_out`, а последний scraper batch тоже содержит только `5` врачей из `medart` и `5` из `ydoc`; ограничение заложено в `config.yaml` через `runtime.max_doctors_per_source: 5`, а `ydoc` дополнительно берет карточки только с текущей list page без пагинации  
**Изменены файлы:** `docs/PROJECT_HISTORY.md`  
**Следующий шаг:** снять лимит `max_doctors_per_source`, добавить пагинацию/полный обход источников и заново прогнать scraper + ingest, чтобы заполнить Turso полным каталогом

## 2026-03-21 23:01 — Full Catalog Backfill In Progress
**Роль:** Windows Engineering Assistant  
**Сделано:** снят лимит `max_doctors_per_source`, `ydoc` переведен на обход specialty pages с `?page=N`, добавлен admin-скрипт `apps/worker/scripts/backfill-from-batch.ts` и npm-команда `catalog:backfill` для chunked ingest напрямую в Turso; подтверждено, что свежий batch содержит `2169` врачей (`22` из `medart`, `2147` из `ydoc`), а live API уже вырос до `1516` врачей во время фонового backfill-процесса  
**Изменены файлы:** `config.yaml`, `apps/scrapers/scrapers/base.py`, `apps/scrapers/scrapers/medart.py`, `apps/scrapers/scrapers/ydoc.py`, `apps/worker/package.json`, `apps/worker/scripts/backfill-from-batch.ts`, `docs/PROJECT_HISTORY.md`, `docs/STATE.md`  
**Следующий шаг:** дождаться завершения фонового `catalog:backfill`, затем перепроверить live `GET /api/v1/doctors` и убедиться, что каталог в Mini App отражает полный batch

## 2026-03-21 23:23 — Full Catalog Imported + Cloud Sync Prepared
**Роль:** Windows Engineering Assistant  
**Сделано:** подтверждено завершение локального full backfill без зависшего процесса; live API и Turso теперь содержат `2162` видимых врачей при `2169` source records, что означает нормальный deduplication, а не потерю карточек; workflow `.github/workflows/scraper.yml` переведен из режима artifact-only в реальный cloud pipeline `catalog-sync`: теперь он снимает лимит врачей, ставит Node + Python зависимости и запускает `apps/worker/scripts/backfill-from-batch.ts` для прямой загрузки в Turso без участия ПК  
**Изменены файлы:** `.github/workflows/scraper.yml`, `apps/worker/scripts/backfill-from-batch.ts`, `docs/PROJECT_HISTORY.md`, `docs/STATE.md`  
**Следующий шаг:** опубликовать обновленный workflow в реальный GitHub-репозиторий с Actions secrets, чтобы будущие обновления каталога тоже шли полностью без ПК

## 2026-03-21 23:27 — GitHub Repo Published + Billing Blocker Confirmed
**Роль:** Windows Engineering Assistant  
**Сделано:** инициализирован git-репозиторий, создан private repo `AI-Nikitka93/medsearchrb`, запушен production state, записаны Actions secrets `TURSO_DATABASE_URL`, `TURSO_AUTH_TOKEN`, `INGEST_SHARED_SECRET`, вручную запущен workflow `catalog-sync`; реальный run `23388104740` не стартовал job из-за GitHub billing blocker для private repo (`recent account payments have failed or your spending limit needs to be increased`)  
**Изменены файлы:** `.gitignore`, `README.md`, `docs/PROJECT_HISTORY.md`, `docs/RESEARCH_LOG.md`, `docs/STATE.md`  
**Следующий шаг:** либо исправить billing для private GitHub Actions, либо перевести репозиторий в `public`, чтобы cloud-only sync работал бесплатно без участия ПК

## 2026-03-21 23:55 — Mini App Production Recovery via Snapshot Fallback
**Роль:** Windows Engineering Assistant  
**Сделано:** подтверждено, что live Turso и read-repository отвечают быстро, а пользовательский сбой вызван медленным доступом к `workers.dev`; добавлен same-origin snapshot pipeline: `apps/miniapp/scripts/generate-catalog-snapshot.mjs` собирает каталог из Turso в `apps/miniapp/public/data/catalog.json`, `apps/miniapp/lib/api.ts` переведен на snapshot-first чтение в production с fallback на Worker, а `db/migrations/0002_read_perf.sql` добавляет read-индексы для doctor list/detail path; после пересборки и реального redeploy на Netlify подтвержден live `catalog.json` с `2162` врачами и headless Edge screenshot, на котором `/list` уже показывает карточки врачей вместо бесконечного loading  
**Изменены файлы:** `apps/miniapp/package.json`, `apps/miniapp/package-lock.json`, `apps/miniapp/scripts/generate-catalog-snapshot.mjs`, `apps/miniapp/public/data/catalog.json`, `apps/miniapp/lib/api.ts`, `apps/miniapp/components/catalog-app.tsx`, `apps/miniapp/components/ui/doctor-card.tsx`, `apps/worker/src/repositories/doctors-read-repository.ts`, `db/migrations/0002_read_perf.sql`, `docs/PROJECT_HISTORY.md`, `docs/STATE.md`  
**Следующий шаг:** проверить Mini App в реальном Telegram WebView и при следующем cloud sync включить регенерацию snapshot перед очередным Netlify deploy

## 2026-03-22 00:13 — Specialty Switcher UX Fix
**Роль:** Windows Engineering Assistant  
**Сделано:** переключение специальностей в Telegram WebView переведено с неудобного горизонтального скролла на двухколоночную сетку с явным текущим состоянием; `PrimaryButton` получил безопасный `truncate`, production Mini App пересобран и заново задеплоен на Netlify, а headless Edge screenshot подтвердил, что `/list` показывает удобный 2x2 selector без обрезанного активного фильтра  
**Изменены файлы:** `apps/miniapp/components/catalog-app.tsx`, `apps/miniapp/components/ui/button.tsx`, `apps/miniapp/eslint.config.mjs`, `apps/miniapp/public/data/catalog.json`, `docs/PROJECT_HISTORY.md`  
**Следующий шаг:** проверить новый selector в реальном Telegram Mini App и при необходимости сделать следующий шаг — sticky compact filter bar при скролле списка

## 2026-03-22 00:22 — Mini App Menu UX Research
**Роль:** Product UX Research  
**Сделано:** выполнен внешний ресерч по Telegram Mini Apps и конкурентам (`YDoc`, `Talon.by`, `Zocdoc`, `Practo`, `103.by`) для построения карты улучшений меню; подтверждено, что текущее меню перегружено равноправными блоками и не имеет ясной иерархии, тогда как сильные паттерны у конкурентов строятся вокруг search-first entry, крупных service modes и secondary specialty navigation  
**Изменены файлы:** `docs/RESEARCH_LOG.md`, `docs/PROJECT_HISTORY.md`  
**Следующий шаг:** на основе этой карты спроектировать новый IA/menu layout для home и list экранов Mini App, а затем внедрить его в `apps/miniapp`

## 2026-03-22 00:36 — Mini App Menu IA Overhaul
**Роль:** Windows Engineering Assistant  
**Сделано:** переработано меню Mini App на основе UX-карты: home screen переведен на action-first иерархию (`короткий hero -> search -> quick actions -> popular specialties -> promos`), список врачей получил compact filter bar вместо громоздкого selector-а, а полный выбор специальностей вынесен в bottom sheet с поиском; добавлен `fetchCatalogOverview()` на основе production snapshot, production mini app пересобран и заново задеплоен на Netlify, HTTP 200 и headless screenshot-файлы подтверждают новый UI на `/` и `/list`  
**Изменены файлы:** `apps/miniapp/components/catalog-app.tsx`, `apps/miniapp/components/ui/search-input.tsx`, `apps/miniapp/lib/api.ts`, `apps/miniapp/public/data/catalog.json`, `docs/PROJECT_HISTORY.md`  
**Следующий шаг:** получить свежий скрин именно из Telegram WebView и при необходимости донастроить micro-spacing, copy и sticky behavior под реальный Telegram viewport

## 2026-03-22 00:44 — Mini App Menu Density Polish
**Роль:** Windows Engineering Assistant  
**Сделано:** на основе живых Telegram-скринов выполнен второй UX-pass: hero сокращен и переписан короче, search input уплотнен за счет icon submit button, быстрые сценарии переведены из двух узких колонок в одноколоночный compact list, а explanatory copy на home/list сокращен до более коротких строк; production mini app заново пересобран и задеплоен на Netlify, а headless browser снова подтвердил живой рендер обновленных `/` и `/list`  
**Изменены файлы:** `apps/miniapp/components/catalog-app.tsx`, `apps/miniapp/components/ui/search-input.tsx`, `apps/miniapp/public/data/catalog.json`, `docs/PROJECT_HISTORY.md`  
**Следующий шаг:** получить новый Telegram screenshot после этого уплотнения и решить, нужен ли еще один проход по hero/stat block и specialty cards

## 2026-03-22 00:50 — Mini App List Bugfix + Compact Polish
**Роль:** Windows Engineering Assistant  
**Сделано:** по новому Telegram-скрину устранен UX-баг list screen, при котором skeleton показывался вместе с уже загруженными карточками; loading-state теперь разделен на `initial loading` и `background refresh`, hero statistics на home переведены в компактные inline chips, specialty tiles уменьшены, а filter block на list сокращен до более легкого header + chip row; production mini app пересобран и заново задеплоен на Netlify  
**Изменены файлы:** `apps/miniapp/components/catalog-app.tsx`, `apps/miniapp/public/data/catalog.json`, `docs/PROJECT_HISTORY.md`  
**Следующий шаг:** получить свежий Telegram screenshot после deploy `69bf12301e80d0f84cc24468` и решить, нужен ли еще один проход по doctor card density

## 2026-03-22 01:00 — Detail Screen Link Semantics Fix
**Роль:** Windows Engineering Assistant  
**Сделано:** исправлена семантика переходов на detail screen: убрана единая misleading CTA `Записаться на сайте клиники`, которая могла вести на профиль врача в `YDoc`; вместо нее каждая клиника теперь получает собственные честные действия (`Запись через YDoc`, `Клиника на YDoc`, `Сайт клиники`, `Профиль врача`) с дедупликацией совпадающих URL, а header detail screen показывает количество клиник, если врач принимает в нескольких местах; production mini app пересобран и задеплоен на Netlify  
**Изменены файлы:** `apps/miniapp/components/catalog-app.tsx`, `apps/miniapp/public/data/catalog.json`, `docs/PROJECT_HISTORY.md`  
**Следующий шаг:** проверить detail screen врача с несколькими клиниками в Telegram Mini App и затем решить, нужно ли вытягивать прямые clinic booking URLs глубже на scraper level

## 2026-03-22 01:06 — Clinic Verification Architecture
**Роль:** Windows Engineering Assistant  
**Сделано:** зафиксирована архитектура clinic-level verification: `doctor -> clinic` связь больше не считается доверенной только по агрегатору; в `docs/DECISIONS.md` добавлено правило приоритета официальных сайтов/booking widgets и будущая модель verification metadata (`source_type`, `verification_status`, `verified_on_clinic_site`, `last_verified_at`, official URLs) для каждой doctor-clinic связи  
**Изменены файлы:** `docs/DECISIONS.md`, `docs/PROJECT_HISTORY.md`  
**Следующий шаг:** спроектировать конкретное расширение схемы Turso и ingest-flow для official clinic verification и внедрить его в scraper/API слой

## 2026-03-22 01:20 — Turso Migration for Clinic Verification
**Роль:** Database Architect & Data Systems Engineer  
**Сделано:** добавлена forward-only миграция `db/migrations/0003_clinic_verification.sql` для official clinic verification без ломающих rename/drop: расширены `clinics`, `clinic_sources`, `doctor_sources`, `doctor_clinics`, создана таблица `clinic_verification_runs` и индексы для verification-read paths; migration-runner переведен на `schema_migrations`, чтобы новые `ALTER TABLE` применялись один раз и не ломали повторные запуски `db\\run.bat`  
**Изменены файлы:** `db/migrations/0003_clinic_verification.sql`, `apps/worker/scripts/apply-migrations.mjs`, `docs/DECISIONS.md`, `docs/PROJECT_HISTORY.md`  
**Следующий шаг:** применить миграцию к Turso, проверить новые поля через `PRAGMA table_info`, затем обновить ingest/service слой под official/aggregator merge rules

## 2026-03-22 01:24 — Clinic Verification Migration Applied to Turso
**Роль:** Database Architect & Data Systems Engineer  
**Сделано:** миграция `0003_clinic_verification.sql` применена к live Turso; повторный запуск `db\\run.bat` подтвержден как безопасный и пропускает уже записанные миграции через `schema_migrations`; через `PRAGMA table_info` подтверждено появление новых verification-полей в `clinics`, `clinic_sources`, `doctor_sources`, `doctor_clinics` и новой таблицы `clinic_verification_runs`  
**Изменены файлы:** `docs/PROJECT_HISTORY.md`  
**Следующий шаг:** обновить `catalog-write-repository.ts` и `ingest-service.ts`, чтобы official clinic data усиливал relation, а aggregator data больше не затирал verified URLs

## 2026-03-22 01:36 — Verification-Aware Ingest and Read Path
**Роль:** Database Architect & Data Systems Engineer  
**Сделано:** `apps/worker/src/types/ingest.ts` расширен optional verification-полями и `clinic_links`, `catalog-write-repository.ts` переведен на verification-aware upsert для `clinics`, `clinic_sources`, `doctor_sources`, `doctor_clinics`, а `ingest-service.ts` теперь строит clinic-scoped relation meta и не дает агрегаторным данным затирать official URLs; `doctors-read-repository.ts` и `doctors-service.ts` начали отдавать preferred URLs и verification metadata в detail API; обновленный Worker задеплоен, а live API подтвержден на production URL  
**Изменены файлы:** `apps/worker/src/types/ingest.ts`, `apps/worker/src/repositories/catalog-write-repository.ts`, `apps/worker/src/services/ingest-service.ts`, `apps/worker/src/repositories/doctors-read-repository.ts`, `apps/worker/src/services/doctors-service.ts`, `docs/PROJECT_HISTORY.md`  
**Следующий шаг:** обновить парсеры/clinic verifier, чтобы они начали присылать official `clinic_links` и verification statuses, а затем включить эти статусы в Mini App UI

## 2026-03-22 01:42 — Scraper-Side Clinic Enrichment + Verifier Script
**Роль:** Database Architect & Data Systems Engineer  
**Сделано:** Python batch-модели расширены полями verification и `clinic_links`; `medart.py` теперь эмитит official clinic/doctor relations как `official_directory`, а `ydoc.py` научен: 1) ходить в doctor detail page, 2) разбирать `:lpu-address-list`, 3) строить рабочие `YDoc` clinic profile URLs, 4) для clinic page вытягивать официальный сайт через `<meta itemprop=\"url\">`; добавлен `apps/worker/scripts/verify-clinic-sites.ts` и npm script `verify:clinics` для backfill уже загруженных `YDoc` clinic pages в Turso; точечный прогон по `Конфиденс` обновил live `clinics.site_url` до `https://confidence.by/`, и это уже видно в production doctor detail API для Абушовой  
**Изменены файлы:** `apps/scrapers/models.py`, `apps/scrapers/scrapers/medart.py`, `apps/scrapers/scrapers/ydoc.py`, `apps/worker/scripts/verify-clinic-sites.ts`, `apps/worker/package.json`, `apps/worker/src/repositories/catalog-write-repository.ts`, `docs/RESEARCH_LOG.md`, `docs/PROJECT_HISTORY.md`  
**Следующий шаг:** прогнать `verify-clinic-sites.ts` массово по всем `YDoc` clinic pages с missing/generic `site_url`, затем добавить direct official clinic-site scrapers для подтверждения врача на стороне сайта клиники

## 2026-03-22 01:56 — Online Status Check + YDoc Verification Backfill
**Роль:** Windows Engineering Assistant  
**Сделано:** подтверждено, что production Worker и Netlify Mini App отвечают онлайн (`/health -> ok:true`, Mini App -> `HTTP 200`), остановлен зависший локальный `python`-scraper после прерванного ручного запуска, а массовый `YDoc` verifier успешно добрал хвост clinic cards: в live Turso подтверждено `402` `YDoc`-клиники, из которых `397` уже имеют не-агрегаторный `site_url`, а `5` остаются без official site или с битым `YDoc` clinic URL; отдельно зафиксировано, что GitHub repo по-прежнему `PRIVATE`, а cloud-only auto-refresh каталога все еще блокируется billing-ограничением private GitHub Actions  
**Изменены файлы:** `docs/PROJECT_HISTORY.md`  
**Следующий шаг:** получить явное разрешение на перевод `AI-Nikitka93/medsearchrb` в `public` или разблокировать private Actions billing, затем перенести scraper/enrichment refresh в cloud-only workflow без зависимости от локального ПК

## 2026-03-22 02:10 — Cloud-Only Verification Architecture
**Роль:** Database Architect & Data Systems Engineer  
**Сделано:** зафиксирована целевая online-only схема refresh-пайплайна: `catalog-scrape -> catalog-ingest -> clinic-site-backfill -> doctor-clinic-verify`, где Cloudflare Worker обслуживает 24/7 API и Telegram webhook, Netlify отдает Mini App/snapshot, Turso хранит verification metadata, а тяжелые scrape/verification jobs должны быть вынесены в cloud runner вместо локального ПК; отдельно зафиксирован приоритет CTA: `official_booking_url -> official_profile_url -> site_url -> aggregator URL`  
**Изменены файлы:** `docs/DECISIONS.md`, `docs/PROJECT_HISTORY.md`  
**Следующий шаг:** после разрешения на `public` repo или разблокировки private Actions billing перенести `catalog-scrape` и `doctor-clinic-verify` в GitHub Actions и подтвердить cloud-only refresh без локального запуска

## 2026-03-22 02:26 — Public Repo Switch + Cloud Sync Runner Started
**Роль:** Windows Engineering Assistant  
**Сделано:** репозиторий `AI-Nikitka93/medsearchrb` переведен из `PRIVATE` в `PUBLIC` после проверки git history и tracked files на отсутствие секретов; добавлены `LICENSE` (`All Rights Reserved`) и usage-ограничение в `README`; новый workflow run `catalog-sync #2` (`23390834435`) больше не блокируется billing и реально стартовал в GitHub Actions, где job `scrape` сейчас выполняет полный cloud scrape без участия локального ПК  
**Изменены файлы:** `LICENSE`, `README.md`, `docs/RESEARCH_LOG.md`, `docs/PROJECT_HISTORY.md`  
**Следующий шаг:** дождаться завершения `catalog-sync #2`, затем при необходимости разрезать pipeline на более короткие cloud jobs (`scrape`, `backfill`, `verify`) для снижения latency первой синхронизации

## 2026-03-22 02:42 — Promotion Channel Posting Pipeline
**Роль:** Windows Engineering Assistant  
**Сделано:** promotion pipeline расширен до online-posting в Telegram-канал: добавлены `NotificationOutboxRepository` и `PromotionChannelService`, Worker получил protected endpoint `/internal/notifications/promotions/flush` и cron trigger `*/20 * * * *`, `deploy_worker.ps1` начал синхронизировать `TELEGRAM_CHANNEL_ID`, а workflow `catalog-sync` теперь после backfill вызывает flush endpoint; live-тест подтвердил реальную отправку pending promo event (`claimed=1`, `sent=1`), после чего `notification_outbox` в Turso перешел в статус `sent`  
**Изменены файлы:** `.github/workflows/scraper.yml`, `apps/worker/deploy_worker.ps1`, `apps/worker/src/env.ts`, `apps/worker/src/index.ts`, `apps/worker/src/routes/internal.ts`, `apps/worker/src/services/telegram-bot-service.ts`, `apps/worker/src/services/promotion-channel-service.ts`, `apps/worker/src/repositories/notification-outbox-repository.ts`, `docs/PROJECT_HISTORY.md`  
**Следующий шаг:** закоммитить и запушить promotion-posting изменения, затем дождаться следующего cloud ingest/backfill и подтвердить, что новые акции публикуются в канал уже без ручного flush

## 2026-03-22 02:37 — Promotion Coverage Check: Lighthouse
**Роль:** Windows Engineering Assistant  
**Сделано:** проверена реальная акция `https://lighthouse.by/promotions/diagnostika-varikoza-po-vygodnoj-stoimosti/`; страница доступна (`HTTP 200`, заголовок совпадает), но ни в репозитории/parsers, ни в live Turso/Worker promotions она не найдена; live API `/api/v1/promotions` сейчас возвращает только `1` акцию из `MedArt`, что подтверждает отсутствие `Lighthouse` как promotion-source в текущем production-пайплайне  
**Изменены файлы:** `docs/PROJECT_HISTORY.md`  
**Следующий шаг:** добавить `Lighthouse` в promotion-source coverage и встроить его акции в cloud scrape/backfill pipeline

## 2026-03-22 02:53 — Lighthouse Promo Source Added and Published Live
**Роль:** Windows Engineering Assistant  
**Сделано:** добавлен новый promo-only scraper source `lighthouse`; архив `https://lighthouse.by/promotions/` теперь разбирается официальным scraper-ом, который отдает `1` clinic record `Маяк Здоровья` и `17` promotions, включая целевую акцию `Диагностика варикоза по выгодной стоимости`; источник зарегистрирован в `SCRAPER_REGISTRY`, включен в `config.yaml`, `selectors.yaml` и future cloud workflow; batch успешно прогнан через live Turso backfill (`inserted=18`, `errors=0`), после чего production Worker API начал отдавать `18` акций, а promotion outbox реально допубликовал новые акции в Telegram channel (`sent=10`, затем `sent=7`, затем очередь опустела)  
**Изменены файлы:** `.github/workflows/scraper.yml`, `apps/scrapers/scrapers/__init__.py`, `apps/scrapers/scrapers/lighthouse.py`, `config.yaml`, `selectors.yaml`, `docs/PROJECT_HISTORY.md`, `docs/RESEARCH_LOG.md`, `docs/STATE.md`  
**Следующий шаг:** закоммитить и запушить `Lighthouse` source в public repo, затем запустить новый `catalog-sync` cloud run и подтвердить, что future scrape/backfill/promo-posting идут полностью online без локального ПК

## 2026-03-22 03:02 — Direct Ingest Transport Fix
**Роль:** Windows Engineering Assistant  
**Сделано:** исправлен direct ingest path в `apps/scrapers/output.py`: `urllib` теперь отправляет `User-Agent`, из-за чего live Worker перестал отвечать `403` на `output_mode=ingest`; повторный production smoke-test `python -m apps.scrapers.main --sources lighthouse --output-mode ingest` завершился успешно и подтвердил прямой POST в `https://medsearchrb-api.aiomdurman.workers.dev/internal/ingest/source-batch` со статусом `200`  
**Изменены файлы:** `apps/scrapers/output.py`, `docs/PROJECT_HISTORY.md`  
**Следующий шаг:** закоммитить и запушить `Lighthouse` + direct-ingest fix, затем запустить cloud `catalog-sync`, чтобы следующий online refresh уже использовал новый источник и исправленный ingest transport

## 2026-03-22 03:14 — Multi-Clinic Promo Coverage Expansion
**Роль:** Windows Engineering Assistant  
**Сделано:** coverage расширен с одного official source до нескольких клиник: добавлены `Kravira` и `LODE` как новые promo sources, источник `lighthouse` сохранен; workflow `.github/workflows/scraper.yml` теперь готов запускать `kravira lighthouse lode medart ydoc`; локальный scrape подтвердил `Kravira=4` promo pages и `LODE=3` promo/news pages, затем direct ingest в live Worker прошел со статусом `200`; production promotions API вырос до `21` акций, а ручной flush outbox отправил новые записи в канал (`claimed=7`, `sent=3`, `skipped=4`)  
**Изменены файлы:** `.github/workflows/scraper.yml`, `apps/scrapers/scrapers/__init__.py`, `apps/scrapers/scrapers/kravira.py`, `apps/scrapers/scrapers/lode.py`, `config.yaml`, `selectors.yaml`, `docs/PROJECT_HISTORY.md`, `docs/RESEARCH_LOG.md`, `docs/STATE.md`  
**Следующий шаг:** запушить multi-clinic promo expansion и сформировать source inventory по оставшимся официальным promo/news pages медцентров Минска, чтобы coverage двигался от “несколько ключевых клиник” к действительно широкому catalog-wide охвату

## 2026-03-22 03:16 — Cloud Sync Relaunch on Latest Multi-Clinic Main
**Роль:** Windows Engineering Assistant  
**Сделано:** после push коммита `bfab24c` предыдущий cloud run `23391706996` был отменен, потому что стартовал до multi-clinic expansion; вместо него запущен новый workflow run `23391902340`, уже с актуального `main`, чтобы future cloud scrape/backfill/promotions posting использовали `kravira lighthouse lode medart ydoc`, а не более старую конфигурацию  
**Изменены файлы:** `docs/PROJECT_HISTORY.md`  
**Следующий шаг:** дождаться перехода нового run `23391902340` в `in_progress/completed` и затем проверить, что cloud refresh подтверждает multi-clinic promo coverage без локального вмешательства

## 2026-03-22 03:20 — Cloud Workflow Split for Online Sync
**Роль:** Windows Engineering Assistant  
**Сделано:** найден корень “часового зависания” GitHub Actions: весь online refresh был собран как один monolithic job, где `Run scrapers` держал внутри полный `ydoc` scrape и блокировал быстрые promo sources; workflow `.github/workflows/scraper.yml` перестроен на две параллельные job-и — `promo-sync` и `ydoc-catalog` — с разными timeout, отдельными batch artifact-ами и `concurrency.cancel-in-progress=true`, чтобы новые ручные rerun-ы автоматически останавливали старые зависшие cloud runs; локальная YAML-проверка подтвердила новую структуру jobs  
**Изменены файлы:** `.github/workflows/scraper.yml`, `docs/PROJECT_HISTORY.md`  
**Следующий шаг:** закоммитить и запушить новый workflow, затем запустить fresh cloud run и убедиться, что promo sources завершаются быстро, а долгий `ydoc` идет отдельно и больше не маскирует прогресс всего pipeline

## 2026-03-22 03:24 — Promo Sync Split Into Dedicated Frequent Workflow
**Роль:** Windows Engineering Assistant  
**Сделано:** окончательно развел online-пайплайны: `.github/workflows/scraper.yml` теперь отвечает только за `doctor-catalog-sync` (`ydoc` daily), а новый `.github/workflows/promo-sync.yml` отвечает только за акции и запускается отдельным cron `*/15 * * * *`; локальная YAML-проверка подтвердила, что теперь есть два самостоятельных workflow-а — `doctor-catalog-sync` и `promo-sync`, что устраняет главный UX-баг GitHub Actions: быстрые акции больше не должны ждать тяжелый doctor crawl  
**Изменены файлы:** `.github/workflows/scraper.yml`, `.github/workflows/promo-sync.yml`, `docs/PROJECT_HISTORY.md`  
**Следующий шаг:** запушить split-workflow в GitHub, вручную запустить новый `promo-sync` и подтвердить, что online refresh акций идет независимо от `ydoc`-каталога

## 2026-03-22 03:34 — Promo Sync Backfill Fixed for Cloud Secrets
**Роль:** Windows Engineering Assistant  
**Сделано:** найден и исправлен реальный cloud blocker для `promo-sync`: job завершал scrape за ~4 минуты, но падал на `Backfill promo batch to Turso`, потому что `apps/worker/scripts/backfill-from-batch.ts` требовал локальный `.env.txt/.env` вместо GitHub Actions environment; скрипт переведен на `env-first` загрузку (`process.env` с fallback на root env file), после чего локальная TypeScript-проверка и YAML-валидация прошли успешно  
**Изменены файлы:** `apps/worker/scripts/backfill-from-batch.ts`, `docs/PROJECT_HISTORY.md`  
**Следующий шаг:** закоммитить и запушить fix, затем заново запустить `promo-sync` в GitHub и подтвердить cloud backfill/flush без зависимости от локальных env-файлов

## 2026-03-22 03:39 — Workflow Verification 403 Fix
**Роль:** Windows Engineering Assistant  
**Сделано:** найден и исправлен последний хвост cloud-run: `promo-sync` уже успешно проходил scrape, backfill и Telegram flush, но падал на финальном `Verify live promo total` из-за `HTTP 403` без `User-Agent`; в `.github/workflows/promo-sync.yml` и `.github/workflows/scraper.yml` добавлен явный `User-Agent: MedsearchRB-GitHubActions/1.0` для финальных live-проверок, а ручной smoke-test к production API с тем же заголовком подтвердил ответ `200` и `total=21`  
**Изменены файлы:** `.github/workflows/promo-sync.yml`, `.github/workflows/scraper.yml`, `docs/PROJECT_HISTORY.md`  
**Следующий шаг:** закоммитить и запушить verification fix, затем перезапустить `promo-sync` и получить первый полностью зеленый cloud run без локального ПК

## 2026-03-22 03:44 — First Fully Green Online Promo Sync
**Роль:** Windows Engineering Assistant  
**Сделано:** получен первый полностью успешный cloud run `promo-sync` без локального ПК: GitHub Actions run `23392262386` завершился `success` за `4m16s`, прошел все этапы `scrape -> backfill -> Telegram flush -> live verify -> artifact upload`; production promotions API после run подтверждает `total=21`, а артефакт `promo-source-batch` сохранен в Actions  
**Изменены файлы:** `docs/PROJECT_HISTORY.md`  
**Следующий шаг:** расширять source coverage по остальным клиникам Минска и отдельно довести `doctor-catalog-sync`, чтобы весь pipeline был online, а не только promo-layer

## 2026-03-22 03:50 — Doctor Catalog Sync Restarted on Fresh Workflow
**Роль:** Windows Engineering Assistant  
**Сделано:** найдено, что пользователь видел не “сломанный” doctor parser, а устаревший long-running run `23391948549` на старом workflow/commit; этот run был отменен, после чего запущен новый `doctor-catalog-sync` run `23392415836` уже на свежем `main` (`head_sha=637bcd6`) и новой doctor-only конфигурации без встроенного promo job; повторная проверка через GitHub API подтвердила прохождение setup/install и переход на шаг `Run YDoc catalog scraper`  
**Изменены файлы:** `docs/PROJECT_HISTORY.md`  
**Следующий шаг:** дождаться завершения `23392415836` и, если он упрется не в stale workflow, уже чинить конкретный runtime/blocker самого `YDoc` scrape step

## 2026-03-22 04:02 — Mini App Links Now Prefer Clinic Sites
**Роль:** Windows Engineering Assistant  
**Сделано:** исправлен приоритет ссылок в карточке врача Mini App: detail fetch теперь идет `worker-first`, snapshot расширен verification-полями (`official_*`, `aggregator_*`, `verification_status`), а `buildClinicActions()` больше не ставит агрегаторный `booking_url` выше официального `site_url`; production Mini App перевыкатан на Netlify deploy `69bf3db9215bcc4eb9afd043`, а новый snapshot для врача `staskevich-regina-nikolaevna-af73b96d43` подтверждает прямые сайты клиник `https://e-clinic.by/` и `https://doctortut.by/`  
**Изменены файлы:** `apps/miniapp/components/catalog-app.tsx`, `apps/miniapp/lib/api.ts`, `apps/miniapp/scripts/generate-catalog-snapshot.mjs`, `apps/miniapp/public/data/catalog.json`, `docs/PROJECT_HISTORY.md`  
**Следующий шаг:** проверить Telegram WebView новым скрином и затем уже добивать следующий data-layer: official booking URLs по clinic verification

## 2026-03-22 10:00 — Overnight Parser Audit
**Роль:** Windows Engineering Assistant  
**Сделано:** проведен аудит ночных cloud runs и текущего scraper coverage; подтверждено, что `promo-sync` всю ночь работал online по cron `*/15 * * * *` и многократно завершался `success`, а последний завершенный run `23399948455` показал `claimed=0, sent=0`, то есть новых промо для канала не было; одновременно `doctor-catalog-sync` по расписанию завершился `success` в run `23395048832` за `3h48m43s`, обработал `22` chunk batch, дал `inserted=22`, `updated=5729`, `errors=0`, но live total врачей остался `2162`, что означает сильный dedup/update-overwrite, а не рост каталога; текущая фактическая source coverage по коду: `ydoc`, `medart`, `lighthouse`, `kravira`, `lode`  
**Изменены файлы:** `docs/PROJECT_HISTORY.md`  
**Следующий шаг:** расширять promo coverage на новые клиники Минска и отдельно диагностировать, почему полный `YDoc` nightly run дает много `updated`, но не увеличивает live total врачей

## 2026-03-22 10:18 — Product Readiness Map Prepared
**Роль:** Windows Engineering Assistant  
**Сделано:** собрана сводная карта готовности по production-контуру проекта для бота, Telegram-канала и Mini App; повторно подтверждены live totals (`doctors=2162`, `promotions=21`), доступность production Mini App (`HTTP 200`) и свежие успешные cloud runs: `promo-sync` (`23400582031`, `success`, `4m31s`) и ночной `doctor-catalog-sync` (`23395048832`, `success`, `3h48m43s`)  
**Изменены файлы:** `docs/PROJECT_HISTORY.md`  
**Следующий шаг:** использовать карту готовности как рабочий backlog: сначала закрыть source coverage по клиникам Минска и verification doctor->clinic, затем дожать UX Mini App и official booking URLs

## 2026-03-22 10:38 — Online Clinic Site Health Layer Added
**Роль:** Windows Engineering Assistant  
**Сделано:** внедрен первый online-слой очистки битых и закрытых клиник: добавлена миграция `0004_clinic_site_health.sql` с health-полями на `clinics`, создан script `apps/worker/scripts/clinic-site-health-sync.ts` для проверки официальных `site_url`, записи результатов в `clinic_verification_runs` и suppression явно невалидных клиник после повторных провалов; `verify-clinic-sites.ts` переведен на `env-first` для GitHub Actions, а новый workflow `.github/workflows/clinic-site-sync.yml` запускает `db:migrate -> verify:clinics -> clinics:health` полностью в облаке; локальный smoke-test подтвердил первый проход (`healthy=4`, `fetch_failed=1`, `hidden=0`)  
**Изменены файлы:** `.github/workflows/clinic-site-sync.yml`, `apps/worker/package.json`, `apps/worker/scripts/clinic-site-health-sync.ts`, `apps/worker/scripts/verify-clinic-sites.ts`, `db/migrations/0004_clinic_site_health.sql`, `docs/PROJECT_HISTORY.md`, `docs/STATE.md`  
**Следующий шаг:** закоммитить и запушить новый health-layer, вручную прогнать первый `clinic-site-sync` run в GitHub и подтвердить, что suppression битых `site_url` работает online без локального ПК

## 2026-03-22 11:03 — First Cloud Clinic Health Run In Progress
**Роль:** Windows Engineering Assistant  
**Сделано:** первый cloud run `clinic-site-sync` (`23401254824`) запущен и дошел до online health-check; шаг `Backfill official clinic sites from YDoc clinic pages` уже завершился `success` и за текущий прогон в `clinic_verification_runs` появилось `402` записей `linked_official_site`, `21` `fetch_failed`, `6` `no_official_site`; шаг `Audit official clinic sites and suppress broken ones` уже начал писать live health-статусы в `clinics`: на момент фиксации `healthy=247`, `blocked=12`, `fetch_failed=12`, `redirected_external=4`, `unknown=135`, при этом `is_hidden=1` еще ни для одной клиники не выставлен, потому что это только первый накопительный проход (`site_failure_count=1`)  
**Изменены файлы:** `docs/PROJECT_HISTORY.md`  
**Следующий шаг:** дождаться завершения run `23401254824`, затем проверить итоговую сводку `site_health_status`, `is_hidden` и решить, нужно ли отдельно обрабатывать Instagram-only clinic URLs как низкодоверенные источники

## 2026-03-22 14:12 — Review Aggregation Strategy Researched
**Роль:** Windows Engineering Assistant  
**Сделано:** проведен targeted research по слою отзывов врачей: подтверждено, что multi-source review aggregation нельзя строить как бесконтрольный перенос полных текстов, особенно для Google Places reviews из-за display/caching/attribution requirements; зафиксирована безопасная стратегия для проекта — хранить source-level summary-метрики (`rating_avg`, `review_count`, `source_url`, `last_seen_at`, sentiment summary), считать итоговую оценку как взвешенную, но обязательно показывать разбивку по источникам, чтобы противоречивые площадки были видны честно  
**Изменены файлы:** `docs/PROJECT_HISTORY.md`, `docs/RESEARCH_LOG.md`  
**Следующий шаг:** спроектировать review-schema и product-слой `Репутация по источникам`, затем подключать источники отзывов по одному с учетом их display restrictions и attribution rules

## 2026-03-22 14:20 — Minsk / Belarus Review Sources Inventory
**Роль:** Windows Engineering Assistant  
**Сделано:** собран inventory площадок Минска/РБ с отзывами о врачах и клиниках; подтверждено, что для doctor-first reputation самыми важными локальными площадками являются `YDoc.by` и `103.by`, тогда как `2GIS`, `Google Maps` и `Yandex Maps` дают в первую очередь clinic/service reputation, а official clinic websites являются self-published low-trust источником; вывод зафиксирован в `docs/RESEARCH_LOG.md` как основа для будущего review-layer проекта  
**Изменены файлы:** `docs/PROJECT_HISTORY.md`, `docs/RESEARCH_LOG.md`  
**Следующий шаг:** разделить будущий review pipeline на `doctor-first` и `clinic-first` и проектировать UI так, чтобы пользователь видел отдельно репутацию врача и репутацию клиники

## 2026-03-22 14:25 — doktora.by and 2doc.by Classified
**Роль:** Windows Engineering Assistant  
**Сделано:** отдельно проверены `doktora.by` и `2doc.by` как возможные источники для reputation/discovery layer; подтверждено, что `doktora.by` живой и выглядит как doctor-first source (`HTTP 200`, homepage `Врачи Беларуси`, robots с `Crawl-delay: 10`), а `2doc.by` живой и сильнее похож на doctor-search / online booking source (`HTTP 200`, robots `Allow: /`, sitemap опубликован), чем на главный review-source; вывод зафиксирован в `docs/RESEARCH_LOG.md`  
**Изменены файлы:** `docs/PROJECT_HISTORY.md`, `docs/RESEARCH_LOG.md`  
**Следующий шаг:** отдельно разобрать detail-page schema на `doktora.by` и `2doc.by`, чтобы решить, что из них идет в review-layer, а что — в discovery/availability layer

## 2026-03-22 14:32 — doktora.by and 2doc.by Detail Signals Confirmed
**Роль:** Windows Engineering Assistant  
**Сделано:** проверены реальные doctor detail pages и sitemap-структура `doktora.by` / `2doc.by`; подтверждено, что `doktora.by` — полноценный review-first doctor source (title/meta `Отзывы о враче`, отдельный paginated review section `/otzyvy-o-vrachah-belarusi?page=N`), а `2doc.by` — hybrid doctor source с review+booking сигналом (open `sitemap-doctor.xml`, doctor pages с `отзывы, записаться на прием` в title/meta)  
**Изменены файлы:** `docs/PROJECT_HISTORY.md`, `docs/RESEARCH_LOG.md`  
**Следующий шаг:** перейти от classification к implementation prep: выделить стабильные detail-page markers и затем добавить scrapers для `doktora.by` и `2doc.by`

## 2026-03-22 14:40 — Review Source Contract Fixed in Decisions
**Роль:** Windows Engineering Assistant  
**Сделано:** после detail-page проверки зафиксирован implementation-contract для review/discovery layer: `doktora.by` закреплен как doctor-review source, `2doc.by` — как hybrid discovery/booking source, а doctor reputation и clinic reputation формально разведены по разным semantic classes; field contract для будущих parser-ов добавлен в `docs/DECISIONS.md`  
**Изменены файлы:** `docs/DECISIONS.md`, `docs/PROJECT_HISTORY.md`  
**Следующий шаг:** переходить к реальной реализации: сначала выбрать один source для первого parser-а (`doktora.by` логичнее первым), затем внедрять source summary в существующий `reviews_summary`

## 2026-03-22 14:48 — Unified Improvement Backlog Added
**Роль:** Windows Engineering Assistant  
**Сделано:** создан единый execution backlog в `docs/TODO.md`, чтобы вести проект по одной карте улучшений; в backlog разделены `Must / Should / Could`, выделены активные треки `Clinic Verification P1` и `Review Layer P1 (doktora.by)`, а `docs/STATE.md` синхронизирован с новым режимом работы от единого TODO вместо разрозненных задач  
**Изменены файлы:** `docs/TODO.md`, `docs/STATE.md`, `docs/PROJECT_HISTORY.md`  
**Следующий шаг:** идти по backlog сверху вниз: сначала дождаться и зафиксировать итог `clinic-site-sync`, затем начинать реализацию `doktora.by` scraper-а как первого doctor-review source

## 2026-03-22 14:54 — clinic-site-sync Summary Step Fixed
**Роль:** Windows Engineering Assistant  
**Сделано:** найден и исправлен точный blocker первого cloud run `clinic-site-sync`: сам health-check и clinic-site backfill завершились успешно, но workflow упал на последнем шаге `Summarize clinic health` из-за `top-level await` в `tsx -e`; summary-step переписан на async IIFE, чтобы GitHub Actions завершал run `success`, а не `failure` при уже обработанных клиниках  
**Изменены файлы:** `.github/workflows/clinic-site-sync.yml`, `docs/PROJECT_HISTORY.md`  
**Следующий шаг:** запушить fix и перезапустить `clinic-site-sync`, чтобы получить первый полностью зеленый run для clinic health-layer

## 2026-03-22 14:58 — Roadmap Activated And clinic-site-sync Rerun Started
**Роль:** Windows Engineering Assistant  
**Сделано:** backlog из `docs/TODO.md` переведен в исполнение: создан commit `645a0a4` с roadmap+CI fix, изменения запушены в `origin/main`, после чего вручную запущен новый cloud run `clinic-site-sync` (`23402446176`) уже на свежем `head_sha=645a0a4`; run дошел до шагов `Backfill official clinic sites from YDoc clinic pages` и `Audit official clinic sites and suppress broken ones`; отдельная проверка live Turso подтвердила накопленный прогресс после cloud health-pass: `healthy=378`, `fetch_failed=15`, `blocked=6`, `redirected_external=5`, `invalid_http=2`, `unknown=4`, но `is_hidden=1` пока остается `0`, поэтому пользовательских визуальных изменений в Mini App почти нет — suppression policy ждет повторных провалов, а UI пока не показывает `site_health_status`
**Изменены файлы:** `docs/PROJECT_HISTORY.md`, `docs/STATE.md`
**Следующий шаг:** дождаться завершения `23402446176`, затем решить один из двух путей: либо ускорять suppression для явно мертвых сайтов, либо начать выводить health/verification сигналы прямо в Mini App, чтобы backend quality work стал виден пользователю до массового `is_hidden`

## 2026-03-22 15:08 — Doctor Card Full Name Fix Deployed
**Роль:** Windows Engineering Assistant  
**Сделано:** найден и исправлен конкретный UI-дефект списка врачей в Mini App: полное ФИО врача обрезалось из-за `truncate` в `DoctorCard`; карточка перестроена под узкий Telegram WebView так, чтобы имя занимало несколько строк, рейтинг ушел под имя, а specialty/clinic остались читаемыми; дополнительно подтверждено, что фото врача сейчас не выводится не из-за “лишней нагрузки”, а потому что в live API и snapshot нет `photo_url/avatar_url` полей вообще; production Mini App перевыкатан на Netlify deploy `69bfdf596f2ab0827cde4c4c`, live `/list` отвечает `200`
**Изменены файлы:** `apps/miniapp/components/ui/doctor-card.tsx`, `docs/PROJECT_HISTORY.md`
**Следующий шаг:** при желании добавить отдельный data-layer для фото врачей: сначала научиться собирать `photo_url/avatar_url` в scrapers/API, потом выводить изображения с fallback на initials и lazy loading

## 2026-03-22 15:17 — Detail Screen Switched To Snapshot-First
**Роль:** Windows Engineering Assistant  
**Сделано:** найден и исправлен наиболее вероятный источник зависания detail-screen в Telegram WebView: список врачей в production уже работал по `snapshot-first`, а `fetchDoctorDetail()` оставался `worker-first`, из-за чего подвисающий запрос к Worker мог держать пользователя на экране `Загружаем карточку врача`; `apps/miniapp/lib/api.ts` переведен на единый production-safe порядок источников через `resolveSourceOrder()` и detail теперь тоже читает сначала live snapshot, а Worker остается fallback; production Mini App перевыкатан на Netlify deploy `69bfe03d8510b685c5dc434b`, live `/list` отвечает `200`
**Изменены файлы:** `apps/miniapp/lib/api.ts`, `docs/PROJECT_HISTORY.md`
**Следующий шаг:** получить новый скрин из Telegram WebView именно с карточкой врача после этого деплоя и убедиться, что зависание ушло не только в браузере, но и в реальном Mini App runtime

## 2026-03-22 15:24 — Clinic Site Link Detail Freshness Fix Deployed
**Роль:** Windows Engineering Assistant  
**Сделано:** после пользовательского скрина с `Супрамедом` найдено, что detail-card надо усиливать по двум направлениям: production snapshot читался через `force-cache`, что могло дольше держать старую версию `catalog.json` в Telegram WebView, а client-side маппинг detail-screen выбрасывал `official_*`, `aggregator_*` и verification-поля клиники; `apps/miniapp/lib/api.ts` переведен на `cache: \"no-store\"` для snapshot, а `apps/miniapp/components/catalog-app.tsx` теперь сохраняет clinic verification fields в локальное состояние detail-screen; production Mini App перевыкатан на Netlify deploy `69bfe12c1e80d0b3f7c24453`, live `/list` отвечает `200`
**Изменены файлы:** `apps/miniapp/lib/api.ts`, `apps/miniapp/components/catalog-app.tsx`, `docs/PROJECT_HISTORY.md`
**Следующий шаг:** получить новый скрин карточки врача в Telegram WebView именно после deploy `69bfe12c1e80d0b3f7c24453` и проверить, появилась ли у `Супрамеда` прямая ссылка на `https://supramed.by/`

## 2026-03-22 15:58 — Multi-Source Review Layer P1 Implemented
**Роль:** Windows Engineering Assistant  
**Сделано:** реализован первый production-slice multi-source отзывов о врачах с двумя новыми source-ами: `103.by` и `doktora.by`. Добавлены scrapers `apps/scrapers/scrapers/by103.py` и `apps/scrapers/scrapers/doktora.py`, обновлены registry/config/selectors, а Worker read-model переведен с single-source latest row на `latest-per-source + weighted aggregate` для `rating_avg/reviews_count`. Mini App detail-screen теперь умеет показывать блок `Отзывы по источникам` и считать aggregate rating/review count по всем source summary. Bounded smoke-run (`MAX_DOCTORS_PER_SOURCE=2`) подтвердил scraping обоих sources, затем bounded live backfill подтвердил запись новых summary в `reviews_summary` (`103.by=2`, `doktora.by=2`) без ошибок. После этого Worker и Mini App пересобраны и перевыкатаны в production; отдельный cloud workflow `.github/workflows/review-sync.yml` подготовлен для online-refresh review-layer без локального ПК. Дополнительно зафиксировано важное качество данных: `doktora.by` сейчас надежно дает `review_count`, но текущий DOM-маркер `average-rating` недостоверен, поэтому `rating_avg` для него временно сохраняется как `null`, пока не будет найден корректный selector или альтернативный payload.
**Изменены файлы:** `apps/scrapers/http_client.py`, `apps/scrapers/scrapers/base.py`, `apps/scrapers/scrapers/by103.py`, `apps/scrapers/scrapers/doktora.py`, `apps/scrapers/scrapers/__init__.py`, `config.yaml`, `selectors.yaml`, `apps/worker/src/repositories/doctors-read-repository.ts`, `apps/worker/src/services/doctors-service.ts`, `apps/miniapp/scripts/generate-catalog-snapshot.mjs`, `apps/miniapp/lib/api.ts`, `apps/miniapp/components/catalog-app.tsx`, `.github/workflows/review-sync.yml`, `docs/TODO.md`, `docs/STATE.md`, `docs/RESEARCH_LOG.md`, `docs/DECISIONS.md`, `docs/PROJECT_HISTORY.md`
**Следующий шаг:** закоммитить и запушить review-layer changes, затем вручную запустить `review-sync` и проверить первый cloud run уже с `103.by + doktora.by`

## 2026-03-22 16:06 — review-sync P1 Pushed And Started In Cloud
**Роль:** Windows Engineering Assistant  
**Сделано:** multi-source review-layer закоммичен в `origin/main` коммитом `1b2fc0c` по протоколу Decision Shadow Commit; после push вручную запущен первый cloud workflow `review-sync` (`23403673638`). GitHub Actions подтвердил создание job `doctor-review-sync` и его фактический старт: `Checkout`, `Setup Python`, `Setup Node` уже `success`, текущий progress дошел до `Install dependencies` и следующих этапов `Run review sources to batch file -> Backfill review batch to Turso -> Verify review source coverage`. То есть review-layer уже не только локально прогнан, но и переведен в online execution path без зависимости от ПК.
**Изменены файлы:** `docs/PROJECT_HISTORY.md`, `docs/STATE.md`
**Следующий шаг:** дождаться финала run `23403673638`, затем зафиксировать его verdict и при необходимости начать performance-tuning полного crawl `103.by + doktora.by`

## 2026-03-22 18:47 — Mini App Switched To Live Worker-First Data Path
**Роль:** Windows Engineering Assistant  
**Сделано:** найден реальный корень жалобы “Mini App не обновляется с ночи”: production Worker API уже отдавал `doctors_total=2271` и `promotions_total=59`, а Netlify `catalog.json` оставался старым (`2165/21`), потому что `apps/miniapp/lib/api.ts` в production читал `snapshot-first`. Mini App переведен на `worker-first` для doctor/promotion/detail path с snapshot как fallback, а `fetchCatalogOverview()` теперь берет live totals из Worker и использует snapshot только для specialty inventory. После пересборки `apps/miniapp` snapshot заново сгенерирован уже с актуальными данными (`2271` врачей, `59` акций) и production перевыкатан на Netlify deploy `69c00f94345e31322e148480`.
**Изменены файлы:** `apps/miniapp/lib/api.ts`, `apps/miniapp/public/data/catalog.json`, `docs/PROJECT_HISTORY.md`
**Следующий шаг:** получить новый скрин из Telegram WebView после deploy `69c00f94345e31322e148480` и подтвердить, что live отзывы/акции действительно подтянулись в Mini App без локального redeploy

## 2026-03-22 18:47 — Promo Coverage Expanded With Four Official Clinic Sources
**Роль:** Windows Engineering Assistant  
**Сделано:** добавлены четыре новых official promo-source для Минска: `Nordin`, `MedAvenu`, `SMART MEDICAL`, `Supramed`. Реализованы scrapers `apps/scrapers/scrapers/nordin.py`, `medavenu.py`, `smartmedical.py`, `supramed.py`, обновлены registry/config/selectors и cloud workflow `.github/workflows/promo-sync.yml`. Bounded и общий локальный scrape подтвердили новые источники: `nordin -> 21 promotions`, `medavenu -> 8`, `smartmedical -> 9`, `supramed -> 1`. Общий live backfill в Turso прошел без ошибок (`processed_batches=4`, `inserted=43`, `errors=0`), что и подняло актуальный production total promotions до `59`.
**Изменены файлы:** `apps/scrapers/scrapers/nordin.py`, `apps/scrapers/scrapers/medavenu.py`, `apps/scrapers/scrapers/smartmedical.py`, `apps/scrapers/scrapers/supramed.py`, `apps/scrapers/scrapers/__init__.py`, `config.yaml`, `selectors.yaml`, `.github/workflows/promo-sync.yml`, `docs/PROJECT_HISTORY.md`
**Следующий шаг:** закоммитить и запушить promo-source expansion в `origin/main`, затем запустить cloud `promo-sync` уже с новым source list

## 2026-03-22 18:58 — Mini App Fast Path Restored For Telegram WebView
**Роль:** Windows Engineering Assistant  
**Сделано:** после пользовательского скрина с исчезнувшими врачами и медленным home/list подтверждено, что regression вызвал production `worker-first` path: Telegram WebView ждал медленный Worker, хотя same-origin snapshot уже был свежим (`2271` врачей, `59` акций). `apps/miniapp/lib/api.ts` переведен обратно на `snapshot-first` для production, локальная среда оставлена `worker-first`, а Worker fetch теперь имеет короткий таймаут `2500 ms` и остается fallback. `fetchCatalogOverview()` тоже снова берет snapshot как первичный быстрый источник. Production перевыкатан на Netlify deploy `69c01139fd19e214828ece04`.
**Изменены файлы:** `apps/miniapp/lib/api.ts`, `docs/PROJECT_HISTORY.md`
**Следующий шаг:** получить новый скрин из Telegram Mini App после deploy `69c01139fd19e214828ece04` и подтвердить, что home/list снова открываются быстро и врачи не пропадают

## 2026-03-22 19:08 — Doctor Rating Calculation Cleaned From Zero-Review Noise
**Роль:** Windows Engineering Assistant  
**Сделано:** найден точный дефект в review-layer: часть `YDoc` записей приходила как `rating_avg=0.1` при `reviews_count=0`, из-за чего карточки врача могли показывать бессмысленный рейтинг, не основанный на отзывах. Исправлен future-ingest в `apps/scrapers/scrapers/ydoc.py` — если отзывов `0`, рейтинг больше не записывается. Дополнительно обновлены read-model Worker и snapshot generation: агрегированная оценка теперь считается только по источникам, где есть и реальный `reviews_count > 0`, и числовой рейтинг; источники без отзывов больше не участвуют ни в weighted-rating, ни в fallback. Production Worker перевыкатан, Mini App пересобран и перевыкатан на Netlify deploy `69c012491e668332fe762468`. Live-проверка подтвердила: `Агарков Виталий Леонидович -> rating_avg=null, reviews_count=0`, а multi-source пример `Машлякевич Татьяна Сергеевна -> rating_avg=5, reviews_count=9`.
**Изменены файлы:** `apps/scrapers/scrapers/ydoc.py`, `apps/worker/src/repositories/doctors-read-repository.ts`, `apps/worker/src/services/doctors-service.ts`, `apps/miniapp/scripts/generate-catalog-snapshot.mjs`, `apps/miniapp/components/catalog-app.tsx`, `docs/PROJECT_HISTORY.md`
**Следующий шаг:** закрепить этот же принцип в UI copy — если отзывов нет, не пытаться визуально продавать рейтинг, а показывать нейтральный state без числовой оценки

## 2026-03-22 19:06 — No-Reviews UX Made Neutral In Mini App
**Роль:** Windows Engineering Assistant  
**Сделано:** после замечания пользователя про риск восприятия `0` как “плохой врач” усилен нейтральный UX для врачей без отзывов. `HaloRating` больше не выглядит как низкая оценка: при `reviewCount=0` он показывает `Пока нет отзывов`, при наличии отзывов без валидного среднего рейтинга — нейтральное `N отзывов`. В карточке списка footer больше не пишет `0 отзывов`, а показывает спокойный текст `Оценка появится после первых отзывов`. В detail screen breakdown по источникам тоже теперь честно пишет `Отзывов пока нет`, если source еще не дал ни одного отзыва. Заодно убран legacy fallback в `aggregateReviewSummary`, который теоретически мог бы вернуть рейтинг без реальных отзывов. Сборка и линт `apps/miniapp` прошли успешно.
**Изменены файлы:** `apps/miniapp/components/ui/halo-rating.tsx`, `apps/miniapp/components/ui/doctor-card.tsx`, `apps/miniapp/components/catalog-app.tsx`, `docs/PROJECT_HISTORY.md`
**Следующий шаг:** перевыкатить Mini App на Netlify и проверить в Telegram WebView, что карточки без отзывов выглядят нейтрально и не читаются как “плохой врач”

## 2026-03-22 19:14 — Live Review Coverage Audit
**Роль:** Windows Engineering Assistant  
**Сделано:** по жалобе пользователя на “один источник отзывов” выполнена live-проверка production snapshot и review-sync. Подтверждено, что pipeline уже не одноисточниковый по коду, но покрытие пока слабое: из `2271` врачей только `13` имеют multi-source отзывы, `2242` остаются single-source и `16` пока без review sources. Расклад по источникам в production snapshot сейчас такой: `ydoc=2146`, `doktora.by=120`, `103.by=2`. Для кейса `Лавейкина Оксана Петровна` live данные подтверждают ровно один source — `doktora.by` с `286` отзывами, без матчей из `YDoc` или `103.by`. Первый cloud workflow `review-sync` (`23403673638`) завершился успешно, значит проблема не в рантайме, а в низком matching/coverage новых review-source.
**Изменены файлы:** `docs/PROJECT_HISTORY.md`
**Следующий шаг:** усиливать matching и source coverage review-layer, начиная с `103.by` и `2doc.by`, чтобы multi-source breakdown стал массовым, а не точечным

## 2026-03-22 20:16 — Cloud Recheck Found Two Real Pipeline Bugs
**Роль:** Windows Engineering Assistant  
**Сделано:** при полной перепроверке production и cloud workflows подтверждены две реальные причины, почему пользователь не видел ожидаемого прогресса. Во-первых, `clinic-site-sync` три раза подряд падал не на health-аудите, а на финальном summary-step: inline `tsx` запускался из repo root и не резолвил `@libsql/client`, хотя сами проверки клиник уже отрабатывали и писали статусы в Turso. Во-вторых, `review-sync` формально был зеленым, но `103.by` внутри него целиком проваливался из-за одного битого URL `https://www.103.by/spec//` из sitemap. Исправлено: `apps/scrapers/scrapers/by103.py` теперь отфильтровывает пустой `spec//`, а `.github/workflows/clinic-site-sync.yml` и `.github/workflows/review-sync.yml` переведены на `cd apps/worker && npx tsx ...`, чтобы summary/check steps использовали локальные зависимости корректно. Локально подтверждено: bounded `103.by` снова дает `doctors_found=9`, `review_summaries_found=9`, а новый `npx tsx` summary-query по `clinics.site_health_status` выполняется без module resolution errors.
**Изменены файлы:** `apps/scrapers/scrapers/by103.py`, `.github/workflows/clinic-site-sync.yml`, `.github/workflows/review-sync.yml`, `docs/PROJECT_HISTORY.md`
**Следующий шаг:** закоммитить и запушить эти cloud-fixes в `origin/main`, затем повторно запустить `clinic-site-sync` и `review-sync`, чтобы подтвердить зеленые runs уже в GitHub Actions

## 2026-03-22 20:18 — Cloud Pipeline Fixes Pushed And Re-runs Started
## 2026-03-23 00:45 — Netlify Deploy Step Hardened With --no-build
**Роль:** Windows Engineering Assistant
**Сделано:** direct production deploy path дошел до Netlify в cloud smoke-run `23413162996` и впервые создал новый deploy object `69c062da865a3f0560482612`, но run упал в deploy-step из-за того, что Netlify CLI пытался сам запускать site build и наткнулся на `hugo: command not found`. Это оказалось поведением Netlify deploy, а не проблемой Mini App. Все workflow deploy-команды обновлены на `--no-build`, потому что `apps/miniapp` уже собирается отдельным шагом `npm --prefix apps/miniapp run build` до вызова CLI.
**Изменены файлы:** `.github/workflows/promo-sync.yml`, `.github/workflows/review-sync.yml`, `.github/workflows/review-sync-103.yml`, `.github/workflows/review-sync-doktora.yml`, `.github/workflows/scraper.yml`, `.github/workflows/clinic-site-sync.yml`, `docs/PROJECT_HISTORY.md`
**Следующий шаг:** закоммитить `--no-build` hardening, запушить в `origin/main`, затем повторно прогнать bounded `review-sync` и подтвердить уже fully successful Netlify production deploy

## 2026-03-23 00:36 — Netlify CLI Removed From Mini App Dependencies For Linux CI
**Роль:** Windows Engineering Assistant  
**Сделано:** после перевода workflows на прямой Netlify deploy выявлен новый cloud-blocker: `review-sync` run `23413041471` уже шел на свежем commit `418dee2`, но падал в шаге `Install dependencies` на `npm --prefix apps/miniapp ci` из-за `netlify-cli` в `apps/miniapp/package-lock.json`. Ошибка была platform-specific (`EBADPLATFORM` на `@rollup/rollup-android-arm-eabi`) и не относилась к самому Mini App. Для устранения blocker-а `netlify-cli` убран из `apps/miniapp` devDependencies, а workflow deploy-команды переведены на `npx --yes netlify-cli@24.4.0 deploy`, чтобы CLI ставился отдельно от product dependencies и не ломал Linux CI сборку Mini App.  
**Изменены файлы:** `apps/miniapp/package.json`, `apps/miniapp/package-lock.json`, `.github/workflows/promo-sync.yml`, `.github/workflows/review-sync.yml`, `.github/workflows/review-sync-103.yml`, `.github/workflows/review-sync-doktora.yml`, `.github/workflows/scraper.yml`, `.github/workflows/clinic-site-sync.yml`, `docs/PROJECT_HISTORY.md`  
**Следующий шаг:** провалидировать локальную сборку `apps/miniapp` без `netlify-cli` в devDependencies, затем повторно прогнать `review-sync` smoke и проверить, что pipeline доходит до production Netlify deploy

## 2026-03-23 00:27 — Direct Netlify Deploy Chosen For Mini App Freshness
**Роль:** Windows Engineering Assistant  
**Сделано:** завершена честная end-to-end проверка freshness path для Mini App. Manual smoke workflow `review-sync` после фикса verify-step успешно завершился (`run 23412674146`) и реально выполнил шаг `Trigger Mini App snapshot rebuild`; лог подтвердил `{"status": 200, "triggered": true}` от Netlify hook. Но последующая проверка Netlify API показала, что сайт `medsearch-minsk-miniapp` не build-connected: `build_id` пустой, `build_settings` пустые, а новый deploy после hook не появляется. На этом основании build hook признан недостаточным для данного production site. В GitHub secrets добавлены `NETLIFY_AUTH_TOKEN` и `NETLIFY_SITE_ID`, а workflows `.github/workflows/promo-sync.yml`, `.github/workflows/review-sync.yml`, `.github/workflows/review-sync-103.yml`, `.github/workflows/review-sync-doktora.yml`, `.github/workflows/scraper.yml`, `.github/workflows/clinic-site-sync.yml` переведены на новую схему: после успешного verify-step они должны собирать `apps/miniapp` и делать прямой `npx netlify deploy --prod --dir apps/miniapp/out`.  
**Изменены файлы:** `.github/workflows/promo-sync.yml`, `.github/workflows/review-sync.yml`, `.github/workflows/review-sync-103.yml`, `.github/workflows/review-sync-doktora.yml`, `.github/workflows/scraper.yml`, `.github/workflows/clinic-site-sync.yml`, `docs/STATE.md`, `docs/TODO.md`, `docs/DECISIONS.md`, `docs/PROJECT_HISTORY.md`  
**Следующий шаг:** провалидировать YAML, закоммитить direct-deploy rollout, запушить его в `origin/main`, затем вручную прогнать один bounded data workflow и убедиться, что после него в Netlify появляется новый production deploy

## 2026-03-23 00:09 — Review Smoke Workflow Verify Step Fixed For Netlify Hook Path
**Роль:** Windows Engineering Assistant  
**Сделано:** исправлен подтвержденный cloud-bug в `.github/workflows/review-sync.yml`: verify-step `Verify review source coverage` больше не использует top-level `await` в `npx tsx -e`, а завернут в async IIFE с явным `catch/process.exit(1)`. Это устраняет падение manual smoke-run на ошибке `Top-level await is currently not supported with the "cjs" output format` и открывает путь к следующему шагу `Trigger Mini App snapshot rebuild`. YAML workflow заново провалидирован локально.  
**Изменены файлы:** `.github/workflows/review-sync.yml`, `docs/PROJECT_HISTORY.md`  
**Следующий шаг:** закоммитить fix, запушить в `origin/main`, вручную перезапустить `review-sync` smoke и проверить, что run доходит до Netlify build hook

**Роль:** Windows Engineering Assistant  
**Сделано:** cloud-fixes зафиксированы commit-ом `1e9f781` и запушены в `origin/main`. После этого вручную созданы новые runs: `clinic-site-sync` `23408281710` и `review-sync` `23408281709`, оба на `head_sha=1e9f7818272a91cc771601d3dd2afea3e5f41d5b`. На момент фиксации оба workflow уже реально стартовали в GitHub Actions: `clinic-site-sync` дошел до шага `Backfill official clinic sites from YDoc clinic pages`, а `review-sync` дошел до шага `Run review sources to batch file`. Production live-state параллельно подтвержден: Worker `/health` жив, `/api/v1/doctors` -> `2271`, `/api/v1/promotions` -> `59`, Netlify `catalog.json` синхронизирован по этим totals.
**Изменены файлы:** `docs/PROJECT_HISTORY.md`
**Следующий шаг:** дождаться завершения runs `23408281710` и `23408281709`, затем повторно проверить `reviews_summary` coverage и `site_health_status` / `is_hidden` уже после cloud-fix rollout

## 2026-03-22 20:36 — Promotion Freshness Guard Added For Ended Offers
**Роль:** Windows Engineering Assistant  
**Сделано:** после жалобы на публикацию завершенных акций добавлен трехслойный safeguard по promo-pipeline. В Python scraper base-layer появился общий ended/expired detector для акций; он подключен ко всем текущим official promo sources (`smartmedical`, `nordin`, `lode`, `kravira`, `medavenu`, `supramed`, `lighthouse`, `medart`), чтобы завершенные или уже просроченные акции отсекались до batch ingestion. В Worker добавлен `promotion-status` util, и `IngestService` теперь помечает акцию `inactive`, если title/ends_at явно говорят, что она завершена. В `PromotionChannelService` добавлена live-перепроверка source page перед отправкой в Telegram-канал: Worker делает fetch promo URL и, если страница дает `HTTP != 200` или содержит ended marker, акция переводится в `inactive` и не публикуется. Дополнительно усилен SQL-фильтр в `NotificationOutboxRepository`, а live Turso уже очищен от ранее попавших завершенных `SMART MEDICAL` акций. Проверка показала: `active_ended_total=0`, а live `/api/v1/promotions` уменьшился с `59` до `52`, что подтверждает реальное удаление завершенных акций из active-layer.
**Изменены файлы:** `apps/scrapers/scrapers/base.py`, `apps/scrapers/scrapers/smartmedical.py`, `apps/scrapers/scrapers/nordin.py`, `apps/scrapers/scrapers/lode.py`, `apps/scrapers/scrapers/kravira.py`, `apps/scrapers/scrapers/medavenu.py`, `apps/scrapers/scrapers/supramed.py`, `apps/scrapers/scrapers/lighthouse.py`, `apps/scrapers/scrapers/medart.py`, `apps/worker/src/utils/promotion-status.ts`, `apps/worker/src/services/ingest-service.ts`, `apps/worker/src/repositories/notification-outbox-repository.ts`, `apps/worker/src/services/promotion-channel-service.ts`, `docs/PROJECT_HISTORY.md`
**Следующий шаг:** закоммитить и запушить promo-freshness fix в `origin/main`, затем вручную прогнать `promo-sync` и проверить, что завершенные акции больше не создают новых channel posts даже при повторном scrape

## 2026-03-22 20:48 — Production Reality Audit: What Works vs What Still Lags
**Роль:** Windows Engineering Assistant  
**Сделано:** выполнен свежий live-аудит production-контура. Подтверждено: Worker `/health` жив, Telegram webhook runtime жив, `/api/v1/doctors` отдает `2271` врачей, `/api/v1/promotions` после promo-cleanup отдает `52` активные акции, а `active_ended_total=0`. `promo-sync` сейчас стабильно зеленый: свежий scheduled run `23411230208` завершился `success` за `7m56s`. `clinic-site-sync` после workflow-fix тоже уже стабильно зеленый: scheduled run `23410108425` завершился `success` за `28m20s`; live clinic health distribution сейчас `healthy=371`, `unknown=32`, `blocked=16`, `fetch_failed=16`, `redirected_external=5`, `invalid_http=2`, `hidden_total=2`. Бот как 24/7 webhook runtime жив: `/telegram/health` вернул `runtime=cloudflare-worker-webhook`. Главный lag сейчас в двух местах: `review-sync` run `23408281709` все еще висит на шаге `Run review sources to batch file` уже `2h46m+`, а Netlify Mini App по-прежнему обслуживает старый snapshot `generated_at=2026-03-22T16:06:56.961Z` с `2271` врачами и `59` акциями, тогда как live Worker API уже отдает `52` акций. Review coverage пока по-прежнему слабый: `multi_source=13`, `single_source=2242`, `no_source=16`, разбивка по источникам — `ydoc=2146`, `doktora.by=120`, `103.by=2`.
**Изменены файлы:** `docs/PROJECT_HISTORY.md`
**Следующий шаг:** отдельно добить `review-sync` long-run diagnosis и перестроить Mini App snapshot refresh, чтобы Netlify-frontend не отставал от live Worker totals

## 2026-03-22 23:41 — Review Sync Split Into Bounded 103.by And Doktora Workflows
**Роль:** Windows Engineering Assistant  
**Сделано:** устранен главный architectural bottleneck review-layer. Старый `.github/workflows/review-sync.yml` больше не запускает unbounded scheduled crawl; он оставлен только как manual smoke-проверка с bounded лимитами (`103.by + doktora` по малому окну). Вместо него добавлены два отдельных scheduled workflow: `.github/workflows/review-sync-103.yml` и `.github/workflows/review-sync-doktora.yml`. Для `103.by` добавлен windowed crawl по sitemap через env `BY103_URL_OFFSET/BY103_URL_LIMIT`, а для `doktora.by` — windowed crawl по страницам через `DOKTORA_PAGE_OFFSET/DOKTORA_PAGE_LIMIT`. В `BaseScraper` добавлены безопасные env helper-ы для bounded slicing, а scrapers `by103.py` и `doktora.py` реально начали уважать эти окна. Локальный bounded smoke подтвердил работоспособность нового подхода: `103.by` с `BY103_URL_LIMIT=25` дал `doctors_found=11`, `review_summaries_found=11` за ~2 минуты; `doktora.by` с `DOKTORA_PAGE_LIMIT=3` и `MAX_DOCTORS_PER_SOURCE=15` дал `doctors_found=3`, `review_summaries_found=3` за ~1 минуту. Дополнительно зафиксировано, что GitHub repo до сих пор не имеет `NETLIFY_*` secrets, поэтому автоматический deploy свежего snapshot в Mini App пока остается внешним blocker-ом, а не кодовой ошибкой.
**Изменены файлы:** `.github/workflows/review-sync.yml`, `.github/workflows/review-sync-103.yml`, `.github/workflows/review-sync-doktora.yml`, `apps/scrapers/scrapers/base.py`, `apps/scrapers/scrapers/by103.py`, `apps/scrapers/scrapers/doktora.py`, `docs/TODO.md`, `docs/STATE.md`, `docs/DECISIONS.md`, `docs/PROJECT_HISTORY.md`
**Следующий шаг:** закоммитить split-workflow hardening, запушить его в `origin/main`, запустить новые workflows `review-sync-103` и `review-sync-doktora`, затем переснять live coverage по `103.by` и `doktora.by`

## 2026-03-22 23:43 — Split Review Workflows Pushed And Started In GitHub Actions
**Роль:** Windows Engineering Assistant  
**Сделано:** пакет hardening-правок зафиксирован commit-ом `cca73ba` и запушен в `origin/main`. Старый зависший run `review-sync` (`23408281709`) отправлен на отмену, чтобы он больше не занимал cloud window. Вместо него вручную созданы два новых run-а на свежем head: `review-sync-103` (`23412067706`) и `review-sync-doktora` (`23412067697`). На момент фиксации оба workflow уже реально стартовали в GitHub Actions и дошли до setup-steps, значит split не остался “только на бумаге”.
**Изменены файлы:** `docs/PROJECT_HISTORY.md`
**Следующий шаг:** дождаться завершения `23412067706` и `23412067697`, затем заново снять review coverage и понять, насколько выросли `103.by` / `doktora.by` без giant long-run

## 2026-03-22 23:58 — External Strategy Research Completed For Mini App, Reviews And Freshness
**Роль:** Windows Engineering Assistant  
**Сделано:** проведено актуальное внешнее исследование на дату `2026-03-22` по ключевым продуктовым и техническим слоям проекта. Сверены official docs Telegram Mini Apps, GitHub Actions, Netlify build hooks, Google Places policies и 2GIS API, плюс повторно проверены live market players (`YDoc.by`, `103.by`, `doktora.by`, `2GIS`). Зафиксирован главный стратегический вывод: Mini App должен оставаться `snapshot-first` ради скорости в Telegram WebView, но freshness нужно переводить на automated Netlify build hooks из GitHub Actions. Для review-layer подтверждено, что doctor reputation и clinic reputation нужно разделять: `YDoc.by/103.by/doktora.by` — doctor-first, `2GIS` и позже `Google Places` — clinic-first. Исследование занесено в `docs/RESEARCH_LOG.md`.
**Изменены файлы:** `docs/RESEARCH_LOG.md`, `docs/PROJECT_HISTORY.md`
**Следующий шаг:** использовать исследование как основу для следующего engineering пакета: Netlify hook refresh, review matching hardening и clinic reputation layer

## 2026-03-22 23:59 — Netlify Build Hook Added To GitHub Secrets And Wired Into Data Workflows
**Роль:** Windows Engineering Assistant  
**Сделано:** создан отдельный Netlify build hook для Mini App site `medsearch-minsk-miniapp` и записан в GitHub repo secrets как `NETLIFY_BUILD_HOOK_URL`. Проверка подтвердила, что hook отвечает `HTTP 200`, а secret уже виден в `gh secret list`. После этого workflows `.github/workflows/promo-sync.yml`, `.github/workflows/review-sync.yml`, `.github/workflows/review-sync-103.yml`, `.github/workflows/review-sync-doktora.yml` и `.github/workflows/scraper.yml` обновлены: после успешного verify-step они делают безопасный `POST` в build hook, без Netlify personal token и без широких прав на аккаунт. Локальная YAML-валидация прошла успешно.
**Изменены файлы:** `.github/workflows/promo-sync.yml`, `.github/workflows/review-sync.yml`, `.github/workflows/review-sync-103.yml`, `.github/workflows/review-sync-doktora.yml`, `.github/workflows/scraper.yml`, `docs/TODO.md`, `docs/STATE.md`, `docs/DECISIONS.md`, `docs/PROJECT_HISTORY.md`
**Следующий шаг:** закоммитить hook-integration, запушить в `origin/main`, затем вручную прогнать хотя бы один data workflow и убедиться, что после него Netlify build реально стартует автоматически

## 2026-03-23 01:21 — Cloudflare Pages Chosen As The Free Mini App Host
**Роль:** Windows Engineering Assistant
**Сделано:** Netlify production deploy path окончательно признан тупиковым для этого проекта: локальная попытка direct deploy через Netlify CLI вернула `403 Account credit usage exceeded - new deploys are blocked until credits are added`. После этого подтвержден рабочий free-path на Cloudflare Pages: проект `medsearch-minsk-miniapp` уже существует, а локальный direct upload `wrangler pages deploy apps/miniapp/out --project-name medsearch-minsk-miniapp --branch main` успешно создал production deployment `65894373-0803-4ae8-aec7-dc1c81c83668`. В GitHub repo secrets добавлен `CLOUDFLARE_API_TOKEN`, и workflows `.github/workflows/promo-sync.yml`, `.github/workflows/review-sync.yml`, `.github/workflows/review-sync-103.yml`, `.github/workflows/review-sync-doktora.yml`, `.github/workflows/scraper.yml`, `.github/workflows/clinic-site-sync.yml` переведены на `wrangler pages deploy` вместо Netlify.
**Изменены файлы:** `.github/workflows/promo-sync.yml`, `.github/workflows/review-sync.yml`, `.github/workflows/review-sync-103.yml`, `.github/workflows/review-sync-doktora.yml`, `.github/workflows/scraper.yml`, `.github/workflows/clinic-site-sync.yml`, `docs/TODO.md`, `docs/STATE.md`, `docs/DECISIONS.md`, `docs/PROJECT_HISTORY.md`
**Следующий шаг:** закоммитить Cloudflare Pages migration, запушить в `origin/main`, затем повторно прогнать bounded data workflow и проверить, что новый Pages deployment создается автоматически после data-runs

## 2026-03-23 01:48 — Cloudflare Pages Deploy Path Validated In GitHub Actions
**Роль:** Windows Engineering Assistant
**Сделано:** свежий bounded GitHub Actions run `review-sync` `23413937432` успешно дошел до шага `Deploy Mini App to Cloudflare Pages` и завершился `success` за `3m29s`; это подтвердило, что Cloudflare Pages уже не просто локально работает, а реально получает production deploy из data workflow. `wrangler pages deployment list --project-name medsearch-minsk-miniapp` показал свежий production deployment `f6a87eb6-57d8-4e39-9b91-a2bad01207ce` со статусом `Production`, branch `main`, source `1eed67f`, то есть Mini App freshness path теперь подтвержден end-to-end на GitHub Actions + Cloudflare Pages.
**Изменены файлы:** `docs/STATE.md`, `docs/TODO.md`, `docs/PROJECT_HISTORY.md`
**Следующий шаг:** держать Cloudflare Pages deploy path под наблюдением и дальше фокусироваться на review coverage, clinic verification depth и source matching

## 2026-03-23 01:48 — 2doc.by Added As Bounded Hybrid Review/Discovery Source
**Роль:** Windows Engineering Assistant
**Сделано:** добавлен новый scraper `2doc.by` как bounded hybrid review/discovery source. В `apps/scrapers/scrapers/twodoc.py` подключен TL;DR parser для doctor sitemap + inline payload, в `apps/scrapers/scrapers/__init__.py` добавлен registry key `2doc`, в `config.yaml` source получил `insecure_tls: true`, а в `apps/scrapers/scrapers/base.py` robots-check для `insecure_tls` hosts научился читать robots.txt с unverified TLS context, не ломая policy глобально. После этого новый bounded workflow `.github/workflows/review-sync-2doc.yml` дважды успешно прошел в GitHub Actions: первый run подтвердил сам pipeline и Cloudflare Pages deploy, а второй run `23414212650` завершился `success`, дал `doctors_found=25`, `clinics_found=18`, `review_summaries_found=25`, и `Verify 2doc review coverage` показал `source_name='2doc.by' -> 25 rows` в live Turso. Cloudflare Pages также получил свежий production deploy `56946859-79cf-40ed-95d2-56d9a0149c78`.
**Изменены файлы:** `apps/scrapers/http_client.py`, `apps/scrapers/scrapers/base.py`, `apps/scrapers/scrapers/__init__.py`, `apps/scrapers/scrapers/twodoc.py`, `config.yaml`, `selectors.yaml`, `.github/workflows/review-sync-2doc.yml`, `docs/STATE.md`, `docs/TODO.md`, `docs/PROJECT_HISTORY.md`
**Следующий шаг:** после подтверждения 2doc by coverage либо расширить его matching/chunking, либо перейти к массовому review-source matching для `103.by` / `doktora.by` / `2doc.by`
