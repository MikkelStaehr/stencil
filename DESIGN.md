# Design system – Stencil (formerly Design Wizard)

Contract between `design-lead` (owns this file) and `ui` (builds).

- **Part A: Guardrails.** Fixed. They apply to every project.
- **Part B: Direction.** Chosen per project by design-lead in Mode 0. This is where the product gets its own identity.

---

## Product profile
- **Product type:** Desktop wizard for design and UX decisions (Design Wizard v0.1). Confirmed by the user.
- **What it does:** The user makes a project's design and UX decisions in five steps: 1. Project profile; 2. UX principles picker (about 12 curated laws, each with "when it applies", each choice becomes a checkable rule); 3. Visual system (font pairs, spacing scale, radius, brand colour → palette with contrast check, density); 4. Live preview on a generic sample screen; 5. Export: DESIGN.md (Part B), `tokens.json`, `ux-rules.yaml`. An AI dev team builds and tests against the exported files.
- **Core principle:** every choice is shown as **2–3 live variants side by side**, never as one abstract option, and **every decision can be changed later**.
- **Primary users & context:** A solo developer or small-team lead, at a desk, at the start of a project and again whenever a decision changes.
- **Platform:** Desktop first (1280px), full keyboard flow. Must still work at 390px. See Project rules.
- **Locale:** en-GB UI copy; numbers with a decimal point (contrast ratios such as 4.73 : 1).
- **References the user likes:** Linear (calm, dense, keyboard-first, a command bar, visible shortcut hints) and Notion (everything editable in place). Only these two.
- **Family (user, 2026-10-21):** Stencil is a sibling of **Mainframe** (`C:\dev\waan\app`, DESIGN.md Part B "Channel view, slice 14"). Same colours, type, radius, cards and one orange accent; Stencil stays its own app and shows its own character in the details (see "Family: what is shared and what is not").
- **Pattern packs:** none. `design/patterns/data-dashboard.md` does not apply: this is a decision tool, not a numbers dashboard.

---

# Part A – Guardrails (fixed)

## UX
- One primary purpose and at most one primary action per screen, and that action is visually dominant.
- Mobile first: design at 390px, then let it grow. *(Overridden for this project, see Project rules.)*
- Every data view has a designed loading, empty, error and (if relevant) stale state. Never a blank area.
- Error messages say what happened and what to do. Undo is preferred over confirmation.

## Accessibility
- [ ] WCAG 2.2 AA contrast in every theme: text ≥ 4.5:1; large text, icons and control borders ≥ 3:1.
- [ ] Colour never carries meaning alone.
- [ ] Semantic HTML (`main`, `nav`, headings in order, `button` vs `a`).
- [ ] Everything works by keyboard, with a visible focus state.
- [ ] Icon-only buttons have `aria-label`. Images have `alt`.
- [ ] Text zoom to 200% doesn't break the layout.
- [ ] `prefers-reduced-motion` respected. All motion has a reduced alternative.

## Interaction
- Touch targets ≥ 44×44px. Nothing essential on hover only.
- Feedback < 100ms. Progress shown for anything > 1s. Skeletons for content areas.
- Forms: visible labels, validate on blur, the error goes next to the field, correct `type`/`inputmode`/`autocomplete`, and input is kept on error.

## Technical
- Tokens only: no magic values in components.
- Fonts are self-hosted (e.g. `next/font`), max 2 families.
- UI library: shadcn/ui + Tailwind for Next.js (assumed template default; stack not yet confirmed by tech-lead/architect), **always themed by Part B. Never the default look.**

---

# Part B – Direction (per project)

**Direction: Night shift, Stencil edition (2026-10-21).** A family member of Mainframe's slice 14 look: dark by default, rounded cards, every number in mono, one orange accent; calm, with a little life in hover and status. It replaces "Grading Suite, light by default" (2026-10-01). Build spec: `design/specs/chrome-family.md`. The old records `design/directions/grading-suite-geist.html` and `font-compare.html` stay frozen as history; where they differ, this file counts.

## Personality
**Calm, exact, lit.** The same night-shift room as Mainframe: a near-black field, quiet grey type, and one orange point that says "you are here". Stencil's own trait is the **neutral viewing plate**: the user's variants sit on square, hue-free grey plates with crop marks, so no colour judgement is made against the tool's orange.

