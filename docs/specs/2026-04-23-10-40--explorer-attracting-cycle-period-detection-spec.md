# Explorer Attracting-Cycle Period Detection Spec

## Scope

This spec applies to the `/explorer` route only.

It covers:

- detecting the attracting-cycle period for the active Mandelbrot parameter
- displaying that detected period in the explorer UI

It does not apply to:

- the SOM workspace
- training
- the layout harness

## Goal

Add an explorer feature that estimates the actual period of the attracting cycle for the active orbit in a mathematically meaningful way.

This feature must not use autocorrelation of scalar distances as the primary detection method.

Instead, it must analyze the complex orbit directly and detect the smallest repeating period in the settled tail of the orbit.

## Non-Goal

This feature is not intended to provide a formal mathematical proof of periodicity.

It is an interactive numerical detector for the attracting-cycle period.

The result should be robust enough for explorer use, but the UI must still allow for:

- `none`
- `undetermined`

when a stable attracting period cannot be identified.

## Terminology

- `active parameter`
  - the Mandelbrot parameter currently driving the Julia set
  - clicked point when Live Preview is off
  - hover point when Live Preview is on and hover is active

- `orbit`
  - the sequence defined by:
    - `z_0 = 0`
    - `z_(n+1) = z_n^2 + c`

- `attracting cycle period`
  - the smallest positive integer `p` such that the settled orbit tail approximately satisfies:
    - `z_n ≈ z_(n-p)`

## Desired User Behavior

The user can enable a period overlay for the active orbit.

When enabled:

- the explorer computes the active orbit
- if a stable attracting cycle is detected, the UI shows its period
- if the orbit escapes, the UI reports that there is no attracting cycle
- if the orbit remains bounded but no stable period is detected within the configured limits, the UI reports that the result is undetermined

## UI

Add a new advanced settings section at the end of the left-side parameter controls:

- section label:
  - `Advanced Settings`

Within that section, add a dedicated subsection:

- subsection label:
  - `Period Detection`

Place all controls for the period-detection algorithm in that subsection.

Required controls:

- `Show Attracting Period`
- `Period Detection Steps`
- `Max Detected Period`

Default values:

- `Show Attracting Period`: `off`
- `Period Detection Steps`: `512`
- `Max Detected Period`: `128`

Recommended ranges:

- `Period Detection Steps`
  - min `64`
  - max `8192`
- `Max Detected Period`
  - min `1`
  - max `512`

Additional detector-tuning controls may also be placed in this subsection if they are exposed in the UI, for example:

- transient discard amount
- tail window size
- tolerance controls

If those are not exposed in v1, they remain implementation parameters.

## Display

When enabled, show the result in the Mandelbrot top-left overlay next to the complex coordinate and zoom.

Recommended format:

- detected:
  - `-0.745430 + 0.113010i · 84.2x · period 3`
- no attracting cycle:
  - `... · no attracting cycle`
- undetermined:
  - `... · period undetermined`

Optional secondary display:

- a matching text line in the selection/summary area

## Data Source

Detection must use the active Mandelbrot parameter.

This means:

- if Live Preview is off:
  - use the selected Mandelbrot point
- if Live Preview is on and a hover point is active:
  - use the hover point
- on mouse leave:
  - follow the existing active-parameter behavior

## Detection Model

### Core principle

The detector must analyze the complex orbit directly.

It must not rely on:

- autocorrelation of orbit-point distances
- radius-only repetition
- angle-only repetition

The primary criterion is complex-point recurrence in the tail:

- `|z_n - z_(n-p)| < epsilon`

for a sufficiently large portion of the settled orbit tail.

### Escape handling

If the orbit escapes before `Period Detection Steps` is reached, report:

- `no attracting cycle`

This is the correct explorer behavior for points outside the Mandelbrot set.

### Tail-based detection

Recommended detector:

1. Compute orbit points up to `N = Period Detection Steps`.
2. If escape occurs, return `no attracting cycle`.
3. Otherwise, analyze only the final tail window.
4. For candidate periods `p = 1..Max Detected Period`:
   - compare `z_n` and `z_(n-p)` across the tail
   - test whether the difference remains below tolerance
