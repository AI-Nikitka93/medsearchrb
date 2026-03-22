# Research Log

## [ТЕМА: Рынок агрегаторов врачей и записи к врачу в Беларуси]
_Последнее обновление: 2026-03-21 | Роль: Product Strategist_
Статус: Актуально

- Контекст: проект "единый агрегатор врачей Беларуси" для Telegram Mini App + Telegram-канала.
- Источники, проверенные вручную:
  - https://www.103.by/
  - https://info.103.by/medorg
  - https://103.by/robots.txt
  - https://talon.by/
  - https://talon.by/terms
  - https://talon.by/robots.txt
  - https://apps.apple.com/by/app/talon-by/id6445949725
  - https://2doc.by/
  - https://2doc.by/law
  - https://2doc.by/robots.txt
  - https://ydoc.by/
  - https://ydoc.by/info/terms-of-use/
  - https://ydoc.by/info/publishing-policy/
  - https://ydoc.by/robots.txt
  - App Store / search snippets for 103 app
- Подтвержденные факты:
  - 103.by позиционируется как каталог клиник, услуг, врачей и лекарств; на главной заявляет 25 000+ специалистов, 15 000+ детских специалистов, 5 000+ услуг и 1000+ медцентров.
  - 103.by заявляет в b2b-материалах: до 40% пациентов записываются напрямую из карточки медцентра и до 8 млн поисков лекарств в месяц.
  - talon.by живой и крупный: главная заявляет запись к врачам в 325 поликлиниках и медцентрах по всей Беларуси; сервис охватывает талоны, платные услуги, анализы и лекарства.
  - App Store Talon.by: рейтинг 4.9 при 4938 оценках, что является сильным сигналом массового использования.
  - 2doc.by активен, но по контенту и позиционированию заметно более узок: основной value prop завязан на Минск, а на главной среди ключевых специализаций видны дерматолог, УЗИ-специалист, стоматолог, гинеколог.
  - YDoc в Беларуси существует как отдельный review-first слой: на момент проверки показывал 3595 отзывов, 2533 врачей и 2198 клиник.
  - У 103.by и talon.by есть официальные Telegram-каналы, но их связка выглядит скорее бренд-медийной, чем как узкий consumer loop "скидки + свежие отзывы + быстрый переход в поиск".
  - robots.txt:
    - 103.by разрешает часть страниц и запрещает search/profile/query-пути.
    - talon.by запрещает множество служебных и query-путей, включая search и order/service-пути с параметрами.
    - ydoc.by запрещает служебные разделы, включая appointment/newcomment/profile.
    - 2doc.by robots.txt максимально открыт и разрешает `Allow: /`.
  - Юридические ограничения на отзывы и материалы высокие:
    - YDoc в политике публикации прямо запрещает копирование/распространение материалов без письменного разрешения и отдельно регулирует цитирование отзывов.
    - Talon.by в соглашении прямо пишет, что любой просмотр, поиск или сбор информации возможен только при полном принятии условий соглашения; сервис может менять и удалять информацию без уведомления.
- Выводы для стратегии:
  - Рынок уже занят 3 разными паттернами:
    - 103.by = широкий health marketplace.
    - talon.by = запись/расписания по Беларуси.
    - YDoc = отзывы.
  - Широкий горизонтальный агрегатор "всё про всех врачей РБ" для MVP слишком слаб как позиционирование и слишком тяжел как парсинг.
  - Реалистичный beachhead для MVP: Минск + частные клиники + специальности с повторяющимся сравнительным выбором и частыми акциями/отзывами.
  - Самый безопасный legal-подход по отзывам: не репаблишить полный пользовательский контент, а хранить агрегированные сигналы, короткие выдержки в допустимом формате и всегда вести на оригинал.
- Handoff:
  - Для следующего шага использовать узкий MVP вместо full-market scraping.
  - Отдельно считать review ingestion и stock/discount ingestion как два независимых риска.

## [ТЕМА: Крупные частные медцентры Беларуси и механика записи]
_Последнее обновление: 2026-03-21 | Роль: Product Strategist_
Статус: Актуально

- Контекст:
  - Проверялись официальные сайты крупных и заметных частных медцентров в Минске, чтобы понять, насколько у них развита собственная digital-запись и какие сценарии записи реально существуют.
- Источники, проверенные вручную:
  - https://www.lode.by/
  - https://www.lode.by/patients/mobile-application
  - https://app.lode.by/
  - https://www.lode.by/patients/rules-for-pre-registration-/
  - https://www.nordin.by/
  - https://www.kravira.by/
  - https://www.kravira.by/zapis/
  - https://medart.by/
  - https://sante.by/
- Подтвержденные факты:
  - ЛОДЭ:
    - на сайте встроен собственный medical widget;
    - есть отдельный web-app `app.lode.by`;
    - есть мобильное приложение в App Store и Google Play;
    - в приложении заявлены функции: запись к врачу, регистрация перед приемом, оплата визита, заключения врачей, результаты анализов, история посещений;
    - в правилах предварительной записи подтвержден как минимум канал через контакт-центр и через мобильное приложение LODE.
  - Нордин:
    - на сайте есть собственный booking widget и CTA `Записаться на прием`;
    - основной короткий номер: `159`;
    - дополнительно опубликованы WhatsApp / Viber / Telegram bot (`https://t.me/nordin_medcentr_bot`);
    - онлайн-запись не является финальным self-serve slot booking: сайт прямо предупреждает, что это предварительная заявка, после которой администраторы подтверждают время.
  - Кравира:
    - сайт содержит отдельную страницу `zapis` и `Личный кабинет`;
    - есть `Заказать звонок`;
    - онлайн-запись также оформлена как предварительная заявка; после 21:00 обратная связь переносится на следующий день.
  - МедАрт:
    - на главной подтвержден собственный online booking widget (`online-booking-widget__toggler`);
    - сайт прямо заявляет: запись онлайн доступна круглосуточно;
    - базовый сценарий записи подтвержден как сайт + телефон.
  - Sante:
    - на сайте есть явные CTA `Запись на прием`;
    - опубликованы телефоны записи и короткий номер `155`;
    - в публичном HTML виден признак `appointment_button:true`;
    - глубина сценария записи без интерактивной проверки не подтверждена: из статического контента видно наличие собственной формы/модали, но не видно, это слотинг или лид-форма.
- Выводы для стратегии:
  - Не все крупные частные клиники дают полноценную self-serve онлайн-запись; часть игроков по факту работает как `request + admin confirmation`.
  - Для MVP агрегатора это хорошо: такие клиники легче встраиваются в click-out модель без необходимости синхронизировать реальные слоты.
  - Самый digital-зрелый игрок в этой выборке — ЛОДЭ; по нему выше риск, что лучший UX уже закрыт в собственном приложении/кабинете.
  - Нордин и Кравира важны как high-value источники, потому что у них есть web запись, но пользовательский путь еще не полностью автоматизирован.
  - Sante и МедАрт нужно рассматривать как отдельные цели для ручной UX-проверки, если они войдут в beachhead-список клиник.
- Handoff:
  - Для MVP приоритизировать источники, где запись представлена как форма/заявка/колл-центр, а не как полностью закрытый кабинет.
  - ЛОДЭ держать как важный бренд, но не как первый приоритет для глубокой интеграции данных записи.
  - Актуальное scope-решение: `только Минск`, но `все специальности`.

## [ТЕМА: Правовая база агрегатора врачей в Республике Беларусь]
_Последнее обновление: 2026-03-21 | Роль: Compliance & Legal Engineer_
Статус: Актуально

- Контекст:
  - Прорабатывалась юридическая обвязка для Telegram Mini App + бота + канала, который агрегирует публичные данные о врачах и клиниках в Минске и не оказывает медицинские услуги.
- Источники:
  - https://cpd.by/en/national-regulation/
  - https://cpd.by/en/national-regulation/the-belarusian-data-protection-act/
  - https://pravo.by/upload/docs/op/H12100099_1620939600.pdf
  - ранее проверенные условия источников отзывов и контента:
    - https://ydoc.by/info/publishing-policy/
    - https://talon.by/terms
