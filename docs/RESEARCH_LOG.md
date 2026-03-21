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
