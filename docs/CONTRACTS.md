# Contracts – Design Wizard v0.1

> **Status:** proposed 2026-10-01 by architect, not built. These formats are consumed by other agents, so changing any of them later means bumping `schemaVersion` and updating the goldens in the same commit. Types are mirrored once in `web/src/contracts/` (see `docs/ARCHITECTURE.md`). Every example here is fictional and illustrative; the committed golden files are the truth.

## 0. Rules for all four files

- UTF-8 without BOM, LF only, exactly one trailing newline.
- No timestamps, app version, machine paths or random ids. The same project file always gives the same bytes.
- Colours are `#RRGGBB`, upper case, with no alpha. Parsers accept either case and normalise to upper case.
- Numbers use the JSON shortest form (`8`, never `8.0`), and rem values have at most 4 decimals. CSS lengths always carry a unit (`0px`, never a bare `0`), because `calc()` needs it.
- Key order is exactly as documented here. Serializers build objects in this order; they never sort keys and never pass through the parse order. Numeric keys (`space.1` … `space.16`) are ascending.
- **Versioning:** each file carries `schemaVersion: 1`. The only change that doesn't need a bump is a new optional key inside `$extensions`.
- **Download names:** `<slug>.dwproj.json`, `DESIGN.md`, `tokens.json`, `ux-rules.yaml`. To build `slug`: transliterate (æ→ae, ø→o, å→a, ß→ss, œ→oe, þ→th, đ→d, ł→l), apply NFKD and drop combining marks, lower-case, delete `'"’`, turn every other run of non-`[a-z0-9]` into `-`, trim `-` and cut at 48 characters. If the result is empty, use `project`. For example, `Nørrebro: "Ida's" #1` → `norrebro-idas-1`.

---

## 1. Project file v1 (`*.dwproj.json`)