- Подтвержденные факты:
  - Закон Республики Беларусь от 07.05.2021 № 99-З применяется к автоматизированной обработке персональных данных и к базам/реестрам, где есть поиск или доступ по критериям.
  - Базовые термины для документов проекта должны быть белорусскими, а не GDPR-калькой:
    - `оператор`;
    - `субъект персональных данных`;
    - `обработка`;
    - `удаление`;
    - `ограничение`.
  - Закон признает `publicly disclosed personal data` / ранее распространенные персональные данные как отдельную категорию; их можно обрабатывать до требования субъекта о прекращении обработки и удалении при отсутствии иных законных оснований.
  - По закону:
    - информация об обработке предоставляется в течение `5 рабочих дней`;
    - требования о прекращении обработки, удалении и изменении данных рассматриваются в течение `15 дней`.
  - Если у оператора нет технической возможности немедленного удаления, он обязан принять меры по недопущению дальнейшей обработки, включая ограничение/блокирование.
  - Данные, указанные в документе или сообщении, адресованном оператору, могут обрабатываться в пределах содержания такого обращения без отдельного согласия.
  - Национальный центр защиты персональных данных Республики Беларусь является профильным надзорным органом и принимает жалобы субъектов.
  - Для агрегатора врачей есть важное разграничение:
    - врач как физическое лицо обычно является субъектом персональных данных;
    - клиника как юридическое лицо не всегда попадает под режим DSAR и часто требует отдельной бизнес-процедуры, а не чистого privacy-flow.
  - История поиска пользователя по врачам и специальностям может косвенно указывать на интерес к медицинским вопросам; для MVP ее хранение нужно ограничить и по возможности включать только по явному пользовательскому действию.
  - Полные тексты отзывов остаются зоной высокого риска:
    - у YDoc есть прямые ограничения на копирование/распространение материалов;
    - поэтому безопасное правило для MVP: `рейтинг + количество отзывов + источник`, а текстовые выдержки только после source-by-source legal review.
- Выводы для реализации:
  - Для проекта подходит белорусский privacy-профиль, а не чистый GDPR-шаблон.
  - В публичных документах нужно жестко зафиксировать:
    - сервис не является клиникой;
    - сервис не дает медицинских советов;
    - сервис не гарантирует точность расписания и цен;
    - сервис выступает как поисковый агрегатор ссылок.
  - В архитектуре обязательно нужны:
    - `is_hidden`;
    - `opt_out`;
    - suppression-логика, запрещающая повторную публикацию скрытого врача или клиники после следующего парсинга.
  - Для врача нужен формальный opt-out/DSAR path с верификацией личности.
  - Для клиники нужен отдельный риск-ориентированный takedown flow, особенно для акций и выдержек из отзывов.
- Handoff:
  - До релиза обязательно заполнить реквизиты оператора, privacy email и почтовый адрес.
  - До включения excerpt-ов из отзывов провести отдельную правовую проверку каждого источника.
  - Для MVP безопаснее запускаться без full-text отзывов и без долгого хранения истории поиска.

## [ТЕМА: Бесплатный архитектурный стек для медагрегатора]
_Последнее обновление: 2026-03-21 | Роль: Technical Architect_
Статус: Актуально

- Контекст:
  - Нужно было выбрать бесплатный production-capable стек для MVP: БД (`Turso` vs `Supabase`) и edge/backend платформа (`Cloudflare Workers` vs `Vercel`).
- Источники:
  - https://turso.tech/pricing
  - https://developers.cloudflare.com/pages/functions/pricing/
  - https://developers.cloudflare.com/workers/platform/limits/
  - https://vercel.com/docs/plans/hobby
  - https://supabase.com/docs/guides/platform/billing-on-supabase
  - https://supabase.com/docs/guides/platform/performance
- Подтвержденные факты:
  - Turso Free:
    - `100` databases;
    - `5 GB` total storage;
    - `500 Million` rows read per month;
    - `10 Million` rows written per month;
    - `1 day` point-in-time restore.
  - Cloudflare Pages / Workers:
    - static asset requests on Pages are `free and unlimited`;
    - free plan daily request limit for Workers/Pages Functions is `100,000/day`;
    - Workers Free plan CPU time is `10 ms` per invocation;
    - Workers Free plan supports `5` Cron Triggers per account;
    - Workers Free plan supports `50` subrequests per request.
  - Vercel Hobby:
    - официально описан как plan for `personal, non-commercial use`;
    - functions quota на Hobby — `1M invocations / month`;
    - max duration зависит от runtime, но сам план юридически слаб для коммерческого продукта.
  - Supabase Free:
    - `500 MB` database size;
    - `5 GB` bandwidth;
    - free projects can be `paused after 1 week of inactivity`;
    - для паузы и restore есть отдельный operational path, что создает cold-start/availability risk для бота и Mini App.
- Выводы для архитектуры:
  - Для planned commercial продукта `Vercel Hobby` исключается первым — не по технике, а по условиям использования.
  - `Cloudflare Workers` подходит лучше: static assets не съедают quota, а webhook/API можно держать в одном runtime.
  - `Turso` лучше подходит для read-heavy каталога и проще вписывается в $0-ограничение, чем `Supabase Free`.
  - Ограничения `Cloudflare Workers Free` требуют thin-worker архитектуру:
    - не более 1-2 DB операций на request path;
    - no runtime dedupe;
    - no fan-out в поисковом запросе.
- Handoff:
  - При инженерной реализации отдельно зафиксировать exact packages и версии после повторной official-docs проверки.
  - Если продукт начнет стабильно выходить за `100,000 requests/day`, первым кандидатом на scale-up будет именно runtime, а не БД.

## [ТЕМА: Парсинг частных клиник и review-порталов]
_Последнее обновление: 2026-03-21 | Роль: Web Intelligence Engineer_
Статус: Актуально

- Контекст:
  - Нужно было спроектировать первый production-like scraper slice для `Минск + частные клиники + review summaries`, без full-text отзывов и без локальной SQLite.
- Источники:
  - https://medart.by/robots.txt
  - https://ydoc.by/robots.txt
  - https://nordin.by/robots.txt
  - https://kravira.by/robots.txt
  - https://www.103.by/robots.txt
  - https://medart.by/spetsialisty/
  - https://medart.by/stocks/
  - https://ydoc.by/minsk/vrach/
  - https://ydoc.by/minsk/vrach/49233-zhurba/
  - `python -m pip index versions curl_cffi`
  - `python -m pip index versions nodriver`
- Подтвержденные факты:
  - `medart.by` и `ydoc.by` отдают SSR HTML на публичных страницах; для initial slice браузер не обязателен.
  - `medart.by`:
    - публичные страницы специалистов и акций доступны без авторизации;
    - doctor URLs имеют устойчивый паттерн `/spetsialisty/<specialty>/<slug>/`;
    - на сайте есть JSON-LD `MedicalOrganization`, из которого можно взять clinic name/address.
  - `ydoc.by`:
    - публичный doctor list доступен по `/minsk/vrach/`;
    - карточки врачей рендерятся в SSR (`div.b-doctor-card`);
    - doctor detail pages содержат summary review signals и встроенные SSR props с полями вроде `stars`, `rating`, `official_rating`;
    - для MVP безопасно брать только `rating_value` и `review_count`, без текстов отзывов.
  - Robots / risk summary:
    - `medart.by`: search/auth/personal/ajax/query endpoints запрещены, но выбранные public pages допустимы;
    - `ydoc.by`: `/ajax/`, `/appointment/`, `/newcomment/`, `/profile/` и смежные flows запрещены; public doctor pages допустимы;
    - `103.by` имеет более жесткие query/path ограничения и higher legal/robots risk, поэтому не включен в первый runnable slice.
  - Package versions, проверенные на дату:
    - `curl_cffi` latest: `0.14.0`;
    - `nodriver` latest: `0.48.1`;
    - `beautifulsoup4` latest: `4.14.3`;
    - `PyYAML` latest: `6.0.3`.
- Выводы для реализации:
  - Primary stealth transport: `curl_cffi` с `impersonate="chrome136"`.
  - Browser stack (`Nodriver`) держать как escalation path, но не тянуть в initial dependency set без необходимости.
  - Первый runnable набор источников:
    - `MedArt` для doctors + clinic + promotions;
    - `YDoc` для doctors + aggregated review summaries.
  - Output mode:
    - по умолчанию сохранять source batch в `%LOCALAPPDATA%\MedsearchRB\scraper\...` на Windows;
    - в CI и следующем шаге переключать на POST в `/internal/ingest/source-batch`.
- Handoff:
  - Перед добавлением новых источников повторять `robots.txt + ToS + SSR/XHR` разведку.
  - Для `103.by` нужен отдельный legal/robots review и, вероятно, другой уровень throttling.
  - Если сайты начнут отдавать JS challenge или `403/429`, первым fallback должен быть `Nodriver`, а не агрессивное повышение частоты запросов.

## [ТЕМА: Telegram bot core для MedsearchRB]
_Последнее обновление: 2026-03-21 | Роль: Bot Architect & Engineer_
Статус: Актуально

