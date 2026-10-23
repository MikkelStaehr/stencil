# Spec-lite: the shell into labs (slice 5b)

Look: DESIGN.md Part B, "Shell" and signature element 2. Pattern: `design/labs/lab-pattern.md`. 5b moves the wizard into the lab shell **on the path only**. Every existing view keeps its behaviour; only the framing, the order and the rail change.

## 1. Question and primary action
"Where am I on the path, and what do I decide here?" The one primary per stop stays exactly today's (Choose `<label>` / Choose a variant, Continue with n rules, Download all / Go to open decision). It sits in the **decision bar** under the plates. Stop 4 (new) gets "Continue to palette".

## 2. Flow and order (domain/decisions.ts stays the one owner)
12 stops, J/K in this order. Ids stay, so `?step=` and its aliases keep working. One stop is new: `visual.brandHex`.

| n | Lab | Stop id | Rail label | h1 |
|---|---|---|---|---|
| 1 | 01 Profile | profile.identity | Name & type | Name and product type |
| 2 | | profile.platform | Platform | Platform |
| 3 | | profile.library | Component library | Component library |
| 4 | 02 Color | **visual.brandHex** (new) | Brand colour | Brand colour |
| 5 | | visual.paletteVariant | Palette | Palette (was "Brand colour → palette") |
| 6 | 03 Type | visual.fontPair | Font pair | Font pair |
| 7 | 04 Space & shape | visual.spacingBase | Spacing | Spacing |
| 8 | | visual.radius | Radius | Radius |
| 9 | | visual.density | Density | Density |
| 10 | 05 Laws | principles | Laws | UX principles |
| 11 | 06 Preview | preview | Sample screen | Live preview |
| 12 | 07 Export | export | Files | Export |

Every other h1 and lede stays as it is today. Question-style h1s ("Pick Harbour's palette") come with each lab in 5c to 5e.
- `DECISIONS` follows this order. `visual.brandHex` moves to stop `visual.brandHex`.
- A click on a stop opens it. A click on a lab name, or `?lab=<profile|color|type|space|laws|preview|export>`, opens that lab's first open stop, or its first stop if none is open. `?step=` wins over `?lab=`. An unknown value logs a warning and opens the first open stop, as today.
- **Keys stay the same:** 1/2/3, Enter, J/K (now over the 12 stops above), E (`lastDecidedStopBefore` in the new order), and Space on Laws. The sketch needs no new key. The only legend change: J/K reads "Next / previous stop". Stop 4 has no plates, so its legend reads "Enter Continue to palette" and then J/K and E, the same way the Laws stop swaps its keys today.

## 3. Copy
- **Eyebrow** (Label style, rendered uppercase), replacing every "Step 0n · …" line: `Path · stop {n} of 12 · {Lab}`.
- **Rail lab summaries:**
  - Profile, Color, Type and Space & shape: `{d} of {total} decided`.
  - Laws: `0 of 1 decided`, `{n} rules`, `1 rule` or `No rules`.
  - Preview: `Nothing to decide`.
  - Export: `Ready` or `{n} open`.
- **Stop rows:** the label, then the value in mono, or `open`. Drop "now" and "next": the square, the fill and `aria-current` carry "current".
- **Brand colour (stop 4):** today's BrandField moves here unchanged (same parse, commit on blur, error beside the field, input kept). The primary "Continue to palette" commits the draft the way blur does, then moves to stop 5. Empty or invalid input behaves exactly like identity's "Continue to platform".
- **Palette (stop 5), brand read-only:**
  - With a brand colour: "From brand colour `#0F766E`. To change it, go back to [Brand colour]". The link button opens stop 4 (`K` also works).
  - Brand open: "Enter the brand colour at stop 4 to see three palettes built from it, each with its contrast checked." plus a [Go to Brand colour] button.
  - No palette passes: today's sentence, ending "…Try a darker or lighter brand colour at stop 4."
- **Live preview caption:**
  - A candidate is shown: `Live preview · {label}, not used yet` when it differs from the project's value, or `Live preview · {label}, in use` when it matches.
  - No candidate: unchanged ("Your choices" / "Neutrals").
- **Colour readout (Palette stop only):** today's `ContrastTable` moves from each plate footer into the side panel under the preview. It shows the previewed palette, or the in-use palette if nothing is previewed. If there is neither: "Pick a palette to read its contrast." Each plate footer becomes one mono line, `{passed} of {total} pass`, counted from the same `checkPairs` result.
- **390 header:** hollow mark + `Stencil · {name}` (just `Stencil` without a name), `Stop {n} of 12 · {rail label}`, theme icons, Open file. It wraps rather than overflows. At the end of the work surface, one "All {Lab} stops" list replaces the per-step mobile navs. It has no orange square: orange stays in the rail.

