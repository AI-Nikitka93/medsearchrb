# Execution Map

Обновлено: `2026-03-30`

Это главный рабочий файл для возобновления проекта после паузы.
Если сессия прервалась, стартовать нужно отсюда.

## Как читать

- `[x]` сделано
- `[-]` в работе
- `[ ]` не начато
- `[!]` заблокировано

## Северная звезда

Собрать лучший `Telegram-native` сервис поиска врача в Минске:
- врач
- клиника
- агрегированные отзывы
- живые акции
- переход на оригинальную запись

Не цель:
- строить полноценный госпитальный ERP / EHR
- конкурировать с глобальными платформами по масштабу прямо сейчас
- тащить в каталог всё подряд без trust-фильтра

## Текущее состояние продукта

### Live сейчас

- `Mini App`: `https://medsearch-minsk-miniapp.pages.dev`
- `Worker API`: `https://medsearchrb-api.aiomdurman.workers.dev`
- `Telegram channel`: `https://t.me/medsearch_minsk`

### Что уже реально есть

- `[x]` живой `Worker API`
- `[x]` живой `Telegram webhook`
- `[x]` живой `Mini App`
- `[x]` канал с автопостингом акций
- `[x]` snapshot-first загрузка Mini App
- `[x]` doctor catalog
- `[x]` promotions feed
- `[x]` multi-source reviews

### Последний зафиксированный baseline

- live API `doctors total`: `10225`
- live API `promotions total`: `73`
- `Аква-Минск Клиника`: `4` promo rows confirmed in Turso, `4` posts confirmed in channel, `4` rows confirmed in live API when queried by clinic slug
- на общем `/promotions?page=1` видно только `3`, потому что `per_page` capped at `50` and the 4th item lands on `page=2`
- последний подтвержденный публичный диапазон постов в канале: до `Аква-Минск` wave включительно

### Последний quality baseline

Из внутреннего аудита:

- `doctors_visible = 3252`
- `clinics_visible = 641`
- `promotions_active = 48`
- `duplicate_doctor_name_groups = 151`
- `duplicate_doctor_rows = 302`
- `doctors_without_active_clinic = 149`
- `doctors_with_verified_clinic_link = 22`

## Главные рабочие направления

### 1. Catalog Trust P0
Статус: `[-] in progress`

- [ ] сократить `duplicate_doctor_name_groups` с `151` до `30` или ниже
- [ ] сократить `doctors_without_active_clinic` с `149` до `30` или ниже
- [ ] поднять `doctors_with_verified_clinic_link` с `22` хотя бы до `200`
- [ ] убрать category drift: немедицинские и спорные сущности не должны загрязнять ядро каталога
- [ ] усилить `doctor -> clinic` verification как основу для Mini App CTA

Почему это важно:
- без этого ranking, карточки и переходы на запись будут выглядеть менее надежно, чем у сильных конкурентов

### 2. Promo Reliability P0
Статус: `[-] in progress`

- [ ] убрать рассинхрон между `API`, `Mini App` и `Telegram channel`
- [x] direct ingest auth восстановлен локально: `401 ingest token is invalid` больше не воспроизводится после нормализации env loading
- [x] локальный Windows backfill path восстановлен для `catalog:backfill`
- [x] `Аква-Минск Клиника` доведен до live Turso + channel dispatch
- [x] выяснено, что `3/4` на общем live API было не drift, а pagination artifact (`per_page <= 50`, 4th row on `page=2`)
- [ ] решить стратегию по `Мерси`: брать не только `/stock/`, но и service-page promo blocks
- [ ] формализовать правило: если `service-page promo` новее `stock-detail`, чему доверяем
- [ ] добить promo-source expansion только через official verified routes

Почему это важно:
- promo-layer сейчас уже ценен, но ещё не достаточно предсказуем как системный trust-layer

### 3. Mini App Product P1
Статус: `[-] in progress`

- [x] облегчена первая загрузка через `catalog-list.json` и `promotions.json`
- [ ] подтвердить Mini App именно из Telegram entrypoint после последних изменений
- [ ] усилить search UX: specialty / clinic / doctor / promo intent должны вести в лучший следующий экран
- [ ] добавить clinic-first сценарий, а не только doctor-first
- [ ] добавить saved state / recent searches / follow-up loop
- [ ] улучшить промо-экран: сроки, статус актуальности, клиника, CTA
- [ ] улучшить detail-card врача: официальная запись first, агрегатор second

### 4. Bot Evolution P1
Статус: `[ ] not started as product track`

- [ ] превратить бот из menu-shell в полезного ассистента
- [ ] добавить problem-based вход: "болит спина", "нужен гинеколог", "ищу ЛОР рядом"
- [ ] добавить clinic / specialty / promo deep-link сценарии
- [ ] добавить лучший handoff из бота в Mini App

Почему это важно:
- сейчас бот хороший как вход, но слабый как самостоятельный продуктовый слой

### 5. Channel & Growth P1
Статус: `[-] in progress`

