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
| `bg` | #EEF6F4 |
| `surface` | #FFFFFF |
| `border` | #5F817C |
| `text` | #0B2B28 |
| `text-muted` | #527370 |
| `accent` | #0F766E |
| `on-accent` | #FFFFFF |
| `positive` | #166534 |
| `warning` | #92400E |
| `negative` | #B91C1C |
| `focus` | #0F766E |

**Contrast (WCAG 2.x, AA)**

| Pair | Ratio | Minimum | Result |
|---|---|---|---|
| text / bg | 13.75 : 1 | ≥ 4.5 | PASS |
| text / surface | 15.10 : 1 | ≥ 4.5 | PASS |
| text-muted / bg | 4.72 : 1 | ≥ 4.5 | PASS |
| text-muted / surface | 5.19 : 1 | ≥ 4.5 | PASS |
| on-accent / accent | 5.47 : 1 | ≥ 4.5 | PASS |
| accent / bg | 4.98 : 1 | ≥ 4.5 | PASS |
| positive / bg | 6.49 : 1 | ≥ 4.5 | PASS |
| warning / bg | 6.45 : 1 | ≥ 4.5 | PASS |
| negative / bg | 5.89 : 1 | ≥ 4.5 | PASS |
| border / bg | 3.88 : 1 | ≥ 3 | PASS |
| border / surface | 4.27 : 1 | ≥ 3 | PASS |
| focus / bg | 4.98 : 1 | ≥ 3 | PASS |

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
  --background: #EEF6F4; /* color.bg */
  --foreground: #0B2B28; /* color.text */
  --card: #EEF6F4; /* color.bg */
  --popover: #EEF6F4; /* color.bg */
  --card-foreground: #0B2B28; /* color.text */
  --popover-foreground: #0B2B28; /* color.text */
  --primary: #0F766E; /* color.accent */
  --primary-foreground: #FFFFFF; /* color.on-accent */
  --secondary: #FFFFFF; /* color.surface */
  --muted: #FFFFFF; /* color.surface */
  --secondary-foreground: #0B2B28; /* color.text */
  --muted-foreground: #527370; /* color.text-muted */
  --accent: #FFFFFF; /* color.surface */
  --accent-foreground: #0B2B28; /* color.text */
  --destructive: #B91C1C; /* color.negative */
  --border: #5F817C; /* color.border */
  --input: #5F817C; /* color.border */
  --ring: #0F766E; /* color.focus */
  --sidebar: #EEF6F4; /* color.bg */
  --sidebar-foreground: #0B2B28; /* color.text */
  --sidebar-primary: #0F766E; /* color.accent */
  --sidebar-primary-foreground: #FFFFFF; /* color.on-accent */
  --sidebar-accent: #FFFFFF; /* color.surface */
  --sidebar-accent-foreground: #0B2B28; /* color.text */
  --sidebar-border: #5F817C; /* color.border */
  --sidebar-ring: #0F766E; /* color.focus */
  --positive: #166534; /* color.positive */
  --warning: #92400E; /* color.warning */
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
