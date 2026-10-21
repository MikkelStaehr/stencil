# Spec-lite: chrome family (Stencil joins Mainframe's look)

Size M, build target about 20 minutes: a token swap plus small class edits. Source of truth: DESIGN.md Part B "Night shift, Stencil edition". No function, shortcut or copy changes except the theme toggle.

## 1. Question and primary action
Unchanged per step. The chrome only changes skin; each step keeps its one primary action (now ink-solid, not black-on-grey).

## 2. Token table (`web/src/app/globals.css`)
Move today's `:root` values into two blocks: `:root, [data-theme="dark"] { …dark…; color-scheme: dark }` and `[data-theme="light"] { …light…; color-scheme: light }`. The shadcn mapping stays in `:root` once (it is all `var()`). No `prefers-color-scheme` query.

| Token | Now | Dark | Light | Note |
|---|---|---|---|---|
| `--dw-bg` | #e6e6e6 | #0C0C0E | #FAF8F4 | |
| `--dw-surface` | #f2f2f2 | #141417 | #FFFFFF | |
| `--dw-plate` | #cccccc | #333333 | #CCCCCC | stays R=G=B |
| `--dw-line` | #cccccc | #1E1E23 | #E7E2DA | |
| `--dw-ctl` | #6b6b6b | #6A6A76 | #857E74 | |
| `--dw-text` | #141414 | #ECECEE | #1C1A17 | |
| `--dw-text-muted` | #4f4f4f | #9A9AA2 | #655F57 | |
| `--dw-accent` | #000000 | #F07A3A | #A8430F | **meaning changes: now the orange "you are here"** |
| `--dw-on-accent` | #ffffff | #0C0C0E | #1B1205 | text on `--dw-accent-fill` |
| `--dw-focus` | #000000 | #7EA8FF | #1F5FD6 | |
| `--dw-hover` | #dadada | #17171B | #F3EFE9 | |
| `--dw-rail` | **new** | #08080A | #F1EEE8 | rail column |
| `--dw-aside` | **new** | #101013 | #F5F2ED | preview column |
| `--dw-selected` | **new** | #1C1C20 | #ECE7DF | current sub-decision row, pressed segment |
| `--dw-accent-fill` | **new** | #F07A3A | #D45A1F | current step chip |
| `--primary` | `--dw-accent` | `var(--dw-text)` | same | ink-solid button |
| `--primary-foreground` | `--dw-on-accent` | `var(--dw-bg)` | same | |
| `--destructive` | `--dw-accent` | `var(--dw-text)` | same | |
| `--accent` / `--accent-foreground` | hover / text | unchanged (`--dw-hover` / `--dw-text`) | | never orange |
| `--ring` | `--dw-focus` | unchanged | | value is now blue |
| `--radius` | 2px | 10px | 10px | |
| `--sidebar` | `--dw-bg` | `var(--dw-rail)` | | |
| `--sidebar-primary` / `-foreground` | accent / on-accent | `var(--dw-accent-fill)` / `var(--dw-on-accent)` | | |
| other `--background … --sidebar-ring` | | unchanged mappings | | values follow the theme |

`@theme inline` additions: `--color-dw-rail`, `--color-dw-aside`, `--color-dw-selected`, `--color-dw-hover`, `--color-dw-focus` (**`outline-dw-focus` in `identity.tsx:95` resolves to nothing today**), `--color-dw-accent-fill`. Fonts: `--font-mono: var(--font-geist-mono), ui-monospace, monospace`. Type: `--text-body` 0.875rem / 1.5, `--text-small` 0.75rem / 1.5, `--text-label` 0.6875rem / 1.4545, `--text-title` 1.875rem / 1.2. Radius: `--radius-2xs: 3px`, `--radius-xs: 6px`, `--radius-sm: 10px`, `--radius-md: 10px`, `--radius-lg … --radius-4xl: 16px`. Motion (values from `domain/motion.ts`): `:root { --duration-fast: 160ms; --duration-base: 220ms }` and in `@theme`: `--ease-out: cubic-bezier(0.23, 1, 0.32, 1); --ease-standard: ease`.

Also in `globals.css`: `kbd` `rounded-sm` → `rounded-xs`; plate brackets `.dw-plate[aria-checked="true"] … border-color: var(--dw-accent)` → `var(--dw-text)`; crop-mark `transition` → `border-color var(--duration-fast) var(--ease-standard), opacity var(--duration-fast) var(--ease-standard)`. Keep the reduced-motion block as it is.