## Family: what is shared and what is not
| Shared with Mainframe (slice 14) | Stencil's own detail |
|---|---|
| Surfaces, text and muted values from `--mf-ch-*` (rail, bg, aside, card, line, selected, hover) | Viewing plates stay **square, R=G=B grey, with crop marks**; the only square, hue-free thing on screen |
| One accent `#F07A3A` (dark) / `#A8430F` + fill `#D45A1F` (light), meaning "here and now" | The accent **never touches a plate** (not on, in or around it): it lives in the rail only |
| Geist + Geist Mono; every number, value, hex code and key in mono | Labels stay 11px **uppercase** mono with +0.08em tracking (stencil lettering); Mainframe's "/" uses sentence case |
| Rounded cards 16px, controls 10px, borders not shadows | The brand mark is Mainframe's 12px orange square **cut out**: a hollow 1.5px accent outline |
| Primary button is ink-solid (text colour), never orange; focus is blue | Dark is the default **regardless of the OS** (Mainframe follows `prefers-color-scheme`); light is a stored choice |

**Deliberately not copied from Mainframe, and why**
- The room, heatmap, chat, avatars and round project icons: they show live agent work; Stencil has none.
- Breathing dots, the working pulse and the split-flap tiles: nothing runs in Stencil, so nothing breathes or flips.
- Status hues (green positive, signal-yellow warning, red negative, the warm "room" surface): on a colour-critical screen they would compete with the user's palette. Stencil's chrome status is words plus shape (PASS/FAIL tags, an ink rule beside a field error).
- The second text tone `--mf-ch-text-2` and the popover shadow: one text tone, one muted tone, no shadows at all.
- Orange on selection (Mainframe forbids it too) and rounded plates (they would cut the crop marks).

## Signature element(s)
1. **Viewing plates with crop marks (kept, Stencil's own).** Every variant sits on a `--dw-plate` surround, 18px padding, **0 radius**, with four 12×12px L-shaped crop marks (1px `--dw-text-muted`) inset 6px from the corners. When a variant is selected the marks become 16×16px, 2px brackets in **`--dw-text`** (ink, not orange). Chrome never draws inside the 18px margin's inner edge.
2. **The lit step (new, the family link).** The rail's current step is the only orange on screen: a 22×22px number chip filled `--dw-accent-fill` with its number in `--dw-on-accent` (Geist Mono 500 11px), plus the 2px `--dw-accent` left rule on the row. Other step numbers are plain muted mono. Shape (filled chip + rule) and position tell "current", not colour alone.
3. **The hollow mark.** The rail header's 12×12px square, radius 3px, 1.5px `--dw-accent` outline, no fill.

### Planned v0.2 (not a current signature element, not built in v0.1)

Plate samples already carry `data-v-part` attributes, so pins can be anchored later without changing the samples.

- **Diff pins.** 18px circles, fill `--dw-surface`, 1.5px `--dw-text` ring, letter in Geist Mono 500 10px. They straddle the plate's left edge (`left: -9px`) on the selected variant, vertically anchored to the element that differs (compute from the element's position; never fixed px). Never over specimen content, at any width. A legend (pin + **bold** name + one plain sentence) sits under the plates.

## Type
Two chrome families, both OFL, committed woff2 (latin) under `web/public/fonts/<id>/` with `OFL.txt`, loaded via `next/font/local`:
- **Geist** 400 / 500 / 600: titles, prose, names, buttons.
- **Geist Mono** 400 / 500 (replaces IBM Plex Mono, 2026-10-21, to match Mainframe): every number, ratio, hex code, value, step number, label and key, always `font-variant-numeric: tabular-nums`. Source: Mainframe's committed copy `C:\dev\waan\app\web\public\fonts\geist-mono\` (Fontsource `@fontsource/geist-mono`, OFL-1.1, latin 400 and 500, about 30 KB together). Its `OFL.txt` comes along, but its first line reads "Google Inc."; write the Geist project's copyright line from Stencil's `geist/OFL.txt` instead. The Plex Mono files leave `web/public/fonts/`.

