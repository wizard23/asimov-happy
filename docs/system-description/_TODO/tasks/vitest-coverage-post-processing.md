# Vitest coverage post-processing

## Goal
Apply a dark theme to the generated Vitest HTML coverage report without changing upstream tooling.

## Approach: pseudo-invert algorithms (default: HSLuv)
The post-processing script rewrites every CSS file under `public/coverage/` and pseudo-inverts all color values by flipping lightness in a chosen color space.

Key points:
- Every color token in coverage CSS (hex, rgb/rgba, and named colors) is converted via the selected algorithm:
  - `hsluv` (default): invert L in HSLuv space.
  - `hsl`: invert L in HSL space.
  - `hsv`: invert V in HSV space.
- The script also writes a small `coverage-dark.css` that only sets `color-scheme: dark` and injects it into all coverage HTML files.
- The approach is idempotent because the CSS is deterministically rewritten and HTML injection is skipped if already present.

## Selecting the algorithm
- Default: `npm run post-process-test-coverage`
- HSLuv: `npm run post-process-test-coverage -- --algo=hsluv`
- HSL: `npm run post-process-test-coverage -- --algo=hsl`
- HSV: `npm run post-process-test-coverage -- --algo=hsv`

## How to run
- Generate coverage: `npm run test-coverage`
- Post-process: `npm run post-process-test-coverage`
- Combined: `npm run test-coverage-and-post-process`
