# Design Wizard v0.1 – plan (tech-lead one-pager)

> **Status:** approved 2026-10-01, with the decisions at the bottom. Slice 1 has the go; the user gives the go before each later slice.

**Size & budget:** Project start (45 min), then the v0.1 build as **L slices of 60 min each** (40 build + 20 review and test), with the user's go before each: slice 1, slice 2, and slice 3 split into **3a–3d**, one UI surface each (2026-10-01). Total about 6 h 45 min of agent time.

**Decision:** v0.1 is a **local-only, static Next.js app in `web/`**: no backend, DB, auth or hosting. Its state is **one versioned project file**, autosaved to localStorage and downloaded with the exports. Variants are same-document plates isolated by a `--v-*` custom-property namespace. Their fonts are a **committed set of OFL woff2 files loaded on demand via the FontFace API**.

## Tradeoffs considered

1. **Local vs hosted.** Hosting only buys access from a second machine. It costs Vercel Authentication, the first-deploy steps and exposure next to a public repo. Single user, one machine, so local wins. `output: 'export'` mechanically forbids server code, and hosting later is a deploy step, not a rewrite. Next.js is heavier than Vite for a client-only app; we keep it because it's the team default, `run-web` expects it and shadcn targets it.
2. **How fonts chosen in the wizard load inside the variants.** We use committed OFL woff2 files (latin subset, only the weights used, the OFL licence per family, sourced from Fontsource), loaded with `new FontFace()` when a decision opens.
   - **Rejected: runtime Google Fonts.** The corporate network may block it, every load sends the user's IP to Google (GDPR), and tests become non-deterministic.
   - **Rejected: `next/font` for variant fonts.** It is build-time only, so it can't load a font the user picks at runtime, and it would preload the whole catalogue. It is used for the **chrome only** (Geist + IBM Plex Mono via `next/font/local`).
   - **Layout shift.** Plates have fixed dimensions and show a loading state until `document.fonts.load()` resolves.
   - **Failure.** A failed font shows "Font failed: X" and disables that plate's Choose action. A plate never silently falls back, because the user would be judging the wrong font.
   - **Export.** The font token names the Fontsource package, weights, subset and licence. DESIGN.md says to load it with `next/font/local` from vendored files, which works on blocked networks. `next/font/google` is listed only as an alternative.
3. **Isolating variants from the chrome.** We use scoped custom properties. The plate root sets every `--v-*` value inline and explicitly sets font-family, colour and line-height, so nothing is inherited from the chrome. Sample components read only `--v-*`, and a test enforces it.
   - **Rejected: shadow DOM.** It isolates nothing that matters here: custom properties and inherited font and colour pass through it, and Tailwind would have to be injected again.
   - **Rejected: iframes.** They mean four documents, fonts registered in each one, and focus and shortcuts breaking across frames. They are only worth it if a variant must render at a true 390px viewport (v0.2).
   - The approved mock already uses the scoped approach.

## Data check (no DB: the project file is the store)

| Value | Status |
|---|---|
| Profile: name, product type, platform, notes | missing → `profile.*` |
| Chosen laws (ids) + params (e.g. 44px) | missing → `principles[]`. Law text missing → static `content/laws` |
| Font pair id | missing → `visual.fontPair`. Catalogue partly exists (6 families in `design/directions/fonts/`) → `content/fonts` |
| Spacing base, radius (0 is valid), density, brand hex, palette variant | missing → `visual.*`, with missing as `null` |
| The 10 Part B colour roles (`--bg` … `--focus`), type scale, space scale | missing → stored `resolved` snapshot, so re-exports are byte-stable |
| positive / warning / negative | missing and not in the spec. Generated from fixed hues and checked against AA |
| Dark theme values | **cut**. The export says explicitly "not defined" |
| Contrast ratios | derived at render, not stored |
| Part B Personality, Signature, Motion, Icons, Elevation, Max width | not decided by the wizard. Exported as explicit "open: design-lead" markers |

