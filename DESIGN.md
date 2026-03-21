# Design System — MedsearchRB Mini App

## 1. Overview
**Holistic Description:** Telegram Mini App для поиска врачей Минска, сравнения отзывов и просмотра актуальных акций.  
**Personality:** Надежный, Дружелюбный, Технологичный  
**Visual Metaphor:** Умная стойка навигации в современной клинике, где все спокойно подсвечено и сразу понятно.

## 2. Colors
| Роль | Переменная | Source Token | Описание |
|------|------------|--------------|----------|
| Page | `--ds-bg-page` | `--tg-theme-bg-color` | Основной фон |
| Surface | `--ds-bg-surface` | `--tg-theme-secondary-bg-color` | Карточки и панели |
| Section | `--ds-bg-section` | `--tg-theme-section-bg-color` | Секции и подложки |
| Primary Text | `--ds-text-primary` | `--tg-theme-text-color` | Основной текст |
| Secondary Text | `--ds-text-secondary` | `--tg-theme-subtitle-text-color` / `--tg-theme-hint-color` | Метаданные |
| Accent | `--ds-text-accent` | `--tg-theme-accent-text-color` / `--tg-theme-link-color` | Рейтинг, ссылки, акценты |
| CTA | `--ds-action-primary-bg` | `--tg-theme-button-color` | Главные действия |
| CTA Text | `--ds-action-primary-text` | `--tg-theme-button-text-color` | Текст CTA |
| Danger | `--ds-text-danger` | `--tg-theme-destructive-text-color` | Ошибки и риски |

## 3. Typography
| Уровень | Семейство | Weight | Размер | Line-height |
|---------|-----------|--------|--------|-------------|
| Display | Manrope Variable | 700 | 32px | 1.1 |
| Headline | Manrope Variable | 700 | 24px | 1.2 |
| Title | Inter Variable | 600 | 20px | 1.2 |
| Body | Inter Variable | 400 | 16px | 1.45 |
| Caption | Inter Variable | 400 | 12px | 1.35 |
| Label | Inter Variable | 500 | 14px | 1.35 |
| Code | JetBrains Mono | 400 | 14px | 1.5 |

## 4. Elevation
| Уровень | Тень | Border | Описание |
|---------|------|--------|----------|
| Flat | none | none | Чистые поверхности |
| Low | `var(--shadow-soft)` | none | Чипы и мелкие блоки |
| Medium | `var(--shadow-card)` | none | Карточки врачей |
| High | `var(--shadow-halo)` | none | Рейтинг и CTA-моменты |

## 5. Components
### Buttons
- **Radius:** `--radius-md: 16px`, `--radius-pill: 999px`
- **Padding:** `16px 24px`
- **States:**
  - Hover/Press: легкое углубление и сжатие
  - Active: сохраняет высокий контраст
  - Disabled: пониженная заметность, но сохраняется читаемость

### Inputs
- **Radius:** `--radius-md: 16px`
- **Background:** `var(--ds-bg-surface)`
- **Focus:** subtle ring на базе `--ds-text-accent`
- **Padding:** `16px`

### Cards
- **Background:** `var(--ds-bg-surface)`
- **Radius:** `--radius-lg: 24px`
- **Padding:** `16px`
- **Shadow:** `var(--shadow-card)`

## 6. Do's and Don'ts
### ✅ DO
- Использовать только Telegram theme variables как источник цвета
- Соблюдать 8px grid
- Делать имя врача главным элементом карточки
- Держать CTA `Записаться` большим и заметным
- Проверять contrast минимум по WCAG AA

### ❌ DON'T
- Не использовать абсолютные HEX для UI-слоев
- Не вводить bottom tab bar в MVP
- Не показывать full-text отзывы
- Не перегружать карточки лишними данными
- Не превращать список врачей в admin-table
