---
name: Farm
description: Open-source developer portal for managing software catalog, deployments, and infrastructure.
colors:
  primary: "oklch(0.5424 0.2454 293.0160)"
  primary-foreground: "oklch(0.9843 0.0017 247.8393)"
  secondary: "oklch(0.9684 0.0068 247.8951)"
  secondary-foreground: "oklch(0.2079 0.0399 265.7275)"
  accent: "oklch(0.72 0.24 340)"
  accent-foreground: "oklch(0.9843 0.0017 247.8393)"
  background: "oklch(0.9848 0 0)"
  foreground: "oklch(0.2496 0.0417 263.3984)"
  muted: "oklch(0.9684 0.0068 247.8951)"
  muted-foreground: "oklch(0.5547 0.0407 257.4404)"
  card: "oklch(1.0 0 0)"
  card-foreground: "oklch(0.2496 0.0417 263.3984)"
  border: "oklch(0.9290 0.0126 255.5317)"
  destructive: "oklch(0.6368 0.2078 25.3259)"
  ring: "oklch(0.5424 0.2454 293.0160)"
typography:
  body:
    fontFamily: "Nunito, ui-sans-serif, system-ui, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 400
    lineHeight: 1.5715
  display:
    fontFamily: "Nunito, ui-sans-serif, system-ui, sans-serif"
    fontSize: "clamp(2rem, 5vw, 3rem)"
    fontWeight: 700
    lineHeight: 1.1
    letterSpacing: -0.02em
  title:
    fontFamily: "Nunito, ui-sans-serif, system-ui, sans-serif"
    fontSize: "1rem"
    fontWeight: 600
    lineHeight: 1.375
  label:
    fontFamily: "Nunito, ui-sans-serif, system-ui, sans-serif"
    fontSize: "0.75rem"
    fontWeight: 600
    letterSpacing: 0.05em
  mono:
    fontFamily: "JetBrains Mono, ui-monospace, SFMono-Regular, monospace"
    fontSize: "0.8125rem"
    fontWeight: 400
    lineHeight: 1.5
rounded:
  sm: "0.375rem"
  md: "0.5rem"
  lg: "0.75rem"
  xl: "1rem"
  full: "9999px"
spacing:
  nav: "0.5rem"
  section: "1rem"
  panel: "1.5rem"
  page: "1.5rem"
components:
  button-default:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.primary-foreground}"
    rounded: "{rounded.lg}"
    padding: "0 0.625rem"
    height: "2rem"
  button-outline:
    backgroundColor: "transparent"
    textColor: "{colors.foreground}"
    rounded: "{rounded.lg}"
    padding: "0 0.625rem"
    height: "2rem"
    border: "1px solid {colors.border}"
  button-ghost:
    backgroundColor: "transparent"
    textColor: "{colors.foreground}"
    rounded: "{rounded.lg}"
    padding: "0 0.625rem"
    height: "2rem"
  button-primary-hover:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.primary-foreground}"
    opacity: 0.8
  input-default:
    backgroundColor: "transparent"
    rounded: "{rounded.lg}"
    padding: "0 0.625rem"
    height: "2rem"
    border: "1px solid {colors.border}"
  card-default:
    backgroundColor: "{colors.card}"
    rounded: "{rounded.xl}"
    padding: "1rem 0"
---

# Design System: Farm — The Control Room

## 1. Overview

**Creative North Star: "The Control Room"**

Farm is a command center for platform engineering. Every screen communicates competence through clarity: exact spacing, deliberate color, predictable interactions. It feels like a tool built by engineers for engineers — confident enough to be quiet.

The system rejects decorative flourishes. Cards have no side-stripe borders. Gradients are reserved for the login brand panel — never on UI chrome. The purple primary (Signal Violet) appears sparingly: active nav states, primary buttons, interactive focus rings. Its rarity is the point.

