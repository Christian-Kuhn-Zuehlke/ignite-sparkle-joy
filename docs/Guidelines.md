# MS Direct — Design System Guideline

> **Product:** MSD Applications (Portal / Special-application Returns, Powerapps, Nova)
> **Version:** 2.0
> **Last updated:** 2026-02-26
> **Primary context:** Seated desktop workstation — mouse and keyboard input
> **Responsive targets:** Desktop, laptop, tablet, mobile (European market)
> **Special-application context:** Standing touch workstation — 21″ touchscreen, no mouse, no mobile view

---

## 1 · Design Principles

### 1.1 Universal Principles

These principles apply to **every** context — desktop, tablet, mobile, and touch workstation.

| # | Principle | Rule |
|---|-----------|------|
| 1 | **Clarity First** | Every action, label, and data point must be immediately legible and unambiguous. |
| 2 | **Reduce Cognitive Load** | Show only the data and controls relevant to the current workflow step. Progressive disclosure over information overload. |
| 3 | **Consistency** | Uniform component behaviour, color semantics, spacing rhythm, and feedback patterns across all screens and breakpoints. |
| 4 | **Feedback-Rich Interactions** | Every user action receives visual acknowledgement — state changes, loading indicators, success / error feedback. |
| 5 | **Accessibility** | WCAG 2.2 Level AA compliance. High contrast, visible focus indicators, keyboard navigability, screen-reader compatibility, and language switching. |
| 6 | **Resilience** | Graceful degradation across viewports. Content remains usable and legible even on the smallest supported screen. |

### 1.2 Desktop-Specific Principles (Primary Context)

| Principle | Rule |
|-----------|------|
| **Precision Input** | Optimised for mouse pointer and keyboard. Interactive target size minimum: **32 × 32 px** (WCAG 2.2 AA for pointer input). |
| **Information Density** | Desktop layouts may present denser data views — wider tables, multi-column forms, side-by-side panels. |
| **Keyboard-First Navigation** | All workflows must be completable via keyboard alone. Logical tab order, shortcut support, and visible focus rings. |
| **Hover States** | All interactive elements display hover feedback (cursor change, background shift, or underline). |

### 1.3 Touch-Workstation Principles (Special Application Only)

