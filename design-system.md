# MedsearchRB Mini App Design System

Сегодня: `2026-03-21`  
Тип: `Telegram Mini App / mobile-first`  
Статус: `Ready for React/Next.js implementation`

## Design Brief
- Продукт: Telegram Mini App для поиска врачей Минска, сравнения отзывов и просмотра актуальных акций.
- Основная задача пользователя: быстро перейти от намерения "нужен врач" к понятному выбору и клику на оригинальную запись.
- Основной UX-принцип: линейный поток `Главная -> Список -> Карточка врача`, без нижнего таб-бара и без лишних развилок.
- Главная метрика интерфейса: `doctor detail open rate` и `click-out to clinic site`.
- Основное ограничение: вся визуальная система должна жить поверх Telegram theme variables, чтобы не ломаться в светлой и темной темах.

## Competitive Design Audit
```text
=== COMPETITIVE DESIGN AUDIT ===
Домен: doctor discovery / appointment discovery / review-aware health search
Конкуренты (топ-3): 103.by, talon.by, YDoc
Что работает: быстрый поиск по специальности, доверительные сигналы, плотные карточки с метаданными, явный путь к записи
Что проваливается: визуальная безликость, шумные каталоги, слабая эмоциональная айдентика, перегрузка плотным текстом
Окно возможностей: сделать Telegram-native опыт, который выглядит легче, теплее и быстрее, чем веб-каталоги, но при этом не теряет ощущение медицинской надежности
===============================
```

## Moodboard

### Visual Benchmark Lab
| Референс | Категория | Tier | Что берем | Что не берем | Почему |
| --- | --- | --- | --- | --- | --- |
| `103.by` | direct | A | богатую предметную модель: врач, клиника, услуга, акция | тяжелые каталожные полотна, визуальный шум | полезно как карта домена, но не как уровень вкуса |
| `talon.by` | direct | A | прямой ценностный тезис и утилитарность | перегруженную сетку ссылок и вторичных входов | у продукта хороший utility tone, но слабый характер |
| `YDoc` | direct | S | акцент на trust signals и врача как центральную сущность | сухие однотипные карточки | ближе всего к нашему сценарию выбора |
| `Zocdoc` | adjacent | S | ясный search-first entry, крупный promise, отзыв как social proof | американский маркетинговый лоск и многословность | показывает, как делать doctor discovery через уверенный CTA |
| `Practo` | adjacent | A | блоки safety/data trust и крупные category shortcuts | перегруженность и конкуренция нескольких CTA | полезно для структуры home screen |
| `Doctoralia` | adjacent | A | быстрое бронирование как понятный outcome | app-push и платформенную навязчивость | пригоден как референс urgency, но не для тона |
| `Telegram TMA UI docs` | adjacent | S | нативная палитра, safe areas, back/main button thinking | библиотечную усредненность | определяет технические границы Telegram-native UX |
| `Linear` | outside-domain | A | аккуратную иерархию, уверенные заголовки, точность в отступах | холодную корпоративность | полезно для ритма и плотности |
| `Raycast` | outside-domain | S | ощущение скорости и "command-first" ясности | desktop-first паттерны | помогает сделать поиск главным актором экрана |
| `Headspace` | outside-domain | B | мягкую эмоциональность и спокойные переходы | слишком wellness-эстетику | берем только идею снижения тревожности |
| `Apple HIG navigation/search` | outside-domain | A | чистую иерархию search -> result -> detail | платформенную стерильность | хороший антишумный ориентир |
| `WCAG 2.1 Contrast` | standards | S | контроль контраста и читаемости | любые декоративные решения в ущерб legibility | обязательный каркас для accessibility |

### What This Means
- Рынок мед-каталогов визуально очень похож сам на себя.
- Мы выигрываем не эксцентричностью, а сочетанием `Telegram-native surfaces + calm confidence + пару запоминающихся signature elements`.
- Визуально нужно идти в сторону `utility with character`, а не в сторону "еще один медицинский портал".

