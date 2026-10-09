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

- **Brand colour:** #FFFF00 · **Palette:** deep
- Dark theme: not defined in v0.1.

| Role | Hex |
|---|---|
| `bg` | #1C1C00 |
| `surface` | #282807 |
| `border` | #737459 |
| `text` | #EFF0E1 |
| `text-muted` | #B8B9A4 |
| `accent` | #FFFF00 |
| `on-accent` | #101002 |
| `positive` | #7CD591 |
| `warning` | #EEC469 |
| `negative` | #F28881 |
| `focus` | #FFFF00 |

**Contrast (WCAG 2.x, AA)**

| Pair | Ratio | Minimum | Result |
|---|---|---|---|
| text / bg | 14.99 : 1 | ≥ 4.5 | PASS |
| text / surface | 13.04 : 1 | ≥ 4.5 | PASS |
| text-muted / bg | 8.64 : 1 | ≥ 4.5 | PASS |
| text-muted / surface | 7.52 : 1 | ≥ 4.5 | PASS |
| on-accent / accent | 17.82 : 1 | ≥ 4.5 | PASS |
| accent / bg | 16.08 : 1 | ≥ 4.5 | PASS |
| positive / bg | 9.69 : 1 | ≥ 4.5 | PASS |
| warning / bg | 10.47 : 1 | ≥ 4.5 | PASS |
| negative / bg | 7.08 : 1 | ≥ 4.5 | PASS |
| border / bg | 3.59 : 1 | ≥ 3 | PASS |
| border / surface | 3.12 : 1 | ≥ 3 | PASS |
| focus / bg | 16.08 : 1 | ≥ 3 | PASS |

**shadcn/ui variables**

| shadcn variable | Part B role | Note |
|---|---|---|
| `--background` | `bg` | |
| `--foreground` | `text` | |
| `--card`, `--popover` | `bg` | As in shadcn's defaults, cards sit on the page colour |
| `--card-foreground`, `--popover-foreground` | `text` | |
| `--primary` | `accent` | |
| `--primary-foreground` | `on-accent` | |
| `--secondary`, `--muted` | `surface` | |
| `--secondary-foreground` | `text` | |
| `--muted-foreground` | `text-muted` | |
| `--accent` | `surface` | shadcn's hover/highlight background, not the brand accent |
| `--accent-foreground` | `text` | |
| `--destructive` | `negative` | shadcn v4's destructive button hard-codes white text: open: design-lead |
| `--border`, `--input` | `border` | |
| `--ring` | `focus` | |
| `--sidebar`, `--sidebar-foreground`, `--sidebar-primary`, `--sidebar-primary-foreground`, `--sidebar-accent`, `--sidebar-accent-foreground`, `--sidebar-border`, `--sidebar-ring` | `bg`, `text`, `accent`, `on-accent`, `surface`, `text`, `border`, `focus` | |
| `--chart-1` … `--chart-5` | – | open: design-lead (no data-visualisation palette in v0.1) |
| `--positive`, `--warning` | `positive`, `warning` | Not in shadcn; added |
| `--radius` | `radius.base` | |

```css
:root {
  --background: #1C1C00; /* color.bg */
  --foreground: #EFF0E1; /* color.text */
  --card: #1C1C00; /* color.bg */
  --popover: #1C1C00; /* color.bg */
  --card-foreground: #EFF0E1; /* color.text */
  --popover-foreground: #EFF0E1; /* color.text */
  --primary: #FFFF00; /* color.accent */
  --primary-foreground: #101002; /* color.on-accent */
  --secondary: #282807; /* color.surface */
  --muted: #282807; /* color.surface */
  --secondary-foreground: #EFF0E1; /* color.text */
  --muted-foreground: #B8B9A4; /* color.text-muted */
  --accent: #282807; /* color.surface */
  --accent-foreground: #EFF0E1; /* color.text */
  --destructive: #F28881; /* color.negative */
  --border: #737459; /* color.border */
  --input: #737459; /* color.border */
  --ring: #FFFF00; /* color.focus */
  --sidebar: #1C1C00; /* color.bg */
  --sidebar-foreground: #EFF0E1; /* color.text */
  --sidebar-primary: #FFFF00; /* color.accent */
  --sidebar-primary-foreground: #101002; /* color.on-accent */
  --sidebar-accent: #282807; /* color.surface */
  --sidebar-accent-foreground: #EFF0E1; /* color.text */
  --sidebar-border: #737459; /* color.border */
  --sidebar-ring: #FFFF00; /* color.focus */
  --positive: #7CD591; /* color.positive */
  --warning: #EEC469; /* color.warning */
  --radius: 8px; /* radius.base */
}
@theme inline {
  --color-positive: var(--positive);
  --color-warning: var(--warning);
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
