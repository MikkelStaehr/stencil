# Lab pattern (slice 5a sketch)

One pattern for every lab and for the guided path. A lab fills it in; it never gets its own layout. Sketch: `design/labs/lab-pattern.html` (`?mode=lab|path`, `?state=open|decided|exploring`, `?theme=light`). Look and tokens: DESIGN.md Part B; where this page and Part B differ, Part B counts until design-lead updates it.

## Anatomy
- **Rail** (232px; at 761–1100px 200px; at ≤760px a wrapping top bar): hollow mark + project name, the labs in order (Profile, Color, Type, Space & shape, Laws, Preview, later Motion and Brand, Export), Open file, the shortcut legend, the Dark/Light toggle. Only the current lab is expanded to its stops; each stop row (44px) shows label + value, or `open`, plus `trying <name>` while a different candidate is selected. **Orange = you are here, rail only:** the current lab's filled chip + left rule; on the path also a 6px filled square on the current stop, which also gets the `--dw-selected` fill and `aria-current="step"` (shape, fill and position carry it, not orange alone).
- **Work surface**: label (`Lab 02 · Color` / `Path · stop 5 of 12 · Color`), the question as `h1`, one lede line, the **tools** row, the **candidates** (2–3 plates, `radiogroup`), the **decision bar**, then wide tool output (e.g. shades).
- **Side panel** (340px; below main under 1101px): the live preview first, on a plate, then the lab's **readouts** about the selected candidate.

## Candidate
`{ id, label, description, decisions (the values Use writes), why, source }`. The plate header shows label, `In use` tag, and its key (1–3); under the plate: the description, then `Source: <source> · <n> of 12 pass`. Sources today: `brand`, `brand + fix`. AI becomes one more source string later; no other change.

## States (every lab, every stop)
| State | Plates | Decision bar | Rail |
|---|---|---|---|
| Open | none selected (lab) / first offered selected (path) | "No palette in use yet. Export waits for this one." Primary disabled until a pick | value `open`; Export lab `1 open` |
| Decided | the in-use plate selected, `In use` tag | "Tinted is in use. Look at another …" No primary in a lab; on the path "Keep Tinted, go on [Enter]" | value |
| Exploring (selected ≠ in use) | ink brackets on the selected plate, `In use` stays on the other | "**Deep** is not used yet. Harbour still uses **Tinted**." Primary **Use Deep [Enter]** + secondary **Back to Tinted [2]** (path: **Choose Deep [Enter]** + **Keep Tinted, go on [J]**) | `trying Deep` under the stop |
| Just used | – | "Harbour now uses Deep (was Tinted)." + **Undo** (no confirm dialog) | new value |
Empty readouts say why ("Pick a candidate to read its contrast."). Loading and error states keep today's chrome notices.

## Explore vs. Use
Exploring never writes: selecting, tools (Fix, a new brand colour) and lenses change the **candidate** or the **view**, never the project. Only **Use** (lab) or **Choose** (path) writes, through the store's one `transition()`, and both offer Undo. A Fix makes a new candidate (`source: brand + fix`) with its own Undo fix; it keeps the hue (OKLCH h and c fixed, L moves only), computed by `domain/color` (the owner), never inline.

## Keyboard (no new key without a reason)
`1/2/3` select a candidate (look). `Enter` writes the selected one: Use in a lab, Choose-and-go-on on the path. `J/K` walk every stop in rail order; from a lab, J enters the path at that lab's first stop; on the path, J moves on without writing. `E` reopens the last decision. Clicking a lab name opens the lab; clicking a stop opens the path at that stop. The legend in the rail always shows the current mode's keys.

## A new lab provides
1. **Question** (h1, the user's words) and one lede line. 2. **Stops**: the decisions it owns, in path order, each with its rail value. 3. **Candidates** per stop, 2–3, each a full candidate (above), rendered as real sample UI. 4. **Tools**: inputs and actions that make or change candidates (Color: brand colour field, Fix; Color's lens is a view tool). 5. **Readouts**: read-only findings about the selected candidate, at most one action per finding. 6. **What Use stores**: the exact project-file fields (Color: `visual.brandHex`, `visual.paletteVariant`, `visual.colorOverrides`).

## What stays neutral
Plates, the preview and shade ramps sit on square R=G=B plates with crop marks, render only from `--v-*` values, and look the same in both themes. No orange, chrome font, radius or theme inside them. The colour-blindness lens filters only `[data-v-root]` and is labelled "simulated".

## Left for later (drawn nowhere in this sketch)
Motion lab and Brand lab (their slots in the rail order are reserved); AI as a candidate source (no AI UI); the project's own dark theme (Deep is a dark *palette*, not a theme pair); in the Preview lab, social cards at 1200×630, 1080×1080 and 1080×1350; a command bar (Ctrl K).