> ⚠️ **Scope:** These principles apply **only** inside the `[data-mode="touch"]` / `.touch-mode` context — a standing-user 21″ touchscreen kiosk (1920 × 1080). There is **no mobile view** in this mode. See [§ 13 · Touch-Workstation Mode](#13--touch-workstation-mode-special-application) for full overrides.

| Principle | Rule |
|-----------|------|
| **Big, Clear & Focused** | Every action reachable with a single tap. Minimum touch target: **48 × 48 px**. |
| **Resilience to Input Error** | Support coarse touch (gloved users). Double-tap forgiveness on destructive actions. No long-press or swipe-only gestures. |
| **Scan-Driven Flow** | UI reacts to barcode scans — auto-focus, auto-advance, and inline confirmation. |
| **Readable at Distance** | All text legible at 60–80 cm standing distance. |

---

## 2 · Color System

> Colors are shared across all contexts. No context-specific color overrides exist.

### 2.1 Base Palette

| Token | Hex | RGB | Usage |
|-------|-----|-----|-------|
| `color.primary` | `#0092D4` | 0, 146, 212 | Primary actions, links, focus rings |
| `color.secondary` | `#083F66` | 8, 63, 102 | Headlines, labels, sidebar bg, active navigation |
| `color.foreground` | `#2B2A28` | 43, 42, 40 | Body text, card text, input values |
| `color.white` | `#FFFFFF` | 255, 255, 255 | Card bg, text on dark surfaces |
| `color.subtitle` | `#445F71` | 68, 95, 113 | Subtitles, hover states, placeholder text |
| `color.mutedForeground` | `#8294A0` | 130, 148, 160 | Icons, disabled states, input borders |
| `color.mutedSubtle` | `#E0E4E7` | 224, 228, 231 | Borders, table lines, muted button bg |
| `color.muted` | `#F1F5F6` | 241, 245, 246 | Light backgrounds only (never text) |
| `color.primaryBg` | `#E6F5FB` | 230, 245, 251 | App background |
| `color.successEmphasis` | `#0F6A42` | 15, 106, 66 | Strong success borders |
| `color.success` | `#299F55` | 41, 159, 85 | Success buttons, progress bars, toggles |
| `color.successSubtle` | `#53DD6C` | 83, 221, 108 | Success notification borders |
| `color.successBg` | `#DDF8E2` | 221, 248, 226 | Success notification bg |
| `color.warningEmphasis` | `#CC8D2D` | 204, 141, 45 | Strong warning borders |
| `color.warning` | `#FFB038` | 255, 176, 56 | Warning buttons, indicators |
| `color.warningSubtle` | `#FFDFB0` | 255, 223, 176 | Warning notification borders |
| `color.warningBg` | `#FFEFD7` | 255, 239, 215 | Warning notification bg |
| `color.destructiveEmphasis` | `#C30000` | 195, 0, 0 | Strong error borders |
| `color.destructive` | `#FF0000` | 255, 0, 0 | Delete actions, error messages |
| `color.destructiveSubtle` | `#FF6666` | 255, 102, 102 | Error notification borders |
| `color.destructiveBg` | `#FFE5E5` | 255, 229, 229 | Error notification bg |

> ⛔ **Deprecated:** `color.grey20` (`#C1C9CF`) — replace all usage with `color.mutedForeground`.

### 2.2 Semantic Tokens — Foreground / Text

| Token | Resolves To | When to Use |
|-------|-------------|-------------|
| `color.text.foreground` | `color.foreground` `#2B2A28` | Body text, input values, table cells |
| `color.text.secondary` | `color.secondary` `#083F66` | Headlines, form labels, table headers |
| `color.text.onSecondary` | `color.white` `#FFFFFF` | Text on `color.secondary` backgrounds |
| `color.text.onCard` | `color.foreground` `#2B2A28` | Text on card backgrounds |
| `color.text.subtitle` | `color.subtitle` `#445F71` | Subtitles, hover hint text, placeholders |
| `color.text.muted` | `color.mutedForeground` `#8294A0` | Icons, disabled inputs, disabled buttons |
| `color.text.onPrimary` | `color.white` `#FFFFFF` | Text on `color.primary` backgrounds |
| `color.text.success` | `color.success` `#299F55` | Success icons / status on light bg |
| `color.text.warning` | `color.warning` `#FFB038` | Warning icons / status on light bg |
| `color.text.destructive` | `color.destructive` `#FF0000` | Error icons / status on light bg |

### 2.3 Semantic Tokens — Background

| Token | Resolves To | When to Use |
|-------|-------------|-------------|
| `color.bg.app` | `color.primaryBg` `#E6F5FB` | Main app background |
| `color.bg.card` | `color.white` `#FFFFFF` | Cards, forms, tables |
| `color.bg.mutedSubtle` | `color.mutedSubtle` `#E0E4E7` | Button backgrounds, borders, table lines |
| `color.bg.muted` | `color.muted` `#F1F5F6` | Light backgrounds only (never text) |
| `color.bg.success` | `color.successBg` `#DDF8E2` | Success notification bg |
| `color.bg.warning` | `color.warningBg` `#FFEFD7` | Warning notification bg |
| `color.bg.destructive` | `color.destructiveBg` `#FFE5E5` | Error notification bg |

### 2.4 Semantic Tokens — Border

| Token | Resolves To | When to Use |
|-------|-------------|-------------|
| `color.border.muted` | `color.mutedSubtle` `#E0E4E7` | Generic borders, table lines |
| `color.border.success` | `color.successSubtle` `#53DD6C` | Success notification border |
| `color.border.warning` | `color.warningSubtle` `#FFDFB0` | Warning notification border |
| `color.border.destructive` | `color.destructiveSubtle` `#FF6666` | Error notification border |
| `color.border.input` | `color.mutedForeground` `#8294A0` | Input field default border |
| `color.border.inputFocus` | `color.primary` `#0092D4` | Input field focus border |

### 2.5 Semantic Tokens — Interactive / Status

| Token | Resolves To | Usage |
|-------|-------------|-------|
| `color.interactive.primary.bg` | `color.primary` `#0092D4` | Primary buttons, links |
| `color.interactive.primary.foreground` | `color.white` `#FFFFFF` | Text on primary buttons |
| `color.interactive.success.bg` | `color.success` `#299F55` | Success buttons, progress bars, done labels, toggles |
| `color.interactive.success.border` | `color.successEmphasis` `#0F6A42` | Stronger outline when needed |
| `color.interactive.warning.bg` | `color.warning` `#FFB038` | Warning buttons |
| `color.interactive.warning.border` | `color.warningEmphasis` `#CC8D2D` | Button warning borders |
| `color.interactive.destructive.bg` | `color.destructive` `#FF0000` | Delete / irreversible action buttons |
| `color.interactive.destructive.border` | `color.destructiveEmphasis` `#C30000` | Destructive button borders |

---

## 3 · Typography

### 3.1 Font Family

| Role | Family | CSS Stack |
|------|--------|-----------|
| **Primary** | **Ubuntu** | `'Ubuntu', 'Inter', 'Roboto', 'Segoe UI', sans-serif` |

Import from Google Fonts: `Ubuntu` in weights **400 (Regular)**, **500 (Medium)**, **700 (Bold)**.

### 3.2 Type Scale — Desktop (≥ 1024 px)

This is the base scale used on desktop and laptop screens.

| Style Name | Weight | Size | Line Height | Letter Spacing | Usage |
|------------|--------|------|-------------|----------------|-------|
| **Headline 1** | Bold 700 | 40 px | 48 px (1.2×) | −0.02 em | Page titles |
| **Headline 1** | Medium 500 | 40 px | 48 px | −0.02 em | Page titles (lighter) |
| **Headline 1** | Regular 400 | 40 px | 48 px | −0.02 em | Page titles (light) |
| **Headline 2** | Bold 700 | 32 px | 40 px (1.25×) | −0.01 em | Section titles, modal headers |
| **Headline 2** | Medium 500 | 32 px | 40 px | −0.01 em | Section titles (lighter) |
| **Headline 2** | Regular 400 | 32 px | 40 px | −0.01 em | Section titles (light) |
| **Headline 3** | Bold 700 | 24 px | 32 px (1.33×) | 0 | Card titles, dialog headers |
| **Headline 3** | Medium 500 | 24 px | 32 px | 0 | Card titles (lighter) |
| **Headline 3** | Regular 400 | 24 px | 32 px | 0 | Card titles (light) |
| **Headline 4** | Bold 700 | 20 px | 28 px (1.4×) | 0 | Subsection headers, widget titles |
| **Headline 4** | Medium 500 | 20 px | 28 px | 0 | Subsection headers (lighter) |
| **Headline 4** | Regular 400 | 20 px | 28 px | 0 | Subsection headers (light) |
| **Label** | Bold 700 | 16 px | 24 px (1.5×) | 0 | Form labels, table headers |
| **Label Uppercase** | Medium 500 | 14 px | 20 px (1.43×) | 0.05 em | Category headers (ALL CAPS) |
| **Label Small** | Bold 700 | 14 px | 20 px | 0 | Compact labels, badge text |
| **Body** | Regular 400 | 16 px | 24 px (1.5×) | 0 | Paragraphs, input values, table cells |
| **Body Small** | Regular 400 | 14 px | 20 px (1.43×) | 0 | Helper text, footnotes, meta info |

### 3.3 Responsive Type Scale — Tablet & Mobile

Headlines scale down proportionally on smaller viewports; body and label sizes remain constant for legibility.

| Style | Desktop (≥ 1024 px) | Tablet (600–1023 px) | Mobile (< 600 px) |
|-------|---------------------|----------------------|--------------------|
| **Headline 1** | 40 px | 32 px | 28 px |
| **Headline 2** | 32 px | 28 px | 24 px |
| **Headline 3** | 24 px | 22 px | 20 px |
| **Headline 4** | 20 px | 18 px | 18 px |
| **Label** | 16 px | 16 px | 16 px |
| **Label Uppercase** | 14 px | 14 px | 14 px |
| **Label Small** | 14 px | 14 px | 14 px |
| **Body** | 16 px | 16 px | 16 px |
| **Body Small** | 14 px | 14 px | 14 px |

> **Implementation:** Use CSS `clamp()` for fluid scaling between breakpoints, e.g.
> `font-size: clamp(28px, 2.5vw + 12px, 40px)` for Headline 1.

### 3.4 Font Color Mapping

| Context | Token | Hex |
|---------|-------|-----|
| Headlines | `color.text.secondary` | `#083F66` |
| Body text | `color.text.foreground` | `#2B2A28` |
| Subtitles / subline | `color.text.subtitle` | `#445F71` |
| Button text (on filled bg) | `color.text.onSecondary` | `#FFFFFF` |
| Labels | `color.text.secondary` | `#083F66` |
| Placeholder / disabled | `color.text.muted` | `#8294A0` |
| Links | `color.primary` | `#0092D4` |

---

## 4 · Layout, Grid & Spacing

### 4.1 Spacing Scale

| Token | Value | Usage |
|-------|-------|-------|
| `spacing.2xs` | 2 px | Micro adjustments, border offsets |
| `spacing.xs` | 4 px | Inline icon-to-text gap |
| `spacing.sm` | 8 px | Tight internal padding (badges, chips) |
| `spacing.md` | 12 px | Cell padding, compact gaps |
| `spacing.lg` | 16 px | Button horizontal padding, standard element gap |
| `spacing.xl` | 20 px | Container internal gap & padding |
| `spacing.2xl` | 24 px | Section separators within a card |
| `spacing.3xl` | 30 px | Gap between containers |
| `spacing.4xl` | 40 px | Container vertical padding, major section breaks |

### 4.2 Responsive Container Spacing

| Property | Desktop (≥ 1024 px) | Tablet (600–1023 px) | Mobile (< 600 px) |
|----------|---------------------|----------------------|--------------------|
| Gap between containers | 30 px | 20 px | 16 px |
| Container outer padding | 40 px V · 20 px H | 24 px V · 16 px H | 16 px all |
| Gap inside containers | 20 px | 16 px | 16 px |
| Padding inside containers | 20 px | 16 px | 12 px |

### 4.3 Responsive Breakpoints

Based on the most common European screen resolutions (StatCounter EU 2025) and standard device categories.

| Token | Min Width | Target Devices | Aspect Ratios |
|-------|-----------|----------------|---------------|
| `breakpoint.mobile` | 0 px | Phones (360–414 px). iPhone SE/14/15, Samsung Galaxy S | 9:19.5, 9:20 |
| `breakpoint.mobileLg` | 480 px | Large phones in landscape, phablets | 16:9 |
| `breakpoint.tablet` | 600 px | Portrait tablets. iPad Mini, Galaxy Tab A | 3:4, 5:8 |
| `breakpoint.tabletLg` | 768 px | iPad portrait, Android 10″ tablets | 3:4 |
| `breakpoint.laptop` | 1024 px | iPad landscape, small laptops, Surface Go | 16:10, 3:2 |
| `breakpoint.desktop` | 1280 px | Standard laptops (1366 × 768), MacBook Air 13″ | 16:9, 16:10 |
| `breakpoint.desktopLg` | 1440 px | Full HD laptops (1536 × 864), 15″ screens | 16:9 |
| `breakpoint.desktopXl` | 1920 px | Full HD monitors — most common EU desktop resolution | 16:9 |

### 4.4 Grid System

#### Desktop Grid (≥ 1280 px)

| Property | Value |
|----------|-------|
| Total columns | 12 |
| Column gutter | 24 px |
| Page margin (horizontal) | 24 px |
| Sidebar | 240 px expanded · 64 px collapsed (rail) |
| Content max-width | Fluid (fills remaining space) |

#### Tablet Grid (600–1279 px)

| Property | Value |
|----------|-------|
| Total columns | 8 |
| Column gutter | 16 px |
| Page margin | 16 px |
| Sidebar | Hidden; replaced by top navigation bar or hamburger menu |

#### Mobile Grid (< 600 px)

| Property | Value |
|----------|-------|
| Total columns | 4 |
| Column gutter | 16 px |
| Page margin | 16 px |
| Sidebar | Hidden; hamburger menu with full-screen overlay drawer |

### 4.5 Responsive Layout Behaviours

| Breakpoint | Sidebar | Navigation | Tables | Form layout | Modals |
|------------|---------|------------|--------|-------------|--------|
| **≥ 1440 px** | Expanded (240 px) | Sidebar vertical | Full columns visible | 2–3 column grid | Centred overlay |
| **1280–1439 px** | Expanded (240 px) | Sidebar vertical | Full columns, scroll if needed | 2 column | Centred overlay |
| **1024–1279 px** | Collapsed rail (64 px) | Rail icons + tooltips | Horizontal scroll enabled | 2 column | Centred overlay |
| **768–1023 px** | Hidden | Top bar + hamburger | Priority columns; secondary in expandable row | Single column | Centred overlay |
| **600–767 px** | Hidden | Top bar + hamburger | Card-based or stacked rows | Single column | Full-width bottom sheet |
| **< 600 px** | Hidden | Top bar + hamburger | Card-based layout | Single column, stacked | Full-screen overlay |

---

## 5 · Corner Radius

| Token | Value | Usage |
|-------|-------|-------|
| `radius.sm` | 4 px | Buttons, inputs, checkboxes, small cards, tags |
| `radius.md` | 8 px | Cards, modals, dropdowns, notifications |
| `radius.full` | 9999 px | Avatars, circular indicators, toggles |

> **Rule:** Only `4 px` and `8 px` are used as rectangular radii. Do not introduce new radius values.

---

## 6 · Iconography

### 6.1 Icon Set

| Property | Value |
|----------|-------|
| **Library** | **Heroicons 2** (https://heroicons.com) |
| **Style** | Outline (24 px) for general UI · Mini (20 px) for filled / active / compact states |

### 6.2 Icon Sizes

| Size | Dimensions | Usage |
|------|------------|-------|
| Default | 24 × 24 px | Navigation, toolbar, action icons |
| Small | 20 × 20 px | Inline with labels, table row actions, input icons |
| Micro | 16 × 16 px | Inside badges, compact tags (mobile / tablet) |

### 6.3 Icon Colors

| Context | Color Token | Hex |
|---------|-------------|-----|
| On dark background | `color.white` at 70 % opacity | `rgba(255, 255, 255, 0.7)` |
| On light background | `color.text.secondary` | `#083F66` |
| Inside input fields | `color.text.muted` | `#8294A0` |
| Disabled | `color.text.muted` at 50 % opacity | `rgba(130, 148, 160, 0.5)` |
| Success | `color.text.success` | `#299F55` |
| Warning | `color.text.warning` | `#FFB038` |
| Error | `color.text.destructive` | `#FF0000` |

### 6.4 Recommended Icon Mapping (Heroicons 2)

| Function | Icon Name | Style |
|----------|-----------|-------|
| Home | `home` | Outline |
| Search | `magnifying-glass` | Outline |
| Close / Dismiss | `x-mark` | Outline |
| Download | `arrow-down-tray` | Outline |
| Edit | `pencil-square` | Outline |
| Delete / Archive | `trash` | Outline |
| Sort | `chevron-up-down` | Mini |
| Chevron (expand) | `chevron-down` | Mini |
| More actions | `ellipsis-horizontal` | Outline |
| Settings | `cog-6-tooth` | Outline |
| User / Account | `user-circle` | Outline |
| Notifications | `bell` | Outline |
| Documents | `document-text` | Outline |
| Filter | `funnel` | Outline |
| Check / Done | `check` | Mini |
| View / Eye | `eye` | Outline |
| Calendar | `calendar-days` | Outline |
| Email | `envelope` | Outline |
| Phone | `phone` | Outline |
| Back / Collapse | `arrow-left` | Outline |
| Add | `plus` | Outline |
| Menu (hamburger) | `bars-3` | Outline |

### 6.5 Flags

Country flags are provided as separate SVG / PNG assets. Render at 20 × 14 px with 2 px border radius.

---

## 7 · Components

### 7.1 Interactive Target Sizes

Target size rules follow **WCAG 2.2 SC 2.5.8**, **Material Design 3**, and **Apple HIG** best practices.

| Context | Minimum target | Recommended target | Standard |
|---------|----------------|--------------------|----------|
| **Desktop (mouse)** | 24 × 24 px | 32 × 32 px | WCAG 2.2 AA (pointer) |
| **Tablet (touch)** | 44 × 44 px | 48 × 48 px | Apple HIG / Material 3 |
| **Mobile (touch)** | 44 × 44 px | 48 × 48 px | Apple HIG / Material 3 |
| **Touch workstation** | 48 × 48 px | 56 × 56 px | Custom (gloved users, distance) |

> On desktop, visible component sizes (e.g. 32 px button) are acceptable as long as the clickable area meets the minimum. On touch devices, use padding or invisible hit areas to meet the 44 px minimum.

---

### 7.2 Buttons

#### Sizes

| Size token | Height | Usage | Context |
|------------|--------|-------|---------|
| `button.lg` | 48 px | Primary page actions, form submissions | All — default on tablet / mobile |
| `button.md` | 40 px | In-table actions, toolbars, secondary actions | Desktop default |
| `button.sm` | 32 px | Dense UI: table inline actions, filter chips | Desktop only |

> On viewports < 1024 px, all buttons default to `button.lg` (48 px) for touch compliance.

#### Shared Properties

| Property | Value |
|----------|-------|
| Width | Hug content (auto) · full-width on mobile for primary CTA |
| Padding | 16 px H · 10 px V (MD / LG) · 12 px H · 8 px V (SM) |
| Corner radius | 4 px |
| Font | Label Bold 16 px (MD / LG) · Label Small Bold 14 px (SM) |
| Icon gap | 8 px between icon and label |
| Cursor | `pointer` (desktop) |

#### Variants

| Variant | Background | Border | Text | Icon Color |
|---------|------------|--------|------|------------|
| **Primary** | `#0092D4` | none | `#FFFFFF` | `#FFFFFF` |
| **Secondary / Ghost** | `#FFFFFF` | 1 px inside `#083F66` | `#083F66` | `#083F66` |
| **Danger** | `#FF0000` | none | `#FFFFFF` | `#FFFFFF` |
| **Success** | `#299F55` | none | `#FFFFFF` | `#FFFFFF` |
| **Text** | transparent | none | `#083F66` | `#083F66` |

#### States

| State | Change |
|-------|--------|
| **Default** | As defined above |
| **Hover** | Background darkens 10 %; cursor `pointer` (desktop only) |
| **Active / Pressed** | Background darkens 15 % |
| **Focused** | 2 px outline `#0092D4`, 2 px offset |
| **Disabled** | Opacity 0.4; `pointer-events: none` |
| **Loading** | Replace icon with 20 px spinner; maintain button width |

#### Responsive Button Behaviour

| Breakpoint | Behaviour |
|------------|-----------|
| ≥ 1024 px | Side-by-side buttons; `button.md` default height |
| 600–1023 px | Side-by-side if space permits; `button.lg` height |
| < 600 px | Full-width stacked CTAs; `button.lg` height; primary on top |

---

### 7.3 Input Fields

#### Sizes

| Size | Height | Usage |
|------|--------|-------|
| Default | 40 px | Standard desktop forms |
| Large | 48 px | Tablet, mobile, and touch-workstation forms |

> On viewports < 1024 px, inputs default to **48 px height** for touch compliance.

#### Shared Properties

| Property | Value |
|----------|-------|
| Corner radius | 4 px |
| Border | 1 px inside `#8294A0` |
| Padding | 12 px horizontal |
| Font | Body Regular 16 px |
| Text color | `#2B2A28` |
| Placeholder color | `#445F71` |
| Icon (leading / trailing) | 20 × 20 px · `#8294A0` |

#### States

| State | Border | Background | Notes |
|-------|--------|------------|-------|
| **Default** | `#8294A0` 1 px | `#FFFFFF` | — |
| **Hover** | `#445F71` 1 px | `#FFFFFF` | Desktop only |
| **Focused** | `#0092D4` 2 px | `#FFFFFF` | Blue focus ring |
| **Filled** | `#8294A0` 1 px | `#FFFFFF` | Text `#2B2A28` |
| **Error** | `#FF0000` 2 px | `#FFE5E5` | Error msg below in Body Small `#FF0000` |
| **Disabled** | `#E0E4E7` 1 px | `#F1F5F6` | Text `#8294A0` |

#### Input Variants

| Variant | Notes |
|---------|-------|
| **Text input** | Single-line text entry |
| **Text input + floating label** | Label floats above on focus / filled |
| **Phone input** | Country flag prefix selector + text input |
| **Select / Dropdown** | Trailing `chevron-down`; opens option list |
| **Select with leading icon** | Leading icon + label + trailing chevron |
| **Search input** | Leading `magnifying-glass`, trailing `x-mark` |
| **Textarea** | Multi-line; min-height 120 px; resizable vertically |
| **Large select** | 64 px height, Headline 4 Bold font — prominent choices |

#### Responsive Form Layout

| Breakpoint | Layout | Label position |
|------------|--------|----------------|
| ≥ 1280 px | 2–3 column grid | Above input (4 px gap) |
| 1024–1279 px | 2 column grid | Above input |
| 768–1023 px | 1–2 column grid | Above input |
| < 768 px | Single column, full-width inputs | Above input |

---

### 7.4 Checkboxes

| Property | Desktop | Touch / Tablet / Mobile |
|----------|---------|--------------------------|
| Visual size | 20 × 20 px | 24 × 24 px |
| Clickable area | 32 × 32 px | 44 × 44 px |
| Corner radius | 4 px | 4 px |
| Border | 1 px `#8294A0` | 1 px `#8294A0` |
| Checked bg | `#0092D4` | `#0092D4` |
| Check icon | `check` 14 px `#FFFFFF` | `check` 16 px `#FFFFFF` |
| Label gap | 8 px | 8 px |
| Label font | Body Regular 16 px `#2B2A28` | Same |

| State | Appearance |
|-------|------------|
| Unchecked | White bg · `#8294A0` border |
| Checked | `#0092D4` bg · white check |
| Indeterminate | `#0092D4` bg · white minus |
| Disabled | Opacity 0.4 |
| Error | `#FF0000` border |

Checkbox Card variant: full-width card with description, `#E6F5FB` bg + 1 px `#0092D4` border when selected.

---

### 7.5 Radio Buttons

| Property | Desktop | Touch / Tablet / Mobile |
|----------|---------|--------------------------|
| Visual size | 20 × 20 px | 24 × 24 px |
| Clickable area | 32 × 32 px | 44 × 44 px |
| Border | 2 px `#8294A0` (unselected) · 2 px `#0092D4` (selected) | Same |
| Selected dot | 10 px circle `#0092D4` | Same |
| Label gap | 8 px | 8 px |
| Label font | Body Regular 16 px `#2B2A28` | Same |

Radio Card variant: same card styling as Checkbox Card, for mutually exclusive groups.

---

### 7.6 Tables

#### Structure

| Part | Spec |
|------|------|
| Container | `#FFFFFF` bg · 8 px radius · 1 px `#E0E4E7` border |
| Header row bg | `#F1F5F6` |
| Header text | Label Uppercase Medium 14 px · `#083F66` · ALL CAPS |
| Row height | 44 px (desktop) · 48 px (touch / tablet) |
| Cell padding | 12 px H · 10 px V |
| Cell text | Body Regular 16 px · `#2B2A28` |
| Row border | 1 px bottom `#E0E4E7` |
| Row hover bg | `#F1F5F6` (desktop mouse hover only) |
| Selected row bg | `#E6F5FB` |

#### Table Controls (above table)

Search input (40 px), filter chips, inline radio filters, action buttons (Ghost / Success), column toggle popover.

#### Action Column

Right-aligned icons: `arrow-down-tray`, `eye`, `pencil-square`, `ellipsis-horizontal`. Context menu: white card, Shadow Level 2, 8 px radius, 40 px option height.

#### Empty State

Centred: Headline 4 Medium + Body Regular `#445F71` + optional primary action button.

#### Responsive Table Strategy

| Breakpoint | Strategy |
|------------|----------|
| ≥ 1024 px | Full table with all columns. Horizontal scroll if columns exceed viewport. |
| 768–1023 px | Priority columns visible; secondary columns collapse into expandable row detail. |
| < 768 px | **Card-based layout.** Each row becomes a card with label–value pairs stacked vertically. Actions at card bottom. |

---

### 7.7 Modals / Dialogs

| Property | Desktop | Tablet | Mobile |
|----------|---------|--------|--------|
| Width | 400–640 px | 400–600 px | 100 % (full-screen sheet) |
| Position | Centred overlay | Centred overlay | Bottom sheet or full-screen |
| Corner radius | 8 px | 8 px | 8 px top (sheet) · 0 (full) |
| Overlay | `rgba(43, 42, 40, 0.5)` | Same | Same |
| Padding | 24 px | 20 px | 16 px |
| Shadow | Level 3 | Level 3 | None (full-screen) |
| Title | Headline 3 Bold 24 px `#083F66` | Same | Headline 4 Bold 20 px |
| Close | `x-mark` 24 px top-right | Same | Same |
| Actions | Right-aligned, 12 px gap | Same | Full-width stacked |

#### Variants

Default, Form modal, Upload modal (dashed `#0092D4` border, `#E6F5FB` bg), Critical action (warning banner + Danger button).

---

### 7.8 Notifications / Toasts

| Variant | Background | Border | Icon (Heroicons 2) | Icon Color |
|---------|------------|--------|---------------------|------------|
| **Success** | `#DDF8E2` | 1 px `#53DD6C` | `check-circle` | `#299F55` |
| **Warning** | `#FFEFD7` | 1 px `#FFDFB0` | `exclamation-triangle` | `#FFB038` |
| **Error** | `#FFE5E5` | 1 px `#FF6666` | `x-circle` | `#FF0000` |
| **Info** | `#E6F5FB` | 1 px `#0092D4` | `information-circle` | `#0092D4` |

| Property | Desktop | Mobile |
|----------|---------|--------|
| Position | Top-right corner | Top full-width |
| Min width | 320 px | 100 % |
| Auto-dismiss | 5 s (success / info) · persistent (warning / error) | Same |
| Corner radius | 8 px | 8 px |
| Padding | 16 px | 16 px |

---

### 7.9 Calendar / Date Picker

| Property | Desktop | Touch / Tablet / Mobile |
|----------|---------|--------------------------|
| Day cell | 36 × 36 px | 44 × 44 px |
| Dropdown | Popover below trigger | Popover (tablet) · Bottom sheet (mobile) |

Quick-select chips: "Previous 30 days", "Year to date", "Q1"–"Q4", "Custom". Selected: `#0092D4` bg · `#FFFFFF` text. Unselected: `#E0E4E7` bg · `#2B2A28` text.

Today cell: 1 px `#0092D4` border. Selected: `#0092D4` bg. Range: `#E6F5FB` bg.

---

### 7.10 Toggle / Switch

| Property | Value |
|----------|-------|
| Track | 44 × 24 px |
| Thumb | 20 × 20 px |
| Corner radius | `radius.full` |
| Off | Track `#E0E4E7` · Thumb `#FFFFFF` |
| On | Track `#299F55` · Thumb `#FFFFFF` |
| Disabled | Opacity 0.4 |
| Clickable area | 32 × 32 px (desktop) · 44 × 44 px (touch) |

---

### 7.11 Dropdown / Select

| Property | Desktop | Touch / Tablet / Mobile |
|----------|---------|--------------------------|
| Trigger | Input field + `chevron-down` 20 px | Same (48 px height) |
| Option height | 36 px | 44 px |
| Menu | Popover, Shadow Level 2, 8 px radius | Popover (tablet) · Bottom sheet (mobile) |
| Hover bg | `#F1F5F6` | N/A (no hover) |
| Selected bg | `#E6F5FB` + `check` icon | Same |
| Max visible | 6 items, then scroll | Same |

---

### 7.12 Sidebar / Navigation

| Property | Desktop ≥ 1280 px | Desktop 1024–1279 px | Tablet / Mobile < 1024 px |
|----------|--------------------|----------------------|---------------------------|
| Type | Vertical sidebar | Collapsed rail | Hamburger → overlay drawer |
| Width | 240 px | 64 px | Drawer: 280 px (tablet) · 100 % (mobile) |
| Background | `#083F66` | `#083F66` | `#083F66` |
| Nav item height | 44 px | 44 px | 48 px |
| Text | Body Regular 16 px · white 70 % | Hidden (tooltip on hover) | Body Regular 16 px · white 70 % |
| Active item | White 100 % + 3 px `#0092D4` left accent | Blue icon + dot | White 100 % + left accent |
| Hover bg | `rgba(255, 255, 255, 0.08)` | Same | Same |
| Icon | Heroicons 2 Outline 24 px | Same (centred) | Same |
| Collapse trigger | Bottom `arrow-left` | Bottom `arrow-right` | Hamburger `bars-3` in top bar |

---

### 7.13 Top Bar / Header

| Property | Desktop | Tablet | Mobile |
|----------|---------|--------|--------|
| Height | 56 px | 56 px | 56 px |
| Background | `#083F66` | `#083F66` | `#083F66` |
| Position | Fixed top | Fixed top | Fixed top |
| Left content | Logo (in sidebar) | Hamburger + Logo | Hamburger + Logo |
| Right content | User name + avatar (32 px) + bell | Avatar + bell | Avatar + bell |
| Notification badge | 8 px `#FF0000` dot | Same | Same |

---

### 7.14 Tabs

| Property | Value |
|----------|-------|
| Tab height | 44 px |
| Padding | 12 px horizontal |
| Font | Body Regular 16 px |
| Default text | `#445F71` |
| Active text | `#0092D4` |
| Active indicator | 2 px solid `#0092D4` bottom |
| Icon (optional) | 20 px, 8 px gap |
| Gap | 24 px (desktop) · 16 px (tablet / mobile) |
| Mobile | Scrollable horizontal row with fade edge indicators |

---

### 7.15 Badges / Status Tags

| Variant | Background | Text |
|---------|------------|------|
| Success | `#DDF8E2` | `#0F6A42` |
| Warning | `#FFEFD7` | `#CC8D2D` |
| Error | `#FFE5E5` | `#C30000` |
| Info | `#E6F5FB` | `#0092D4` |
| Neutral | `#F1F5F6` | `#2B2A28` |

Height: 24 px. Padding: 4 px V · 8 px H. Radius: 4 px. Font: Label Small Bold 14 px.

---

### 7.16 Breadcrumbs

Body Small 14 px `#445F71`. Active (last): Bold `#083F66`. Separator: `chevron-right` 16 px `#8294A0`. Gap: 8 px. Hidden on mobile (< 600 px) → replaced by back arrow.

---

### 7.17 KPI / Stat Cards

White bg, 8 px radius, Shadow Level 1. Title: Body Small `#445F71`. Value: H2 Bold `#083F66` (desktop) · H3 Bold (mobile). Trend: `arrow-up`/`arrow-down` Mini + Body Small `#299F55` or `#FF0000`. Layout: horizontal row (≥ 1024 px) · 2-col grid (tablet) · vertical stack (mobile).

---

### 7.18 Progress Bar

Track: 8 px height, `#E0E4E7`, 4 px radius. Fill: `#299F55` (success), `#0092D4` (info), `#FFB038` (warning), `#FF0000` (error). Label: Label Small Bold 14 px.

---

### 7.19 Avatars

Small 32 px (top bar), Medium 40 px (lists), Large 56 px (profile). Circle. Fallback: 2-letter initials on `#083F66`, white text. Group: −8 px overlap. "+N": `#0092D4` bg.

---

### 7.20 File Upload Zone

1 px dashed `#0092D4`, `#E6F5FB` bg, 8 px radius, 24 px padding (16 px mobile). "Drag & drop here or **Choose a file**" (Body 16 px, link Bold `#0092D4`). Restriction text: Body Small `#445F71`. Mobile: "Choose a file" button only (no drag-and-drop).

---

## 8 · Elevation & Shadows

| Level | Value | Usage |
|-------|-------|-------|
| **Level 0** | none | Flat elements, inline |
| **Level 1** | `0 1px 3px rgba(43, 42, 40, 0.08)` | Cards on app background |
| **Level 2** | `0 4px 16px rgba(43, 42, 40, 0.1)` | Dropdowns, popovers, date pickers |
| **Level 3** | `0 8px 24px rgba(43, 42, 40, 0.15)` | Modals, dialogs |

---

## 9 · Motion & Feedback

| Property | Value |
|----------|-------|
| Duration (micro) | 100 ms — hover, press |
| Duration (default) | 200 ms — expand / collapse, fade |
| Duration (modal) | 300 ms — modal enter / exit |
| Easing | `cubic-bezier(0.4, 0, 0.2, 1)` |
| Reduced motion | Respect `prefers-reduced-motion: reduce` |
| Focus ring | 2 px `#0092D4`, 2 px offset |

#### Desktop Feedback

Hover: background shift within 100 ms. Click: pressed state 100 ms. Keyboard focus: visible 2 px ring. Loading: spinner or skeleton shimmer. Error: red border flash + inline message.

---

## 10 · Accessibility

Based on **WCAG 2.2 Level AA**, **EN 301 549** (European accessibility standard), and **Material Design 3** guidelines.

| Requirement | Standard | Reference |
|-------------|----------|-----------|
| Contrast (text) | 4.5 : 1 body · 3 : 1 large text (≥ 24 px bold / ≥ 19 px regular) | SC 1.4.3 |
| Contrast (UI) | 3 : 1 for interactive elements and meaningful icons | SC 1.4.11 |
| Target size (pointer) | ≥ 24 × 24 px | SC 2.5.8 (AA) |
| Target size (touch) | ≥ 44 × 44 px recommended | HIG / M3 |
| Focus indicator | 2 px visible ring on all focusable elements | SC 2.4.7 |
| Keyboard navigation | All functionality via keyboard | SC 2.1.1 |
| Skip links | "Skip to main content" at top of page | SC 2.4.1 |
| ARIA landmarks | `<nav>`, `<main>`, `<aside>`, `<header>`, `<footer>` | SC 1.3.1 |
| Language attribute | `<html lang>` set; runtime switching | EN 301 549 |
| Reduced motion | Disable non-essential animation | SC 2.3.3 |
| Alt text | All images; decorative `alt=""` | SC 1.1.1 |
| Colour not sole indicator | Status conveyed with icon + text | SC 1.4.1 |
| Error identification | Errors in text, not colour alone | SC 3.3.1 |
| Zoom | Usable at 200 % without horizontal scroll | SC 1.4.4 |

---

## 11 · Responsive Design Reference

### 11.1 Common European Screen Resolutions (Test Targets)

| Resolution | EU Share (2025) | Category | Ratio |
|------------|-----------------|----------|-------|
| 1920 × 1080 | ~32 % | Desktop | 16:9 |
| 1366 × 768 | ~15 % | Laptop | 16:9 |
| 1536 × 864 | ~11 % | Laptop | 16:9 |
| 2560 × 1440 | ~8 % | Large monitor | 16:9 |
| 1440 × 900 | ~6 % | MacBook | 16:10 |
| 1280 × 800 | ~3 % | Older laptop | 16:10 |
| 2560 × 1600 | ~2 % | MacBook Pro 14″ | 16:10 |
| 1920 × 1200 | ~2 % | Desktop 16:10 | 16:10 |
| 2256 × 1504 | ~1 % | Surface Laptop | 3:2 |
| 1180 × 820 | — | iPad 10th gen | ~3:2 |
| 1024 × 768 | — | iPad legacy | 4:3 |
| 800 × 1280 | — | Android 10″ | 5:8 |
| 390 × 844 | — | iPhone 14/15 | ~9:19.5 |
| 375 × 812 | — | iPhone 13 Mini | ~9:19.5 |
| 360 × 800 | — | Samsung Galaxy | ~9:20 |

### 11.2 Figma Design Frames

| Frame name | Width × Height | Purpose |
|------------|----------------|---------|
| `Desktop XL` | 1920 × 1080 | Primary desktop target |
| `Desktop` | 1440 × 900 | Laptop / compact desktop |
| `Desktop SM` | 1280 × 800 | Minimum desktop |
| `Laptop` | 1366 × 768 | Common EU laptop |
| `Tablet Landscape` | 1024 × 768 | iPad landscape |
| `Tablet Portrait` | 768 × 1024 | iPad portrait |
| `Mobile` | 375 × 812 | Standard mobile |
| `Mobile SM` | 360 × 800 | Android baseline |
| `Touch Workstation` | 1920 × 1080 | Special app (§ 13) |

### 11.3 Responsive Component Summary

| Component | Desktop (≥ 1024 px) | Tablet (600–1023 px) | Mobile (< 600 px) |
|-----------|---------------------|----------------------|--------------------|
| Sidebar | 240 px or 64 px rail | Hidden → hamburger | Hidden → hamburger |
| Tables | Full columns + sort | Priority cols + expand | Card-based stack |
| Buttons | 40 px, inline | 48 px, inline | 48 px, full-width stack |
| Inputs | 40 px | 48 px | 48 px |
| Modals | Centred 400–640 px | Centred 400–600 px | Full-screen sheet |
| Forms | 2–3 col grid | 1–2 col | Single column |
| Tabs | Static row | Scrollable | Scrollable |
| KPI Cards | Horizontal row | 2-col grid | Vertical stack |
| Toasts | Top-right | Top-right | Top full-width |
| Date picker | Popover | Popover | Bottom sheet |
| Breadcrumbs | Visible | Truncated | Hidden → back arrow |
| Checkboxes | 20 px + 32 px hit | 24 px + 44 px hit | 24 px + 44 px hit |

---

## 12 · Asset Checklist for Figma

| Asset | Source | Notes |
|-------|--------|-------|
| Font | Google Fonts — **Ubuntu** 400, 500, 700 | Regular, Medium, Bold |
| Icons | **Heroicons 2** — Outline 24 + Mini 20 | https://heroicons.com |
| Flags | External SVG / PNG folder | Country flag assets |
| Logo | Brand asset (provided separately) | Sidebar and header |
| Illustrations | Custom (provided separately) | Empty states, onboarding |

---

## 13 · Touch-Workstation Mode (Special Application)

> **Context:** Standing user, 21″ touchscreen (1920 × 1080, 16:9). No mouse. No keyboard (barcode scanner only). **No mobile or tablet view** — always full-screen 1920 × 1080.
>
> **Activation:** CSS class `.touch-mode` or HTML attribute `[data-mode="touch"]` on the root container. All overrides below are scoped to this selector.
>
> **Figma:** Use the `Touch Workstation` frame (1920 × 1080) with the "Touch Overrides" component variant set.

### 13.1 Layout Override

| Property | Touch Value | Desktop Default |
|----------|-------------|-----------------|
| Viewport | Fixed 1920 × 1080 (no responsive) | Responsive |
| Sidebar width | 240 px (always expanded) | 240 px or rail |
| Grid columns | 12 | 12 |
| Grid gutter | 30 px | 24 px |
| Page margin | 30 px H · 40 px V | 24 px H |
| Container gap | 30 px | 30 px |
| Container padding | 20 px all sides | 20 px |

### 13.2 Target Size Override

**All interactive elements** must meet a minimum **48 × 48 px** touch target. Recommended: **56 × 56 px** for frequently-used actions (gloved users).

| Component | Touch Min | Desktop Comparison |
|-----------|-----------|---------------------|
| Buttons | 48 px height | 40 px |
| Inputs | 48 px height | 40 px |
| Table rows | 56 px height | 44 px |
| Checkboxes / Radios | 24 px visual + 48 px hit | 20 px visual + 32 px hit |
| Calendar cells | 48 × 48 px | 36 × 36 px |
| Toggle switch | 56 × 28 px track | 44 × 24 px |
| Nav items | 56 px height | 44 px |
| Dropdown options | 48 px height | 36 px |

### 13.3 Typography Override

Desktop type scale (§ 3.2) applies — **no responsive scaling** (viewport is always 1920 × 1080). Base 16 px body size ensures legibility at 60–80 cm on a 21″ screen.

> If physical testing shows insufficiency at 80 cm, scale all sizes up by **+2 px** per step.

### 13.4 Interaction Overrides

| Behaviour | Touch Rule | Desktop Comparison |
|-----------|------------|--------------------|
| **Hover** | **Disabled.** Use `:active` pressed states instead. | Hover enabled |
| **Right-click** | **N/A.** Use visible `ellipsis-horizontal` icon buttons. | Right-click context menu |
| **Tooltips** | **Disabled.** All info must be inline or in labels. | Hover-triggered |
| **Scrolling** | Touch-drag. Visible scroll indicators. Avoid nested scrolls. | Mouse wheel / scrollbar |
| **Double-tap forgiveness** | Destructive actions: 2-step confirmation. 500 ms debounce. | Single click + modal |
| **Drag-and-drop** | **Avoid.** Use "Move up / Move down" buttons. | Pointer drag |
| **Long-press** | **Not used.** All actions via single tap. | N/A |
| **Swipe** | **Not used.** No swipe-to-delete or swipe navigation. | N/A |
| **Text selection** | **Disabled** on UI elements. Enabled in input fields only. | Enabled |
| **Keyboard shortcuts** | **N/A** (no keyboard). All actions on-screen. | Full keyboard |
| **Focus ring** | **Hidden** (no keyboard nav). Active state provides feedback. | Visible |

### 13.5 Scan-Driven Flow

| Behaviour | Implementation |
|-----------|----------------|
| **Auto-focus** | Target input gets 3 px `#0092D4` border glow animation |
| **Scan confirmation** | Input fills, green flash (`#DDF8E2` → white, 400 ms), auditory beep |
| **Auto-advance** | Focus moves to next step (input or confirmation button) |
| **Scan error** | Red border flash + shake (6 px, 300 ms) + optional auditory alert |

### 13.6 Figma Component Variant Properties

| Component | Property | Touch Value |
|-----------|----------|-------------|
| Button | `size` | `lg` (48 px) only |
| Input | `size` | `lg` (48 px) only |
| Table Row | `density` | `comfortable` (56 px) |
| Checkbox | `size` | `lg` (24 px visual, 48 px hit) |
| Radio | `size` | `lg` (24 px visual, 48 px hit) |
| Dropdown option | `density` | `comfortable` (48 px) |
| Calendar cell | `density` | `comfortable` (48 × 48 px) |
| Toggle | `size` | `lg` (56 × 28 px) |
| Nav item | `density` | `comfortable` (56 px) |
| Modal | `context` | `touch` (wider buttons, 48 px height) |

---

## 14 · Quick Reference — CSS Variables

```css
:root {
  /* ─── Base palette ─── */
  --color-foreground: #2B2A28;
  --color-secondary: #083F66;
  --color-white: #FFFFFF;
  --color-subtitle: #445F71;
  --color-muted-foreground: #8294A0;
  --color-muted-subtle: #E0E4E7;
  --color-muted: #F1F5F6;
  --color-primary: #0092D4;
  --color-primary-bg: #E6F5FB;
  --color-success-emphasis: #0F6A42;
  --color-success: #299F55;
  --color-success-subtle: #53DD6C;
  --color-success-bg: #DDF8E2;
  --color-warning-emphasis: #CC8D2D;
  --color-warning: #FFB038;
  --color-warning-subtle: #FFDFB0;
  --color-warning-bg: #FFEFD7;
  --color-destructive-emphasis: #C30000;
  --color-destructive: #FF0000;
  --color-destructive-subtle: #FF6666;
  --color-destructive-bg: #FFE5E5;

  /* ─── Typography ─── */
  --font-family: 'Ubuntu', 'Inter', 'Roboto', 'Segoe UI', sans-serif;
  --font-h1: 700 40px/48px var(--font-family);
  --font-h2: 700 32px/40px var(--font-family);
  --font-h3: 700 24px/32px var(--font-family);
  --font-h4: 700 20px/28px var(--font-family);
  --font-label: 700 16px/24px var(--font-family);
  --font-label-upper: 500 14px/20px var(--font-family);
  --font-label-small: 700 14px/20px var(--font-family);
  --font-body: 400 16px/24px var(--font-family);
  --font-body-small: 400 14px/20px var(--font-family);

  /* ─── Spacing ─── */
  --spacing-2xs: 2px;
  --spacing-xs: 4px;
  --spacing-sm: 8px;
  --spacing-md: 12px;
  --spacing-lg: 16px;
  --spacing-xl: 20px;
  --spacing-2xl: 24px;
  --spacing-3xl: 30px;
  --spacing-4xl: 40px;

  /* ─── Radius ─── */
  --radius-sm: 4px;
  --radius-md: 8px;
  --radius-full: 9999px;

  /* ─── Shadows ─── */
  --shadow-1: 0 1px 3px rgba(43, 42, 40, 0.08);
  --shadow-2: 0 4px 16px rgba(43, 42, 40, 0.1);
  --shadow-3: 0 8px 24px rgba(43, 42, 40, 0.15);

  /* ─── Motion ─── */
  --duration-micro: 100ms;
  --duration-default: 200ms;
  --duration-modal: 300ms;
  --easing: cubic-bezier(0.4, 0, 0.2, 1);

  /* ─── Breakpoints ─── */
  --bp-mobile-lg: 480px;
  --bp-tablet: 600px;
  --bp-tablet-lg: 768px;
  --bp-laptop: 1024px;
  --bp-desktop: 1280px;
  --bp-desktop-lg: 1440px;
  --bp-desktop-xl: 1920px;

  /* ─── Target sizes ─── */
  --target-pointer: 32px;
  --target-touch: 48px;
}

/* ─── Touch Workstation Overrides ─── */
.touch-mode,
[data-mode="touch"] {
  --target-pointer: 48px;
  --target-touch: 56px;
}
```

---

## 15 · Do's and Don'ts

| ✅ Do | ❌ Don't |
|------|---------|
| Use semantic color tokens, not raw hex | Hard-code hex values in components |
| Design desktop-first, adapt down for smaller screens | Design touch-first and force it onto desktop |
| Maintain 32 px click targets on desktop (24 px AA minimum) | Use targets smaller than 24 px on any platform |
| Maintain 44 px touch targets on tablet / mobile | Assume mouse precision on touch devices |
| Use the responsive type scale (§ 3.3) | Use fixed pixel sizes that overflow on small screens |
| Test at 1920×1080, 1366×768, 768×1024, and 375×812 | Only test at a single resolution |
| Use Ubuntu as the primary font everywhere | Mix font families within a view |
| Use Heroicons 2 for all functional icons | Mix icon libraries |
| Show hover states on desktop | Show hover states on touch devices |
| Provide full keyboard navigation on desktop | Rely on mouse-only interactions |
| Use progressive disclosure on mobile | Display desktop-density tables on mobile |
| Scope touch overrides to `.touch-mode` | Apply touch overrides globally |
| Convert tables to cards on mobile | Force wide tables to scroll on mobile |
| Use full-screen modals on mobile | Use floating modals on small screens |
| Respect `prefers-reduced-motion` | Force animations on all users |
| Follow EN 301 549 for EU accessibility | Ignore European accessibility requirements |

---

*End of Design System Guideline — MSD Portal v2.0*
<!--

System Guidelines

Use this file to provide the AI with rules and guidelines you want it to follow.
This template outlines a few examples of things you can add. You can add your own sections and format it to suit your needs

TIP: More context isn't always better. It can confuse the LLM. Try and add the most important rules you need

# General guidelines

Any general rules you want the AI to follow.
For example:

* Only use absolute positioning when necessary. Opt for responsive and well structured layouts that use flexbox and grid by default
* Refactor code as you go to keep code clean
* Keep file sizes small and put helper functions and components in their own files.

--------------

# Design system guidelines
Rules for how the AI should make generations look like your company's design system

Additionally, if you select a design system to use in the prompt box, you can reference
your design system's components, tokens, variables and components.
For example:

* Use a base font-size of 14px
* Date formats should always be in the format “Jun 10”
* The bottom toolbar should only ever have a maximum of 4 items
* Never use the floating action button with the bottom toolbar
* Chips should always come in sets of 3 or more
* Don't use a dropdown if there are 2 or fewer options

You can also create sub sections and add more specific details
For example:


## Button
The Button component is a fundamental interactive element in our design system, designed to trigger actions or navigate
users through the application. It provides visual feedback and clear affordances to enhance user experience.

### Usage
Buttons should be used for important actions that users need to take, such as form submissions, confirming choices,
or initiating processes. They communicate interactivity and should have clear, action-oriented labels.

### Variants
* Primary Button
  * Purpose : Used for the main action in a section or page
  * Visual Style : Bold, filled with the primary brand color
  * Usage : One primary button per section to guide users toward the most important action
* Secondary Button
  * Purpose : Used for alternative or supporting actions
  * Visual Style : Outlined with the primary color, transparent background
  * Usage : Can appear alongside a primary button for less important actions
* Tertiary Button
  * Purpose : Used for the least important actions
  * Visual Style : Text-only with no border, using primary color
  * Usage : For actions that should be available but not emphasized
-->