- [x] есть автоматическая публикация акций
- [ ] добиться нулевого рассинхрона channel vs API
- [ ] улучшить шаблоны постов и порядок публикации
- [ ] ввести follow / alert-механику по клинике, специальности или типу акции
- [ ] сделать канал не просто лентой, а retention-loop для Mini App

### 6. Positioning & Market Fit P1
Статус: `[-] defined, but not finalized`

Текущее лучшее позиционирование:

`Telegram-native сервис поиска врача в Минске: врач + клиника + отзывы + акции + переход на оригинальную запись.`

Что надо закрепить:

- [ ] единое короткое позиционирование для README / bot / channel / landing
- [ ] жёстко удерживать фокус: `Минск`, `медицина`, `trust`, `акции`, `оригинальная запись`
- [ ] не размывать ядро в сторону "всё обо всём"

## Текущие блокеры

### Blocker A
Статус: `[!]`

Live worker deploy сейчас заблокирован Cloudflare account mismatch:

- текущий `wrangler` token логинится в account `66f004592f734d5e3a78f24ba7c03118`
- сервис `medsearchrb-api` привязан к account `64b38702090e458c489bb7981c0b2727`
- `wrangler deploy` падает с `Authentication error [code: 10000]`

Следствие:

- локальные fixes уже рабочие, но нельзя нормально выкатить новый worker code path до выравнивания Cloudflare account access
- чтобы снять зависимость от локального OAuth, добавлен обходной deploy path:
  - workflow `.github/workflows/worker-deploy.yml`
  - helper `scripts/sync-worker-github-secrets.ps1`
- production check уже выполнен: GitHub Actions run `worker-deploy` `23752689339` подтвердил, что workflow и repo secrets wiring работают, но сам `CLOUDFLARE_API_TOKEN` в GitHub сейчас недействителен
- точная ошибка из шага `Show Cloudflare auth account`: `Invalid access token [code: 9109]`

### Blocker B
Статус: `[-]`

Нужно довести новую policy публикации до production runtime:

- channel теперь должен публиковать только promo с date evidence (`ends_at` или свежий `published_at`)
- часть источников пока ещё не извлекает `published_at`

Следствие:

- до расширения promo-layer нужно пройтись по scraper-ам и дотянуть реальные promo dates там, где они доступны

## Что уже нельзя терять

Это уже подтверждено и не должно быть забыто:

- `[x]` `gurumed` live published
- `[x]` `paracels` live published
- `[x]` `idealmed` source реализован
- `[x]` `medera / Эра` source реализован
- `[x]` `aquaminsk` source реализован, дал `4 promotions`, и stale outbox был поднят через reclaim logic
- `[x]` `merci` требует отдельной service-page логики, а не только `/stock/`
- `[x]` `Mini App` first screen был уже починен через lightweight snapshots
- `[x]` `notification_outbox` теперь имеет `claimed_at` и умеет reclaim-ить stale `processing`
- `[x]` `apply-migrations` теперь корректно читает `.env.txt -> .env -> .env.local` и снова работает на Windows
- `[x]` channel guard ужесточён: без `ends_at` или свежего `published_at` акция больше не должна автоматически уходить в Telegram

## Следующий рабочий порядок

Идти именно так, не перепрыгивать:

1. `[x]` прогнать `powershell -File scripts/sync-worker-github-secrets.ps1`
2. `[x]` активировать и проверить workflow `worker-deploy`
3. `[ ]` заменить GitHub secret `CLOUDFLARE_API_TOKEN` на действующий token account `64b387...`
4. `[ ]` повторно запустить `worker-deploy`
5. `[ ]` после deploy повторно проверить `GET /api/v1/promotions`, channel и mini app
6. `[ ]` пройтись по promo-scraper-ам и дотянуть `published_at` там, где дата реально доступна
7. `[ ]` затем брать следующую волну promo expansion
8. `[ ]` параллельно запускать cleanup `Catalog Trust P0`

## Definition of Done для ближайшего этапа

Этап считается закрытым только если одновременно выполнено всё ниже:

- [x] `Аква-Минск` виден в live API
- [x] `Аква-Минск` доехал в канал без зависшей `processing` записи
- [x] по `Аква-Минск` расхождение закрыто как pagination artifact, а не как data drift
- [ ] есть понятный рабочий path для добавления новых official promo sources
- [ ] baseline по catalog trust начал реально улучшаться, а не только измеряться

## Resume Here

Если работа возобновляется с нуля, начать с этого мини-чеклиста:

1. Открыть этот файл
2. Проверить `Blocker A` и `Blocker B`
3. Проверить live:
   - `GET /api/v1/promotions`
   - `GET /api/v1/doctors?page=1&per_page=5`
   - `https://t.me/s/medsearch_minsk`
4. Проверить `Аква-Минск`: Turso `4`, channel `4`, live API `4` по clinic filter; на общем feed page 1 допустимо видеть `3`, если 4-я запись ушла на `page=2`
5. Только потом переходить к новым клиникам или новому UX