- Контекст:
  - Нужно было собрать локальный Telegram bot shell на `Python + aiogram 3.x` для dev/testing в polling mode, без БД и без production webhook-деплоя.
- Источники:
  - https://core.telegram.org/bots/api
  - https://core.telegram.org/bots/api-changelog
  - https://docs.aiogram.dev/en/dev-3.x/
  - https://pypi.org/project/aiogram/
  - `python -m pip index versions aiogram`
  - `python -m pip index versions python-dotenv`
- Подтвержденные факты:
  - `aiogram` latest на дату проверки: `3.26.0`.
  - `python-dotenv` latest на дату проверки: `1.2.2`.
  - Официальная документация `aiogram 3.26.0` указывает совместимость с `Telegram Bot API 9.5`.
  - Для текущего Telegram UI достаточно inline keyboard + `web_app` button.
  - `InlineKeyboardButton.style` поддерживается в текущем стеке и подтвержден локальным validator-слоем.
- Выводы для реализации:
  - Для текущего шага достаточно stateless bot shell:
    - `/start`, `/help`, `/about`, `/privacy`;
    - inline web app CTA;
    - anti-flood middleware;
    - polling only.
  - В production path потом переносить на webhook и edge/runtime, но не смешивать это с локальным Python shell.
  - Root scripts должны уметь:
    - запускать бота по умолчанию;
    - запускать scraper по явному аргументу.
- Handoff:
  - Перед переходом к production webhook отдельно проверить актуальный Bot API changelog повторно.
  - Для live polling/runtime теста нужен реальный `BOT_TOKEN` в `.env`.
  - Перед Mini App integration шагом сохранить current bot texts и CTA как baseline UX.

## [ТЕМА: Design system и UX для Telegram Mini App]
_Последнее обновление: 2026-03-21 | Роль: Design System Architect_
Статус: Актуально

- Контекст:
  - Проектировалась дизайн-система для Telegram Mini App агрегатора врачей Минска перед React/Next.js реализацией.
- Источники:
  - https://core.telegram.org/bots/webapps
  - https://docs.ton.org/ecosystem/tma/telegram-ui/platform-and-palette
  - https://www.w3.org/WAI/WCAG21/Understanding/contrast-minimum
  - https://www.103.by/

## [ТЕМА: Turso + Cloudflare Worker backend foundation]
_Последнее обновление: 2026-03-21 | Роль: Database Architect & Data Systems Engineer_
Статус: Актуально

- Контекст:
  - Нужен backend foundation для `Cloudflare Workers + Turso (libSQL)` с SQL-миграциями, ingest endpoint и read API под Mini App.
- Источники:
  - https://docs.turso.tech/sdk/ts/reference
  - https://docs.turso.tech/sdk/ts/guides/hono
  - https://docs.turso.tech/cli/db/shell
  - https://docs.turso.tech/cli/auth/token
  - https://docs.turso.tech/data-and-connections
  - https://hono.dev/docs/getting-started/cloudflare-workers
- Подтвержденные факты:
  - JavaScript/TypeScript SDK `@libsql/client` официально совместим с `Cloudflare Workers`, `Deno`, `Netlify` и `Vercel Edge Functions`.
  - В reference по libSQL подтвержден `batch` как последовательность SQL-операций в неявной транзакции; для write-flow допустим transaction-first паттерн.
  - Официальный Hono quickstart для Workers рекомендует `create-hono` с шаблоном `cloudflare-workers`.
  - Turso CLI официально поддерживает выполнение SQL через shell и загрузку SQL dump из файла через редирект stdin:
    - `turso db shell <database-name> < dump.sql`
  - Для headless/CLI automation доступна команда `turso auth token`, которая выводит текущий API token платформы.
  - В `data-and-connections` Turso прямо фиксирует, что consistency model отличается от локального SQLite из-за сетевой и реплицируемой природы libSQL; это усиливает требование к коротким write-транзакциям и idempotent ingest.
- Выводы для реализации:
  - Для Worker-кода можно опираться на `@libsql/client` без отдельного TCP-адаптера.
  - Для схемы и миграций безопаснее держать forward-only SQL files и отдельный runner, а не ручные правки в Turso UI.
  - Для ingest-path нужно сохранять short transaction scope и детерминированные dedupe keys.
  - Так как поведение `foreign_keys` по runtime не было подтверждено как глобально-включенное в libSQL/Turso, в коде и миграторе нужно явно выполнять `PRAGMA foreign_keys = ON`.
- Практически подтверждено в проекте:
  - через Turso Platform API удалось:
    - создать group `medsearch-primary`;
    - создать базу `medsearchrb`;
    - сгенерировать database auth token;
  - рабочий DB URL для проекта имеет вид:
    - `libsql://medsearchrb-aiomdurman.aws-eu-west-1.turso.io`
  - миграция `db/migrations/0001_init.sql` реально применена в live Turso, а ключевые таблицы подтверждены отдельным запросом к `sqlite_master`.
- Handoff:
  - Следующий шаг может сразу использовать `apps/worker` и `db/migrations/0001_init.sql`.
  - Корневой `.env.txt` уже содержит `TURSO_DATABASE_URL`, `TURSO_AUTH_TOKEN`, `INGEST_SHARED_SECRET`.
  - Не перепроверено: production request-body cap для ingest endpoint; при необходимости ограничить batch size на application-слое.
  - https://talon.by/
  - https://ydoc.by/
  - https://www.zocdoc.com/
  - https://www.practo.com/
  - https://www.doctoralia.co/
  - https://developer.apple.com/design/human-interface-guidelines/navigation-and-search
  - https://linear.app/
  - https://www.raycast.com/
  - https://www.headspace.com/
- Подтвержденные факты:
  - Telegram Mini Apps отдают theme params в CSS variables `--tg-theme-*`, включая `bg`, `text`, `hint`, `link`, `button`, `button_text`, `secondary_bg`, `section_bg`, `section_header_text`, `section_separator`, `subtitle_text`, `destructive_text`, `bottom_bar_bg`.
  - Telegram рекомендует использовать `ready()` как можно раньше, учитывать `safe area` и `content safe area`, а также строить интерфейс с учетом `BackButton`, `MainButton` и `SecondaryButton`.
  - Для doctor discovery интерфейсов стабильно работают: search-first entry, short specialty shortcuts, trust signals рядом с именем врача и явный путь к действию.
  - Прямые конкуренты в домене дают полезную информацию, но почти не формируют запоминающийся визуальный характер.
  - Смежные и outside-domain референсы показывают, что отличимость в нашем случае должна строиться не на произвольной палитре, а на типографике, ритме и signature elements.
  - WCAG 2.1 Contrast Minimum требует минимум `4.5:1` для основного текста; placeholder text тоже подпадает под проверку контраста.
- Выводы для реализации:
  - Цветовая система Mini App должна быть semantic-first и строиться только на Telegram variables.
  - Характер продукта нужно собирать не собственными HEX-цветами, а формой, типографикой, motion и signature elements.
  - Линейный флоу `Главная -> Список -> Карточка врача` оптимален для MVP и соответствует Telegram-native UX.
- Handoff:
  - Следующий фронтенд-шаг должен начать с semantic CSS layer `--ds-*` поверх `--tg-theme-*`.
  - Обязательные UI-инварианты: `Halo Rating`, `Ticket Promo Badge`, sticky CTA `Записаться`, safe-area aware paddings.

## [ТЕМА: Frontend foundation для Telegram Mini App на Next.js]
_Последнее обновление: 2026-03-21 | Роль: Frontend Architect_
Статус: Актуально

- Контекст:
  - Нужно было поднять foundation layer Mini App в `apps/miniapp` на `Next.js + App Router + TypeScript + Tailwind`, опираясь на утвержденную дизайн-систему и папку прототипов `Desing`.
- Источники:
  - `npx create-next-app@latest --help`
  - `apps/miniapp/package.json` после scaffolding
  - https://nextjs.org/docs/app/getting-started/installation
  - https://tailwindcss.com/blog/tailwindcss-v4
  - https://core.telegram.org/bots/webapps
  - локальные прототипы:
    - `Desing/architecture_plan_medsearch_app.html`
    - `Desing/stitch_architecture_plan_medsearch_app/medsearch_mvp_5/code.html`
    - `Desing/stitch_architecture_plan_medsearch_app/medsearch_by_8/code.html`
- Подтвержденные факты:
  - `create-next-app@latest` на дату шага создает проект на `Next 16.2.1`, `React 19.2.4`, `Tailwind 4`, `TypeScript 5`.
  - В свежем Tailwind v4 конфиг по умолчанию смещен в CSS, но `tailwind.config.ts` по-прежнему можно использовать через `@config`, что подходит под требование проекта.
  - Для foundation slice достаточно stateless client-side screen switching через `useState`, без router-based навигации.
  - Прототипы в `Desing` подтверждают spatial layout: hero + search + chips + promo на home, компактные doctor cards в list, sticky CTA в detail.
