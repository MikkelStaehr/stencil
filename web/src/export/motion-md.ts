// The Motion section of the exported DESIGN.md (docs/CONTRACTS.md §4.4). Token values come from domain/motion.ts;
// the text is fixed, the same for every project. Never write "<" here: Mainframe rejects a DESIGN.md with anything
// that looks like HTML.
import { MOTION_DURATIONS, MOTION_EASINGS } from "@/domain/motion";

/** The Motion CSS block: durations as custom properties, easings in Tailwind v4's `--ease-*` theme namespace. */
export function motionCss(): string {
  return [
    ":root {",
    ...MOTION_DURATIONS.map(
      (d) => `  --duration-${d.key}: ${d.ms}ms; /* duration.${d.key}${d.websitesOnly ? ", websites only" : ""} */`,
    ),
    "}",
    "@theme {",
    ...MOTION_EASINGS.map((e) => `  --ease-${e.key}: ${e.css}; /* ease.${e.key} */`),
    "}",
  ].join("\n");
}

/** The section's lines, ending with the items left to design-lead (`open` builds those). */
export function motionSection(open: (label: string) => string[]): string[] {
  return [
    "## Motion",
    "",
    "Motion shows a change: new content, a number that changes, a new status. It is never decoration alone. The tokens are the same in light and dark.",
    "",
    "| Token | Value | Use |",
    "|---|---|---|",
    ...MOTION_DURATIONS.map((d) => `| \`duration.${d.key}\` | ${d.ms}ms | ${d.use}${d.websitesOnly ? " (websites only)" : ""} |`),
    ...MOTION_EASINGS.map((e) => `| \`ease.${e.key}\` | \`${e.css}\` | ${e.use} |`),
    "",
    "```css",
    motionCss(),
    "```",
    "",
    "In Tailwind v4 the classes `ease-out`, `ease-in-out` and `ease-standard` use these curves; the first two replace Tailwind's defaults. Durations have no Tailwind namespace: write `duration-(--duration-fast)`.",
    "",
    "**Shelf.** The project's Mainframe channel decides it: Applications and Web applications use Apps; Website/Design uses Websites. The motion laws chosen for the project are in `ux-rules.yaml`.",
    "",
    "**Apps.** Small, functional motion only. Transitions last at most `duration.slow`. No WebGL or canvas backgrounds and no smooth scroll.",
    "",
    "**Websites.** Large visual sections, heroes, WebGL backgrounds and smooth scroll (Lenis) are allowed, each with a fallback: a still image where WebGL is missing, and native scrolling with still heroes under reduced motion.",
    "",
    "**Reduced motion.** Always respected. It means gentler, not none: keep short opacity and colour fades, drop movement.",
    "",
    "**Easing and properties.** Enter and exit with `ease.out`, never ease-in. Animate `transform` and `opacity` only, never `transition: all`. Anything opened by a keyboard shortcut appears at once, without animation.",
    "",
    "**Dependencies.** CSS first: transitions, `@starting-style` and the Web Animations API. A new animation dependency (GSAP, Motion, three.js) needs a one-line reason in the commit that adds it.",
    "",
    "**Patterns for apps.** CSS first and written for these tokens. The ideas come from React Bits; no code is copied.",
    "",
    "| Pattern | Use when | Not when | Tokens |",
    "|---|---|---|---|",
    "| Count-up number | A value changes while the user watches, such as a total after an edit | On every page load, or for values that update many times a minute | `duration.slow`, `ease.out`, tabular numerals |",
    "| List enter | A new row arrives (a new booking, a new message): it fades in and slides 8px | The list's first render, sorting or filtering | `duration.base`, `duration.stagger`, `ease.out` |",
    "| Working pulse | Something runs now (a sync, an upload, an agent at work): a ring pulses around its status | Finished or idle work: show a still status. Under reduced motion: a still dot | One cycle is 4 × `duration.slow`, `ease.in-out` |",
    "| Dock hover | A row of icon buttons on a pointer device: the hovered icon scales up to 1.15 | Touch screens, rows with text labels, primary navigation | `duration.fast`, `ease.out`, `@media (hover: hover) and (pointer: fine)` |",
    "| Grain | A flat surface needs texture: a still SVG noise overlay at 3–5% opacity | Anything animated, canvas, or behind body text where it lowers contrast | None: grain never moves |",
    "",
    "Sources: the easing curves, the 300ms ceiling and the reduced-motion rule come from Emil Kowalski's emilkowalski/skills (MIT). The pattern ideas come from React Bits (reactbits.dev, MIT + Commons Clause).",
    "",
    ...open("Signature motion"),
  ];
}