**Key Characteristics:**
- Clean authority — information-rich but never dense; hierarchy guides the eye
- Skeuomorphic restraint — flat surfaces at rest, subtle shadow on hover
- One typeface does the work — Nunito from heading to caption, differentiated by weight and size
- Dark mode is not an afterthought — every token is explicitly remapped, not inverted

## 2. Colors

A cool-leaning neutral base anchored by a vivid purple primary and a rose accent. The palette is economical: each color has a distinct job, and colors do not drift into decoration.

### Primary
- **Signal Violet** (`oklch(0.5424 0.2454 293.0160)`): Active nav items, primary buttons, focus rings, the brand gradient stop. Used on ≤15% of any screen.

### Accent
- **Rose** (`oklch(0.72 0.24 340)`): Secondary call-to-actions, brand gradient companion, occasional data-vis highlight. Always paired with Signal Violet in the brand gradient; never used alone as a surface color.

### Neutral
- **Background** (`oklch(0.9848 0 0)` / light gray in dark): The canvas. Pure near-white in light mode, deep near-black in dark mode.
- **Foreground** (`oklch(0.2496 0.0417 263.3984)` / near-white in dark): Body text, headings, icons. High contrast against background.
- **Muted** (`oklch(0.9684 0.0068 247.8951)` / dark variant `oklch(0.2800 0.0369 259.9740)`): Secondary surfaces, hover states, table striping.
- **Muted Foreground** (`oklch(0.5547 0.0407 257.4404)`): Secondary text, placeholders, breadcrumb dividers. Must maintain ≥4.5:1 against background.
- **Border** (`oklch(0.9290 0.0126 255.5317)`): Hairline borders, input strokes, dividers. Always 1px.
- **Card** (`oklch(1.0 0 0)` / dark variant `oklch(0.1573 0.0228 265.6559)`): Container surfaces with subtle `ring-1 ring-foreground/10` border.

### Dark Mode

All neutral tokens are explicitly remapped in `.dark`. Background and surface colors shift toward cool deep tones (hue ~260). The primary and accent shift slightly in lightness to maintain contrast — Signal Violet drops from L 0.54 to L 0.49.

### Brand Gradient

A diagonal purple-to-rose gradient (`#6F00FF` → `#FE59C2`). Reserved exclusively for the login branding panel. Never used on UI elements, badges, or decorative surfaces.

### Named Rules

**The One Voice Rule.** Signal Violet is the only interaction color. Never introduce a second accent for buttons, links, or focus states. Rose supports the brand gradient but does not compete as an interaction color.

**The Flat-At-Rest Rule.** Surfaces carry no shadow in their default state. Depth appears only as a response to interaction (hover, focus, elevated overlay).

## 3. Typography

- **Display Font:** Nunito (with ui-sans-serif, system-ui fallback)
- **Body Font:** Nunito (with ui-sans-serif, system-ui fallback)
- **Mono Font:** JetBrains Mono (with ui-monospace, SFMono-Regular fallback)

**Character:** Nunito is warm but not friendly, round but not soft — a geometric humanist that reads as capable rather than decorative. Tight tracking (-0.01em) pulls words together for a precise, technical feel. JetBrains Mono brings developer credibility to code blocks, kbd elements, and data displays.

### Hierarchy

- **Display** (Nunito 700, `clamp(2rem, 5vw, 3rem)`, 1.1 line-height, -0.02em tracking): Hero headings only (login panel, empty states). `text-wrap: balance`.
- **Title** (Nunito 600, 1rem/16px, 1.375 line-height, -0.01em tracking): Card titles, dialog headings, section headings.
- **Body** (Nunito 400, 0.875rem/14px, 1.5715 line-height, -0.01em tracking): All reading text. Max line length 65–75ch. `text-wrap: pretty`.
- **Label** (Nunito 600, 0.75rem/12px, uppercase, 0.05em tracking): Section group headers in nav, form labels.
- **Mono** (JetBrains Mono 400, 0.8125rem/13px, 1.5 line-height): Code, keyboard shortcuts, data values, filenames, IDs.