**Text lengths ("chars") are UTF-16 code units, i.e. JavaScript `length`** (decided 2026-10-01: an internal tool, so emoji edge cases don't matter). The parser, the profile form and its counter all count this way.

**`null` means the decision is open.** Export is blocked while any decision is `null`. A value is never `0` or `""` as a stand-in for missing.

| Field | Type | `null` | Is 0 / empty valid? | Rule |
|---|---|---|---|---|
| `schemaVersion` | integer | never | no | Must be `1` |
| `format` | `"design-wizard-project"` | never | – | Rejects other JSON (e.g. a tokens.json opened by mistake) |
| `profile.name` | string or null | open | `""` invalid | 1–80 chars after trim, one line (no control characters) |
| `profile.productType` | string or null | open | `""` invalid | Free text, 1–60 chars after trim, one line. Nothing branches on it in v1 |
| `profile.platform` | `"desktop"`, `"mobile"`, `"both"` or null | open | – | |
| `profile.notes` | string | never | `""` valid | ≤ 2000 chars. Not a decision |
| `profile.componentLibrary` | `"shadcn"` or `"none"` | never | – | New projects start at `"shadcn"`, the user's default target (Next.js + Tailwind v4 + shadcn/ui), shown selected and changeable in the profile step. `"none"` (Tailwind or plain CSS without shadcn) leaves out the shadcn layer and exports the role-named CSS block (§4.2a). tokens.json is the same either way |
| `principles` | array or null | open | **`[]` valid** (decided: zero laws) | No duplicate `lawId`. The serializer writes principles and `resolved.rules` in catalogue (content) order, whatever order a file uses |
| `principles[].lawId` | string | never | – | Must be a known id in `content/laws` |
| `principles[].params` | object of string → number | never | per param `min` (§5) | Keys exactly equal the law's params |
| `visual.fontPair` | string or null | open | – | Must be a known id in `content/font-pairs` |
| `visual.spacingBase` | integer px or null | open | **0 invalid** | 2–16 |
| `visual.radius` | integer px or null | open | **0 valid** | 0–32 |
| `visual.density` | `"compact"`, `"balanced"`, `"airy"` or null | open | – | |
| `visual.brandHex` | `#RRGGBB` or null | open | `#000000` valid | Input only. The used colour is `resolved.color.light.accent` |
| `visual.paletteVariant` | `"quiet"`, `"tinted"`, `"deep"` or null | open | – | Ids and labels owned by `domain/color/palette.ts` |
| `visual.colorOverrides` | object of role → `#RRGGBB` | never | **`{}` valid** | Always `{}` in v0.1, because "Apply fix" is cut and only passing palettes are offered. The field stays so v0.2 can add it without changing the format. Keys must be roles (§2) |
| `resolved` | object or null | while any decision is open | – | Computed by `domain/tokens/resolve.ts`; see the next table |

### `resolved` (stored snapshot, so re-exports are byte-stable)

| Field | Type | Is 0 valid? | Rule |
|---|---|---|---|
| `color.light` | object with exactly the 11 roles of §2, in that order → `#RRGGBB` | – | Every pair in §4.3 passes. Overrides are already applied |
| `color.dark` | `null` | – | Always `null` in v1 (decided: light only in v0.1). The `deep` palette is a project palette option, not a dark theme |
| `font.display`, `font.text` | FontRef | – | Both are present even if they name the same family |
| `fontSize` | `xs, sm, base, lg, xl, 2xl, 3xl` → rem number | no | Strictly ascending, 0.5–6 |
| `lineHeight` | `text, display` → number | no | 1.0–2.0 |
| `space` | `"1","2","3","4","6","8","12","16"` → px integer | no | Equals key × `visual.spacingBase` |
| `radius` | px integer | **yes** | Equals `visual.radius` |
| `rules` | array of Rule (the exact §3 rule shape) | `[]` valid | One per principle, in content order |

**FontRef** = `{ catalogueId, family, generic, fontsource, subset, weights, style, license, copyright }`. `weights` is ascending integers in 100–900 and are the weights the pair uses for that role. `style` is `"normal"`, `subset` is `"latin"` and `license` is `"OFL-1.1"`; these are the only values accepted in v1.

**Consistency.** Fields that are copied from decisions (`radius`, `font.*.catalogueId`, `rules[].law` and params) must match the decisions, otherwise the parser reports an `inconsistent` error. Fields computed by an algorithm (palette, scales) may differ from a fresh computation. The stored values then win, and the UI shows "Stored values differ from the current algorithm: keep or recompute". A `resolved` that is non-null while any decision is `null` is an error. If every decision is set and `resolved` is `null`, the store resolves it and marks the file as changed.

### Example (one principle, abbreviated `rules`)

```json
{
  "schemaVersion": 1,
  "format": "design-wizard-project",
  "profile": { "name": "Harbour", "productType": "Clinic booking", "platform": "desktop", "notes": "", "componentLibrary": "shadcn" },
  "principles": [ { "lawId": "fitts", "params": { "minPx": 44 } } ],
  "visual": {
    "fontPair": "sora-inter", "spacingBase": 4, "radius": 8, "density": "compact",
    "brandHex": "#0F766E", "paletteVariant": "tinted", "colorOverrides": {}
  },
  "resolved": {
    "color": {
      "light": { "bg": "#E8FAF8", "surface": "#FFFFFF", "border": "#699691", "text": "#022522", "text-muted": "#4E716C",
                 "accent": "#0F766E", "on-accent": "#FFFFFF", "positive": "#…", "warning": "#…", "negative": "#…", "focus": "#0F766E" },
      "dark": null
    },
    "font": {
      "display": { "catalogueId": "sora", "family": "Sora", "generic": "sans-serif", "fontsource": "@fontsource/sora", "subset": "latin",
                   "weights": [600, 700], "style": "normal", "license": "OFL-1.1", "copyright": "Copyright 2019 The Sora Project Authors (https://github.com/sora-xor/sora-font)" },
      "text": { "catalogueId": "inter", "…": "…" }
    },
    "fontSize": { "xs": 0.6875, "sm": 0.75, "base": 0.8125, "lg": 0.9375, "xl": 1.25, "2xl": 1.5625, "3xl": 2 },
    "lineHeight": { "text": 1.5, "display": 1.2 },
    "space": { "1": 4, "2": 8, "3": 12, "4": 16, "6": 24, "8": 32, "12": 48, "16": 64 },
    "radius": 8,
    "rules": [ { "id": "fitts.target-size", "law": "fitts", "…": "see §3" } ]
  }
}
```

The real serializer writes one key per line with a 2-space indent; the compact layout above is for this page only.

### Parser errors: `parse(text) → { ok: true, project } | { ok: false, errors: ParseError[] }`

- `ParseError = { path, code, message }`.
  - `path` uses dot and index notation, e.g. `principles[2].params.minPx`, or `""` for the whole file.
  - `message` is en-GB and says what is wrong and what to do, e.g. "radius must be a whole number of px from 0 to 32, or null if undecided. Found -2."
- `code` is one of a closed list: `json-syntax` (includes line:col), `not-object`, `format`, `schema-version`, `missing-key`, `unknown-key`, `type`, `not-integer`, `range`, `empty`, `too-long`, `enum`, `hex`, `unknown-id`, `duplicate`, `inconsistent`.
- **Every problem is listed at once**, in documented field order (depth first, arrays by index). The parser never throws on bad input and never coerces (`"8"` is a `type` error).
  - The only early stops: `json-syntax`, `not-object`, a wrong `format` or a wrong `schemaVersion`. After one of these, the remaining fields can't be interpreted, so only that error is returned.
- An invalid file leaves the store unchanged. The errors are listed in the UI.
- **localStorage:** the key `design-wizard:v1:project` holds `{ "savedAt": ISO, "downloadedAt": ISO or null, "file": "<canonical project file text>" }`. On restore, `file` goes through the same parser. If it can't be parsed, the text is moved to `design-wizard:v1:quarantine` and nothing is lost.
  - `savedAt` is when the file's text last changed: an action that leaves the canonical text identical does not move it.
  - `downloadedAt` is the last time a file on disk matched the project: a download of the project file (not of DESIGN.md, tokens.json or ux-rules.yaml), or a successful open (since 3d; design/specs/step-5-export.md §10). `savedAt` later than `downloadedAt` means the browser holds changes that no file has.
- **Form input is not file input:** `domain/parse-input.ts` accepts `8`, `8px`, `8,0`, `8.0` and hex with or without `#` in either case, and rejects junk next to the field.

---

## 2. tokens.json

**Followed: W3C DTCG Design Tokens Format Module 2025.10 and its Color Module 2025.10** (final Community Group reports, October 2025). Verified against the published spec on 2026-10-01 (slice 1, step 3): colour `{colorSpace, components, alpha, hex}` with `hex` in 6-digit CSS notation, dimension `{value, unit}`, fontFamily as a string or an array of names, number as a JSON number, and `$description`/`$extensions` (reverse-domain keys) allowed on groups. The JSON Schema is `web/src/contracts/schemas/tokens.v1.schema.json`.

| Token type | `$value` shape used |
|---|---|
| `color` | `{ "colorSpace": "srgb", "components": [r, g, b], "alpha": 1, "hex": "#RRGGBB" }`. Each component is `byte/255` rounded to 4 decimals. `hex` is always present and is authoritative for consumers. |
| `dimension` | `{ "value": <number>, "unit": "px" }` or `"rem"` (font sizes are rem, which respects text zoom; space and radius are px) |
| `fontFamily` | `["<Family>", "<generic>"]` |
| `number` | a bare number (line heights) |

- `$type` is repeated on every token, with no group inheritance, so consumers stay simple.
- v1 emits **no aliases**; every `$value` is literal. C3 still resolves any `{a.b}` generically.
- `schemaVersion` can't be a bare key in DTCG (it would be read as a token), so it lives in the root `$extensions`.
- Extension namespace: `com.github.mikkelstaehr.design-wizard` (written `NS` below).

| Path (in this order) | `$type` | Source in `resolved` |
|---|---|---|
| `color.bg`, `.surface`, `.border`, `.text`, `.text-muted`, `.accent`, `.on-accent`, `.positive`, `.warning`, `.negative`, `.focus` | color | `color.light` |
| `font.display`, `font.text` (+ `$extensions[NS]` metadata) | fontFamily | `font` |
| `font-size.xs` … `font-size.3xl` | dimension (rem) | `fontSize` |
| `line-height.text`, `line-height.display` | number | `lineHeight` |
| `radius.base` | dimension (px) | `radius` |
| `space.1`, `.2`, `.3`, `.4`, `.6`, `.8`, `.12`, `.16` | dimension (px) | `space` |

The 11 colour roles are the 10 in `design/DESIGN.template.md` **plus `on-accent`**. Button labels and shadcn's `--primary-foreground` need it, and the mock's "Button label" row checks it. C3's "every role exactly once" uses this list of 11.

```json
{
  "$description": "Design tokens for Harbour. Generated by Stencil.",
  "$extensions": { "com.github.mikkelstaehr.design-wizard": { "schemaVersion": 1, "project": "Harbour", "theme": "light" } },
  "color": {
    "accent": { "$type": "color", "$value": { "colorSpace": "srgb", "components": [0.0588, 0.4627, 0.4314], "alpha": 1, "hex": "#0F766E" } }
  },
  "font": {
    "display": {
      "$type": "fontFamily", "$value": ["Sora", "sans-serif"],
      "$extensions": { "com.github.mikkelstaehr.design-wizard": {
        "catalogueId": "sora", "fontsource": "@fontsource/sora", "weights": [600, 700], "style": "normal",
        "subset": "latin", "license": "OFL-1.1", "copyright": "Copyright 2019 The Sora Project Authors (https://github.com/sora-xor/sora-font)" } }
    }
  },
  "font-size": { "base": { "$type": "dimension", "$value": { "value": 0.8125, "unit": "rem" } } },
  "line-height": { "text": { "$type": "number", "$value": 1.5 } },
  "radius": { "base": { "$type": "dimension", "$value": { "value": 0, "unit": "px" } } },
  "space": { "1": { "$type": "dimension", "$value": { "value": 4, "unit": "px" } } }
}
```

(The example is abbreviated: the real file has every token in the table above.) Dark (not in v0.1) would be additive: `$extensions[NS].dark` on each `color.*` token.

---

## 3. ux-rules.yaml v1

- YAML 1.2, written by our own emitter.
- Every string is double-quoted with JSON escaping, which is valid YAML 1.2. Non-ASCII stays literal UTF-8.
- Numbers are bare. `viewports` uses flow style. An empty map is `{}` and an empty list is `[]`. The indent is 2 spaces.

| Field | Type | Rule |
|---|---|---|
| `schemaVersion` | integer | `1` |
| `project` | string | `profile.name` |
| `rules` | list | `[]` valid (zero laws). Content order |
| `rules[].id` | string | `<lawId>.<ruleKey>`, unique, stable |
| `rules[].law` | string | Law id |
| `rules[].when` | string | One sentence: when the rule applies |
| `rules[].rule` | string | One imperative sentence with the params filled in |
| `rules[].severity` | `"must"` or `"should"` | must = tester fails / reviewer blocks; should = reported |
| `rules[].check.kind` | closed list below | |
| `rules[].check.selector` | string, or `null` for `manual` only | CSS selector of the elements checked |
| `rules[].check.params` | map of string → **number** | Exactly the keys for that kind; `{}` for `manual` |
| `rules[].check.viewports` | list of integer px | Ascending, unique, 320–2560. Non-empty for automated kinds; may be `[]` for `manual` |
| `rules[].check.question` | string | **`manual` only**, required |

| `kind` | Params | Passes when |
|---|---|---|
| `min-target-size` | `minPx` (integer ≥ 1) | Every visible match is at least `minPx` × `minPx` |
| `max-count` | `max` (integer ≥ 0; **0 valid**, meaning "none allowed") | Visible matches per screen ≤ `max` |
| `contrast` | `minRatio` (number ≥ 1, e.g. 4.5 or 3) | Each match's text colour against its effective background is ≥ `minRatio` (WCAG 2.x) |
| `response-time` | `maxMs` (integer ≥ 1) | From activating the match (click or Enter) to the first visual change ≤ `maxMs` |
| `focus-visible` | `minOutlinePx` (number ≥ 1) | Each match shows an outline or ring ≥ `minOutlinePx` when focused by keyboard |
| `manual` | none (`{}`) | reviewer answers `question` with yes |

**How a `manual` question is phrased:**
- It is one yes/no question, where **yes means pass**.
- It names where to look (which screen, flow or element).
- It is answerable by looking at the running app, not the code.
- It is ≤ 200 characters and ends with `?`. It contains no "and/or" compound and no opinion words ("nice", "clean").

```yaml
schemaVersion: 1
project: "Harbour"
rules:
  - id: "fitts.target-size"
    law: "fitts"
    when: "Any screen with controls a user clicks or taps."
    rule: "Make every interactive element at least 44 by 44 px."
    severity: "must"
    check:
      kind: "min-target-size"
      selector: "a[href], button, input, select, textarea, [role=button], [tabindex]:not([tabindex='-1'])"
      params:
        minPx: 44
      viewports: [390, 1280]
  - id: "peak-end.closing-screen"
    law: "peak-end"
    when: "Flows with a clear end, such as booking or sign-up."
    rule: "End every main flow on a screen that confirms the result and offers one next step."
    severity: "should"
    check:
      kind: "manual"
      selector: null
      params: {}
      viewports: [390, 1280]
      question: "At the end of the main flow, does the last screen say in plain words what happened and offer one next step?"
```

---

## 4. Exported DESIGN.md (Part B)

The exported file is meant to be merged into the target repo's DESIGN.md. It uses the template's exact headings, in the template's order.

- **Header:**
  - `# Design system – <name, markdown-escaped>`
  - a provenance quote: "Part B exported by Design Wizard from `design/<slug>.dwproj.json` (project file schema v1). Reopen that file in Design Wizard to change a decision. Part A comes from the ProjectStart template and is not included. UX rules: `ux-rules.yaml` (N rules)."
- **Escaping:** markdown escaping is owned by `lib/md-escape.ts`, which escapes `\ ` `` ` `` `* _ [ ] < > |` and a leading `#`.
- **Open marker:** every open item is exactly the line `> **open: design-lead** – not decided in Stencil.` Agents grep for `open: design-lead`.

### 4.1 Sections

| Section | Filled by the wizard | Marked open: design-lead |
|---|---|---|
| Product profile | Product type, platform, notes | Primary users, locale, references, pattern packs |
| Personality | – | whole section |
| Signature element(s) | – | whole section |
| Type | Display and Text families + weights, scale (px and rem), line heights, "Loading" (`next/font/local` from vendored Fontsource files; `next/font/google` named only as an alternative) | Numerals |
| Colour | 11-role table (hex), contrast table (§4.3), then one CSS block: the shadcn table + shadcn CSS block (§4.2) when `profile.componentLibrary` is `"shadcn"`, otherwise the role-named CSS block (§4.2a). The line "Dark theme: not defined in v0.1." | Accent usage |
| Shape & depth | Radius (`0px` written as such) | Borders vs. shadows, elevation levels |
| Space & density | Spacing base + scale, density | Max content width |
| Motion | – | whole section |
| Iconography & imagery | – | whole section |
| Project rules | – | whole section |

### 4.2 Role → shadcn variable (optional layer, one table in `export/shadcn-map.ts`)

This section is exported only when `profile.componentLibrary` is `"shadcn"`. tokens.json stays stack-agnostic either way.

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
| `--accent` | `surface` | shadcn's hover/highlight background, **not** the brand accent |
| `--accent-foreground` | `text` | |
| `--destructive` | `negative` | shadcn v4's destructive button hard-codes white text. That case is marked open: design-lead |
| `--border`, `--input` | `border` | |
| `--ring` | `focus` | |
| `--sidebar`, `-foreground`, `-primary`, `-primary-foreground`, `-accent`, `-accent-foreground`, `-border`, `-ring` | `bg`, `text`, `accent`, `on-accent`, `surface`, `text`, `border`, `focus` | |
| `--chart-1` … `--chart-5` | – | open: design-lead (no data-visualisation palette in v0.1) |
| `--positive`, `--warning` | `positive`, `warning` | Not in shadcn; added |
| `--radius` | `radius.base` | |

The mapping reuses shadcn's names on purpose. Part B's `--accent` and shadcn's `--accent` mean different things, so the CSS block declares **only shadcn names** (plus `--positive` and `--warning`). It never declares the Part B role names, and a trailing comment on each line names the role.

**CSS block:** one fenced `css` block. Its text equals `shadcnCss(tokensJson)` exactly (C4), and every token except the font metadata appears in it.

```css
:root {
  --background: #E8FAF8; /* color.bg */
  --primary: #0F766E; /* color.accent */
  /* … every row of the table above, in table order … */
  --radius: 8px; /* radius.base */
}
@theme inline {
  --color-positive: var(--positive);
  --color-warning: var(--warning);
  --font-display: var(--font-display-face), sans-serif; /* font.display: Sora */
  --font-sans: var(--font-text-face), sans-serif; /* font.text: Inter */
  --text-xs: 0.6875rem; /* font-size.xs */
  --leading-text: 1.5; /* line-height.text */
  --spacing: 4px; /* space.1; Tailwind multiplies, so p-4 = space.4 */
}
```

### 4.2a Role-named CSS block (when `profile.componentLibrary` is `"none"`)

This is one fenced `css` block. Its text equals `roleCss(tokensJson)` from `export/css-vars.ts` exactly (C4).
- **`:root`** declares the 11 Part B roles under their own names (`--bg`, `--surface`, `--border`, `--text`, `--text-muted`, `--accent`, `--on-accent`, `--positive`, `--warning`, `--negative`, `--focus`) plus `--radius`. Each line has a trailing comment naming its token.
- **`@theme inline`** maps them for Tailwind v4 (`--color-bg: var(--bg);` …). It carries the same font, font-size, line-height and spacing lines as §4.2.
- There is no shadcn table, and no shadcn names are declared.

### 4.3 Contrast table

- **Pairs** are owned by `domain/color/pairs.ts`. Text pairs need ≥ 4.5 and non-text pairs ≥ 3:
  - `text / bg`, `text / surface`, `text-muted / bg`, `text-muted / surface`
  - `on-accent / accent`, `accent / bg` (links)
  - `positive / bg`, `warning / bg`, `negative / bg`
  - `border / bg` ≥ 3, `border / surface` ≥ 3, `focus / bg` ≥ 3
- **Ratio:** WCAG 2.x relative luminance, with the sRGB linearisation threshold **0.04045**. PASS is decided on the unrounded value. The displayed ratio is **floored** to 2 decimals, so a value can never be rounded up into a pass: 4.478 shows as 4.47.
- **Row format:** `| <fg> / <bg> | <ratio> : 1 | ≥ <min> | PASS |`, e.g. `| text-muted / bg | 4.72 : 1 | ≥ 4.5 | PASS |`. FAIL rows can't occur in an export, because the export gate blocks on any failing pair.

---

## 5. Content shapes (`web/src/content/`, typed, changed by commit)

**Law entry** (`laws.ts`, about 12 entries, drafted by design-lead and approved by the user)

| Field | Type | Rule |
|---|---|---|
| `id` | kebab string | Unique and stable forever (it is stored in project files) |
| `name` | string | e.g. "Fitts's law" |
| `summary` | string | One sentence saying what the law says |
| `when` | string | One sentence saying when it applies. Shown in the picker and copied to `rule.when` |
| `rule.key` | kebab string | The rule id is `<id>.<key>` |
| `rule.template` | string | An imperative sentence. Each `{paramKey}` is filled from the params: up to 2 decimals with trailing zeros trimmed, then the unit as `44px`, `400 ms`, `4.5:1`, or a bare number for `count` (owned by `domain/rules.ts#formatParam`) |
| `rule.severity` | `"must"` or `"should"` | |
| `rule.check` | `{ kind, selector, viewports, question? }` | `question` is required if and only if `kind` is `manual`. Check params are the law params |
| `params` | array of `{ key, label, unit, integer, min, max, suggested }` | `unit` is `px`, `ms`, `count` or `ratio`. **0 is valid only if `min` ≤ 0.** `suggested` pre-fills the visible field; the user's value is stored when they choose the law. `manual` laws have `[]` |
| `source` | string | Citation text (not a link that is fetched) |

The catalogue test checks:
- ids are unique;
- every `{x}` in the template is a param, and every param appears in the template;
- `suggested` is within `min`–`max`;
- the params match the kind's param set (§3).

**Font catalogue entry** (`fonts.ts`)

| Field | Type | Rule |
|---|---|---|
| `id` | kebab string | Unique, equals the folder name under `web/public/fonts/` |
| `family` | string | The published name, e.g. "IBM Plex Mono" |
| `generic` | `"sans-serif"`, `"serif"` or `"monospace"` | The fallback in tokens |
| `fontsource` | string | The npm package, e.g. `@fontsource/sora` |
| `subset` | `"latin"` | |
| `files` | array of `{ weight, style: "normal", file }` | `file` is a name only. The loader builds `/fonts/<id>/<file>`. **The weights are derived from `files`** and are not stored twice |
| `license` | `"OFL-1.1"` | The only value accepted (enforced by the catalogue test) |
| `copyright` | string | Equals the first line of that family's `OFL.txt` |
| `roles` | array containing `"display"` and/or `"text"` | The pairing role(s) the family may take |

**Font pair entry** (`font-pairs.ts`): `{ id, display: { font, weights }, text: { font, weights }, note }`. Each weight must exist in that font's `files`. A single-family pair uses the same `font` in both roles (e.g. `inter-solo`).

---

## 6. Plate variables `--v-*` (owned by `domain/tokens/plate-vars.ts`)

- The plate root (`[data-v-root]`) sets these inline and also sets `font-family`, `color`, `background` and `line-height` explicitly from them. Sample CSS may read only these.

| Group | Variables |
|---|---|
| Colour | `--v-bg`, `--v-surface`, `--v-border`, `--v-text`, `--v-text-muted`, `--v-accent`, `--v-on-accent`, `--v-positive`, `--v-warning`, `--v-negative`, `--v-focus` |
| Font | `--v-font-display`, `--v-font-text` (e.g. `"dwv-sora", sans-serif`), `--v-weight-display`, `--v-weight-text`, `--v-weight-strong` |
| Type scale | `--v-fs-xs` … `--v-fs-3xl`, `--v-lh-text`, `--v-lh-display` |
| Space, shape | `--v-space-1` … `--v-space-16` (the same keys as tokens), `--v-radius` |

The mock's `--vbg`, `--vsurf`, `--vtext`, `--vmuted`, `--vbrand`, `--von`, `--vborder` and `--vr` are replaced by the names above. The mock's `--vchip` has no role, so the sample's "Confirmed" chip uses `--v-positive`.

---

## 7. Fixtures for contract tests C1–C6 (all fictional)

The project fixtures live in `web/fixtures/`, and their goldens in `web/tests/contract/golden/<fixture>/{DESIGN.md,tokens.json,ux-rules.yaml}`. Fixtures use `.project.json`, so the `*.dwproj.json` gitignore never hides them.

| Fixture | Contains | Used by |
|---|---|---|
| `harbour.project.json` | A fictional clinic-booking product called "Harbour". Brand `#0F766E`, pair `sora-inter`, spacing 4, radius 8, compact, `tinted`. Four laws covering `min-target-size`, `max-count`, `contrast` and one `manual`. `resolved` is complete | C1 golden, C3–C6, `?fixture=harbour` |
| `edge-radius-0.project.json` | Harbour with radius 0 → `radius.base` 0 px, `--radius: 0px`, "Radius: 0px" | C2 golden |
| `edge-yellow.project.json` | Brand `#FFFF00` → all three palettes pass, `accent` is shifted from the brand, `on-accent` is dark | C2 golden |
| `edge-single-family.project.json` | Pair `inter-solo` (display = text = Inter, different weights) | C2 golden, C3 |
| `edge-name.project.json` | Name `Nørrebro: "Ida's" #1` → slug `norrebro-idas-1`, plus JSON, YAML and markdown escaping | C2 golden |
| `edge-no-shadcn.project.json` | Harbour with `componentLibrary: "none"`: no shadcn table, a role-named CSS block (§4.2a), and tokens.json byte-equal to Harbour's | C2 golden, C4 |
| `edge-zero-laws.project.json` | `principles: []` → `rules: []` and "0 rules" | C2 golden, C5 |
| `invalid-many.project.json` + `.errors.json` | At least 8 problems at once: radius `-2`, brandHex `"teal"`, spacingBase `0`, density `"dense"`, unknown lawId `"fits"`, unknown fontPair, extra key `raduis`, `resolved` set while `paletteVariant` is `null` (density is `"dense"`, so it cannot also be null). The `.errors.json` file is the exact ordered list of `{ path, code }` | C6 |
| `invalid-syntax.txt`, `invalid-version.project.json` | Truncated JSON (one `json-syntax` error with line:col); `schemaVersion: 2` (one `schema-version` error) | C6 |

| Test | Asserts |
|---|---|
| **C1** | `exportAll(harbour)` is byte-equal to its goldens |
| **C2** | Each edge fixture is byte-equal to its goldens |
| **C3** | Each golden tokens.json passes `contracts/schemas/tokens.v1.schema.json`. Every alias resolves. Each of the 11 roles and each `font.*`, `font-size.*`, `line-height.*`, `radius.base` and `space.*` token appears exactly once |
| **C4** | The CSS block in each golden DESIGN.md equals `shadcnCss(tokens.json)` when `componentLibrary` is `"shadcn"`, or `roleCss(tokens.json)` when it is `"none"`. Each contrast row's ratio equals the floored ratio recomputed from tokens.json. The `contrast.ts` anchors hold (`#000000`/`#FFFFFF` = 21.00, `#777777`/`#FFFFFF` = 4.47) |
| **C5** | Each golden ux-rules.yaml passes `ux-rules.v1.schema.json`. Ids are unique, `kind` is in the list, params are numbers matching the kind, `manual` rules have a `question` and the others a selector |
| **C6** | For every valid fixture, `serialize(parse(bytes)) === bytes`. `invalid-many` returns exactly its `.errors.json`. The invalid fixtures leave the store state unchanged |