**Migration: none.** The equivalent is **one project-file schema v1** holding all the fields above, committed before any UI, with `schemaVersion` from day one.

## Export formats

- **tokens.json** uses the W3C DTCG 2025.10 format (`$type`/`$value`).
  - Groups are named exactly after the Part B roles in `design/DESIGN.template.md` (`color.bg`, `color.text-muted`, …, `font.display`, `font.text`, `radius`, `space`). Font metadata goes in `$extensions`.
  - The exported DESIGN.md Part B carries a role → shadcn variable table (`--text`→`--foreground`, `--accent`→`--primary`, `--focus`→`--ring`, `--negative`→`--destructive`, …) plus a CSS block generated from tokens.json. So the file is standard and still maps 1:1.
- **ux-rules.yaml v1** has `schemaVersion` and a list of `rules`.
  - Each rule has `id`, `law`, `when`, `rule` (one imperative sentence), `severity` (must/should) and `check {kind, selector, params, viewports}`.
  - `kind` is a closed list: `min-target-size`, `max-count`, `contrast`, `response-time`, `focus-visible`, `manual` (with a `question` for reviewer).
  - Rules that can't be automated are honestly marked `manual`.
- **Contract tests:**
  - **C1 golden:** `fixtures/harbour.project.json` (fictional) produces export files byte-equal to the committed golden files. Exports contain no timestamps.
  - **C2 edge cases:** radius 0, brand `#FFFF00`, a single-family pair, project name `Nørrebro: "Ida's" #1`, zero laws chosen.
  - **C3:** tokens.json passes its schema, every alias resolves, and every Part B role appears exactly once.
  - **C4:** the DESIGN.md CSS block equals the mapper's output, and the stated contrast ratios match values recomputed from the tokens.
  - **C5:** ux-rules.yaml passes its schema, ids are unique, `kind` is in the list, and numeric params are numbers.
  - **C6:** the project file round-trips, and an invalid file lists every problem.

## Content

The UX laws and the font catalogue are **static typed content in the repo**, changed by commit. design-lead drafts them and the user approves. Project files store ids only, and an unknown id on load is a loud error, never a default.

## Cut from v0.1

- Backend, DB, auth and hosting
- Dark theme
- The Ctrl K command menu
- The A/B/C diff pins (planned v0.2)
- **"Apply fix" on contrast.** The palette generator only offers palettes that pass AA, and the ratios are still shown.
- Font upload and Google Fonts search
- Writing directly into a target folder (v0.1 uses downloads only)
- A multi-project list
- Importing an existing DESIGN.md
- An undo stack
- Domain-specific sample screens
- Bundling font files into the export

## v0.2 backlog

Ideas only, no code yet (user, 2026-10-02). Each becomes a slice in § Slices when the user gives the go. Diff pins are also planned for v0.2 (see Cut from v0.1).

- **Brand colour:** the swatch shows the colour live as soon as the hex is valid, with a hint that Enter applies it.
- **More palettes:** "Show 3 new" steps through strategies (monochrome, analogous, complementary, triadic, muted, bold), still 3 side by side. Every palette offered still passes AA (AC7).
- **Colours from an image:** upload an image or logo, extract its 5–6 dominant colours in the browser (nothing is sent anywhere), and pick one as the brand colour.
- **Fonts:** the user's visual assessment of the 8 families (on `?step=visual.fontPair`).
- **Design team sparring per step** (user, 2026-10-08): the design team gives input at each step, and the reasoning behind each decision is stored in the project file.
- **The name Stencil in the app, and a new file extension** instead of `.dwproj.json` (user, 2026-10-08). **Contract change:** project file schema version bump, the export provenance line ("Design Wizard", `design/<slug>.dwproj.json`), golden files and the `*.dwproj.json` gitignore. Mainframe's v0.2 Design tab validates `design/<slug>.dwproj.json`, so it has to change in step.
- **Colour blindness simulation** on palettes.
- **Brand board export:** one page that can be shown to a client.
- **Font library:** open licences only (Fontsource/Google Fonts), self-hosted, with categories, suggested font pairs, a preview in the project's own text, and a glyph check (including æøå) shown per font.