Headings `h1`–`h3` should use `text-wrap: balance`. Long prose should use `text-wrap: pretty` to reduce orphans.

### Named Rules

**The One Size Rule.** Body text is always 0.875rem (text-sm). Secondary text is always 0.75rem (text-xs). There is no medium body size at 1rem — that slot belongs to titles only. If it reads like prose, it's 0.875rem.

## 4. Elevation

Flat at rest, lifted on interaction. The system conveys depth through tonal layering (card vs background, sidebar vs content) rather than shadows at rest. Shadow appears only as a transient signal: focus rings, hover states, modal overlays, dropdown menus.

### Shadow Vocabulary

- **Focus ring** (`0 0 0 3px oklch(0.5424 0.2454 293.0160 / 0.5)`): Interactive element focus. Not a shadow per se, but the primary depth signal.
- **Overlay** (`0px 4px 15px 0px hsl(220 40% 15% / 0.13)` / dark: `0px 10px 25px 0px hsl(0 0% 0% / 1.00)`): Modals, dialogs, sheet panels. The strongest shadow; used only when content lifts above a backdrop.
- **Hover lift** (`0px 4px 15px 0px hsl(220 40% 15% / 0.05)`): Dropdown menus, hovered cards, popovers. Subtle, close to the surface.
- **Ambient** (`0px 4px 15px 0px hsl(220 40% 15% / 0.03)`): The barest depth. Used on the login card and minor containers.

### Named Rules

**The Flat-By-Default Rule.** A surface at rest has no shadow. If a card, sidebar, or panel needs visual separation from its background, use tonal layering (contrasting background color) — never a resting shadow.

## 5. Components

All components use Base UI for accessibility primitives and Tailwind CSS for styling. Components are `data-slot` instrumented for targeting and testing.

### Buttons

- **Shape:** Rounded (0.75rem / `rounded-lg`). Gently curved but not pill-like.
- **Primary (**`bg-primary text-primary-foreground`**):** Signal Violet background, white text. The one call to action per view.
- **Hover:** Primary darkens to `primary/80`. Ghost and outline variants shift to `bg-muted`. Transitions are instant (no transition-timing on background — the color swaps immediately).
- **Focus:** 3px ring at `ring/50` — visible but not overwhelming. Focus is always present, never removed.
- **Outline (**`border-border bg-background hover:bg-muted`**):** Light border, invisible background. Used for secondary actions alongside a primary button.
- **Ghost (**`hover:bg-muted`**):** No border, no background at rest. Used in navigation, toolbars, dense UIs.
- **Destructive (**`bg-destructive/10 text-destructive hover:bg-destructive/20`**):** Red-tinted for delete/danger actions. Uses transparency to avoid introducing a second primary-like weight.
- **Sizes:** default (2rem/32px h-8), sm (1.75rem/28px h-7), xs (1.5rem/24px h-6), lg (2.25rem/36px h-9), and icon-only variants.

### Navigation (Sidebar)

- **Style:** Ghost buttons in a collapsible, vertically scrollable sidebar (14rem/224px wide). Sections are grouped under uppercase tracked section labels.
- **States:** Active items show a 2px Signal Violet left border (`border-l-primary`), a `bg-primary/10` tint, and `font-medium`. Inactive items are `text-foreground/80` with no border.
- **Mobile:** A `Sheet` (slide-in drawer) mirrors the desktop sidebar structure, triggered by a hamburger icon.
- **Org Switcher:** A compact dropdown between the brand header and nav items, showing the current organization name.

### Cards