- Выводы для реализации:
  - Foundation нужно строить поверх Telegram theme variables с dev-safe fallback значениями без HEX.
  - `layout.tsx` должен поднимать Telegram SDK script и init-слой отдельно от screen UI.
  - `page.tsx` может оставаться client component на этом шаге, потому что задача — UX shell и токены, а не data fetching.
- Handoff:
  - Следующий шаг — подключить реальные данные и заменить mock entities на Turso/Worker contract.
  - При переходе к production стоит отдельно проверить WebApp BackButton/MainButton integration against final UX flow.

## [ТЕМА: Деплой Telegram Mini App в Cloudflare Pages]
_Последнее обновление: 2026-03-21 | Роль: Cloudflare Pages Integrator_
Статус: Актуально

- Контекст:
  - Нужно было получить публичный HTTPS URL для Mini App без карты и сразу связать его с конфигом Telegram-бота.
- Источники:
  - `wrangler whoami`
  - `npx wrangler pages project create --help`
  - `npx wrangler pages deploy --help`
  - попытка web-поиска по официальной документации Cloudflare Pages
- Подтвержденные факты:
  - Локальная авторизация Cloudflare уже была активна и имела scope `pages (write)`.
  - Для статического Next.js shell самый надежный путь — `output: "export"` и deploy директории `out/` через `wrangler pages deploy`.
  - Если Pages project еще не создан, `wrangler pages deploy` возвращает `Project not found [code: 8000007]`, после чего проект нужно создать отдельной командой `wrangler pages project create <name>`.
  - Рабочий production URL для текущего проекта: `https://medsearch-minsk-miniapp.pages.dev`.
  - Для бота важно, чтобы и `WEBAPP_URL`, и `PRIVACY_URL` были публичными `https://` ссылками; иначе runtime-валидация останавливает старт.
  - В текущем проекте полезно принимать и `.env.txt`, и несколько форматов `TELEGRAM_CHANNEL_USERNAME`: `@username`, `t.me/username`, `https://t.me/username`.
- Выводы для реализации:
  - Mini App можно держать на Cloudflare Pages как static export до появления server-side/API слоя.
  - Корневой бот должен подхватывать `.env.txt`, иначе конфиг пользователя выглядит "заполненным", но не работает.
  - Публичная privacy-страница должна существовать уже на MVP-этапе, иначе `/privacy` ломает runtime startup.
- Handoff:
  - Следующий инфраструктурный шаг: при переходе на production Mini App можно добавить custom domain, но текущий `pages.dev` уже пригоден для Telegram Web App.
  - Следующий продуктовый шаг: проверить в реальном Telegram клиенте открытие `https://medsearch-minsk-miniapp.pages.dev` по кнопке `/start`.

## [ТЕМА: Можно ли сделать Telegram Mini App без сайта]
_Последнее обновление: 2026-03-21 | Роль: Telegram Mini App Research_
Статус: Актуально

- Контекст:
  - Нужно было точно проверить, можно ли запускать Telegram Mini App без сайта/хостинга, и что именно настраивается в самом Telegram.
- Источники:
  - https://core.telegram.org/bots/webapps
  - https://core.telegram.org/bots/api
  - https://core.telegram.org/api/bots/menu
  - https://core.telegram.org/api/bots/webapps
- Подтвержденные факты:
  - Mini Apps запускаются из Telegram несколькими способами: через `web_app` keyboard button, inline button, menu button, main mini app, direct link и attachment menu.
  - Во всех этих сценариях Telegram открывает Mini App по указанному URL.
  - Menu button можно настраивать через `@BotFather` или Bot API методом `setChatMenuButton`.
  - `Main Mini App` и кнопка `Launch app` в профиле бота настраиваются через `@BotFather`.
  - Keyboard-button Mini Apps могут отправлять данные обратно через `Telegram.WebApp.sendData`, что позволяет обойтись без внешнего сервера именно для ответа бота на ввод пользователя.
  - Это не отменяет необходимость публичного URL для самого Mini App: без веб-адреса Telegram нечего открывать.
  - В test environment Telegram допускает HTTP без TLS, но это отдельная тестовая среда и не production path.
- Выводы для реализации:
  - Можно сделать Mini App без собственного бэкенда/API, если фронтенд статический.
  - Нельзя сделать production Mini App "без сайта" в смысле без публичного `https://` URL.
  - Если задача — совсем без хостинга, тогда нужен не Mini App, а обычный Telegram-бот с сообщениями и inline-кнопками.
- Handoff:
  - При объяснении пользователю важно различать `без сайта` и `без сервера`.
  - Для текущего проекта допустим zero-backend Mini App, но не zero-hosting Mini App.

## [ТЕМА: Netlify как альтернатива для Telegram Mini App]
_Последнее обновление: 2026-03-21 | Роль: Netlify Deployer_
Статус: Актуально

- Контекст:
  - Требовалась бесплатная альтернатива `pages.dev` без карты и с более нейтральным production URL для Telegram Mini App.
- Источники:
  - https://www.netlify.com/pricing
  - локальный `netlify-cli --help`
  - локальный `netlify api listAccountsForUser`
  - локальный production deploy через `netlify deploy --prod`
- Подтвержденные факты:
  - Free plan позволяет создавать статические сайты и дает production URL вида `*.netlify.app`.
  - Для non-interactive deploy подходит связка:
    - `netlify sites:create --account-slug <slug> --name <site>`
    - `netlify deploy --site <name> --prod --dir out --no-build --json`
  - В текущем аккаунте account slug = `aiomdurman`.
  - Production URL текущего mini app: `https://medsearch-minsk-miniapp.netlify.app`.
  - Bot API `setChatMenuButton` успешно обновил menu button на новый Netlify URL.
- Выводы для реализации:
  - Для текущего MVP Netlify — более удобный и нейтральный static host, чем `pages.dev`.
  - Для Telegram Mini App этого достаточно: публичный `https://` URL есть, privacy route опубликован, menu button обновлен.
- Handoff:
  - Если Mini App все еще не откроется, следующий фактор для проверки — `Main Mini App` в `@BotFather`, а не сам хостинг.
  - При появлении своего домена можно позднее перенести Mini App на `Cloudflare Pages + custom domain` без изменения клиентской архитектуры.

## [ТЕМА: libSQL runtime path для Cloudflare Workers]
_Последнее обновление: 2026-03-21 | Роль: Integration Engineer_
Статус: Актуально

- Контекст:
  - Во время live-интеграции `Cloudflare Worker -> Turso` ingest-путь работал локально в Node.js, но падал в deployed Worker runtime с `500`.
- Источники:
  - https://www.npmjs.com/package/%40libsql/client/v/0.1.5?activeTab=dependents
  - https://docs.turso.tech/sdk/ts/guides/quasar
- Подтвержденные факты:
  - Для сред без локальной файловой системы, включая `Cloudflare Workers`, npm README для `@libsql/client` рекомендует импорт:
    - `import { createClient } from "@libsql/client/web"`
  - Turso guide для browser/edge-style runtimes повторяет тот же import path `@libsql/client/web`.
  - После переключения runtime-импортов Worker-а на `@libsql/client/web` и повторного деплоя `POST /internal/ingest/source-batch` начал проходить успешно против live Worker-а.
- Выводы для реализации:
  - В `Cloudflare Workers` нужно использовать `@libsql/client/web` в runtime-коде.
  - Node-only tooling, включая миграционный runner, может оставаться на `@libsql/client`.
  - При retry ingest нужно уметь перезапускать batch со статусом `running`/`failed`, иначе stale `batch_id` блокирует повторную доставку.
- Handoff:
  - Не возвращать Worker runtime обратно на `@libsql/client` без отдельной проверки в live edge-среде.
  - При следующих проблемах ingest сначала проверять import path и retry-semantics `scrape_runs`, а не только SQL-схему.

## [ТЕМА: Telegram Bot 24/7 runtime через Cloudflare Worker webhook]
_Последнее обновление: 2026-03-21 | Роль: Windows Engineering Assistant_
Статус: Актуально

- Контекст:
  - Нужно было убрать зависимость бота от локального polling-процесса и перевести его на always-on runtime, который работает без включенного ПК.
- Источники:
  - https://core.telegram.org/bots/api
  - локальная проверка `wrangler deploy`
  - локальная проверка `getWebhookInfo`
  - live GET `https://medsearchrb-api.aiomdurman.workers.dev/telegram/health`
