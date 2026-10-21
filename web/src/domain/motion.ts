// Motion tokens (docs/CONTRACTS.md §4.4): a few named durations and easings, the same in light and dark.
// Approved by the user on 2026-10-21. The easing curves and the 300 ms ceiling for UI motion come from
// emilkowalski/skills (MIT, Copyright (c) 2026 Emil Kowalski). Exported in DESIGN.md only until tokens.json v2.

export interface MotionDuration {
  key: string;
  /** Whole ms. 0 is not used: an instant change needs no token. */
  ms: number;
  use: string;
  /** Only the Websites shelf may use it. */
  websitesOnly: boolean;
}

export interface MotionEasing {
  key: string;
  /** A CSS easing function. */
  css: string;
  use: string;
}

/** The longest transition an app (Apps shelf) may use, in ms. */
export const APP_MOTION_CEILING_MS = 300;

export const MOTION_DURATIONS: readonly MotionDuration[] = [
  { key: "fast", ms: 160, use: "Hover, tooltips, press feedback", websitesOnly: false },
  { key: "base", ms: 220, use: "Dropdowns, new rows, a number that changes", websitesOnly: false },
  { key: "slow", ms: APP_MOTION_CEILING_MS, use: "Modals and drawers; the ceiling for apps", websitesOnly: false },
  { key: "stagger", ms: 50, use: "Delay between items in a list", websitesOnly: false },
  { key: "reveal", ms: 600, use: "Section and hero reveals", websitesOnly: true },
];

export const MOTION_EASINGS: readonly MotionEasing[] = [
  { key: "out", css: "cubic-bezier(0.23, 1, 0.32, 1)", use: "Entering and exiting (the default)" },
  { key: "in-out", css: "cubic-bezier(0.77, 0, 0.175, 1)", use: "Moving on screen" },
  { key: "standard", css: "ease", use: "Colour and hover" },
];