## 4. States
- **Loading:** the rail renders. The work surface shows today's "Opening your project…" with no eyebrow.
- **Empty** (`?fixture=empty`): opens on stop 1. Profile is expanded, and its stops read `open` except Component library. Export reads `{n} open`. The preview caption reads "Neutrals".
- **Stale** (`?fixture=stale`, `snapshot-differs`): `SnapshotNotice`, unchanged, above the eyebrow.
- **Error** (`?fixture=invalid-many`): the file-errors section, unchanged, above the eyebrow. The rail still shows the unreplaced project. "Save failed" and `OpenedNotice` are unchanged.

## Files the build touches
- `domain/decisions.ts`:
  - `LABS` (id, number, title) replaces `STEPS`.
  - `STOPS` gets `lab` and the new order, and gains `visual.brandHex`.
  - `DECISIONS` gets the new order.
  - New helpers: `labOfStop`, `stopNumber`, `entryStopOfLab`.
- `WizardShell.tsx`: renders per stop and lab, reads `?lab=`, the 390 header copy, the shared eyebrow, the side panel (`LivePreview`, then a readout slot), and the 390 "All {Lab} stops" list. The Preview stop keeps the full width without a side panel.
- `Rail.tsx`: 7 labs with only the current one expanded, the chip and rule on the lab row (`aria-current="true"` on its `li`), and `nav` aria-label "Labs".
- `SubDecisionList.tsx`: `StopList` gets the 6px `--dw-accent-fill` square (its slot hidden on other rows), `aria-current="step"`, and value-or-`open`. `SubDecisionList` goes; one `labStopRows(project, lab)` feeds `StopList`.
- `ShortcutLegend.tsx`: the J/K label, and the stop-4 variant.
- `LivePreview.tsx`: the caption.
- `ContrastTable.tsx`: unchanged. A new `ColorReadout` renders it in the side panel.
- `steps/visual/`:
  - `VisualStep.tsx`: the brandHex view, its lede, the eyebrow, and the mobile nav removed.
  - `palette.tsx`: BrandField moves to the new stop; the read-only brand line; the pass-count footer.
  - `model.ts`: the brandHex `valueLabel`, and the Palette label.
- `steps/profile/ProfileStep.tsx`: the eyebrow, and the mobile nav removed.
- `steps/principles`, `preview`, `export`: the eyebrow only.
- Tests:
  - The 13 e2e specs.
  - The unit tests for order and labs.
  - The chrome contrast test gains `--dw-accent-fill` on `--dw-selected`.
  - Goldens stay **byte-identical**. If any exporter turns out to read the `DECISIONS` order, stop and ask.

## Not in 5b
- Lab mode: explore and Use, the "Lab 02 · Color" eyebrow, the lab legend, the "trying {name}" rail line, and the exploring/just-used bar with Undo (5c).
- Fix, the contrast matrix, shades, the colour-blindness view, the brand colour as a lab tool, and the Candidate type and `source` line (5c).
- Type, profile, laws, space and export as labs (5d, 5e). The Preview lab (5f). Motion and Brand (5h, 5i). No format change.

## Screenshots for review (run-web, port 3110)
1. `?fixture=harbour&step=visual.paletteVariant` at 1280: dark, then light.
2. The same in dark after pressing `2`: the caption reads "not used yet" and the readout follows.
3. The same at 390: dark and light.
4. `?fixture=harbour&step=visual.brandHex` at 1280, dark.
5. `?fixture=empty` at 1280 dark and 390 light. Also `?fixture=empty&step=visual.paletteVariant` at 1280 dark.
6. `?fixture=stale` and `?fixture=invalid-many` at 1280, dark.

## Checks for tester
1. The rail lists the 7 labs in order, and exactly one is expanded. Every lab and stop row is at least 44px.
2. Exactly one stop has `aria-current="step"`, and its square is visible. Computed styles show the accent colours only on the lab chip, the lab rule, that square and the hollow mark.
3. From stop 1, J visits the 12 stops in the table's order, and each eyebrow reads `Path · stop n of 12 · {Lab}`. K walks back the same way.
4. `?lab=color` on harbour opens stop 4. On empty it opens the first open Color stop. `?step=visual.palette` still opens stop 5.
5. Stop 4: an invalid hex shows its error beside the field on blur, and the input is kept. A valid hex plus Enter opens stop 5.
6. Stop 5 on harbour: pressing a key for a palette that isn't in use sets the caption to "{label}, not used yet" and the readout to that palette's ratios. Enter chooses it and opens stop 6.
7. The goldens show no diff, store-invariants is green, the chrome contrast test passes in both themes, and nothing scrolls horizontally at 390.