- Подтвержденные факты:
  - Telegram Bot API поддерживает webhook c `secret_token`, который Telegram передает в заголовке `x-telegram-bot-api-secret-token`.
  - Для production достаточно настроить `setWebhook` на Cloudflare Worker URL и валидировать `secret_token` на стороне Worker.
  - После live deploy worker `medsearchrb-api` успешно принял webhook URL `https://medsearchrb-api.aiomdurman.workers.dev/telegram/webhook`.
  - `getWebhookInfo` подтвердил `pending_update_count = 0`, `max_connections = 20` и `allowed_updates = ["message", "callback_query"]`.
  - Тестовый POST в `telegram/webhook` с корректным secret header вернул `{"ok":true}`, что подтверждает рабочий webhook handler и вызов bot service внутри Worker runtime.
  - Для Cloudflare Worker deploy удобнее и надежнее использовать PowerShell-backed `deploy_worker.ps1`, а `.bat` оставить тонкой Windows-оберткой; это снимает quoting-падения длинного батника.
  - JSON вызовы в Telegram profile sync (`setMyDescription`, `setMyShortDescription`) нужно отправлять принудительно в UTF-8 байтах, иначе PowerShell может вернуть `Bad Request: strings must be encoded in UTF-8`.
- Выводы для реализации:
  - Production Telegram bot должен жить в Worker webhook runtime, а локальный Python polling оставаться только debug-path.
  - `deploy_worker.bat` должен не только деплоить Worker, но и перепривязывать webhook/menu button/commands, иначе bot runtime и Telegram profile будут расходиться.
  - `telegram/health` полезен как независимая smoke-check точка для always-on бота.
- Handoff:
  - Для следующего шага считать production bot runtime уже live и независимым от локального ПК.
  - Если бот снова "не отвечает", сначала проверять `telegram/health`, потом `getWebhookInfo`, и только потом искать проблемы в Mini App или Bot API token.

## [ТЕМА: Cloud-only catalog sync blocker on GitHub Free]
_Последнее обновление: 2026-03-21 | Роль: Windows Engineering Assistant_
Статус: Актуально

- Контекст:
  - Нужно было полностью убрать зависимость обновления каталога от локального ПК и перевести scrape/backfill на GitHub Actions.
- Источники:
  - https://docs.github.com/actions/learn-github-actions/usage-limits-billing-and-administration
  - https://docs.github.com/en/billing/managing-billing-for-your-products/managing-billing-for-github-actions
  - https://developers.cloudflare.com/workers/platform/limits/
  - https://developers.cloudflare.com/workers/platform/pricing/
- Подтвержденные факты:
  - GitHub Docs пишут, что стандартные GitHub-hosted runners бесплатны для public repositories.
  - Для private repositories GitHub-hosted runners расходуют включенные минуты и упираются в billing/payment status владельца аккаунта.
  - Реальный запуск workflow `catalog-sync` в репозитории `AI-Nikitka93/medsearchrb` завершился аннотацией:
    - `The job was not started because recent account payments have failed or your spending limit needs to be increased.`
  - Cloudflare Workers Free plan имеет `10 ms` CPU time на HTTP request и `10 ms` на Cron Trigger, а также `50` external subrequests на invocation; этого недостаточно для тяжелого full-catalog scraping тысячи карточек.
- Выводы для реализации:
  - В текущем аккаунте GitHub cloud-sync не поедет в private repo, пока не исправлен billing status.
  - Самый прямой бесплатный путь для GitHub-hosted runners — public repository.
  - Cloudflare Worker/Cron на free плане не является реалистичной заменой для полного scraper/backfill цикла такого объема.
- Handoff:
  - Если допустима публикация кода, перевод репозитория в `public` — самый короткий способ получить cloud-only refresh без ПК.
  - Если repo должен остаться private, нужен другой внешний compute/runtime с бесплатным планом или исправление billing в GitHub.

## [ТЕМА: UX меню и навигации для doctor discovery Mini App]
_Последнее обновление: 2026-03-22 | Роль: Product UX Research_
Статус: Актуально

- Контекст:
  - Пользователь пожаловался, что текущее меню Mini App неудобно. Нужно было изучить актуальные паттерны Telegram Mini Apps и конкурентов по doctor discovery, чтобы построить карту улучшений именно для меню/навигации/фильтров.
- Источники:
  - https://core.telegram.org/bots/webapps
  - https://ydoc.by/
  - https://talon.by/
  - https://www.zocdoc.com/about/how-search-works/
  - https://www.zocdoc.com/
  - https://www.practo.com/
  - https://info.103.by/ne_app
- Подтвержденные факты:
  - Telegram Mini Apps официально требуют mobile-first, native-like поведение компонентов, адаптацию к theme params и уважение `safe area` / `content safe area`.
  - YDoc на главной в Минске сразу показывает `Все врачи` и популярные специальности с количествами (`Гинеколог`, `Дерматолог`, `Невролог`, `Педиатр`, `Стоматолог`), то есть пользователь с первого экрана понимает breadth каталога и может идти через specialty entry points.
  - Talon.by строит верхний выбор через крупные service modes (`Талоны`, `Платные услуги`, `Медучреждения`, `Анализы`, `Лекарства`) вместо плотной россыпи равноправных кнопок.
  - Zocdoc в explainable-search документации делает ставку на единый search-first вход, а потом на patient-centric criteria и фильтры вроде availability, location и doctor attributes.
  - На главной Zocdoc дополнительно использует `Top-searched specialties`, но они работают как secondary navigation под главным поиском, а не как конкурирующий основной UI-слой.
  - Practo разделяет `consult online` и `book in-clinic` на отдельные интенты, а specialties подает как browse-секции с понятным описанием сценария, а не просто как набор чипов.
  - 103.by в мобильном приложении продвигает value props через крупные функциональные разделы и объяснимый поиск (`исправляет ошибки`, `по названию или действующему веществу`, `все на карте`), а не через перегруженный экран кнопок.
- Выводы для реализации:
  - Для нашего Mini App главное меню не должно быть “россыпью одинаковых кнопок”. Нужна четкая иерархия: один primary action, 1–2 secondary blocks и только потом specialty shortcuts.
  - Specialties нельзя держать как единственный и основной навигационный паттерн на первом экране. Они должны стать secondary-entry layer под поиском и популярными интентами.
  - Экран списка должен иметь compact sticky filter summary вместо повторения большого набора кнопок под search field.
  - Для MVP под Telegram лучше всего работает navigation model: `hero/search -> quick intents -> popular specialties -> promos`, а не `hero/search -> full filter control panel`.
- Handoff:
  - Следующий UX-шаг: перестроить home screen вокруг primary search entry и двух-четырех quick intents.
  - Следующий implementation step: заменить current specialty block на secondary module и вынести filters на list screen в compact sticky bar / bottom sheet.

## [ТЕМА: YDoc clinic verification and official site extraction]
_Последнее обновление: 2026-03-22 | Роль: Database Architect & Data Systems Engineer_
Статус: Актуально

- Контекст:
  - Нужно было перейти от doctor-level aggregator links к clinic-scoped navigation и понять, можно ли из `YDoc` вытащить clinic page URL и официальный сайт клиники без ручной модерации.
- Источники:
  - live `https://ydoc.by/minsk/vrach/45731-staskevich/`
  - live `https://ydoc.by/minsk/lpu/126-medicinskiy-centr-doktor-tut/`
  - live `https://ydoc.by/minsk/lpu/211-medicinskiy-centr-konfidens/`
- Подтвержденные факты:
  - Doctor detail pages `YDoc` содержат большой JSON-like attribute `:lpu-address-list="..."`, где есть:
    - `lpu_id`
    - `lpu.translit`
    - `lpu.name`
    - `address`
  - Рабочий clinic profile URL строится как:
    - `https://ydoc.by/minsk/lpu/{lpu_id}-{translit}/`
    - при этом `translit` иногда уже включает id, и это нужно учитывать, иначе получается ложный `211-211-...` и `404`.
  - На clinic page `YDoc` есть `<meta itemprop="url" content="...">`, и для части клиник это реальный официальный сайт, а не `ydoc.by`.
  - Пример подтвержденного enrich-case:
    - `Медицинский центр «Конфиденс»`
    - YDoc clinic page: `https://ydoc.by/minsk/lpu/211-medicinskiy-centr-konfidens/`
    - официальный сайт, найденный на странице: `https://confidence.by/`