5. Return the smallest candidate period that passes the stability test.
6. If no candidate passes, return `period undetermined`.

## Recommended Numerical Parameters

These values are recommended for v1:

- total orbit steps:
  - `N = user-selected steps`
- transient discard:
  - discard the first `max(32, floor(N * 0.5))` points from period testing
- tail window:
  - use the final `min(128, floor(N * 0.4))` comparisons

### Tolerance

The tolerance must scale with the magnitude of the orbit.

Recommended form:

- `epsilon = max(absoluteFloor, relativeFactor * orbitScale)`

where:

- `absoluteFloor = 1e-12`
- `relativeFactor = 1e-8`
- `orbitScale` can be the maximum of:
  - `1`
  - `|Re(z)|`
  - `|Im(z)|`
  - `|z|`

The exact scaling choice may be tuned during implementation, but it must be documented in code comments.

### Stability requirement

A candidate period should not pass on a single match.

Recommended rule:

- for all or nearly all tail comparisons:
  - `|z_n - z_(n-p)| < epsilon`

Suggested threshold:

- at least `90%` of tested pairs must pass

Additionally:

- the smallest passing period wins

This is important because harmonics may also pass:

- true period `3`
- period `6` may also appear to repeat

The detector must return `3`, not `6`.

## Result States

The detector must return one of these states:

1. `detected`
   - includes:
     - `period`
     - optionally confidence/debug metadata

2. `no-attracting-cycle`
   - orbit escaped

3. `undetermined`
   - orbit remained bounded within the tested steps
   - but no stable minimal period was found

## Performance Requirements

This feature should be lightweight enough for interactive use.

Recommended v1 constraints:

- compute only when `Show Attracting Period` is enabled
- compute from the active parameter only
- avoid allocations in tight loops where practical
- if needed, memoize only by:
  - parameter
  - detection steps
  - max period

The detector must work with:

- click-select mode
- Live Preview mode

Live Preview will trigger repeated recomputation, so the implementation should remain reasonably cheap at default settings.

## Relationship To Orbit Overlay

This feature is independent of `Show Orbit`.

That means:

- the period may be shown when the orbit lines are hidden
- orbit drawing and period detection should not share the same control

However, both features operate on the same active parameter and orbit definition.

They may share low-level orbit-generation helpers internally if desired.

## Recommended Implementation Shape

Introduce a small pure helper module for orbit generation and period detection.

Recommended responsibilities:

- generate Mandelbrot orbit points for a parameter `c`
- report escape/non-escape
- detect minimal stable period from the orbit tail

Suggested return shape:

- `status: "detected" | "no-attracting-cycle" | "undetermined"`
- `period?: number`

## Acceptance Criteria

1. Explorer has an `Advanced Settings` section at the end of the left-side controls.
2. Inside it, explorer has a `Period Detection` subsection.
3. That subsection contains `Show Attracting Period`.
4. That subsection contains numeric controls for `Period Detection Steps` and `Max Detected Period`.
5. Default values are:
   - period display off
   - detection steps `512`
   - max period `128`
6. When enabled, the Mandelbrot overlay shows:
   - detected period
   - or `no attracting cycle`
   - or `period undetermined`
7. Points outside the Mandelbrot set report `no attracting cycle`.
8. Stable interior points with clear attracting cycles report the minimal detected period.
9. Harmonics do not replace the minimal period when the smaller valid period is present.
10. Live Preview updates period detection from the active parameter.
11. The feature works whether or not `Show Orbit` is enabled.
12. Build and lint pass after implementation.

## Explicit Rejection Of The Original Heuristic

The originally proposed heuristic was:

- autocorrelation of the distances of orbit points from the starting point

This spec rejects that as the primary method for actual-period detection because it:

- discards phase information
- can detect harmonics instead of the minimal period
- can confuse repeated radii with repeated orbit positions

That heuristic could still be useful later as a supplementary signal or visualization, but not as the main detector for the attracting-cycle period.
