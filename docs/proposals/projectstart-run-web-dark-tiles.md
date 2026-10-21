# Proposal: run-web retakes a tiled full-page shot

Proposed 2026-10-21 (slice 4b). This session does not edit ProjectStart (`C:\dev\waan\teams`). The user applies this proposal there, pushes and runs `install.sh`. It concerns `skills/run-web/shoot.mjs` and `SKILL.md`, which every project copies. Mainframe and Stencil are both dark by default now, so both are affected.

## What happened

In Stencil slice 4b, `shoot.mjs` sometimes returned a full-page PNG where the page repeated itself in tiles of about 756 × 488 px, instead of one page:

- **4 of 18 dark-theme shots** tiled, all at 1280 px wide (page height 1144 px, viewport 844 px, so 300 px beyond the viewport).
- **0 of 10 light-theme shots** tiled. Light and dark pages have the same layout and height.
- `--reduce-motion` didn't prevent it: 2 of the 4 tiled shots had it on.
- **A new shot of the same page was always clean within three tries.** Two pages were clean on the first retake. One page (the palette step) tiled twice in a row and was clean on the third shot, which had `--reduce-motion`. The page itself renders correctly; the fault is in the capture.

The JSON line reported no overflow and no console errors for the tiled shots, so nothing flagged them. They were caught only because the PNG was read.

## Likely causes (not yet confirmed)

1. The page sets `color-scheme: dark`, but `shoot.mjs` always emulates `prefers-color-scheme: light` unless `--dark` is given. Stencil ignores the OS setting, so the page and the emulated scheme disagree on every dark shot.
2. `captureBeyondViewport` runs 200 ms after the page is ready. A dark page may still be rasterising tiles beyond the viewport when the capture starts.

## Change

**1. `skills/run-web/shoot.mjs`: detect tiles and retake once.** After `Page.captureScreenshot`, compare the image with a second capture of the same clip; if they differ, wait two animation frames and capture again, and report `"retaken": true` in the JSON line. If the third capture still differs from the second, exit 1 with "full-page capture is unstable". Two equal captures are the stable result.

**2. `skills/run-web/SKILL.md`, under `## Rules`:**

> - A full-page shot that repeats the page in tiles is a capture fault, not a layout bug: take it again, and say so if it happens twice in a row. Never judge a layout from a tiled image.

**3. Look into cause 1 when there's time:** shoot a dark-by-default page with `--dark` and without it, 10 times each, and count the tiled images. If only the "without" shots tile, let `shoot.mjs` read the page's computed `color-scheme` after load and emulate the same `prefers-color-scheme`.

## LESSONS.md row

| Date | Project | What happened | Root cause | Rule | Lives in |
|---|---|---|---|---|---|
| 2026-10-21 | Stencil | 4 of 18 dark full-page shots came back as repeated tiles. 0 of 10 light shots did, and a retake was clean within three tries. The JSON line said nothing was wrong. | Unconfirmed: a capture beyond the viewport on a `color-scheme: dark` page, likely while tiles were still rasterising. | A tiled full-page shot is a capture fault: take it again. `shoot.mjs` compares two captures and retakes once before reporting. | `skills/run-web/shoot.mjs`, `skills/run-web/SKILL.md` |
