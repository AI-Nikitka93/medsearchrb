# MedsearchRB Execution Backlog

_Последнее обновление: 2026-03-22 14:48 | Роль: Windows Engineering Assistant_

## Must

- [ ] Review Layer P1 — добавить `103.by` и `doktora.by` как production doctor-review sources
  - Цель: перейти от single-source YDoc к реальному multi-source reputation layer для врачей.
  - Вход: подтвержденные detail-page markers `103.by: ratingValue/reviewCount/clinic blocks`, `doktora.by: average-rating/total-votes/bg-review`.
  - Definition of Done:
    - scrapers для `103.by` и `doktora.by` получают `rating_avg`, `review_count`, `source_page_url`, specialty и clinic mention;
    - данные доходят в `reviews_summary`;
    - Worker API list/detail агрегируют рейтинг по нескольким источникам;
    - Mini App detail показывает source breakdown хотя бы как summary по источникам.
  - Сложность: L
  - Риск блокера: средний, возможны нестабильные detail-page шаблоны и долгие full runs.

- [ ] Review Layer P2 — добавить `2doc.by` как hybrid doctor discovery/review source
  - Цель: усилить discovery/booking layer и добавить второй doctor-source.
  - Вход: открытый `sitemap-doctor.xml`, inline payload с `doctor`, `clinic`, `service`.
  - Definition of Done:
    - scraper читает structured payload `2doc.by`;
    - в ingest попадают `rating`, `comment_count`, clinic relation и booking/discovery signals;
    - doctor detail API хранит source breakdown без конфликта с YDoc.
  - Сложность: M
  - Риск блокера: низкий-средний, возможна смена inline payload формата.

- [ ] Clinic Verification P1 — завершить первый cloud run `clinic-site-sync` и закрепить suppression policy
  - Цель: убрать битые и закрытые клиники из пользовательской выдачи.
  - Вход: live workflow `clinic-site-sync`, `site_health_status`, `site_failure_count`.
  - Definition of Done:
    - первый cloud run завершен;
    - зафиксированы статусы `healthy/blocked/fetch_failed/redirected_external`;
    - suppression policy подтверждена на повторных fail кейсах;
    - `STATE.md` и `PROJECT_HISTORY.md` обновлены по результату.
  - Сложность: S
  - Риск блокера: низкий.

- [ ] Doctor Verification P2 — вынести `doctor-clinic-verify` в отдельный cloud step
  - Цель: подтверждать, что врач реально работает в клинике по official site.
  - Definition of Done:
    - отдельный workflow/job создан;
    - `doctor_clinics.verified_on_clinic_site` и `official_*` поля реально наполняются;
    - CTA Mini App используют verified-first логику.
  - Сложность: L
  - Риск блокера: высокий, разные сайты клиник и слабая унификация.

## Should

- [ ] Promo Coverage Expansion — добавить новые official promo/news sources по клиникам Минска
  - Цель: увеличить coverage Telegram channel и Mini App promotions.
  - Приоритетные кандидаты: `Nordin`, затем следующий инвентарь клиник с public promo/news pages.
  - Definition of Done: promotions total и source coverage растут cloud-only, без локального ПК.

- [ ] Doctor Catalog Diagnostics — понять, почему nightly `YDoc` дает `updated=5729`, а live total почти не растет
  - Цель: устранить bottleneck в unique doctor growth.
  - Definition of Done: зафиксирована причина dedup/merge эффекта и выбран safe fix.

- [ ] Mini App UX P2 — вторая волна polish под Telegram WebView
  - Цель: довести mobile UX до более плотного и понятного состояния.
  - Definition of Done: новый Telegram screenshot подтверждает улучшение без новых UX-артефактов.

## Could

- [ ] Clinic Reputation Layer — подключить `2GIS` как clinic-first review source
  - Цель: отделить репутацию клиники от репутации врача.

- [ ] Maps Layer Research — отдельно проверить feasibility `Google Maps` и `Yandex Maps`
  - Цель: решить, где нужен API/атрибуция, а где scraping path вообще не стоит брать.

- [ ] Bot UX Expansion — добавить richer conversational entrypoints поверх Mini App
  - Цель: бот не только открывает Mini App, но и помогает навигировать по сценариям.

## Current Focus

- [ ] Активный трек: `Cloud Pipeline Hardening (clinic-site-sync + review-sync + 103.by URL fix)`
- [ ] Следующий после него: `Clinic Verification P1 + review matching coverage`