## 3. Per region
- **Shell** `WizardShell.tsx`: `<aside>` gets `bg-dw-rail`; the preview `<section>` gets `bg-dw-aside`; mobile `<header>` gets `flex-wrap gap-y-2` and the compact `ThemeToggle` between "Step n of 5" and Open file. Notices at :101 and :117 add `rounded-xl` (keep `border-dw-ctl`: they ask for action).
- **Rail** `Rail.tsx`: :18 mark → `size-3 rounded-2xs border-[1.5px] border-dw-accent` (hollow). :39 keeps `border-l-dw-accent` (now orange). :42 step number: when `isCurrent`, `inline-flex size-[22px] items-center justify-center rounded-xs bg-dw-accent-fill font-medium text-dw-on-accent`; otherwise as now. Footer (:80): Open file, ShortcutLegend, then `<ThemeToggle />` last.
- **Sub-decision rows** `SubDecisionList.tsx:38–39`: current `bg-dw-surface` → `bg-dw-selected`; `duration-[120ms] ease-out` → `duration-(--duration-fast) ease-standard`.
- **Primary buttons** (`bg-dw-accent … text-dw-on-accent` → `bg-primary … text-primary-foreground`; inner `kbd` `border-dw-on-accent` → `border-primary-foreground`): `PlateGrid.tsx:209,212`, `ExportStep.tsx:261,264`, `PreviewStep.tsx:82,85`, `PrinciplesStep.tsx:306,310`, `identity.tsx:168,171`.
- **Selection is ink, not orange:** `PrinciplesStep.tsx:369` `var(--dw-accent)` → `var(--dw-text)`; :387 `border-dw-accent bg-dw-accent` → `border-dw-text bg-dw-text`, :386 `rounded-[2px]` → `rounded-2xs`; :390 check mark `dw-on-accent` → `dw-bg`. Field-error rules `PrinciplesStep.tsx:417` and `identity.tsx:199` `border-l-dw-accent` → `border-l-dw-text`.
- **Fields:** `identity.tsx:95` and `PrinciplesStep.tsx:433` `rounded-[2px]` → `rounded-sm`. `palette.tsx:44` `focus-visible:outline-dw-accent` → `focus-visible:outline-dw-focus`.
- **Cards:** `rounded-xl` and `border-dw-line` on `OpenedNotice.tsx:24,36`, `SnapshotNotice.tsx:40,62` and the law card `PrinciplesStep.tsx:366`. `ExportStep.tsx:321` `<pre>` gets `rounded-md`.
- **Contrast tags** `ContrastTable.tsx:26–27`: `rounded-sm` → `rounded-full`; FAIL `bg-dw-accent … text-dw-on-accent` → `bg-primary … text-primary-foreground`.
- **Export step:** the four-file list and primary follow the rules above; `ExportStep.tsx:277` "downloaded" fade → `duration-(--duration-base) ease-out` (keep `starting:opacity-0 motion-reduce:transition-none`).
- **Step content fades removed:** `ProfileStep.tsx:58` and `VisualStep.tsx:53` drop `animate-in fade-in duration-[120ms] ease-out` (J/K/E/Enter open them; keyboard-opened UI appears at once).
- **Fonts:** copy `C:\dev\waan\app\web\public\fonts\geist-mono\` (2 woff2 + `OFL.txt`; fix its first line to Geist's copyright line, see DESIGN.md Type) to `web/public/fonts/geist-mono/`; delete `web/public/fonts/ibm-plex-mono/`. `app/fonts.ts`: `plexMono` → `geistMono` (`--font-geist-mono`). `app/layout.tsx`: class name. `tests/unit/catalogue.test.ts:13`: `CHROME = ["geist", "geist-mono"]`. `content/fonts.ts:4` comment. Plex is not a catalogue option, so no variant changes.

## 4. Theme toggle
- New `web/src/components/wizard/ThemeToggle.tsx` (`compact?: boolean`). `<div role="group" aria-label="Theme" class="flex rounded-md border border-dw-ctl">` with two `<button type="button" aria-pressed>`, `min-h-11 flex-1` (compact: `size-11`), `rounded-md`, `transition-colors duration-(--duration-fast) ease-standard`. Content: inline-SVG moon / sun (16px, `aria-hidden`, stroke `currentColor`) + the words "Dark" / "Light"; compact shows icons only with `aria-label="Dark theme"` / `"Light theme"`. Pressed: `bg-dw-selected text-dw-text font-medium outline outline-1 -outline-offset-1 outline-dw-ctl`; unpressed: `text-dw-text-muted hover:bg-dw-hover`.
- New `web/src/lib/theme.ts` (no imports from `src`): `THEME_KEY = "stencil.theme"`, `readTheme()`, `writeTheme(t)` (try/catch; on failure the theme still applies to this tab, `console.warn` once), and `THEME_BOOT`, the pre-paint script string: read `?theme=light|dark` from the URL (applies for that load only, not stored; for screenshots and e2e), else the stored value, else `dark`; an unknown stored value is treated as missing (`console.warn`); set `document.documentElement.dataset.theme`; everything inside `try`, falling back to dark.
- `app/layout.tsx`: `<html lang="en" data-theme="dark" suppressHydrationWarning …>` and `<script dangerouslySetInnerHTML={{ __html: THEME_BOOT }} />` as the first child of `<head>` (the CSP already allows inline scripts). No flash: the static HTML is dark, and the script switches before the body paints.
- The component reads the theme with `useSyncExternalStore` (server snapshot `"dark"`). Clicking sets `data-theme` and writes storage; nothing animates. It never goes through the project store or autosave and is never exported.
- Keys: Tab reaches it; Enter/Space switch it (`ownsKey` already gives Enter to a focused button). 1/2/3, J, K and E keep working while it has focus and never switch the theme. No new shortcut; `ShortcutLegend` is unchanged.
- **Mainframe parity:** `C:\dev\waan\app\docs\PLAN.md` has no slice 14b yet (Mainframe follows `prefers-color-scheme`, no toggle). Mainframe's 14b should copy this: same control, labels, `data-theme` attribute and boot script (key `mainframe.theme`).

## 5. Motion (tokens from `domain/motion.ts`)
| Transition | Token | Reduced motion |
|---|---|---|
| Hover/press colour: secondary buttons (`classes.ts` `SECONDARY`, `SnapshotNotice.tsx:60`), sub-decision rows, theme segments | `duration.fast`, `ease.standard`, `transition-colors` only | instant |
| Plate bracket colour on select | `duration.fast`, `ease.standard` (size instant) | instant |
| "· downloaded hh:mm" appears | opacity, `duration.base`, `ease.out` | instant |
| Step and sub-decision change, preview update, theme switch, focus | none | none |

No `transition: all`, nothing moves or scales, nothing loops.

## 6. Must NOT change
`components/plate/*` (except the CSS bracket colour above), `components/samples/*`, `LivePreview`, `domain/tokens/plate-vars.ts` and everything inside `[data-v-root]`. Samples read only `--v-*`; the `sample-isolation` unit test and the e2e leak tests (`visual-step`, `preview`, `slice2-acceptance`, `slice3b/3c-tester`) stay green unchanged. The theme switches only `--dw-*` and shadcn variables, never a `--v-*`. Exports (goldens) are byte-identical.

## 7. States
No new data views. Existing loading ("Opening your project…"), error, stale and empty states take the new tokens only; check them in both themes with `?fixture=invalid-many`, `stale`, `empty`.

## 8. Acceptance (tester)
1. Fresh profile (no `stencil.theme`) in an OS set to light: the first screenshot is dark; no light frame before it (shoot with `--reduce-motion`, and reload once with `stencil.theme=light` stored: the first paint is light).
2. Toggle by keyboard only: Tab to it, Enter switches, Space switches back; focus ring visible (blue) in both themes; J/K/1/2/3 still work with focus on it.
3. The choice survives a reload; failing storage still switches the tab and shows no error.
4. A plate's computed `font-family`, `color` and `background-color` for every node inside `[data-v-root]` are identical in dark and light.
5. Orange appears only in the rail (chip, rule, mark): no element inside `main` or the preview column has a computed colour of `--dw-accent` or `--dw-accent-fill`.
6. A unit test computes every pair in DESIGN.md's contrast table from `globals.css` with `domain/color/contrast.ts`, both themes; every pair meets its threshold.
7. Every chrome node renders in Geist or Geist Mono (font check); no request leaves localhost; 390px has no horizontal scroll in either theme, including the mobile header at 200% text.
8. All existing unit, contract and e2e tests pass; goldens unchanged.

## 9. Screenshots (run-web, after the build)
`?theme=` sets the theme for the load; `--dark` only emulates the OS and does not pick Stencil's theme.
For each of `profile.identity`, `principles`, `visual.palette`, `preview`, `export` (all with `fixture=harbour`): 1280 dark (`/?fixture=harbour&step=<stop>`), 1280 light (`…&theme=light`), 390 dark. Plus 390 light for `visual.palette` and `export`.