| Role | Font | Size / line | Weight | Tracking |
|---|---|---|---|---|
| Step title (h1) | Geist | 30 / 36 | 600 | −0.02em |
| Section and item titles | Geist | 14 / 20 | 600 (sections) / 500 (items) | 0 |
| Body | Geist | 14 / 21 | 400 | 0 |
| Small (summaries, help) | Geist | 12 / 18 | 400 | 0 |
| Label | Geist Mono | 11 / 16, uppercase | 500 | +0.08em |
| Value, ratio, hex, table | Geist Mono | 11 / 16 | 400 | 0 |
| Key (`kbd`) | Geist Mono | 11 / 16 | 500 | 0 |
| Primary button | Geist | 14 / 20 | 600 | 0 |

- **Scale:** 11 / 12 / 14 / 30. No other sizes in chrome.
- **Rule:** mono = numbers, values, labels and keys; sans = prose, names and titles. Never swap.

## Colour
**Two themes. Dark is the default regardless of the OS**; light is the alternative, chosen with the theme toggle and remembered in this browser. Values come from Mainframe's slice 14 tokens unless marked *Stencil*. Every chrome token is `--dw-*` in code (shadcn owns `--accent`).

| Token | Dark | Light | Use |
|---|---|---|---|
| `--dw-rail` | #08080A | #F1EEE8 | rail (step list) column |
| `--dw-bg` | #0C0C0E | #FAF8F4 | main column, page |
| `--dw-aside` | #101013 | #F5F2ED | live preview column |
| `--dw-surface` | #141417 | #FFFFFF | cards, notices, inputs, kbd, secondary buttons |
| `--dw-hover` | #17171B | #F3EFE9 | row and button hover |
| `--dw-selected` | #1C1C20 | #ECE7DF | current sub-decision row, pressed theme segment |
| `--dw-line` | #1E1E23 | #E7E2DA | card and column borders, dividers. Decorative only |
| `--dw-ctl` | #6A6A76 | #857E74 *Stencil* | control borders (inputs, buttons, kbd, tags) |
| `--dw-plate` | #333333 *Stencil* | #CCCCCC *Stencil* | viewing plates. Always R=G=B |
| `--dw-text` | #ECECEE | #1C1A17 | text; primary button fill; selection brackets; field-error rule |
| `--dw-text-muted` | #9A9AA2 | #655F57 | secondary text, labels, crop marks |
| `--dw-accent` | #F07A3A | #A8430F | the accent as a line or text: current step rule, hollow mark |
| `--dw-accent-fill` | #F07A3A | #D45A1F | the current step chip fill |
| `--dw-on-accent` | #0C0C0E | #1B1205 | number on the accent fill |
| `--dw-focus` | #7EA8FF | #1F5FD6 | focus outline only: 2px solid, 2px offset (3px on plates) |

**Contrast** (WCAG 2.x, computed by design-lead on 2026-10-21 from the values above; ui asserts every pair in a unit test computed from `globals.css` with `domain/color/contrast.ts`, never typed as literals). Columns are the surfaces the foreground appears on.

| Foreground (threshold) | Theme | rail | bg | aside | surface | hover | selected | plate |
|---|---|---|---|---|---|---|---|---|
| `--dw-text` (4.5) | dark | 16.96 | 16.56 | 16.10 | 15.58 | 15.15 | 14.40 | 10.71 |
| | light | 14.99 | 16.37 | 15.55 | 17.36 | 15.16 | 14.11 | 10.81 |
| `--dw-text-muted` (4.5; crop marks 3) | dark | 7.16 | 7.00 | 6.80 | 6.58 | 6.40 | 6.08 | 4.52 |
| | light | 5.45 | 5.95 | 5.65 | 6.31 | 5.51 | 5.13 | 3.93 (marks only, no text on plates) |
| `--dw-accent` (4.5) | dark | 7.19 | 7.03 | 6.83 | 6.61 | 6.43 | 6.11 | never used |
| | light | 5.22 | 5.70 | 5.41 | 6.04 | 5.28 | 4.91 | never used |
| `--dw-ctl` (3) | dark | 3.75 | 3.66 | 3.56 | 3.45 | 3.35 | 3.18 | – |
| | light | 3.46 | 3.78 | 3.59 | 4.01 | 3.50 | 3.26 | – |
| `--dw-focus` (3) | dark | 8.51 | 8.31 | 8.08 | 7.82 | 7.60 | 7.22 | 5.37 |
| | light | 4.95 | 5.40 | 5.13 | 5.73 | 5.00 | 4.65 | 3.57 |