- Выводы для реализации:
  - `YDoc` можно использовать как aggregator-source для связи `doctor -> clinic` и как мост к official clinic site.
  - Но сам факт наличия official site на `YDoc` clinic page не равен `official_verified` doctor-clinic relation; это только clinic-level enrichment.
  - Нужен отдельный verifier/backfill step, который обновляет `clinics.site_url` и пишет audit в `clinic_verification_runs`.
- Handoff:
  - Не использовать больше generic placeholder `https://ydoc.by/minsk/klinika/` как clinic URL.
  - Следующий data step: прогнать `verify-clinic-sites.ts` по всем `YDoc` clinic pages с missing/off-platform `site_url`, затем уже строить clinic-site scrapers для direct verification врача на официальном сайте.

## [ТЕМА: Public GitHub repo without exposing secrets]
_Последнее обновление: 2026-03-22 | Роль: Windows Engineering Assistant_
Статус: Актуально

- Контекст:
  - Нужно перевести `AI-Nikitka93/medsearchrb` в `public`, но не раскрыть секреты и максимально ограничить переиспользование кода.
- Источники:
  - GitHub CLI help for `gh repo edit`
  - repository history/file scan in local git workspace
- Подтвержденные факты:
  - В tracked files секреты не найдены; `.env` / `.env.txt` не входят в git history.
  - В git history есть только `.env.example` и документация с именами переменных, но не реальные токены.
  - `gh repo edit` требует явного подтверждения последствий для смены visibility.
  - Для public GitHub repo нельзя технически запретить просмотр и скачивание исходников через саму платформу; максимум — не выдавать open-source лицензию и явно оставить `All Rights Reserved`.
- Выводы для реализации:
  - Перед переводом в `public` нужно оставить только placeholder secrets и не пушить `.env*`.
  - Лучший реалистичный вариант защиты: proprietary `LICENSE` + явное usage notice в `README`.
  - Публикация репозитория не равна публикации cloud secrets, если secrets уже вынесены в GitHub/Cloudflare/Turso secret stores.
- Handoff:
  - Следующий operational step: закоммитить `LICENSE`/README/security cleanup, затем выполнить `gh repo edit --visibility public --accept-visibility-change-consequences`.
  - После смены visibility повторно проверить `gh run list`/`gh workflow run` для cloud-only refresh.

## [ТЕМА: Lighthouse promotions coverage gap]
_Последнее обновление: 2026-03-22 | Роль: Windows Engineering Assistant_
Статус: Актуально

- Контекст:
  - Нужно было проверить, попадает ли реальная акция Lighthouse в текущий production promotion-pipeline.
- Источники:
  - live `https://lighthouse.by/promotions/diagnostika-varikoza-po-vygodnoj-stoimosti/`
  - live `https://medsearchrb-api.aiomdurman.workers.dev/api/v1/promotions?page=1&per_page=20`
  - локальный grep по репозиторию
- Подтвержденные факты:
  - Страница акции Lighthouse доступна (`HTTP 200`) и заголовок страницы совпадает: `Диагностика варикоза по выгодной стоимости`.
  - По локальному коду `lighthouse.by` вообще не фигурирует как scraper/source.
  - В live Turso нет promotions с `source_url LIKE '%lighthouse.by%'` и нет title по `варикоз`.
  - Live promotions API сейчас отдает только одну акцию `MedАrt`.
- Выводы для реализации:
  - Текущий production-pipeline акций покрывает не все медцентры Минска.
  - `Lighthouse` — реальный пропуск в source coverage, а не UI-баг и не проблема ingest.
  - Для закрытия этого класса дыр нужно расширять promotion-source coverage clinic-by-clinic и включать новые источники в cloud scrape/backfill.
- Handoff:
  - Следующий data step: добавить `Lighthouse` как promotion scraper source.
  - После добавления — проверить, что новая акция доходит до `promotions`, затем в `notification_outbox`, затем в Telegram channel posting.

## [ТЕМА: Lighthouse promotions source structure]
_Последнее обновление: 2026-03-22 | Роль: Windows Engineering Assistant_
Статус: Актуально

- Контекст:
  - После подтверждения coverage gap нужно было понять, можно ли быстро встроить `Lighthouse` как официальный источник акций без doctor catalog.
- Источники:
  - live `https://lighthouse.by/robots.txt`
  - live `https://lighthouse.by/`
  - live `https://lighthouse.by/promotions/`
  - live `https://lighthouse.by/promotions/diagnostika-varikoza-po-vygodnoj-stoimosti/`
- Подтвержденные факты:
  - `robots.txt` не запрещает чтение публичного архива `/promotions/`.
  - Архив `https://lighthouse.by/promotions/` сейчас содержит `17` уникальных promo URLs.
  - Detail pages стабильно отдают promo title в `h1`, а основной текст акции лежит в `.entry-content`.
  - В raw homepage HTML стабильно встречается адрес `г. Минск, ул. К. Туровского, 14`.
  - JSON-LD homepage дает стабильный бренд-маркер `«Маяк Здоровья»`, но не полноценный `MedicalOrganization`.
- Выводы для реализации:
  - `Lighthouse` подходит как promo-only official source.
  - Для clinic record надежнее использовать canonical name `Маяк Здоровья` и адрес из raw HTML, чем SEO title страницы.
  - Для первичного live ingest достаточно official archive + detail pages; doctor scraping можно отложить.
- Handoff:
  - Источник уже реализован в `apps/scrapers/scrapers/lighthouse.py`.
  - Следующий operational step: запушить код и включить `lighthouse` в следующий cloud `catalog-sync`.

## [ТЕМА: Official promo pages for Minsk clinics]
_Последнее обновление: 2026-03-22 | Роль: Windows Engineering Assistant_
Статус: Актуально

- Контекст:
  - После `Lighthouse` нужно было быстро расширить official promo coverage на несколько крупных клиник Минска и понять, какие публичные pages реально подходят под scraper.
- Источники:
  - live `https://www.kravira.by/actions/`
  - live `https://www.lode.by/news/`
  - live `https://nordin.by/news/`
  - live `https://www.kravira.by/actions/lazernoe-lechenie-varikoza/`
  - live `https://www.lode.by/news/novyy-god-s-idealnym-zreniem/`
  - live `https://www.lode.by/news/spetsialnye-predlozheniya-lode-ko-dnyu-materi/`
  - live `https://nordin.by/news/aktsii-i-skidki-v-iyule-2.html`
- Подтвержденные факты:
  - `Kravira` имеет отдельный публичный archive `https://www.kravira.by/actions/` с как минимум `4` реальными action pages.
  - `LODE` не имеет отдельного `/actions/`, но в `https://www.lode.by/news/` есть promo-like posts с устойчивыми title/content keywords.
  - `Nordin` использует paginated news archive (`/news/page/2 ... /page/57`) и содержит promo-like entries, например `Акции и скидки в июле`.
  - `Kravira` detail page содержит promo text и явные сроки акции.
  - `LODE` detail pages содержат promotional wording и сроки вида `до 31 декабря 2025 года`.
- Выводы для реализации:
  - `Kravira` подходит как чистый official promo source.
  - `LODE` можно подключать как filtered promo/news source с keyword-based gating.
  - `Nordin` тоже перспективен, но для чистого результата лучше делать отдельный paginated filtered source, а не добавлять наспех.
- Handoff:
  - `Kravira` и `LODE` уже реализованы и живо ingested.
  - Следующий source-expansion step: `Nordin`, затем inventory остальных официальных promo/news pages по крупным медцентрам Минска.

## [ТЕМА: Additional official promo pages for Minsk clinics]
_Последнее обновление: 2026-03-22 | Роль: Windows Engineering Assistant_
Статус: Актуально

- Контекст:
  - После жалобы пользователя на слабое покрытие акций нужно было быстро найти еще несколько стабильных official promo/news pages и встроить их без “серых” источников.
- Источники:
  - live `https://nordin.by/shares`
  - live `https://nordin.by/shares/aktsiya-v-nordine-pri-proverke-zreniya-diagnostika-sindroma-suhogo-glaza-i-vnutriglaznogo-davleniya-v-podarok-2.html`
  - live `https://nordin.by/shares/ves-maj-mrt-so-skidkoj-25-v-nochnoe-vremya.html`
  - live `https://medavenu.by/akcii/`
  - live `https://medavenu.by/akcii/chek-ap-ezhegodnyj-polnyj-kontrol-zhenskogo-zdorovya/`
  - live `https://smartmedical.by/news/`
  - live `https://smartmedical.by/news/professionalnaya-gigiena-polosti-rta-v-komplekse-zdorovyy-rebyenok/`
  - live `https://supramed.by/sales/`
  - live `https://supramed.by/sales/skidka-10-ko-dnyu-rozhdeniya/`
  - live robots:
    - `https://nordin.by/robots.txt`
    - `https://medavenu.by/robots.txt`
    - `https://smartmedical.by/robots.txt`
