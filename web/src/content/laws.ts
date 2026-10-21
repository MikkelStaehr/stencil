import type { LawEntry } from "@/contracts/content";

// Curated UX laws, approved by the user on 2026-10-01 from design/content-review (cut: goal-gradient, von-restorff, consistency).
// Ids are stored in project files: never rename one. Changing wording changes the exports (goldens).
export const LAWS: readonly LawEntry[] = [
  {
    "id": "fitts",
    "name": "Fitts's law",
    "summary": "The time to hit a target depends on its distance and its size.",
    "when": "Any screen with controls a user clicks or taps.",
    "rule": {
      "key": "target-size",
      "template": "Make every interactive element at least {minPx} by {minPx}.",
      "severity": "must",
      "check": {
        "kind": "min-target-size",
        "selector": "a[href], button, input, select, textarea, [role=button], [tabindex]:not([tabindex='-1'])",
        "viewports": [
          390,
          1280
        ]
      }
    },
    "params": [
      {
        "key": "minPx",
        "label": "Minimum target size",
        "unit": "px",
        "integer": true,
        "min": 24,
        "max": 64,
        "suggested": 44
      }
    ],
    "source": "Fitts, P. M. (1954). The information capacity of the human motor system in controlling the amplitude of movement."
  },
  {
    "id": "hick",
    "name": "Hick's law",
    "summary": "The time it takes to decide grows with the number of choices.",
    "when": "Screens where the user picks one action from several.",
    "rule": {
      "key": "primary-actions",
      "template": "Limit primary actions to {max} per screen.",
      "severity": "must",
      "check": {
        "kind": "max-count",
        "selector": "[data-primary-action]",
        "viewports": [
          390,
          1280
        ]
      }
    },
    "params": [
      {
        "key": "max",
        "label": "Primary actions per screen",
        "unit": "count",
        "integer": true,
        "min": 1,
        "max": 3,
        "suggested": 1
      }
    ],
    "source": "Hick, W. E. (1952). On the rate of gain of information. Hyman, R. (1953)."
  },
  {
    "id": "wcag-contrast",
    "name": "Contrast minimum (WCAG 2.2, 1.4.3)",
    "summary": "Text needs enough contrast against its background to be read with low vision.",
    "when": "Every screen with text.",
    "rule": {
      "key": "text-contrast",
      "template": "Give all body text a contrast ratio of at least {minRatio} against its background.",
      "severity": "must",
      "check": {
        "kind": "contrast",
        "selector": "p, li, td, th, label, a, button, h1, h2, h3, h4, h5, h6",
        "viewports": [
          390,
          1280
        ]
      }
    },
    "params": [
      {
        "key": "minRatio",
        "label": "Minimum contrast ratio",
        "unit": "ratio",
        "integer": false,
        "min": 4.5,
        "max": 7,
        "suggested": 4.5
      }
    ],
    "source": "W3C, Web Content Accessibility Guidelines 2.2, Success Criterion 1.4.3."
  },
  {
    "id": "wcag-focus-visible",
    "name": "Focus visible (WCAG 2.2, 2.4.7)",
    "summary": "Keyboard users must be able to see which element has focus at every moment.",
    "when": "Every screen with links, buttons or form fields.",
    "rule": {
      "key": "focus-outline",
      "template": "Show a focus outline at least {minOutlinePx} thick on every interactive element reached by keyboard.",
      "severity": "must",
      "check": {
        "kind": "focus-visible",
        "selector": "a[href], button, input, select, textarea, [role=button], [tabindex]:not([tabindex='-1'])",
        "viewports": [
          390,
          1280
        ]
      }
    },
    "params": [
      {
        "key": "minOutlinePx",
        "label": "Minimum focus outline",
        "unit": "px",
        "integer": false,
        "min": 1,
        "max": 4,
        "suggested": 2
      }
    ],
    "source": "W3C, Web Content Accessibility Guidelines 2.2, Success Criteria 2.4.7 (Focus Visible) and 2.4.13 (Focus Appearance)."
  },
  {
    "id": "response-limits",
    "name": "Response-time limits",
    "summary": "A response within 0.1 s feels instant; after about 1 s users notice they are waiting.",
    "when": "Every screen with a primary action.",
    "rule": {
      "key": "instant-feedback",
      "template": "Show a visible response within {maxMs} of activating a primary action.",
      "severity": "must",
      "check": {
        "kind": "response-time",
        "selector": "[data-primary-action]",
        "viewports": [
          390,
          1280
        ]
      }
    },
    "params": [
      {
        "key": "maxMs",
        "label": "Maximum time to first response",
        "unit": "ms",
        "integer": true,
        "min": 50,
        "max": 1000,
        "suggested": 100
      }
    ],
    "source": "Miller, R. B. (1968). Response time in man-computer conversational transactions. Nielsen, J. (1993). Usability Engineering, chapter 5."
  },
  {
    "id": "recognition-recall",
    "name": "Recognition over recall",
    "summary": "Recognising an option on screen is easier than remembering it from an earlier step.",
    "when": "Multi-step forms, filters and any screen that depends on an earlier choice.",
    "rule": {
      "key": "show-earlier-choices",
      "template": "Keep earlier choices visible on every step that depends on them.",
      "severity": "should",
      "check": {
        "kind": "manual",
        "selector": null,
        "viewports": [
          390,
          1280
        ],
        "question": "On each later step of a multi-step form, are the choices made in earlier steps visible without going back?"
      }
    },
    "params": [],
    "source": "Nielsen, J. (1994). Enhancing the explanatory power of usability heuristics. Heuristic 6: recognition rather than recall."
  },
  {
    "id": "proximity",
    "name": "Law of proximity (Gestalt)",
    "summary": "Things placed close together are read as one group.",
    "when": "Forms, settings and any screen with groups of related fields.",
    "rule": {
      "key": "group-by-space",
      "template": "Group related fields by spacing, with more space between groups than inside them.",
      "severity": "should",
      "check": {
        "kind": "manual",
        "selector": null,
        "viewports": [
          390,
          1280
        ],
        "question": "On each form, is the gap between groups of fields larger than the gap between fields inside a group?"
      }
    },
    "params": [],
    "source": "Wertheimer, M. (1923). Untersuchungen zur Lehre von der Gestalt II. Psychologische Forschung, 4."
  },
  {
    "id": "error-recovery",
    "name": "Help users recover from errors",
    "summary": "An error message helps only if it says what went wrong and how to put it right.",
    "when": "Every form and every action that can fail.",
    "rule": {
      "key": "actionable-errors",
      "template": "Show each error next to its field, saying what went wrong and what to do next.",
      "severity": "must",
      "check": {
        "kind": "manual",
        "selector": null,
        "viewports": [
          390,
          1280
        ],
        "question": "When a required field is left empty on submit, does the message next to that field say what to enter?"
      }
    },
    "params": [],
    "source": "Nielsen, J. (1994). Heuristic 9: help users recognize, diagnose, and recover from errors."
  },
  {
    "id": "peak-end",
    "name": "Peak-end rule",
    "summary": "People judge an experience mostly by its most intense moment and by its end.",
    "when": "Flows with a clear end, such as booking or sign-up.",
    "rule": {
      "key": "closing-screen",
      "template": "End every main flow on a screen that confirms the result and offers one next step.",
      "severity": "should",
      "check": {
        "kind": "manual",
        "selector": null,
        "viewports": [
          390,
          1280
        ],
        "question": "At the end of the main flow, does the last screen say in plain words what happened and offer one next step?"
      }
    },
    "params": [],
    "source": "Kahneman, D., Fredrickson, B. L., Schreiber, C. A., Redelmeier, D. A. (1993)."
  },
  // Motion laws, approved by the user on 2026-10-21 (slice 4a). The apps-* laws belong to the Apps shelf
  // (Applications, Web applications), website-* to the Websites shelf (Website/Design).
  {
    "id": "reduced-motion",
    "name": "Reduced motion",
    "summary": "Motion can make people dizzy or ill, and their reduced-motion setting asks for less of it.",
    "when": "Any screen with motion.",
    "rule": {
      "key": "fades-only",
      "template": "With reduced motion on, drop all movement and keep only short opacity and colour fades.",
      "severity": "must",
      "check": {
        "kind": "manual",
        "selector": null,
        "viewports": [
          390,
          1280
        ],
        "question": "With reduced motion turned on in the OS, do the main screens change without any movement, apart from fades?"
      }
    },
    "params": [],
    "source": "W3C (2023). WCAG 2.2, Success Criterion 2.3.3 Animation from Interactions. Kowalski, E. (2026). emilkowalski/skills, review-animations (MIT)."
  },
  {
    "id": "motion-purpose",
    "name": "Purposeful motion",
    "summary": "Motion helps when it shows what changed; as decoration it only slows people down.",
    "when": "Any screen with motion.",
    "rule": {
      "key": "explains-change",
      "template": "Animate only to show a change: new content, a number that changes or a new status.",
      "severity": "must",
      "check": {
        "kind": "manual",
        "selector": null,
        "viewports": [
          390,
          1280
        ],
        "question": "On the main screens, does every animation follow a change in content, a number or a status?"
      }
    },
    "params": [],
    "source": "Kowalski, E. (2026). emilkowalski/skills, emil-design-eng and review-animations (MIT)."
  },
  {
    "id": "motion-frequency",
    "name": "Frequency of use",
    "summary": "The more often people see an animation, the more it gets in their way.",
    "when": "Menus, panels and actions opened from the keyboard.",
    "rule": {
      "key": "no-keyboard-motion",
      "template": "Show and hide anything opened by a keyboard shortcut at once, without animation.",
      "severity": "should",
      "check": {
        "kind": "manual",
        "selector": null,
        "viewports": [
          390,
          1280
        ],
        "question": "When a keyboard shortcut opens a menu or panel, does it appear at once, without animation?"
      }
    },
    "params": [],
    "source": "Kowalski, E. (2026). emilkowalski/skills, emil-design-eng (MIT)."
  },
  {
    "id": "apps-native-scroll",
    "name": "Apps: native scrolling",
    "summary": "In an app, scrolling has to follow the hand exactly, and smooth-scroll libraries add lag.",
    "when": "Applications and web applications (the Apps shelf).",
    "rule": {
      "key": "no-smooth-scroll",
      "template": "Scroll natively: use {max} smooth-scroll libraries on any screen.",
      "severity": "must",
      "check": {
        "kind": "max-count",
        "selector": "html.lenis, html.has-scroll-smooth",
        "viewports": [
          390,
          1280
        ]
      }
    },
    "params": [
      {
        "key": "max",
        "label": "Smooth-scroll libraries per screen",
        "unit": "count",
        "integer": true,
        "min": 0,
        "max": 0,
        "suggested": 0
      }
    ],
    "source": "Stencil motion shelves (user, 2026-10-21). The selector finds Lenis and Locomotive Scroll."
  },
  {
    "id": "apps-still-background",
    "name": "Apps: still backgrounds",
    "summary": "A moving background pulls the eye away from the work and costs battery.",
    "when": "Applications and web applications (the Apps shelf).",
    "rule": {
      "key": "no-canvas-background",
      "template": "Keep app backgrounds still, with no WebGL or canvas effect behind the content.",
      "severity": "must",
      "check": {
        "kind": "manual",
        "selector": null,
        "viewports": [
          390,
          1280
        ],
        "question": "On every main screen, is the background still, with no animated canvas or WebGL effect behind the content?"
      }
    },
    "params": [],
    "source": "Stencil motion shelves (user, 2026-10-21)."
  },
  {
    "id": "website-motion-fallback",
    "name": "Websites: motion fallbacks",
    "summary": "Big motion works only if the page still works without it.",
    "when": "Websites (the Website/Design shelf) with animated heroes, WebGL or smooth scroll.",
    "rule": {
      "key": "still-fallback",
      "template": "Give every animated hero and smooth scroll a fallback: a still image and native scrolling under reduced motion.",
      "severity": "must",
      "check": {
        "kind": "manual",
        "selector": null,
        "viewports": [
          390,
          1280
        ],
        "question": "With reduced motion turned on, does the page scroll natively and show a still image in place of each animated hero?"
      }
    },
    "params": [],
    "source": "Stencil motion shelves (user, 2026-10-21). Lenis (lenis.dev, MIT)."
  }
];

export const LAW_BY_ID: ReadonlyMap<string, LawEntry> = new Map(LAWS.map((l) => [l.id, l]));