## Brand Foundation
```text
=== BRAND FOUNDATION ===
Purpose: сократить тревогу и время выбора врача в Минске.
Promise: за одну короткую сессию пользователь понимает, к кому идти, где принимать решение и где есть выгода.
Positioning: Telegram-first агрегатор врачей и акций для Минска, легче и живее классических порталов, но надежнее типового агрегатора скидок.
Values: ясность, доверие, скорость, уважение к вниманию, честная агрегация.
Trust signals: отзывы в агрегированном виде, явный источник данных, клиника на карточке, понятная кнопка ухода на оригинальную запись.
Anti-positioning: не онлайн-клиника, не wellness-медиа, не скучная админка, не псевдо-премиальный каталог.
========================
```

## Style DNA
```text
=== STYLE DNA ===
Personality: Надежный / Дружелюбный / Технологичный
Metaphor: не больничный коридор, а "умная стойка навигации" в современной клинике, где все подсвечено, спокойно и сразу понятно.
Anti-Reference: не хотим быть как банковский кабинет; не хотим быть как яркий маркетплейс купонов; не хотим быть как generic SaaS dashboard.
Emotional Target: Уверенность
================
```

## Voice Contract
```text
=== VOICE CONTRACT ===
Default voice: спокойный, ясный, экспертный без холодности
Support tone: бережный и предметный
Error tone: короткий, не пугающий, с понятным следующим шагом
Success tone: уверенный, без избыточного праздника
Core message: найти врача в Минске можно быстро и без хаоса
Proof points: рейтинг, число отзывов, клиника, акции, переход на оригинальную запись
Forbidden language: "лучший врач", "гарантируем прием", "100% точность", "вылечим", "идеально подходит"
CTA style: короткие глаголы действия — "Найти", "Смотреть", "Записаться", "Показать акции"
======================
```

## Psychology Layer
- `Закон Хика`: на home screen только 3 быстрых специальности и один основной поисковый вход; остальное уходит в список.
- `Закон Фиттса`: основная зона действия — большой поисковый инпут сверху и затем крупная кнопка `Записаться` на detail screen.
- `Визуальная иерархия`: на каждом экране только один крупный акцент.
- `Peak-End Rule`: wow-момент даем через живую карточку врача и signature CTA-блок перед уходом на внешний сайт.
- `Когнитивная нагрузка`: в карточке врача нет длинных описаний и “лишних” атрибутов, только то, что помогает выбрать.

## Creative Constraints
- `One Color Challenge`: собственный акцент не вводим через HEX; характер строим на одной Telegram-native акцентной группе `button/link/accent`.
- `No Borders`: основная иерархия строится через поверхности, воздух и один signature shadow, а не через сетку рамок.
- `Micro-Interactions First`: каждое важное действие дает микрофидбек — press depth, shimmer на акции, soft halo на рейтинге.

Почему это усиливает бренд:
- проект остается Telegram-native;
- не конфликтует с пользовательской темой;
- визуальная память строится на форме и движении, а не на произвольной палитре.

## Art Direction Decision Matrix
| Ось | Выбор | Обоснование |
| --- | --- | --- |
| Density | `balanced` | интерфейс должен помещать много полезной информации, но не выглядеть тесным каталогом |
| Temperature | `neutral-warm` | меньше "холодной клиники", больше спокойной уверенности |
| Contrast | `medium-sharp` | важные CTA и рейтинги читаются резко, вторичные поверхности мягче |
| Geometry | `mixed` | прямоугольные списки с мягкими скруглениями, чтобы сохранить доверие и не стать детскими |
| Motion | `restrained-expressive` | движения заметны, но не театральны |
| Luxury level | `elevated` | ощущение продуманности без премиального косплея |
| Surface style | `layered` | слои и мягкая глубина лучше подходят карточкам врачей и акциям |
| Composition | `modular` | линейный мобильный флоу требует модульной вертикальной композиции |

## Signature Elements
1. `Halo Rating`
   - рейтинг и количество отзывов собираются в компактный pill-блок с мягким свечением из `--tg-theme-accent-text-color`.
   - эффект работает и в светлой, и в темной теме, потому что glow строится от theme variable, а не от фиксированного неона.