- Подтвержденные факты:
  - `Nordin` имеет отдельный публичный promo archive `/shares` и promo detail pages с устойчивыми `h1` и promo wording.
  - `MedAvenu` имеет прямую official page `/akcii/` с как минимум `8` promo URLs.
  - `SMART MEDICAL` держит promo-materials в `/news/`; titles `АКЦИЯ ...` и promo content стабильно читаются на detail pages.
  - `Supramed` имеет публичный `/sales/` и как минимум одну прямую акцию `Скидка 10% ко Дню рождения!`.
  - Robots:
    - `nordin.by` разрешает выбранные public promo pages;
    - `medavenu.by` не запрещает `/akcii/`;
    - `smartmedical.by` не запрещает `/news/`.
- Выводы для реализации:
  - Следующий reliable promo-source set для Минска:
    - `nordin`
    - `medavenu`
    - `smartmedical`
    - `supramed`
  - `Nordin` и `MedAvenu` подходят как чистые official promo sources.
  - `SMART MEDICAL` подходит как filtered promo/news source.
  - `Supramed` пока стоит держать как small official promo source, даже если archive там компактный.
- Handoff:
  - Источники уже реализованы локально в `apps/scrapers/scrapers/*.py`.
  - Следующий operational step: запушить код и обновленный `.github/workflows/promo-sync.yml`, затем запустить cloud `promo-sync`.

## [ТЕМА: Review aggregation policy and source strategy]
_Последнее обновление: 2026-03-22 | Роль: Windows Engineering Assistant_
Статус: Актуально

- Контекст:
  - Нужно понять, как собирать отзывы о врачах с нескольких источников и безопасно выводить агрегированную оценку в Mini App.
- Источники:
  - live `https://ydoc.by/robots.txt`
  - live `https://www.103.by/robots.txt`
  - official `https://developers.google.com/maps/documentation/places/web-service/policies`
- Подтвержденные факты:
  - Для Google Places reviews действуют строгие правила отображения: нужны атрибуции, авторы и ограничения по хранению/отображению review content; это не просто “свободный scrape и перепечатка”.
  - Для review-layer безопаснее хранить не полные тексты отзывов как основной кэш, а summary-метрики и source-level attribution.
  - Уже действующая content policy проекта и текущая схема лучше всего сочетаются с моделью `rating_count / rating_avg / source_count / last_seen_at`, а не с массовой репликацией полных текстов отзывов.
- Выводы для реализации:
  - Делать multi-source review aggregation нужно через нормализованные source-level summaries:
    - `source_name`
    - `rating_avg`
    - `review_count`
    - `review_sentiment_summary`
    - `last_seen_at`
    - `source_url`
  - Итоговую “среднюю” оценку лучше считать как взвешенную по количеству отзывов, но показывать рядом разбивку по источникам, чтобы не скрывать конфликт между площадками.
  - Для источников с жесткими display/caching restrictions лучше ограничиться ссылкой на источник, атрибуцией и summary, а не полным переносом текста отзывов.
- Handoff:
  - Следующий data step: спроектировать таблицы `review_sources` / `doctor_review_sources` / `doctor_review_snapshots` и выводить в Mini App блок `Репутация по источникам`.
  - Следующий product step: в detail-screen врача показывать не “одну абсолютную оценку”, а `Итоговый рейтинг` + `По источникам`, чтобы противоречивые площадки были видны честно.

## [ТЕМА: Minsk / Belarus doctor review sites inventory]
_Последнее обновление: 2026-03-22 | Роль: Windows Engineering Assistant_
Статус: Актуально

- Контекст:
  - Нужно понять, какие сайты в Минске/РБ реально формируют слой отзывов о врачах и клиниках, и какие из них подходят для продукта как source-of-truth или secondary reputation signals.
- Источники:
  - live `https://info.103.by/otzyvy`
  - live `https://developers.google.com/maps/documentation/places/web-service/policies`
  - live `https://2gis.by/minsk`
  - search results по `ydoc.by`, `103.by`, `2gis.by`, `Google Maps`, `Yandex Maps`
- Подтвержденные факты:
  - `YDoc.by` — doctor-first площадка для Беларуси/Минска, у которой отзывы и рейтинг являются центральной частью doctor card; по вспомогательным материалам YDoc видно, что портал активно работает с отзывами и рейтингами врачей.
  - `103.by` — важный локальный RB-source, но у него сильная модерация отзывов и правила публикации; площадка подходит как значимый local signal, но требует аккуратного отношения к отзывам и происхождению рейтинга.
  - `2GIS` в Минске дает рабочий слой отзывов в основном по клиникам/медцентрам, а не по отдельным врачам; полезен как clinic/service reputation source.
  - `Google Maps` потенциально ценен для clinic reputation, но у Places API есть строгие attribution/caching/display rules для reviews.
  - `Yandex Maps` и аналогичные map/listing-сервисы полезны прежде всего как clinic-level репутационный сигнал, а не как doctor-first source.
  - Официальные сайты клиник тоже могут содержать отзывы, но это низкодоверенный self-published источник и его нельзя смешивать с независимыми площадками как равный сигнал.
- Выводы для реализации:
  - Источники надо делить на 3 класса:
    1. `doctor-first`: `YDoc.by`, `103.by`
    2. `clinic-first`: `2GIS`, `Google Maps`, `Yandex Maps`
    3. `self-published`: отзывы на сайтах самих клиник
  - Для Mini App честный reputation layer должен быть multi-source:
    - doctor trust лучше строить на `YDoc + 103.by`
    - clinic/service trust лучше строить на `2GIS + maps sources`
    - official clinic site reviews можно показывать только как secondary signal
  - Для Google нельзя полагаться на произвольный scrape review content; нужен официальный API path с атрибуцией или отказ от полного переноса текстов.
  - Для first production slice самый практичный стек review-sources выглядит так:
    - `YDoc.by`
    - `103.by`
    - `2GIS`
    - позже `Google Maps`
- Handoff:
  - Следующий data step: спроектировать `review_sources` и привязать doctor-level и clinic-level review pipelines отдельно.
  - Следующий product step: в detail-screen врача развести `Отзывы о враче` и `Отзывы о клинике`, чтобы не смешивать doctor reputation и clinic service reputation в одну цифру.

## [ТЕМА: doktora.by и 2doc.by как review / discovery sources]
_Последнее обновление: 2026-03-22 | Роль: Windows Engineering Assistant_
Статус: Актуально

- Контекст:
  - Пользователь отдельно указал `https://doktora.by` и `https://2doc.by/` как кандидатов в review/discovery inventory.
- Источники:
  - live `https://doktora.by/`
  - live `https://doktora.by/robots.txt`
  - live `https://2doc.by/`
  - live `https://2doc.by/robots.txt`
- Подтвержденные факты:
  - `doktora.by` живой (`HTTP 200`) и явно позиционируется как `Врачи Беларуси`; по homepage и контентным маркерам это doctor-first площадка с doctor/review-oriented моделью.
  - `doktora.by/robots.txt` не запрещает весь публичный сайт целиком, но задает `Crawl-delay: 10` и стандартные запреты на admin/search/auth paths.
  - `2doc.by` живой (`HTTP 200`) и явно позиционируется как `сервис поиска врачей` / online booking.
  - `2doc.by/robots.txt` максимально открытый (`Allow: /`), sitemap опубликован.
  - По доступным публичным сигналам `2doc.by` сейчас выглядит сильнее как doctor-discovery / appointment source, чем как мощный самостоятельный review-source.
- Выводы для реализации:
  - `doktora.by` стоит добавить в shortlist doctor-first sources рядом с `YDoc.by` и `103.by`.
  - `2doc.by` стоит рассматривать сначала как discovery / availability / booking source, а не как основной слой отзывов.
  - Для review-layer приоритет по этим двум источникам:
    - `doktora.by` — потенциальный doctor-review source
    - `2doc.by` — потенциальный doctor discovery / booking source
- Handoff:
  - Следующий data step: отдельно проверить структуру doctor detail pages на `doktora.by` и наличие стабильных review-count / rating markers.
  - Для `2doc.by` следующий шаг — проверить detail-page schema на наличие отзывов; если review-layer слабый, использовать его не для рейтинга, а для availability/discovery signals.

## [ТЕМА: doktora.by / 2doc.by detail page signals]
_Последнее обновление: 2026-03-22 | Роль: Windows Engineering Assistant_
Статус: Актуально

