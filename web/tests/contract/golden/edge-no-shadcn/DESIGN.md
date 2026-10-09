# Design system – Harbour

> Part B exported by Design Wizard from `design/harbour.dwproj.json` (project file schema v1). Reopen that file in Design Wizard to change a decision. Part A comes from the ProjectStart template and is not included. UX rules: `ux-rules.yaml` (4 rules).

## Product profile

- **Product type:** Clinic booking
- **Platform:** desktop
- **Notes:** Booking tool for small physiotherapy clinics. Fictional sample project.

**Primary users & context**
> **open: design-lead** – not decided in Stencil.

**Locale**
> **open: design-lead** – not decided in Stencil.

**References**
> **open: design-lead** – not decided in Stencil.

**Pattern packs**
> **open: design-lead** – not decided in Stencil.

# Part B – Direction (per project)

## Personality

> **open: design-lead** – not decided in Stencil.

## Signature element(s)

> **open: design-lead** – not decided in Stencil.

## Type

- **Display:** Sora 600 / 700
- **Text:** Inter 400 / 500 / 600
- **Scale:** xs 11px (0.6875rem) · sm 12px (0.75rem) · base 13px (0.8125rem) · lg 15px (0.9375rem) · xl 20px (1.25rem) · 2xl 25px (1.5625rem) · 3xl 32px (2rem)
- **Line height:** text 1.5 · display 1.2
- **Loading:** Self-host the vendored Fontsource files (`@fontsource/sora`, `@fontsource/inter`; latin subset; SIL OFL 1.1, keep each family's OFL.txt next to its files) with `next/font/local`, exposing `--font-display-face` and `--font-text-face`. Alternative only where Google Fonts is reachable: `next/font/google`.

**Numerals**
> **open: design-lead** – not decided in Stencil.

## Colour

- **Brand colour:** #0F766E · **Palette:** tinted
- Dark theme: not defined in v0.1.

| Role | Hex |
|---|---|
| `bg` | #E8FAF8 |
| `surface` | #FFFFFF |
| `border` | #699691 |
| `text` | #022522 |
| `text-muted` | #4E716C |
| `accent` | #0F766E |
| `on-accent` | #FFFFFF |
| `positive` | #1D7D3E |
| `warning` | #A46100 |
| `negative` | #C22826 |
| `focus` | #0F766E |

**Contrast (WCAG 2.x, AA)**

| Pair | Ratio | Minimum | Result |
|---|---|---|---|
| text / bg | 15.08 : 1 | ≥ 4.5 | PASS |
| text / surface | 16.27 : 1 | ≥ 4.5 | PASS |
| text-muted / bg | 4.98 : 1 | ≥ 4.5 | PASS |
| text-muted / surface | 5.38 : 1 | ≥ 4.5 | PASS |
| on-accent / accent | 5.47 : 1 | ≥ 4.5 | PASS |
| accent / bg | 5.07 : 1 | ≥ 4.5 | PASS |
| positive / bg | 4.79 : 1 | ≥ 4.5 | PASS |
| warning / bg | 4.53 : 1 | ≥ 4.5 | PASS |
| negative / bg | 5.36 : 1 | ≥ 4.5 | PASS |
| border / bg | 3.05 : 1 | ≥ 3 | PASS |
| border / surface | 3.29 : 1 | ≥ 3 | PASS |
| focus / bg | 5.07 : 1 | ≥ 3 | PASS |

**CSS variables**

```css
:root {
  --bg: #E8FAF8; /* color.bg */
  --surface: #FFFFFF; /* color.surface */
  --border: #699691; /* color.border */
  --text: #022522; /* color.text */
  --text-muted: #4E716C; /* color.text-muted */
  --accent: #0F766E; /* color.accent */
  --on-accent: #FFFFFF; /* color.on-accent */
  --positive: #1D7D3E; /* color.positive */
  --warning: #A46100; /* color.warning */
  --negative: #C22826; /* color.negative */
  --focus: #0F766E; /* color.focus */
  --radius: 8px; /* radius.base */
}
@theme inline {
  --color-bg: var(--bg);
  --color-surface: var(--surface);
  --color-border: var(--border);
  --color-text: var(--text);
  --color-text-muted: var(--text-muted);
  --color-accent: var(--accent);
  --color-on-accent: var(--on-accent);
  --color-positive: var(--positive);
  --color-warning: var(--warning);
  --color-negative: var(--negative);
  --color-focus: var(--focus);
  --font-display: var(--font-display-face), sans-serif; /* font.display: Sora */
  --font-sans: var(--font-text-face), sans-serif; /* font.text: Inter */
  --text-xs: 0.6875rem; /* font-size.xs */
  --text-sm: 0.75rem; /* font-size.sm */
  --text-base: 0.8125rem; /* font-size.base */
  --text-lg: 0.9375rem; /* font-size.lg */
  --text-xl: 1.25rem; /* font-size.xl */
  --text-2xl: 1.5625rem; /* font-size.2xl */
  --text-3xl: 2rem; /* font-size.3xl */
  --leading-text: 1.5; /* line-height.text */
  --leading-display: 1.2; /* line-height.display */
  --spacing: 4px; /* space.1; Tailwind multiplies, so p-4 = space.4 */
}
```

**Accent usage**
> **open: design-lead** – not decided in Stencil.

## Shape & depth

- **Radius:** 8px

**Borders vs. shadows**
> **open: design-lead** – not decided in Stencil.

**Elevation levels**
> **open: design-lead** – not decided in Stencil.

## Space & density

- **Spacing base:** 4px
- **Scale:** 1 = 4px · 2 = 8px · 3 = 12px · 4 = 16px · 6 = 24px · 8 = 32px · 12 = 48px · 16 = 64px
- **Density:** compact

**Max content width**
> **open: design-lead** – not decided in Stencil.

## Motion

> **open: design-lead** – not decided in Stencil.

## Iconography & imagery

> **open: design-lead** – not decided in Stencil.

## Project rules

> **open: design-lead** – not decided in Stencil.