## v0.3 backlog

Ideas only, no code yet (user, 2026-10-08). Needs Mainframe's server.

- **Import a website:** Mainframe renders the page headless and reads the colours, fonts, sizes, radius and spacing it uses. Stencil proposes a palette, type scale and direction as a starting point. Licensed fonts are identified, never copied, and the nearest open alternative is proposed. Only the user's own sites and client sites.

## Domain assumptions

1. Single user on one machine. *Verified (user).* Nothing Chromium-only is used.
2. Target projects use Next.js + Tailwind v4 + shadcn/ui. *Needs the user.*
3. The exported pair has at most 2 families, with no third mono family. The 2-family limit is *verified* (Part A); "no mono" *needs the user*.
4. The contrast bar is WCAG 2.2 AA: 4.5:1 for text, 3:1 for UI and borders. *Verified* (Part A).
5. v0.1 is light theme only. *Needs the user.*
6. The sample screen is generic; only the product name comes from the profile. *Needs the user.*
7. "Change later" means reopening the project file, which is committed in the target repo next to the exports. *Needs the user.*
8. design-lead curates about 12 laws and about 8 font families. *Needs the user's approval.*
9. Every catalogue font is OFL-1.1 and on Fontsource. *Not yet verified*; a catalogue test enforces it.

## Risks

- **Biggest product risk: nobody consumes the exports.** tester, reviewer and ui are defined in ProjectStart, which this repo's sessions never edit. The last step writes a proposal for the user to apply there. Until then, the exports are inert.
- **Formats are hard to change once agents consume them.** `schemaVersion` is in all four files from v1, and the golden tests guard them.
- **Public repo.** Fixtures are fictional, real `*.dwproj.json` files are gitignored, screenshots go to the scratchpad, and the OFL licence ships with each font.
- **Nothing to sequence.** There is no migration and no scheduled job, so go-live order and `check-config` don't apply. If the app is ever hosted, Vercel Authentication comes before the repo is connected.
- **run-web.** `serve.ps1 -Mode prod` uses `next start`, which doesn't work with a static export, so v0.1 uses dev mode only. The `DEV_TODAY` option goes away (slice 1).
- **localStorage can be lost.** The downloaded project file is the durable copy, and the UI shows "unsaved since".

## Slices

Every slice and task of the project, in order. Status is never written here; it is derived from git (each commit ends with a `Slice: <id>` line).

| id | title | size |
|---|---|---|
| 0 | Project start: direction, DESIGN.md, plan and architecture | Project start |
| 1 | Contract first: scaffold, project file v1, exporters and contract tests C1–C6 | L |
| 2 | Variants: font catalogue, laws, plates, wizard shell, visual decisions, palettes | L |
| 3a | Carry-over fixes and the project profile (step 1) | L |
| 3b | UX principles picker (step 2) | L |
| 3c | Live preview (step 4 and the preview column) | L |
| 3d | Export (step 5) | L |
| 3e | Wrap-up of v0.1: keyboard e2e, AC1–AC11, architecture, ProjectStart proposal | M |
| 3f | Regenerate the Harbour fixture | S |
| 3g | Slices table, Slice commit line, team install and run-web merge | S |

## Plan (one commit per step; no building until the user says go)

*Project start:* fill in CLAUDE.md, design-lead finishes DESIGN.md, and architect writes `docs/ARCHITECTURE.md`.

*Slice 1, contract first (60 min):*

1. Scaffold `web/`: static export, strict TypeScript, Tailwind v4, shadcn themed from the chrome tokens, Vitest, Playwright, chrome fonts via `next/font/local`, `.gitignore`, and an empty shell screenshotted at 390 and 1280.
2. Project-file schema v1 (all fields), a parser that lists every error, autosave, and open/download.
3. The three exporters plus their schemas and contract tests C1–C6.

