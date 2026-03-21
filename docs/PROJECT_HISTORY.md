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