- **Corner Style:** Extra-rounded (1rem / `rounded-xl`).
- **Background:** White (`bg-card`) with a subtle `ring-1 ring-foreground/10` border — no shadow at rest.
- **Shadow Strategy:** None at rest (see Flat-By-Default Rule). Cards may receive a hover shadow only when interactive (clickable card grids).
- **Internal Structure:** Header (with optional title, description, and action slot), Content, Footer. Footer has a hairline top border with `bg-muted/50` background. Spacing is 1rem (16px) horizontal padding and 0.25rem gaps.
- **Sizes:** `default` (full spacing) and `sm` (compressed padding for dense lists).

### Inputs

- **Style:** Single 1px border (`border-input`), transparent background, 2rem (32px) height. In dark mode the background gets a faint `bg-input/30` tint.
- **Focus:** Border shifts to Signal Violet (`focus-visible:border-ring`) with a 3px ring at `ring/50`. The ring is the primary focus signal.
- **Error:** Border and ring shift to destructive red. Error messages appear below the input in `text-xs text-destructive`.
- **Disabled:** Reduced opacity at `disabled:opacity-50`, muted background, `cursor-not-allowed`.
- **Placeholder:** `text-muted-foreground` — must maintain ≥4.5:1 contrast against the input background.

### Badges

- **Shape:** Full-pill (9999px / `rounded-4xl`), 1.25rem (20px) fixed height.
- **Variants:** Default (Signal Violet on white), Secondary (muted), Destructive (transparent red), Outline (border only), Ghost (no background), Link (underlined text).
- **Text:** `text-xs` (0.75rem) with `font-medium`.

### Dialog / Sheet

- **Dialog:** Centered modal with black/50 backdrop, `rounded-xl`, `shadow-lg`, `p-6`. Entrance: fade + scale (95% → 100%). Backdrop supports `backdrop-blur-xs` when available.
- **Sheet:** Slides in from the left (navigation) or right (details). Full height, 16rem (256px) default width for nav, wider for detail panels.

### Breadcrumbs

- **Style:** `text-sm` inline nav. Segments separated by a muted foreground slash. Final segment is `text-foreground font-medium`; ancestor segments are muted and linkable.
- **Conditional rendering:** Hidden when path has ≤1 segment (root pages).

## 6. Do's and Don'ts

### Do:

- **Do** use Signal Violet sparingly — active nav, primary buttons, focus rings. Its rarity is what makes it meaningful.
- **Do** keep body text at 0.875rem (`text-sm`) and secondary text at 0.75rem (`text-xs`). The hierarchy is two steps, not a ladder.
- **Do** use tonal layering (card on background, sidebar on background) instead of shadows for surface separation at rest.
- **Do** respect dark mode as a first-class state with explicitly remapped tokens.
- **Do** use `data-slot` attributes for targeting elements in tests and variants.
- **Do** use OKLCH for all color values. The existing palette is the source of truth.
- **Do** use `focus-visible` rings on all interactive elements. Never remove browser default focus without replacing it.
- **Do** cap content width at 65–75ch for readable prose.

### Don't:

- **Don't** use side-stripe borders (border-left greater than 1px as a colored accent). Use full borders or background tints instead.
- **Don't** use gradient text (`background-clip: text` with a gradient). Emphasis comes from weight and size, not decoration.
- **Don't** add glassmorphism or backdrop blur as a decorative default — reserved for modal backdrops only.
- **Don't** write `999` or `9999` z-index values. Use the semantic scale: dropdown (50) → sticky (100) → modal-backdrop (49) → modal (50) → toast (60) → tooltip (70).
- **Don't** replicate Backstage's dense, text-heavy sidebar or nested card grids. Farm is cleaner and more spacious.
- **Don't** apply the brand gradient outside the login panel. The brand gradient is not a UI element.
- **Don't** use uppercase tracking (eyebrow labels) on every section. The nav section labels are uppercase; content sections should not be.
- **Don't** use cards nested inside cards. Cards are a single surface layer.
- **Don't** animate layout properties (width, height, position) — prefer transform and opacity transitions.
