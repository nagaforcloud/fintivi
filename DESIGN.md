---
name: Fintivi
description: A calm daily finance home for personal financial management
colors:
  ink: "#17211b"
  paper: "#faf7f2"
  card: "#fffcf6"
  forest: "#183d28"
  forest-hover: "#1f4d33"
  moss: "#587260"
  lead: "#526056"
  clay: "#9a9f8e"
  line: "#ded7c8"
  line-light: "#ece8de"
  input-bg: "#fffaf0"
  error: "#c44f4a"
  success: "#1d4a2a"
  warning: "#6b4a1a"
  info: "#1a3c6e"
typography:
  body:
    fontFamily: "Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif"
    fontSize: "0.95rem"
    fontWeight: 400
    lineHeight: 1.5
  heading:
    fontFamily: "Inter, ui-sans-serif, system-ui"
    fontSize: "clamp(1.5rem, 4vw, 2rem)"
    fontWeight: 700
    lineHeight: 1.1
  display:
    fontFamily: "Inter, ui-sans-serif, system-ui"
    fontSize: "clamp(3rem, 9vw, 6rem)"
    fontWeight: 700
    lineHeight: 0.9
  label:
    fontFamily: "Inter, ui-sans-serif, system-ui"
    fontSize: "0.85rem"
    fontWeight: 500
    lineHeight: 1.3
  data:
    fontFamily: "Inter, ui-sans-serif, system-ui"
    fontSize: "1.35rem"
    fontWeight: 700
    lineHeight: 1
rounded:
  full: "999px"
  card: "1.25rem"
  auth-card: "2rem"
  field: "0.75rem"
  status: "0.75rem"
spacing:
  xs: "0.25rem"
  sm: "0.5rem"
  md: "0.75rem"
  lg: "1rem"
  xl: "1.25rem"
  2xl: "1.5rem"
  3xl: "2rem"
components:
  button-primary:
    backgroundColor: "{colors.forest}"
    textColor: "#fffaf0"
    rounded: "{rounded.full}"
    padding: "0 1.25rem"
    height: "2.75rem"
  button-primary-hover:
    backgroundColor: "{colors.forest-hover}"
  button-outline:
    backgroundColor: "transparent"
    textColor: "{colors.forest}"
    rounded: "{rounded.full}"
    padding: "0 1.25rem"
    border: "1px solid {colors.line}"
  button-small:
    rounded: "{rounded.full}"
    height: "2rem"
    padding: "0 0.75rem"
  card-metric:
    backgroundColor: "{colors.card}"
    rounded: "{rounded.card}"
    padding: "1rem 1.25rem"
    border: "1px solid {colors.line}"
  input-field:
    backgroundColor: "{colors.input-bg}"
    rounded: "{rounded.field}"
    padding: "0.6rem 0.75rem"
    border: "1px solid {colors.line}"
  input-field-focus:
    border: "1px solid {colors.moss}"
    boxShadow: "0 0 0 2px rgba(88, 114, 96, 0.2)"
---

# Design System: Fintivi

## 1. Overview

**Creative North Star: "The Calm Ledger"**

A financial control center that feels like a well-organized desk by morning light — everything in its place, nothing demanding attention until it's needed. The system rejects the typical finance app aesthetic (dark navy, gold accents, dense tables, neon gain/loss indicators) in favor of warm natural tones, generous whitespace, and deliberate restraint. Every screen centers on one task, not a dashboard of competing signals.

This is a product UI, not a marketing surface. Familiarity is a feature. The visual vocabulary stays consistent across auth, dashboard, accounts, upload flow, transactions, and settings — same button shape, same form controls, same column rhythm. The tool disappears into the task.

**Key Characteristics:**
- Warm off-white foundation with deep forest green anchor
- Generous card radius (20px) communicates softness and approachability
- Pill-shaped buttons feel tactile and deliberate
- Single sans family (Inter) throughout — pairing is unnecessary for a product UI
- Border-only containers, no decorative shadows at rest
- Green accent is used sparingly — primary actions, key data, brand mark only
- Error/success/warning/info states use muted semantic backgrounds, not saturated colors

## 2. Colors: The Forest Floor Palette

Warm earth tones anchored by a deep forest green. The palette avoids the navy/gold fintech default and the sterile corporate blue-grey bank look. The green provides calm authority without the alarm of red or the coldness of blue.