2. `Ticket Promo Badge`
   - акции оформляются как "медицинский талон нового поколения": компактный ticket badge с внутренней полосой на основе `--tg-theme-button-color` и `--tg-theme-link-color`.
   - это отсылает к идее талона/записи, но выглядит свежо и телеграмно, а не старомодно.

## Design Tokens

### Telegram-Native Color Architecture
Все semantic colors должны ссылаться только на Telegram CSS variables.

```css
:root {
  --ds-bg-page: var(--tg-theme-bg-color);
  --ds-bg-surface: var(--tg-theme-secondary-bg-color, var(--tg-theme-section-bg-color, var(--tg-theme-bg-color)));
  --ds-bg-section: var(--tg-theme-section-bg-color, var(--tg-theme-secondary-bg-color, var(--tg-theme-bg-color)));
  --ds-bg-header: var(--tg-theme-header-bg-color, var(--tg-theme-bg-color));
  --ds-bg-bottom-bar: var(--tg-theme-bottom-bar-bg-color, var(--tg-theme-secondary-bg-color, var(--tg-theme-bg-color)));

  --ds-text-primary: var(--tg-theme-text-color);
  --ds-text-secondary: var(--tg-theme-subtitle-text-color, var(--tg-theme-hint-color, var(--tg-theme-text-color)));
  --ds-text-hint: var(--tg-theme-hint-color);
  --ds-text-link: var(--tg-theme-link-color);
  --ds-text-accent: var(--tg-theme-accent-text-color, var(--tg-theme-link-color));
  --ds-text-section-header: var(--tg-theme-section-header-text-color, var(--tg-theme-text-color));
  --ds-text-danger: var(--tg-theme-destructive-text-color, var(--tg-theme-link-color));

  --ds-action-primary-bg: var(--tg-theme-button-color);
  --ds-action-primary-text: var(--tg-theme-button-text-color);
  --ds-action-secondary-bg: var(--tg-theme-secondary-bg-color, var(--tg-theme-section-bg-color, var(--tg-theme-bg-color)));
  --ds-action-secondary-text: var(--tg-theme-text-color);

  --ds-divider: var(--tg-theme-section-separator-color, var(--tg-theme-secondary-bg-color, var(--tg-theme-hint-color)));
  --ds-rating-glow: var(--tg-theme-accent-text-color, var(--tg-theme-link-color));
  --ds-promo-start: var(--tg-theme-button-color);
  --ds-promo-end: var(--tg-theme-link-color);
}
```

### Color Psychology
| Токен | Психология | Где применять | Чего избегать |
| --- | --- | --- | --- |
| `--ds-action-primary-bg` | явное действие, уверенность, следующий шаг | CTA, активная фильтрация, sticky booking button | большие фоновые поверхности |
| `--ds-text-accent` | интеллектуальная подсветка, ощущение "здесь важный сигнал" | рейтинг, ключевые метки, ссылки на source-like действия | длинные абзацы |
| `--ds-bg-surface` | мягкая глубина и структурность | карточки, секции, фильтры | полноэкранный фон |
| `--ds-text-secondary` | снижает шум и помогает иерархии | подписи, клиника, количество отзывов | CTA или warning copy |
| `--ds-text-danger` | риск и осторожность | legal warnings, ошибки, удаление | обычные ссылки |

### Typography
```css
:root {
  --font-display: "Manrope Variable", "Inter Variable", ui-sans-serif, system-ui, sans-serif;
  --font-body: "Inter Variable", ui-sans-serif, system-ui, sans-serif;
  --font-mono: "JetBrains Mono", ui-monospace, SFMono-Regular, monospace;

  --text-display: 32px;
  --text-h1: 24px;
  --text-h2: 20px;
  --text-title: 18px;
  --text-body: 16px;
  --text-body-sm: 14px;
  --text-caption: 12px;

  --leading-display: 1.1;
  --leading-heading: 1.2;
  --leading-body: 1.45;
  --leading-caption: 1.35;

  --weight-regular: 400;
  --weight-medium: 500;
  --weight-semibold: 600;
  --weight-bold: 700;
}
```