*Slice 2, variants (60 min):*

4. Font catalogue (woff2 files, OFL licences, manifest) and the laws content, with catalogue tests. design-lead drafts both, and the user approves them from side-by-side previews before they are committed.
5. Plate component: `--v-*` mapping, FontFace loader with loading and error states, and a leak test.
6. Wizard shell: rail, keyboard keys 1/2/3, J/K, Enter and E, and editing an earlier step.
7. Font pair, spacing, radius and density decisions.
8. Brand colour → 3 palettes that pass AA, with the contrast table.

*Slice 3 is split into 3a–3d, one new UI surface each, plus task 3e* (team rule, 2026-10-01: plan an L slice's build against 40 of its 60 minutes; design-lead review, polish, tester and reviewer take about 20). **Status: approved by the user on 2026-10-01; 3a started.** The user gives the go before each later slice. Every slice runs the same L flow: design-lead spec-lite (not for 3c, which the mock covers) → ui build → design-lead review (Must only, checked against the ACs below) → polish → commit → tester ∥ reviewer → push.

*Slice 3a: carry-over fixes + project profile (step 1). Build 40 min: fixes ~12, profile ~28.*

1. **Carried over from the slice 2 review** (reviewer Shoulds, deferred by the user on 2026-10-01):
   - Move the open-decision and progress helpers in `components/wizard/steps/visual/model.ts` (`SUB_KEYS`, `isDecided`, `firstOpen`, `nextOpenAfter`, `lastDecidedBefore`) into `domain/decisions.ts`, the one owner (ARCHITECTURE §4).
   - Use one decision order everywhere: `DECISIONS` lists density before palette, but the wizard shows palette first.
   - `fonts/loader.ts`: a failed face is cached forever. On failure, remove the face and the cache entry so a remount retries.
   - `PlateGrid`: the ResizeObserver reconnects on every render (the `options` dependency). Key it on the option ids.
   - Store: `decide()` recomputes `resolved` on any action, so editing notes replaces an opened file's snapshot without the "Stored values differ from the current algorithm: keep or recompute" notice (CONTRACTS §1). Add a `snapshotDiffers` state on open, and only recompute when a decision changes. The profile step needs this.
   - Nice: make `PlateGrid` generic over the id type (removes casts); move `ownsKey` into `wizard/use-shortcuts.ts`.
2. **Profile step (step 1):**
   - **Form fields:** name, product type and notes, as text fields. They validate on blur, show errors next to the field, and keep the input.
   - **Variants:** platform (desktop / mobile / both) and component library (shadcn / none) as 2–3 variants side by side, rendered on the generic sample. componentLibrary starts at "shadcn", shown selected.
   - **Rail:** the step 1 row becomes live; E and J/K reach it.
   - **Done when:**
     - the profile decisions stay open (null) until set
     - a reload restores them (AC10)
     - editing notes never changes `resolved`
     - an opened file whose snapshot differs shows "keep or recompute"
     - every clickable row is at least 44px, and step 1 works by keyboard alone (AC6, step 1)

*Slice 3b: UX principles picker (step 2). Build 40 min.*

0. **Carried over from the slice 3a review** (reviewer Shoulds):
   - `components/wizard/steps/profile/model.ts` re-derives which profile stops are decided. Use `isStopDecided` and count from `DECISIONS`.
   - The name-check sample is a lone, inert `role="radio"` plate. Give `Plate` a non-interactive mode.
   - `Rail.tsx` still works out a stop's step from its id string. Use `stepOfStop` from `domain/decisions.ts`.

3. **The laws as cards,** with the do/don't preview side by side as in `design/content-review/`. Choosing a law opens its params with the suggested values. Zero laws is an explicit choice (`principles: []`), never a default.
   - **Params:** parsed with `domain/parse-input.ts`, which accepts units and comma decimals. 0 is allowed only where min ≤ 0. The rendered rule sentence (from `domain/rules.ts`) updates live, and the rule count shows.
   - **Done when:**
     - principles stay null until decided
     - each card's rule sentence equals what the export writes
     - bad param input is reported next to the field and kept
     - step 2 works by keyboard alone (AC6, step 2)
     - every clickable row is at least 44px

*Slice 3c: live preview (step 4 and the preview column). Build 40 min; probably less, because the mock covers it.*

0. **Carried over from the slice 3b review** (reviewer Nice):
   - `RuleSentence` repeats `renderRule`'s template fill. Add a shared `ruleParts()` in `domain/rules.ts`. Also use `LAW_BY_ID` in `countLine`, and `fontPairLabel(DEMO_FONT)` instead of the hard-coded "Inter".
   - The module-level `memory` and the `drafts` state in `PrinciplesStep` survive opening another file, so an old draft can show instead of the stored value. Reset both on open.
   - Put the Must/Should badge in the checkbox's `aria-describedby`.

4. *(Scope, 2026-10-02: the preview reflects token decisions only. Platform and component library change no tokens, so selecting them leaves the preview unchanged; their own stops show the difference.)* **A generic `SampleScreen`** in `components/samples/`: it reads only `--v-*`, and only the product name comes from the profile. The preview column shows the focused variant on top of every earlier decision, in every step. Step 4 shows the same screen full size.
   - **Done when:**
     - AC4 (the leak test) and AC5 (the box doesn't change while fonts load) hold for the preview too
     - AC2 holds: fonts are local only
     - the preview updates within 100 ms of focusing a variant
     - no overflow at 390

*Slice 3d: export (step 5) only. Build 40 min.*

5. **The export step:**
   - Open decisions are listed by name, each with a way back to it (AC8).
   - Each file has its own download button, plus "Download all": `<slug>.dwproj.json`, `DESIGN.md`, `tokens.json`, `ux-rules.yaml`.
   - A hint says to commit the project file to the target repo's `design/` folder.
   - `markDownloaded()` is recorded.
   - **Done when:** AC8, AC9 and AC10 hold at the UI level; step 5 works by keyboard alone; every clickable row is at least 44px.

*Task 3e: wrap-up of v0.1. Size **M**, 30 min (M flow: build → reviewer; no security, because no data or access changes).*

6. **A keyboard-only e2e test** through the whole wizard, profile to export, at 1280 and 390 (AC6), plus a full AC1–AC11 run.
7. **Docs:** update `docs/ARCHITECTURE.md`. Write the ProjectStart consumer proposal and a LESSONS row (text only, for `C:\dev\waan\teams`): how ui, tester and reviewer read DESIGN.md Part B, tokens.json and ux-rules.yaml.
   - **Done when:** AC1–AC11 all hold in one run, and the docs match the code.

*Task 3f: regenerate the Harbour fixture. Size **S**, after 3e (user decision 2026-10-02).* Harbour's stored colours were written by hand in slice 1, before the palette algorithm, so `?fixture=harbour` always shows "Stored values differ" and every edge fixture inherits it. Regenerate `resolved` with the current algorithm, run `pnpm golden`, update the hex values in CONTRACTS, and give the 3a/3b tests that rely on the difference their own fixture with deliberately differing stored values (like the `snapshot-differs` dev fixture). The `ready` dev fixture can then go.

## Acceptance criteria (tester)

1. `pnpm build` produces a static export, and lint, typecheck, test and e2e all pass.
2. A full e2e run makes **0 requests to hosts other than localhost**, and every variant font still renders.
3. Every decision shows 3 plates side by side at 1280px. At 390px they stack and `shoot.mjs` exits 0 (no overflow). *Scope (2026-10-02):* this applies to decisions that have variants (visual system, platform). Laws are independent yes/no choices, not variants. Step 2 shows each law's do/don't pair side by side instead (design/specs/step-2-principles.md). The component library shows 2 panels (decision 2026-10-01).
4. Changing a variant's tokens leaves the chrome's computed font-family and colours unchanged, and sample CSS reads only `--v-*`.
5. A plate's bounding box is identical before and after its font loads. When a font file returns 404, the plate shows "Font failed" and Choose is disabled.
6. Every clickable row is at least 44px at both widths. The whole wizard can be completed by keyboard only, through to export.
7. Every offered palette passes AA for 50 seeded brand colours (including `#FFFF00`, `#000`, `#FFF` and `#777`). Recomputing a palette after a brand-colour input takes under 100 ms.
8. Export is blocked while any decision is `null`, and every open decision is listed by name. No defaults are filled in.
9. After export, changing radius from 8 to 0 and exporting again changes only the radius lines. 0 is exported as 0.
10. Reopening a saved project file restores every decision and produces byte-identical exports. An invalid file lists every problem and leaves the current state unchanged.
11. Contract tests C1–C6 pass.

## Agents

- **Each slice runs the L flow:** design-lead spec (only for the screens the mock doesn't cover: profile, laws, export) → ui build → design-lead review (Must only) → commit → tester ∥ reviewer.
- **Skipped: the separate data check and migration.** There is no DB; step 2 replaces them.
- **Skipped: security.** There is no auth, server, secrets or personal data, and tester verifies zero external requests.

## Amendments from architect (2026-10-01)

Details are in `docs/ARCHITECTURE.md` and `docs/CONTRACTS.md`. These amendments override the sections above.

- **11 colour roles, not 10.** `on-accent` is added because shadcn's `--primary-foreground` needs it and the mock checks it. C3 checks for 11.
- **Ratios round down** to 2 decimals for display, so a failing ratio can never show as a pass. The mock's 4.73 is exactly 4.728, so it shows as 4.72.
- **tokens.json `schemaVersion`** goes under the root `$extensions`, because a plain key would be read as a token. The DTCG 2025.10 shapes were pinned from memory, so verify them against the published spec in slice 1, step 3, before freezing the goldens.
- **Export:** one button per file plus "Download all", because 4 downloads from one click triggers Chromium's multiple-downloads prompt.
- **Slice 1 repo changes:**
  - `.gitattributes` with `eol=lf` for fixtures and goldens (Windows CRLF breaks byte equality)
  - `*.dwproj.json` in `.gitignore`
  - remove `DEV_TODAY` and the stale Supabase line from `run-web`'s SKILL.md
- **Dev fixture flag** `?fixture=empty|harbour|stale|invalid-many` (required by CLAUDE.md, missing above).
- **The `resolved` snapshot** also stores the rendered rules and the font metadata. `visual.colorOverrides` exists from v1 (empty `{}` if "Apply fix" is cut).
- **Planned dev-only dependencies:** `ajv` and `yaml`, used only by the C3 and C5 tests.

## Decisions (user, 2026-10-01)

These answer the open questions and override anything above that says otherwise.

1. **Light theme only in v0.1.** "Deep" stays as a project palette option: it is the project's palette, not the wizard's theme.
2. **Default target is Next.js + Tailwind v4 + shadcn/ui,** but tokens.json stays stack-agnostic. The shadcn mapping is an **optional export layer**, chosen with `profile.componentLibrary` (`"shadcn"` or `"none"`), because some projects use Tailwind without shadcn.
3. **"Apply fix" is cut.** Only palettes that pass are offered, and the ratios are shown.
4. **Generic sample screen,** with only the product name taken from the profile.
5. **The project file is committed in the target repo's `design/` folder.**
6. **The user approves the lists of laws and fonts.** design-lead presents them **as side-by-side previews** where possible (slice 2, step 4).
7. **Diff pins are cut from v0.1.** DESIGN.md marks them "planned v0.2"; they are no longer a current signature element.

**Status:** go given for slice 1.