### Primary
- **Forest** (#183d28): Primary buttons, brand mark, links, key data emphasis. A deep, calm green that reads as trustworthy, not financial.
- **Forest Hover** (#1f4d33): Button hover state. Slightly lighter but stays in the same tonal band.

### Neutral
- **Ink** (#17211b): Body text, headings. Near-black with a slight green undertone, softer than pure #000.
- **Paper** (#f7f3ea): Page background. Warm off-white, not cream. The warmth comes from the green-tinted radial gradient overlay.
- **Card** (#fffcf6): Card, input, and surface backgrounds. A whisper warmer than white.
- **Lead** (#526056): Secondary text, muted labels, table headers. Green-tinted grey, readable at 4.5:1 against paper.
- **Clay** (#9a9f8e): Placeholder text, hints, secondary metadata. The lightest readable grey.
- **Line** (#ded7c8): Borders, dividers, card strokes. Warm beige-grey.
- **Line Light** (#ece8de): Lighter borders, tab backgrounds, progress track.

### Semantic
- **Moss** (#587260): Accent — eyebrows, focus rings, progress fills, active tab text. The bridge between forest and neutral.
- **Error** bg (#fce8e6) / text (#c44f4a): Soft rose alert.
- **Success** bg (#e6f3e8) / text (#1d4a2a): Soft mint alert.
- **Warning** bg (#fdf3e0) / text (#6b4a1a): Soft amber alert.
- **Info** bg (#e8f0fe) / text (#1a3c6e): Soft blue alert.

### Named Rules
**The One Green Rule.** Forest green appears on ≤15% of any given screen. It's reserved for primary actions, the brand mark, and data emphasis. Its rarity is the point — when green appears, the user knows it matters.

**The Warm-Not-Cream Rule.** The background is tinted toward green (the brand hue), not toward generic warmth. The radial gradient (`circle at top left, #edf8ef → transparent`) carries the brand into the atmosphere without a solid color block.

## 3. Typography

**Body Font:** Inter (with ui-sans-serif, system-ui, -apple-system, Segoe UI fallback). A single sans family throughout — product UI doesn't need a display/body pairing.

**Character:** Calm, precise, neutral. Inter's moderate x-height and open counters keep financial data readable at small sizes. The tight spacing scale (no exaggerated display sizes) means headings don't compete with data.

### Hierarchy
- **Display** (700, clamp(3rem, 9vw, 6rem), 0.9): Hero heading on the public entry screen only. Reserved for first impressions; never appears inside the app.
- **Headline** (700, clamp(1.5rem, 4vw, 2rem), 1.1): Page titles (dashboard, accounts, settings). One per view.
- **Title** (600, 0.9rem, 1.3): Section headings, table headers. Uppercase with 0.05em tracking.
- **Body** (400, 0.95rem, 1.5): Standard reading text, form labels, table cells. 65–75ch max width on prose sections.
- **Label** (500, 0.85rem, 1.3): Form field labels, metric card headers, nav links, small metadata.
- **Data** (700, 1.35rem, 1): Financial values in metric cards, balances. Bold weight signals numeric authority.
- **Small** (400, 0.8rem, 1.4): Hints, helper text, secondary metadata, timestamps.

### Named Rules
**The No-Headline-Overflow Rule.** Headings use `clamp()` with a controlled max. At narrow viewports, a heading should never overflow its container or break to an orphan word.

## 4. Elevation

The system uses tonal layering, not shadows, for depth. Surfaces sit at one elevation: content level. Cards and containers are distinguished by a 1px warm border (Line #ded7c8), not by drop shadows.

The exception is modal-scale containers (auth cards, hero cards), which get a single ambient shadow (`0 24px 80px rgba(36, 45, 37, 0.12)`) to float them above the page. This shadow is reserved for centercard layouts only — never applied to inline cards, metric cards, or side panels.

**The Flat-By-Default Rule.** Surfaces are flat at rest. The auth card shadow is the only exception, and its use is explicit: it signals "this is the thing you're here to interact with." Everything else earns its separation through spacing and border, not shadow.

## 5. Components

### Buttons
- **Shape:** Pill (999px border radius). 2.75rem min-height.
- **Primary:** Forest (#183d28) background, white (#fffaf0) text, weight 700. Hover: Forest Hover (#1f4d33).
- **Outline:** Transparent background, Forest text, Line border. Hover: subtle Forest-tinted background (rgba 24, 61, 40, 0.06).
- **Small variant:** 2rem min-height, 0.85rem font-size, tighter padding.
- **Disabled:** Opacity 0.5, no hover effect.
- **Link style:** No background or border, Moss (#587260) underlined text. Used for secondary inline actions.

### Inputs & Fields
- **Shape:** 0.75rem rounded corners. 1px solid Line border.
- **Background:** Input bg (#fffaf0).
- **Focus:** Border shifts to Moss (#587260) with a 2px green-tinted ring (`rgba(88, 114, 96, 0.2)`).
- **Error:** Border shifts to error red (#c44f4a).
- **Label:** Above the field in Label style. Hint text in Clay below.
- **Select:** Same visual treatment as text inputs.

### Cards & Containers
- **Shape:** 1.25rem border radius (metric cards), 2rem (auth/hero cards), 1.5rem (upload zone).
- **Background:** Card (#fffcf6) at 0.7–0.9 opacity over Paper background.
- **Border:** 1px solid Line (#ded7c8) on all containers. No shadows at rest.
- **Internal padding:** 1rem 1.25rem (metric), 1.25rem (card-stack), clamp-based for centercards.

### Navigation
- **Style:** Horizontal top bar. 0.75rem 1.5rem padding with subtle backdrop blur.
- **Border bottom:** 1px solid Line.
- **Logo:** Forest green, weight 700, auto-margin-right to push links to the right.
- **Links:** Lead (#526056) default, Ink (#17211b) on hover. Label style.
- **User indicator:** Clay (#9a9f8e), Label style.

### Data Table
- **Shape:** 1.25rem rounded wrapper with Line border and Card background.
- **Headers:** Title style — uppercase, 0.8rem, 0.05em tracking, Lead (#526056) color.
- **Cells:** 0.65rem 1rem padding, Body size. Bottom border Line Light between rows.
- **Scroll:** Horizontal overflow on narrow viewports with `overflow-x: auto`.

### Status Messages
- **Shape:** 0.75rem rounded, 0.9rem font. Padding 0.75rem 1rem.
- **Semantic variants:** Soft backgrounds per status (info blue, success mint, warning amber, error rose) with matching text and border. Role="alert" for errors.

### Upload Zone
- **Shape:** 1.5rem rounded, 2rem padding. 2px dashed Line border. Centered content layout.
- **Background:** Card at 0.5 opacity.

### Progress Bar
- **Pill shape** (999px radius), 2rem height. Background Line Light.
- **Fill:** Moss (#587260) with 0.3s width transition.
- **Label:** mixed-blend-mode difference over the bar.

### Badge
- **Pill shape** (999px radius), 0.2rem 0.5rem padding.
- **Background:** Line Light. Text: Lead. 0.75rem font.
- Used for status indicators (inactive account, etc.).

### Tabs
- **Container:** Pill-shaped (999px) Line Light background. 0.25rem internal padding.
- **Inactive tab:** Transparent, Lead text. Weight 500.
- **Active tab:** White (Card), Ink text. Subtle shadow. Weight unchanged.

## 6. Do's and Don'ts

### Do:
- **Do** use Forest green sparingly — ≤15% of any screen. It's the brand anchor; treat it as rare.
- **Do** keep financial data in Data style (bold, 1.35rem) so numbers scan immediately.
- **Do** use the pill button shape consistently across all interactive actions.
- **Do** use warm-off-white Paper as the default background everywhere.
- **Do** maintain 4.5:1 minimum contrast on all body text.
- **Do** show one primary action per view. Multiple competing CTAs confuse the task.
- **Do** use the flat-by-default elevation model — only centercard layouts get shadows.

### Don't:
- **Don't** use dark navy, gold accents, or neon colors — these are the saturated fintech default and Fintivi explicitly rejects them.
- **Don't** use display fonts for UI labels, buttons, or data. One font (Inter) is right for product UI.
- **Don't** apply the auth-card shadow to inline cards, metric cards, or side panels.
- **Don't** use decorative motion that doesn't convey state. Product motion is 150–250ms, state-driven only.
- **Don't** use modal as first thought for actions — exhaust inline and progressive alternatives first.
- **Don't** ship a component without all its states: default, hover, focus, active, disabled, loading, error.
- **Don't** use green to mean "good" and red to mean "bad" without also communicating with text or icons.
- **Don't** use generic SaaS cream/beige backgrounds — the palette is warmed by the brand's green hue, not generic warmth.
