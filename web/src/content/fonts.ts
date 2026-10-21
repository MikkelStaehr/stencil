import type { FontEntry } from "@/contracts/content";

// Curated font catalogue (OFL-1.1, Fontsource latin woff2), approved 2026-10-01 from design/content-review.
// The chrome's own fonts (geist, geist-mono) also live in public/fonts/ but are never project options.
export const FONTS: readonly FontEntry[] = [
  {
    "id": "inter",
    "family": "Inter",
    "generic": "sans-serif",
    "fontsource": "@fontsource/inter",
    "subset": "latin",
    "files": [
      {
        "weight": 400,
        "style": "normal",
        "file": "inter-latin-400-normal.woff2"
      },
      {
        "weight": 500,
        "style": "normal",
        "file": "inter-latin-500-normal.woff2"
      },
      {
        "weight": 600,
        "style": "normal",
        "file": "inter-latin-600-normal.woff2"
      }
    ],
    "license": "OFL-1.1",
    "copyright": "Copyright 2016 The Inter Project Authors (https://github.com/rsms/inter)",
    "roles": [
      "display",
      "text"
    ]
  },
  {
    "id": "sora",
    "family": "Sora",
    "generic": "sans-serif",
    "fontsource": "@fontsource/sora",
    "subset": "latin",
    "files": [
      {
        "weight": 600,
        "style": "normal",
        "file": "sora-latin-600-normal.woff2"
      },
      {
        "weight": 700,
        "style": "normal",
        "file": "sora-latin-700-normal.woff2"
      }
    ],
    "license": "OFL-1.1",
    "copyright": "Copyright 2019 The Sora Project Authors (https://github.com/sora-xor/sora-font)",
    "roles": [
      "display"
    ]
  },
  {
    "id": "open-sans",
    "family": "Open Sans",
    "generic": "sans-serif",
    "fontsource": "@fontsource/open-sans",
    "subset": "latin",
    "files": [
      {
        "weight": 400,
        "style": "normal",
        "file": "open-sans-latin-400-normal.woff2"
      },
      {
        "weight": 600,
        "style": "normal",
        "file": "open-sans-latin-600-normal.woff2"
      }
    ],
    "license": "OFL-1.1",
    "copyright": "Copyright 2020 The Open Sans Project Authors (https://github.com/googlefonts/opensans)",
    "roles": [
      "text"
    ]
  },
  {
    "id": "fraunces",
    "family": "Fraunces",
    "generic": "serif",
    "fontsource": "@fontsource/fraunces",
    "subset": "latin",
    "files": [
      {
        "weight": 600,
        "style": "normal",
        "file": "fraunces-latin-600-normal.woff2"
      }
    ],
    "license": "OFL-1.1",
    "copyright": "Copyright 2020 The Fraunces Project Authors (github.com/undercasetype/Fraunces)",
    "roles": [
      "display"
    ]
  },
  {
    "id": "space-grotesk",
    "family": "Space Grotesk",
    "generic": "sans-serif",
    "fontsource": "@fontsource/space-grotesk",
    "subset": "latin",
    "files": [
      {
        "weight": 600,
        "style": "normal",
        "file": "space-grotesk-latin-600-normal.woff2"
      }
    ],
    "license": "OFL-1.1",
    "copyright": "Copyright 2020 The Space Grotesk Project Authors (https://github.com/floriankarsten/space-grotesk)",
    "roles": [
      "display"
    ]
  },
  {
    "id": "manrope",
    "family": "Manrope",
    "generic": "sans-serif",
    "fontsource": "@fontsource/manrope",
    "subset": "latin",
    "files": [
      {
        "weight": 400,
        "style": "normal",
        "file": "manrope-latin-400-normal.woff2"
      },
      {
        "weight": 500,
        "style": "normal",
        "file": "manrope-latin-500-normal.woff2"
      },
      {
        "weight": 700,
        "style": "normal",
        "file": "manrope-latin-700-normal.woff2"
      }
    ],
    "license": "OFL-1.1",
    "copyright": "Copyright 2019 The Manrope Project Authors (https://github.com/sharanda/manrope)",
    "roles": [
      "display",
      "text"
    ]
  },
  {
    "id": "atkinson-hyperlegible-next",
    "family": "Atkinson Hyperlegible Next",
    "generic": "sans-serif",
    "fontsource": "@fontsource/atkinson-hyperlegible-next",
    "subset": "latin",
    "files": [
      {
        "weight": 400,
        "style": "normal",
        "file": "atkinson-hyperlegible-next-latin-400-normal.woff2"
      },
      {
        "weight": 500,
        "style": "normal",
        "file": "atkinson-hyperlegible-next-latin-500-normal.woff2"
      },
      {
        "weight": 700,
        "style": "normal",
        "file": "atkinson-hyperlegible-next-latin-700-normal.woff2"
      }
    ],
    "license": "OFL-1.1",
    "copyright": "Copyright 2020-2024 The Atkinson Hyperlegible Next Project Authors (https://github.com/googlefonts/atkinson-hyperlegible-next)",
    "roles": [
      "display",
      "text"
    ]
  },
  {
    "id": "barlow",
    "family": "Barlow",
    "generic": "sans-serif",
    "fontsource": "@fontsource/barlow",
    "subset": "latin",
    "files": [
      {
        "weight": 600,
        "style": "normal",
        "file": "barlow-latin-600-normal.woff2"
      }
    ],
    "license": "OFL-1.1",
    "copyright": "Copyright 2017 The Barlow Project Authors (https://github.com/jpt/barlow)",
    "roles": [
      "display"
    ]
  }
];

export const FONT_BY_ID: ReadonlyMap<string, FontEntry> = new Map(FONTS.map((f) => [f.id, f]));

/** The FontFace name a variant font is registered under, so it can never match a chrome font. */
export const variantFace = (catalogueId: string) => `dwv-${catalogueId}`;