Other pairs: `--dw-on-accent` on `--dw-accent-fill` 7.03 dark / 4.65 light (≥ 4.5); `--dw-accent-fill` chip on `--dw-rail` 7.19 / 3.43 (≥ 3); primary button text `--dw-bg` on `--dw-text` 16.56 / 16.37; selection brackets `--dw-text` on `--dw-plate` 10.71 / 10.81. `--dw-line` is 1.18 / 1.22 on bg and is never the only cue for anything.

- **Accent usage: "you are here".** Only the rail's current step (chip + rule) and the hollow mark. Never buttons, links, selection, hover, headings, errors, PASS/FAIL, focus, or anything on or inside a plate or the live preview. Hue inside the plates and preview comes only from the user's project.
- **Primary action:** ink-solid (`--dw-text` fill, `--dw-bg` text), as in Mainframe.
- **Errors:** words first, plus a 2px `--dw-text` rule beside the field and the FAIL tag inverted (ink fill). No red.

### Contrast check presentation
Each row reads `<pair name>  <ratio, 2 decimals, tabular>  <tag>`, set in Geist Mono 11px. PASS is a 44px-wide pill tag with `--dw-text-muted` text and a 1px `--dw-line` outline. FAIL is the same tag inverted (`--dw-text` fill, `--dw-bg` text, 500). Never colour alone, never ✓/✕ glyphs. v0.1 offers only palettes where every pair passes, so FAIL should not appear in the palette step; the style exists for any check that fails. There is no fix box and no "Apply fix" in v0.1.