Почему так:
- `Manrope` в заголовках дает более живой и теплый характер, чем стандартный системный grotesk.
- `Inter` в теле лучше держит плотные медицинские метаданные и не ломает читабельность.
- На `320px` display не должен превышать `32px`, иначе шапка home screen теряет ритм.

### Spacing: 8px Grid
```css
:root {
  --space-1: 8px;
  --space-2: 16px;
  --space-3: 24px;
  --space-4: 32px;
  --space-5: 40px;
  --space-6: 48px;
  --space-7: 56px;
  --space-8: 64px;
}
```

Правила:
- Вся layout spacing кратна `8px`.
- Между заголовком и supporting copy: `8px`.
- Между блоками секций: `24px` или `32px`.
- Внутри карточки врача: `16px`.

### Radii
```css
:root {
  --radius-sm: 12px;
  --radius-md: 16px;
  --radius-lg: 24px;
  --radius-pill: 999px;
}
```

Иерархия:
- `12px`: chips, badges, compact pills.
- `16px`: inputs, small cards, buttons.
- `24px`: крупные секции, carousel cards, hero surfaces.

### Elevation
```css
:root {
  --shadow-soft: 0 8px 24px color-mix(in srgb, var(--tg-theme-text-color) 8%, transparent);
  --shadow-card: 0 12px 32px color-mix(in srgb, var(--tg-theme-text-color) 10%, transparent);
  --shadow-halo: 0 0 0 1px color-mix(in srgb, var(--tg-theme-accent-text-color, var(--tg-theme-link-color)) 16%, transparent),
                 0 8px 20px color-mix(in srgb, var(--tg-theme-accent-text-color, var(--tg-theme-link-color)) 20%, transparent);
}
```

Если `color-mix()` решат не использовать:
- fallback: обычная box-shadow без смешивания цвета, на `--tg-theme-text-color` с low opacity.

### Motion Tokens
```css
:root {
  --motion-fast: 140ms;
  --motion-base: 220ms;
  --motion-slow: 360ms;
  --ease-standard: cubic-bezier(0.22, 1, 0.36, 1);
  --ease-soft: cubic-bezier(0.25, 0.1, 0.25, 1);
  --z-base: 1;
  --z-sticky: 20;
  --z-overlay: 40;
  --z-toast: 60;
}
```

## Layout Architecture
- `max-width`: `720px` для desktop within Telegram, но mobile-first с базовым контейнером `100%`.
- `page padding`: `16px` + safe area:
```css
padding-left: max(16px, var(--tg-content-safe-area-inset-left));
padding-right: max(16px, var(--tg-content-safe-area-inset-right));
padding-top: max(16px, var(--tg-content-safe-area-inset-top));
padding-bottom: max(24px, var(--tg-content-safe-area-inset-bottom));
```
- Breakpoints:
  - `320px`: минимальный mobile.
  - `768px`: tablet/desktop in Telegram.
  - `1280px`: only for wider web debugging, not primary target.

## Theme Strategy
- Источник правды по теме: `Telegram.WebApp.themeParams`.
- Локально не хранить цветовую тему; Mini App должен всегда следовать Telegram.
- При наличии события `themeChanged` обновлять только semantic aliases, а не переопределять palette вручную.
- Invariant tokens: spacing, radii, motion, typography scale.
- Theme-sensitive tokens: все colors, shadows, glow, section emphasis.

## Component System

### Atoms
#### 1. Primary Button
- Назначение: открыть список, применить фильтр, уйти на запись.
- Анатомия: label, optional icon, optional right-chevron.
- Состояния: default, pressed, loading, disabled.
- Accessibility:
  - target area `>= 44x44`;
  - контраст текста на кнопке минимум `4.5:1` относительно `button_color`.

#### 2. Search Field
- Анатомия: leading search icon, placeholder, clear action.
- Placeholder tone: только `--ds-text-hint`.
- Состояния: default, focus, filled, error.
- Правило: никакой декоративной обводки; focus задается ring/elevation.

