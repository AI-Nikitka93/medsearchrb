# MedsearchRB Roadmap to 100/100

_Последнее обновление: 2026-03-23 21:33 Europe/Minsk_

## Цель

Довести проект до состояния, где он:

- честно показывает врачей, клиники, отзывы и акции;
- не теряет доверие из-за дублей, битых ссылок и архивного шума;
- стабильно обновляется без ручного ПК;
- хорошо выглядит и понятно ведет пользователя в Telegram.

`100/100` для нас — это не “много фич”, а сочетание:

- `Data trust`
- `Runtime stability`
- `Truthful UX`
- `Reliable distribution`

## Baseline на 2026-03-23

Baseline снят командой:

```powershell
npm --prefix apps/worker run catalog:audit -- --format json
```

Текущие цифры:

- Врачи в каталоге: `3252`
- Клиники в каталоге: `641`
- Активные акции: `48`
- Врачи без активной клиники: `149`
- Врачи без отзывов: `1574`
- Врачи с 1 review-source: `1630`
- Врачи с 2+ review-sources: `48`
- Врачи с verified clinic link: `22`
- Группы дублей врачей по имени: `151`
- Строки внутри этих дублей: `302`
- Группы дублей клиник по normalized_name: `0`

Review coverage:

- `ydoc`: `952`
- `103.by`: `643`
- `doktora.by`: `120`
- `2doc.by`: `12`

Clinic health:

- `healthy`: `375`
- `unknown`: `230`
- `fetch_failed`: `17`
- `blocked`: `14`
- `redirected_external`: `5`
- `invalid_http`: `2`

## Фазы до 100/100

### Phase 1 — Catalog Trust P0

Цель: убрать самые токсичные причины недоверия к каталогу.

Definition of Done:

- дубли врачей сокращены с `151` групп до однозначно меньшего числа;
- врачи без активной клиники сокращены с `149`;
- заведен повторяемый audit-командный контур;
- roadmap и remediation опираются на цифры, а не на ощущения.

Подзадачи:

1. Exact duplicate audit и remediation plan
2. Cleanup orphan doctors without clinic link
3. Stronger doctor identity matching
4. Clinic alias reconciliation, если exact name недостаточен

Статус: `ACTIVE`

### Phase 2 — Review Truth P1

Цель: сделать рейтинг врача честным и понятным.

Definition of Done:

- rating считается только из валидных source-level ratings;
- UI показывает `1 источник / 2 источника / 3 источника`;
- если рейтинга нет, пользователь видит нейтральный trust-state, а не “0”.

Подзадачи:

1. Дожать extraction `rating_avg` там, где сейчас есть только `reviews_count`
2. Улучшить matching между `ydoc`, `103.by`, `doktora.by`, `2doc.by`
3. Добавить truthful aggregate rating и trust labels в API/Mini App

Статус: `PLANNED`

### Phase 3 — Promo Integrity P1

Цель: чтобы в канал и в Mini App не просачивались архивные или завершенные акции.

Definition of Done:

- active promo layer очищен от старых news-style pages;
- AI audit используется только как conservative second opinion;
- канал не постит явный архив;
- coverage по клиникам Минска продолжает расти без деградации качества.

Подзадачи:

1. Source-specific stale cleanup
2. AI-assisted audit только для ambiguous promo
3. Freshness rules по источникам
4. Coverage expansion по частным клиникам Минска

Статус: `IN_PROGRESS`

### Phase 4 — Clinic Verification P1

Цель: честно знать, жива ли клиника и реально ли врач там принимает.

Definition of Done:

- clinic health runs стабильно обновляют `site_health_status`;
- verified clinic links растут выше текущих `22` врачей;
- UI различает `официально подтверждено` и `только агрегатор`.

Подзадачи:

1. Дожать clinic-site-sync
2. Вынести doctor-clinic verification в отдельный cloud step
3. Переопределить CTA в verified-first логике

Статус: `IN_PROGRESS`

### Phase 5 — Product Polish P2

Цель: довести UX бота, Mini App и канала до ощущения законченного продукта.

Definition of Done:

- home/list/detail в Mini App выглядят уверенно и быстро;
- бот полезен не только как launcher Mini App;
- канал имеет внятный editorial style и trust cues.

Подзадачи:

1. Mini App UX polish
2. Bot conversational flows
3. Channel copy system and templates

Статус: `PLANNED`

## Что делаем первым

Первый обязательный трек: `Catalog Trust P0`.

Причина:

- дубли и сиротские карточки подрывают доверие к продукту сильнее, чем отсутствие еще одной фичи;
- без этого мы не дойдем до “честного” doctor detail, truthful rating и надежных CTA.

## Уже запущено

Уже создан и работает базовый инструмент для этого трека:

- `apps/worker/scripts/catalog-quality-audit.ts`
- команда:

```powershell
npm --prefix apps/worker run catalog:audit -- --format markdown
```

Это и есть старт выполнения roadmap, а не только планирование.