### shadcn/ui mapping (never ship the default theme)
`--background` = `--dw-bg` · `--foreground` = `--dw-text` · `--card` / `--popover` = `--dw-surface` · `--card-foreground` / `--popover-foreground` = `--dw-text` · `--primary` = `--dw-text` · `--primary-foreground` = `--dw-bg` · `--secondary` / `--muted` = `--dw-surface` · `--secondary-foreground` = `--dw-text` · `--muted-foreground` = `--dw-text-muted` · `--accent` (shadcn's hover background, **never orange**) = `--dw-hover` with `--accent-foreground` = `--dw-text` · `--destructive` = `--dw-text` (destructive actions are told apart by wording and undo) · `--border` = `--dw-line` · `--input` = `--dw-ctl` · `--ring` = `--dw-focus` · `--radius` = 10px · `--sidebar` = `--dw-rail`, `--sidebar-primary` = `--dw-accent-fill`, `--sidebar-primary-foreground` = `--dw-on-accent`, `--sidebar-accent` = `--dw-hover`, `--sidebar-border` = `--dw-line`, `--sidebar-ring` = `--dw-focus`. No component shadows; overlays use a 1px `--dw-ctl` border on `--dw-surface`.

## Theme toggle
- A segmented control, group name "Theme", two buttons **Dark** and **Light** (`aria-pressed`), each with a 16px inline-SVG moon or sun (`aria-hidden`). Rail footer: words + icons, full width. Mobile header (≤760px): icons only, each button `aria-label` "Dark theme" / "Light theme".
- Pressed: `--dw-selected` fill, `--dw-text`, weight 500, 1px `--dw-ctl` inset outline. Unpressed: transparent, `--dw-text-muted`, `--dw-hover` on hover. Never orange.
- Keyboard: Tab-reachable; Enter or Space switches. **No shortcut key** (1/2/3, J, K, E, Enter and Space are taken, and the theme is set rarely). Focus stays on the pressed button. The switch is instant.
- Stored in `localStorage["stencil.theme"]` (`dark` | `light`); missing or unknown means dark. It is a browser preference, not project data: never in the project file or the exports. Applied to `<html data-theme>` before first paint.

## Shape & depth
- Radius tokens: cards and notices 16px; controls (buttons, inputs, sub-decision rows, theme segments) 10px; `kbd` 6px; checkbox and the hollow mark 3px; PASS/FAIL tags pill. **Plates 0.** Variants keep their own radius.
- Borders, not shadows: cards are `--dw-surface` + 1px `--dw-line`. Notices that ask for action (file errors, save failed) keep a 1px `--dw-ctl` border. No shadows anywhere in the chrome.
- Elevation: three column tones (rail darkest, main, aside), then cards. The plates are flat grey.

## Space & density
- Spacing scale: 4-pt; 4, 8, 12, 16, 20, 24, 32. Card padding 16 (notices 12 × 16).
- Density: compact. Every clickable or J/K-reachable row is at least 44px. Read-only rows (contrast rows, shortcut legend) may be shorter.
- Layout at ≥1101px: rail 232px (`--dw-rail`) | main (fluid, 24px padding, `--dw-bg`) | preview 340px (`--dw-aside`). At 761–1100px: rail 200px + main, with the preview below main. At ≤760px: single column, a top bar (Stencil, Step n of 5, theme icons, Open file; it wraps rather than overflows), variants stacked, rail and shortcut legend hidden, primary button full width.
- Variants: 3 equal columns, 20px gap. Reading width of prose ≤ 60ch.

## Motion
Tokens from `web/src/domain/motion.ts` (the slice 4a motion laws; same in both themes). Only feedback and status move; nothing slides, scales or breathes.
- **Hover and press colour** (buttons, rows, theme segments): `duration.fast` 160ms, `ease.standard`.
- **Selection brackets** (border colour on select): `duration.fast`, `ease.standard`. Size changes are instant.
- **"Downloaded hh:mm" status:** opacity in, `duration.base` 220ms, `ease.out`.
- **Instant, by rule:** step and sub-decision changes (they follow J, K, E and Enter, and anything opened by a keyboard shortcut appears at once), the live preview update, the theme switch, focus.
- **Reduced motion:** every transition is instant (the existing global rule). With no movement in the chrome, instant is the gentler path.

## Iconography & imagery
- No icon font. Inline SVG only, `currentColor`, 1.5–2px stroke, square caps, sized in `em` (theme icons 16px). Arrows (→) are inline SVG with a visually hidden text label ("to").
- No illustration or photography in the chrome.

---

## Project rules
- **Platform override (user decision):** Desktop first: 1280px, full keyboard flow, Linear-like density. Design decisions are desk work. It must still work at 390px, but density is tuned for desktop. This overrides the Part A guardrail "Mobile first: design at 390px". Design and review at 1280px first, then verify 390px, **in both themes**. All other guardrails, including 44px touch targets, still apply.
- **Scope:** Channels and bots belong to the later W.A.A.N. control room, not this product. No feeds, channels or bot posts in Design Wizard.
- **Variants are live, never abstract:** every decision is presented as 2–3 variants side by side, each rendered as real sample UI in its own tokens (not a swatch or a font name alone). The live preview reflects the focused variant plus every earlier decision.
- **Chrome never contaminates variants:** the wizard's own fonts, accent, radii and **theme** never appear inside a variant frame, and a variant's tokens never leak into the chrome. A plate renders identically in dark and light.
- **Every decision is editable later:** earlier steps and sub-decisions stay visible with their current value and can be edited in place (`E`) without losing later decisions.
- **Keyboard flow:** `1`/`2`/`3` pick a variant, `J`/`K` next/previous decision, `E` edit an earlier step, `Enter` choose, `⌘K`/`Ctrl+K` command bar. Shortcut hints are always visible on desktop, never on hover only.
- **Contrast check is a product feature:** each palette variant shows its ratios as numbers with the words PASS/FAIL (not colour alone). Only palettes where every checked pair passes AA are offered. "Apply fix" is cut from v0.1.
- **Variants never inherit chrome tokens.** Variant and preview content is styled only from the user's project tokens, scoped to the variant container; no chrome CSS variable, font or radius may cascade into it.
- **Font limit scope:** "max 2 families" applies to the chrome only (Geist + Geist Mono), not to variant content, which renders whatever font pair the user picks.
- **Glyph rule:** never use characters outside the shipped font subsets. Arrows are inline SVG with a visually hidden text label. Ticks and crosses are words (PASS/FAIL) or CSS shapes. Verify with a font check that every chrome node renders in web fonts only.
- **Platform-aware shortcut labels:** "Ctrl" on Windows and Linux; "⌘" only on macOS, and only if the glyph is covered by the shipped font. Key names are words ("Enter", "Ctrl").
- **Shortcut legend lives in the rail footer** on desktop, always visible, never hover-only.
- **44px rows:** any row that can be clicked or reached with J/K is at least 44px tall.
- **One accent, in the rail only.** Orange means "you are here" and never appears on, in or next to a plate or the live preview.