#### 3. Filter Chip
- Типы: default, selected, promo, specialty.
- Радиус: `pill`.
- Состояния: default, selected, pressed, disabled.

#### 4. Rating Pill
- Содержимое: star icon, numeric rating, review count.
- Использует `Halo Rating`.

#### 5. Promo Ticket Badge
- Содержимое: label, optional deadline.
- Использует `Ticket Promo Badge`.

#### 6. Avatar / Placeholder
- Фото врача или инициал-плейсхолдер.
- Правило: если фото нет, показывать инициалы и specialty tint через `surface`, без стоковых силуэтов.

### Molecules
#### 1. Doctor Card
- Anatomy: avatar, name, specialty, clinic, rating pill, review count, optional promo badge.
- Варианты: compact list, featured list.
- Состояния: default, pressed, skeleton, hidden data fallback.

#### 2. Promo Carousel Card
- Anatomy: tag, title, clinic, validity, CTA hint.
- Варианты: short promo, long promo.

#### 3. Clinic Row
- Anatomy: clinic name, address/metro, source link hint.
- Состояния: normal, with active promo, disabled if unavailable.

#### 4. Review Summary Block
- Содержимое: rating value, stars, review count, source note.
- Без full-text excerpts.

#### 5. Empty State
- Для search/list: friendly explanation + one next action.
- Не использовать иллюстрации как обязательную зависимость в MVP.

### Organisms
#### 1. Home Search Stack
- Большой заголовок
- Search field
- Specialty quick filters
- Hot promotions carousel
- Trust note "отзывы и акции из открытых источников"

#### 2. Results List
- Sticky compact search header
- Applied filters row
- Vertical doctor cards
- Optional inline "показать акции по этой специальности"

#### 3. Doctor Detail Hero
- Large profile block
- Rating halo
- Clinics section
- Promotions section
- Sticky CTA bar with `Записаться`

## UX Flow: 3 Main Screens

### 1. Главный экран / Search Home
Структура сверху вниз:
1. Short greeting block:
   - заголовок: `Найдите врача в Минске без хаоса`
   - supporting copy: `Сравните отзывы, клиники и акции за пару минут`
2. Search field:
   - placeholder: `Специальность, врач или клиника`
3. Quick filters row:
   - `Гинеколог`
   - `УЗИ`
   - `Дерматолог`
4. Hot promotions carousel:
   - 2-5 карточек с акциями
5. Trust strip:
   - `Рейтинги и количество отзывов`
   - `Переход на оригинальную запись`

UX-логика:
- Home должен ощущаться не как каталог, а как launchpad.
- Первый экран отвечает на три вопроса: что искать, с чего начать, почему можно доверять.

### 2. Список врачей / List
Структура:
1. Sticky compact header:
   - back button
   - search query summary
2. Active filters chips
3. Result count
4. Vertical doctor cards

Doctor card content:
- фото/placeholder
- ФИО
- специальность
- название клиники
- rating pill со звездами
- количество отзывов
- promo badge, если есть акция

UX-правила:
- карточка целиком tappable;
- вторичная информация не должна обгонять имя врача;
- список работает как "scan surface": пользователь должен принять решение за 2-3 секунды на карточку.

### 3. Карточка врача / Detail
Структура:
1. Hero block:
   - фото/placeholder
   - ФИО
   - specialties
   - rating halo + review count
2. Clinics section:
   - список клиник с адресом/метро
3. Promotions section:
   - активные акции
4. Source trust note:
   - `Запись происходит на сайте клиники`
5. Sticky CTA:
   - огромная кнопка `Записаться`

UX-правила:
- Detail должен снимать тревогу и не заставлять искать нужную кнопку.
- Sticky CTA появляется после первого экрана и остается доступным до конца.
- Если клиник несколько, рядом с CTA показываем выбранную клинику или просим выбрать клинику до ухода.

## Required States
- hover
- focus-visible
- pressed/active
- loading/skeleton
- disabled
- empty
- error
- success

Особенно важно:
- loading для search results;
- disabled для кнопки записи, если source link временно недоступен;
- empty state с предложением сменить фильтр.

