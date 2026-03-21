# Design System Document: The Clinical Ethereal

## 1. Overview & Creative North Star
**Creative North Star: "The Digital Sanctuary"**

In the context of health and medical searching in Minsk, the interface must transcend a simple utility. This design system rejects the "industrial" clinical look in favor of a "Sanctuary" aesthetic—a space that feels breathable, authoritative, and profoundly calm. 

We break the "template" look by utilizing **High-Contrast Typography Scales** (juxtaposing large, airy headlines with compact, precise labels) and **Intentional Asymmetry**. We move away from rigid grid-based boxes toward a layout that uses "Negative Space as a Component." By allowing elements to breathe and overlap slightly, we create a sense of organic trust rather than robotic efficiency.

---

## 2. Colors & Surface Philosophy
Our palette is rooted in the clarity of a Minsk morning—cool, crisp, and professional.

### Palette Tokens (Material Design Convention)
*   **Primary:** `#006194` (The Anchor)
*   **Surface:** `#F7F9FB` (The Canvas)
*   **Surface Container Lowest:** `#FFFFFF` (The Floating Layer)
*   **On-Surface:** `#191C1E` (The Authority)
*   **Outline Variant:** `#BFC7D2` (The Ghost)

### The "No-Line" Rule
Strictly prohibit 1px solid borders for sectioning. Structural definition must be achieved through **Background Color Shifts**. 
*   *Example:* A `surface-container-low` search bar sitting on a `surface` background. 
*   *Objective:* Eliminate visual noise. Lines create "cages"; tonal shifts create "zones."

### Surface Hierarchy & Nesting
Treat the UI as a series of physical layers. 
1.  **Level 0 (Base):** `surface` (#F7F9FB) – The global background.
2.  **Level 1 (Nesting):** `surface-container-low` (#F2F4F6) – Used for grouping related content (e.g., a list background).
3.  **Level 2 (Priority):** `surface-container-lowest` (#FFFFFF) – Used for interactive cards that need to "pop."

### The "Glass & Gradient" Rule
For floating elements (Modals, Bottom Sheets), use **Glassmorphism**: `bg-white/80 backdrop-blur-md`. This ensures the patient never feels "lost" from their previous context. For CTAs, apply a subtle gradient from `primary` (#006194) to `primary-container` (#007BB9) to provide depth and "soul" that flat hex codes lack.

---

## 3. Typography
We use a dual-font strategy to balance character with readability.

*   **Display & Headlines (Manrope):** Chosen for its modern, geometric friendliness. Large `display-md` (2.75rem) titles should have generous letter-spacing (-0.02em) to feel editorial.
*   **Body & Labels (Inter):** The workhorse of the system. `body-md` (0.875rem) provides maximum legibility for medical descriptions and pharmacy addresses.

**Hierarchy as Identity:** 
Use `headline-sm` (1.5rem) for section titles to establish clear landmarks. All typography should prioritize the Russian language's specific x-heights, ensuring balanced line-heights (1.5x for body text) to prevent the "dense block" effect.

---

## 4. Elevation & Depth
Depth is a functional tool, not a decoration.

*   **The Layering Principle:** Instead of shadows, stack `surface-container-lowest` cards on `surface-container-low` backgrounds. This creates a "Soft Lift."
*   **Ambient Shadows:** If an element must float (e.g., a "Book Now" FAB), use an extra-diffused shadow: `shadow-[0_8px_30px_rgb(0,0,0,0.04)]`. The shadow is nearly invisible, mimicking natural ambient light.
*   **The Ghost Border:** If accessibility requires a boundary, use `outline-variant` at 15% opacity. Forbid 100% opaque borders.

---

## 5. Components

### Signature Elements (The "MedSearch" DNA)
1.  **Halo Rating:** Used for doctor profiles. 
    *   *Spec:* `shadow-[0_0_12px_rgba(2,132,199,0.15)] text-[#0284C7] bg-blue-50 px-2 py-1 rounded-full`. It should appear to emit its own soft light.
2.  **Ticket Promo Badge:** For pharmacy discounts.
    *   *Spec:* `border-l-2 border-dashed border-[#0284C7] bg-blue-50 p-4 rounded-r-2xl`. The dashed line mimics a physical coupon.

### Primitive Styling
*   **Buttons:** 
    *   **Primary:** `rounded-xl` (12px), Gradient fill, `title-sm` (Inter SemiBold).
    *   **Tertiary:** No background, `primary` text color, subtle hover state using `primary/5`.
*   **Input Fields:** Use `surface-container-lowest` with a "Ghost Border." Labels must be `label-md` in `on-surface-variant` (#3F4850).
*   **Cards:** `rounded-2xl` (16px). **Prohibit Dividers.** Use `gap-4` (1rem) and `p-4` (1rem) to create separation through white space.
*   **Chips:** Pill-shaped (`rounded-full`), `bg-secondary-container` for inactive, `bg-primary` for active.

### Contextual Components
*   **Status Indicators:** For "Available/In-Stock." Use a soft pulse animation on a 6px dot rather than high-contrast bold text.
*   **Prescription Timeline:** A vertical track using the `outline-variant` as a "Ghost Line" (10% opacity) to connect medical events.

---

## 6. Do's and Don'ts

### Do
*   **Do** use asymmetrical margins (e.g., more padding at the top of a section than the bottom) to create a high-end editorial feel.
*   **Do** use Lucide icons with a `stroke-width` of 1.5pt to match the weight of Inter's body text.
*   **Do** write all copy in professional, empathetic Russian (e.g., "Найдем ближайшую аптеку" instead of "Поиск").

### Don't
*   **Don't** use pure black (#000000) for text. Use `on-surface` (#191C1E) to maintain the soft sanctuary vibe.
*   **Don't** use standard `border-gray-200`. If you feel the urge to draw a line, try adding 8px of extra whitespace or a subtle background tint instead.
*   **Don't** crowd the "Halo Rating." It requires at least 12px of clear space around it to maintain its "glow" effect.

---
*Document end. Follow these principles to ensure the interface feels like a trusted partner in the user's health journey.*