- Контекст:
  - Нужно было понять, что именно реально есть на doctor detail pages `doktora.by` и `2doc.by`: только discovery, или и review/rating тоже.
- Источники:
  - live `https://doktora.by/otzyvy/hirurg-v-minske-alekseev-sergey-alekseevich`
  - live `https://2doc.by/doctor/Lysenok-alexandr-yurievich`
  - live `https://2doc.by/sitemap-doctor.xml`
  - live `https://doktora.by/otzyvy-o-vrachah-belarusi`
- Подтвержденные факты:
  - `doktora.by` doctor detail pages уже в title/meta выглядят как review-first doctor pages:
    - title: `Отзывы о враче ...`
    - meta description содержит звездную оценку, specialty, clinic and review-oriented text.
  - `doktora.by` имеет отдельный большой paginated раздел `/otzyvy-o-vrachah-belarusi?page=N`, что делает его системным review-source, а не случайным каталогом.
  - `2doc.by` имеет открытый `sitemap-doctor.xml` с большим списком doctor detail pages.
  - `2doc.by` doctor pages в title/meta уже явно содержат:
    - `отзывы`
    - `записаться на прием`
    - specialty / full name врача
  - По raw HTML `2doc.by` сейчас выглядит как hybrid source: doctor reviews + booking/discovery.
- Выводы для реализации:
  - `doktora.by` можно считать полноценным doctor review source для roadmap-а рядом с `YDoc.by` и `103.by`.
  - `2doc.by` надо считать hybrid source:
    - review signal
    - booking / appointment signal
    - discovery signal
  - Для parser design:
    - `doktora.by` сначала worth parsing for `rating / review_count / doctor page / clinic mention`
    - `2doc.by` worth parsing for `rating / review_count / doctor page / booking availability / clinic relation`
- Handoff:
  - Следующий implementation step: взять по 3-5 карточек и выделить стабильные CSS/JSON-LD markers для `rating_avg`, `review_count`, `clinic_name`, `booking CTA`.
  - После этого добавить два новых scrapers: `doktora_reviews` и `2doc_doctors`.

## [ТЕМА: 103.by и doktora.by implementation markers]
_Последнее обновление: 2026-03-22 | Роль: Windows Engineering Assistant_
Статус: Актуально

- Контекст:
  - Нужно было довести `103.by` и `doktora.by` от research до реально внедряемого parser contract для первого production multi-source review slice.
- Источники:
  - live `https://www.103.by/spec/25-vecer/`
  - live `https://www.103.by/sitemap-staff.xml.gz`
  - live `https://doktora.by/otzyvy-o-vrachah-belarusi?page=1`
  - live `https://doktora.by/otzyvy/akusher-v-minske-rutkovskiy-valeriy-anatolevich`
- Подтвержденные факты:
  - `103.by`
    - `sitemap-staff.xml.gz` дает прямой inventory doctor detail pages;
    - на doctor page стабильно видны `itemprop='ratingValue'` и `itemprop='reviewCount'`;
    - clinic blocks читаются через `.StaffPage__Place` и `.StaffPage__PlaceAddress`;
    - title дает specialty через шаблон `: отзывы, <specialty> - запись ...`.
  - `doktora.by`
    - paginated list `/otzyvy-o-vrachah-belarusi?page=N` содержит doctor review URLs;
    - doctor page надежно дает `review_count` через `.bg-review`;
    - doctor page надежно дает specialty через `[itemprop='medicalSpecialty']`;
    - clinic mention доступен через anchor `a[href*='/medcentry/']`;
    - текущий `.average-rating` marker недостоверен: на sample pages дает `1`, хотя это не выглядит как реальная средняя оценка.
- Выводы для реализации:
  - `103.by` можно использовать как полноценный `doctor-review source` с `rating_avg + review_count`.
  - `doktora.by` на первом production-проходе нужно использовать как `review_count-first source`:
    - `review_count` сохранять;
    - `rating_avg` временно оставлять `null`, пока не найден надежный extraction path.
- Handoff:
  - Следующий data step: внедрить `2doc.by` как hybrid source с отдельным transport hardening.
  - Следующий quality step: найти надежный rating marker или payload для `doktora.by`, чтобы позже поднять и `rating_avg`, а не только `review_count`.

## [ТЕМА: Production strategy audit — Mini App, reviews, promotions, trust layer]
_Последнее обновление: 2026-03-22 | Роль: Windows Engineering Assistant_
Статус: Актуально

- Контекст:
  - Нужно было не локально “допилить баг”, а сверить всю продуктовую стратегию проекта с актуальными внешними источниками на дату `2026-03-22`: Telegram Mini Apps, cloud refresh, review aggregation, clinic reputation и freshness delivery.
- Источники:
  - official Telegram Mini Apps docs: `https://core.telegram.org/bots/webapps`
  - official GitHub Actions docs: `https://docs.github.com/en/actions/writing-workflows/choosing-when-your-workflow-runs`
  - official GitHub concurrency docs: `https://docs.github.com/en/actions/writing-workflows/choosing-what-your-workflow-does/control-the-concurrency-of-workflows-and-jobs`
  - official Netlify build hooks docs: `https://docs.netlify.com/build/configure-builds/build-hooks/`
  - official Google Places API policies: `https://developers.google.com/maps/documentation/places/web-service/policies`
  - official 2GIS search API docs: `https://docs.2gis.com/en/api/search/overview`
  - live market sources:
    - `https://ydoc.by/`
    - `https://www.103.by/`
    - `https://doktora.by/`
    - `https://2gis.by/minsk`
    - `https://2doc.by/` (через web fetch в этом исследовании вернул `502`, поэтому источник считаем потенциально нестабильным и требующим осторожности)
- Подтвержденные факты:
  - Telegram прямо требует делать Mini Apps “snappy, smooth”, mobile-first, уважать `safeAreaInset` / `contentSafeAreaInset` и подстраиваться под Telegram UI и производительность устройства.
  - Telegram Main Mini App и profile `Launch app` button — правильный long-term UX path для сервиса, который должен открываться в один тап из профиля бота.
  - GitHub Actions позволяет управлять расписанием и concurrency; bounded runs с `cancel-in-progress: true` — это корректный способ не допускать накопления stale jobs.
  - Netlify build hooks позволяют триггерить новый deploy простым `POST` в уникальный URL; это лучший lightweight path для refresh snapshot после data-runs, если хранить hook URL как GitHub secret.
  - Google Places reviews и photos можно использовать только с обязательной атрибуцией; для review summaries есть отдельные display-требования и обязательные ссылки.
  - 2GIS через официальный API дает review statistics (`review count` + `average rating`), но не тексты отзывов; данные каталога обновляются ежемесячно.
  - `YDoc.by` сейчас публично позиционируется как review-heavy doctor platform в Беларуси (`3601` отзыв, `2529` врачей, `2198` клиник на homepage в момент проверки).
  - `103.by` сейчас позиционируется как крупный doctor/clinic/discovery marketplace с `25 000+` специалистами и `1000+` медцентрами.
  - `doktora.by` публично показывает doctor-first review/community слой (`4601` врачей в базе, `10062` отзывов на homepage в момент проверки).
- Выводы для стратегии:
  - Mini App должен оставаться `snapshot-first for speed`, но freshness нельзя оставлять на ручном deploy; правильный production path — build hook из GitHub Actions после успешных data workflows.
  - Review layer нельзя подавать как “одна истина”; правильная модель — source breakdown + aggregated score only when multiple trustworthy sources exist.
  - Для doctor reputation приоритетно использовать doctor-first sources:
    - `YDoc.by`
    - `103.by`
    - `doktora.by`
    - затем `2doc.by`
  - Для clinic reputation лучше идти официальным API-путем:
    - `2GIS` как clinic stats source
    - `Google Places` только при готовности соблюдать атрибуцию/policy
  - Для каналов акций и CTA в Mini App доверие должно строиться сверху вниз:
    1. official clinic site / official booking URL
    2. trusted aggregator URL
    3. скрытие или понижение stale/closed clinics
  - Full refresh workflow-ы должны быть bounded by design; giant full crawls по `103.by` или similar inventories в одном run — архитектурная ошибка, а не “нормальная цена за полноту”.
- Handoff:
  - Следующий engineering step:
    1. добавить в GitHub secrets Netlify build hook URL;
    2. вызывать build hook после `promo-sync`, `review-sync-*` и doctor-catalog refresh;
    3. после этого Mini App перестанет visibly lag live Worker.
  - Следующий data step:
    - усилить `103.by` / `doktora.by` matching;
    - затем подключить `2doc.by`;
    - отдельно рассмотреть `2GIS` как clinic-level rating source, а не doctor-review source.