## Accessibility
- Контраст текста и интерактивных элементов: `WCAG 2.1 AA`, минимум `4.5:1` для body text.
- Не полагаться только на цвет:
  - selected chip отличать и цветом, и формой, и иконкой/outline.
- Focus-visible обязателен для web-debugging и desktop Telegram.
- Target sizes: `44x44px` минимум.
- Placeholder text тоже проверять на contrast minimum.
- Звезды рейтинга не являются единственным носителем смысла: рядом обязательно numeric rating и число отзывов.

## Technical Foundation Handoff

### CSS Architecture
- Layer 1: Telegram native vars
- Layer 2: semantic aliases `--ds-*`
- Layer 3: component tokens `--card-padding`, `--badge-bg`, `--search-height`

### Responsive Rules
- Mobile-first.
- На `320px` quick filters переходят в horizontal scroll.
- На `768px+` detail screen может получить двухколоночный clinic/promo split, но home и list остаются single-column.

### Suggested Tailwind Mapping
```ts
export default {
  theme: {
    extend: {
      colors: {
        page: "var(--ds-bg-page)",
        surface: "var(--ds-bg-surface)",
        section: "var(--ds-bg-section)",
        text: "var(--ds-text-primary)",
        subtle: "var(--ds-text-secondary)",
        hint: "var(--ds-text-hint)",
        accent: "var(--ds-text-accent)",
        action: "var(--ds-action-primary-bg)",
        actionText: "var(--ds-action-primary-text)",
        divider: "var(--ds-divider)",
        danger: "var(--ds-text-danger)",
      },
      borderRadius: {
        sm: "var(--radius-sm)",
        md: "var(--radius-md)",
        lg: "var(--radius-lg)",
        pill: "var(--radius-pill)",
      },
      spacing: {
        1: "var(--space-1)",
        2: "var(--space-2)",
        3: "var(--space-3)",
        4: "var(--space-4)",
        5: "var(--space-5)",
        6: "var(--space-6)",
      },
      boxShadow: {
        soft: "var(--shadow-soft)",
        card: "var(--shadow-card)",
        halo: "var(--shadow-halo)",
      },
      fontFamily: {
        display: "var(--font-display)",
        body: "var(--font-body)",
        mono: "var(--font-mono)",
      },
    },
  },
};
```

## Visual Directions

### Direction A — Pragmatic Trust
- Personality: calm, reliable, fast
- Color strategy: minimal contrast, almost all emphasis through button/accent tokens
- Typography pair: Manrope + Inter
- Motion: restrained
- Best for: fast implementation, list-heavy product
- Not ideal for: сильное брендирование маркетинговых поверхностей

### Direction B — Editorial Clinical Glow
- Personality: warm, modern, memorable
- Color strategy: stronger use of accent glow and promo ticket patterns
- Typography pair: Manrope display with slightly larger headings
- Motion: expressive but short
- Best for: Mini App with ярким характером и сильным канальным трафиком
- Not ideal for: если захотите предельно консервативный визуальный язык

Рекомендация: `Direction B` как основной, но с плотностью и дисциплиной `Direction A`.

## Emotional Journey Map
1. Первый контакт:
   - пользователь видит крупный promise и быстрые specialty shortcuts;
   - hook: "можно не копаться в каталогах".
2. Исследование:
   - doctor cards дают scan-friendly выбор;
   - micro-interaction: halo rating и живая promo badge.
3. Действие:
   - tap по карточке ведет в detail;
   - sticky CTA убирает сомнение, где записаться.
4. Результат:
   - пользователь чувствует ясность и контроль, а не перегрузку.
5. Возврат:
   - запоминаются рейтинг-halo и "талонные" promo badges.

## Hierarchy Score
```text
Visual Hierarchy: 9/10
Cognitive Load:   8/10
CTA Clarity:      9/10
Trust Signals:    9/10
Mobile Usability: 9/10
```

## Priority Backlog
- `FIRST`: собрать foundation tokens и 3 core organisms.
- `FIRST`: реализовать sticky CTA и search input with quick filters.
- `PLAN`: анимированный promo carousel с graceful fallback.
- `PLAN`: A/B тест двух вариантов promo badge.
- `QUICK WIN`: skeleton states и subtle press depth.

