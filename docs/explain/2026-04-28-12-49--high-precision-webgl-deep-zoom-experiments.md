# High-Precision WebGL Deep-Zoom Experiments

## Goal

Evaluate why the separate `High Precision WebGL Rendering` mode with `Precision Floats = 2`
did not produce a visible reduction in blockiness compared with the existing `WebGL Rendering`
mode at deep zoom levels around `500000x` to `1000000x`.

The original expectation was:

- ordinary WebGL would become numerically blocky first
- the high-precision WebGL path would remain visually stable somewhat longer

That expected separation did not appear in practice.

## Test Setup

### Primary comparison method

The most reliable automated comparison used a temporary headless-browser helper page served from
the built app output. That helper:

- selected one renderer through local storage
- opened the normal `/` explorer route
- dispatched repeated wheel zoom events against the Mandelbrot overlay canvas
- captured:
  - active renderer label
  - precision label
  - Mandelbrot overlay text showing center and zoom
  - a screenshot

### Comparison point

The main repeated comparison point was:

- center approximately `-1.093555 + 0.002654i`
- zoom approximately `998599x`

This point was chosen because it is deep enough to expose the practical blockiness problem while
still being reachable reliably in the automated comparison.

### Debug route

A dedicated debug route was added for future manual and scripted comparison:

- `/explorer-renderer-compare`

It shows:

- `WebGL Rendering`
- `High Precision WebGL Rendering`

side by side with shared basic controls. In practice, static-preview routing and long-lived WebGL
work made direct headless capture of that compare route less reliable than the simpler single-route
helper above, so the deep-zoom experiments below were primarily evaluated with the single-renderer
helper.

## Baseline Observation

At approximately `998599x`, the following two runs were visually almost identical:

1. `WebGL Rendering`
2. `High Precision WebGL Rendering` with `Precision Floats = 2`

This confirmed the user-reported problem:

- the new renderer did not provide a meaningful visible deep-zoom benefit at around `1e6x`

## Hypotheses Tested

### 1. Shared zoom floor was the only issue

This had already been ruled out earlier.

There is indeed a shared JavaScript-side viewport clamp based on `Number.EPSILON`, but the user
was specifically concerned about blockiness **well before** that final zoom floor is reached.

So the relevant problem was:

- visible numerical blockiness before the explorer runs into the shared JS zoom limit

### 2. Bailout test was collapsing to float too early

This was the first serious suspected culprit.

Original problem:

- the high-precision shader updated the orbit in two-float arithmetic
- but converted back to float every iteration for the bailout test

This was changed so that bailout uses double-single magnitude-squared:

- compute `|z|^2` in two-float arithmetic
- compare against `4.0` without collapsing first

#### Result

- This change was reasonable and worth keeping.
- However, it did **not** create a meaningful visible improvement at about `998599x`.

Conclusion:

- bailout collapse to float was a real weakness
- but it was not the main explanation for the remaining blockiness

### 3. Float-based smoothing was the main blocker

Hypothesis:

- perhaps the image structure was acceptable, but final smoothing/coloring still collapsed too early

Experiment:

- keep the post-escape magnitude-squared in double-single a little longer before converting to float
  for `log2(log2(...))`

#### Result

- no visible improvement at the same zoom and center

Conclusion:

- float-based smoothing is **not** the main reason the user still sees the deep-zoom blockiness

### 4. Coordinate reconstruction from viewport min/max caused cancellation

Hypothesis:

- reconstructing each pixel as `min + width * u` / `max - height * v` might introduce cancellation
  error at deep zoom
- perhaps a center-relative formulation would be more stable

Experiment:

- reconstruct pixel coordinates relative to viewport center instead of viewport min/max

#### Result

- no useful improvement in Mandelbrot
- Julia became dramatically worse and nearly collapsed to black at the same zoom

Conclusion:

- this was not a clean fix
- it introduced instability rather than improving practical precision

### 5. Specialized `dsSquare()` would recover useful precision

Hypothesis:

- the recurrence performs squaring constantly
- perhaps a square-specialized double-single operation would improve useful precision at acceptable
  cost

Experiment:

- add a specialized `dsSquare()`
- use it in:
  - recurrence
  - bailout magnitude-squared

#### Result

- render cost increased sharply
- the same `~1e6x` headless run no longer completed in a reasonable window

Conclusion:

- even if it might help mathematically, this version is too expensive to be a clean next step

### 6. Stronger double-double style `dsAdd()` / `dsMul()` would help

Hypothesis:

- the current arithmetic might simply be too lightweight
- perhaps a more standard renormalized double-double carry path would separate nearby pixels better

Experiment:

- replace the lightweight carry/renormalization path for:
  - `dsAdd`
  - `dsMul`

with a stronger renormalized formulation

#### Result

- build/lint passed
- visible output at the same `~998599x` point still looked effectively identical

Conclusion:

- a modestly stronger `dsAdd()` / `dsMul()` formulation alone is still not enough to produce the
  hoped-for visual deep-zoom gain

## Overall Conclusion

The experiments strongly suggest that the current design is reaching a practical limit:

- a fragment-shader-based `n = 2` two-float approach in this architecture does **not** buy enough
  visible precision at around `1e6x`
- at least not through small, local fixes that keep performance reasonable

What the experiments ruled out as primary explanations:

- shared JS zoom floor
- float-based smoothing
- coordinate reconstruction form
- slightly stronger local carry paths in `dsAdd()` / `dsMul()`

What remains the most likely explanation:

- the overall `n = 2` fragment arithmetic design is still too weak to produce meaningful practical
  deep-zoom gains at the tested scale

In other words:

- the problem is probably not one remaining small bug
- it is more likely a limitation of this specific implementation strategy

## Practical Implication

If the goal is a **visible** deep-zoom benefit beyond ordinary WebGL, the next successful path is
unlikely to be another tiny arithmetic tweak.

The more promising directions are:

1. A substantially more ambitious multi-component arithmetic design, with explicit acceptance of
   higher shader cost
2. A different deep-zoom strategy entirely, such as:
   - perturbation / reference-orbit methods
   - CPU high-precision reference orbit + GPU delta evaluation

These are much more likely to provide real practical gains than continuing to polish the current
`n = 2` fragment-shader arithmetic.

## Status After Experiments

All unsuccessful experimental changes described above were reverted after testing.

What remains in the codebase:

- the dedicated compare route:
  - `/explorer-renderer-compare`
- the stable high-precision renderer state with the bailout-in-double-single improvement

Verification after cleanup:

- `npm run build` passed
- `npm run lint` passed