## Cross-Touchpoint Consistency Audit
| Touchpoint | Consistency | Комментарий |
| --- | --- | --- |
| Bot welcome | high | бот уже обещает поиск врачей и акции; Mini App должен продолжать ту же ясную пользу |
| Mini App home | high | основной носитель brand personality |
| Detail screen | high | самое важное место для trust signals |
| Privacy/legal screens | medium | нужен тот же тон и тот же surface language, без ощущения "чужого сайта" |
| Future landing | medium | должен взять те же signature elements, иначе будет brand fragmentation |

## Aesthetic Failure Modes
- `Generic SaaS gloss`
  - риск: если оставить обычные rounded cards без signature elements
  - фикс: обязательно сохранить halo rating и ticket badge
- `Admin-panel syndrome`
  - риск: слишком плотная типографика и одинаковые карточки
  - фикс: больше воздуха на home, один крупный заголовок, clear CTA
- `Premium cosplay`
  - риск: чрезмерный glow и blur
  - фикс: glow только для рейтинга и CTA moments

## Fidelity Check
```text
=== FIDELITY CHECK ===
Critical visual invariants: Telegram-native semantic color layer, halo rating, promo ticket badge, sticky booking CTA.
Required states: hover, focus-visible, active, loading, disabled, empty, error, success.
Non-negotiable spacing rules: все layout spacing кратны 8px; карточка врача имеет минимум 16px внутреннего отступа.
Non-negotiable typography rules: имя врача всегда визуально сильнее клиники и рейтинга; body text не меньше 14px.
Needs design QA after implementation: да, для home screen density, rating pill glow, safe-area поведения и sticky CTA.
Graceful degradation allowed: упростить glow/shimmer до статического surface accent, если производительность или Telegram WebView будут нестабильны.
======================
```

## Governance Layer
- Подробные governance notes вынесены в `docs/design/`.
- Обязательны перед началом фронтенда:
  - `brand_rules.md`
  - `component_usage_rules.md`
  - `token_change_policy.md`
  - `deprecation_rules.md`
  - `brand_drift_checklist.md`
  - `implementation_review_points.md`
  - `motion-tokens.md`

## Implementation Order
1. Telegram theme bootstrap + semantic aliases.
2. Typography, spacing, radii, elevation.
3. Atoms: button, search field, chip, badge, avatar.
4. Molecules: doctor card, promo card, clinic row, review summary.
5. Organisms: home, list, detail.
6. Sticky CTA and BackButton behavior.
7. Loading/empty/error states.
8. Motion and polishing.

## A/B Tests
- `A/B #1`: promo badge
  - A: compact ticket with perforation
  - B: pill badge with striped accent rail
- `A/B #2`: rating emphasis
  - A: halo on rating block only
  - B: halo + subtle animated shimmer once on first render

## Taste Critique
```text
=== TASTE CRITIQUE ===
Looks like: смесь Telegram-native utility app и современной clinical discovery поверхности.
Feels too generic in: results list, если убрать rating halo и promo ticket.
Strongest visual move: Halo Rating как trust signal, который одновременно полезен и запоминается.
Weakest visual move: базовые surfaces легко скатятся в обычные карточки без хорошей типографики.
Most borrowed pattern: вертикальный список карточек врачей.
What makes it ours: ticket-like promo language + glow-based trust system, завязанные на Telegram palette вместо собственных хексов.
What to push one level higher: hero copy и микроанимацию появления фильтров на home screen.
======================
```

## References
- https://core.telegram.org/bots/webapps
- https://docs.ton.org/ecosystem/tma/telegram-ui/platform-and-palette
- https://www.w3.org/WAI/WCAG21/Understanding/contrast-minimum
- https://www.103.by/
- https://talon.by/
- https://ydoc.by/
- https://www.zocdoc.com/
- https://www.practo.com/
- https://www.doctoralia.co/
- https://developer.apple.com/design/human-interface-guidelines/navigation-and-search
