# Explorer Escape Bands Palette Mode Spec

## Scope

This spec applies to the `/explorer` route only.

It covers:

- a new palette-mapping mode based on raw escape iteration count
- UI controls for configuring that mode
- rendering semantics for Mandelbrot and Julia

It does not apply to:

- the SOM route
- the layout harness
- non-explorer rendering paths outside the explorer canvases

## Goal

Add a new palette-mapping mode that colors the fractals by **escape iteration count** rather than by smooth normalized escape value.

This mode should behave like a configurable step/band classifier:

- early-escaping points use the first color
- later-escaping points move through subsequent colors
- non-escaping/interior points and very late-escaping points use the last color

## Name

UI label:

- `Escape Bands`

This mode becomes a new option inside `Palette Mapping`.

## Terminology

This spec uses the following terms:

- `escape iteration count`
  - the raw integer number of iterations required before the orbit escapes

- `escapes in n iterations`
  - the orbit exceeds the bailout radius on iteration `n`

- `early-escaping points`
  - points with low escape iteration counts

- `late-escaping points`
  - points with high escape iteration counts

- `non-escaping/interior points`
  - points that do not escape within the configured iteration limit

## Core Behavior

This mode must use the **raw integer escape iteration count**.

It must not use:

- smoothed escape values
- normalized `[0, 1]` escape values
- palette stop interpolation

### Classification model

The user defines:

- a number of palette entries
- one color per entry
- one threshold per entry except the last

The meaning is:

- entry 1 color:
  - used for points whose orbit escapes in at most `Threshold 1`
- entry 2 color:
  - used for points whose orbit escapes after `Threshold 1` and in at most `Threshold 2`
- entry 3 color:
  - used for points whose orbit escapes after `Threshold 2` and in at most `Threshold 3`
- ...
- last entry color:
  - used for all remaining points, including:
    - points escaping after the last explicit threshold
    - non-escaping/interior points

### Inclusive thresholds

Thresholds are inclusive.

So:

- `Threshold i` means:
  - points whose orbit escapes in at most that many iterations

## Applies To

This mode applies to both:

- Mandelbrot
- Julia

The meaning is the same in both cases:

- classify by raw escape iteration count
- use the same configured escape-band colors and thresholds

## UI

Add `Escape Bands` to the `Palette Mapping` dropdown.

When `Palette Mapping = Escape Bands`:

- show the escape-band controls
- use those controls instead of palette-gradient interpolation for coloring

## Control Placement

Place the controls in:

- `Advanced Settings`

inside a dedicated subsection:

- `Escape Bands`

This subsection is shown only when:

- `Palette Mapping = Escape Bands`

## User-Facing Controls

### Number of entries

Control:

- `Number of Entries`

Default:

- `3`

Allowed range:

- `2..12`

### Colors

There is one color picker for each entry.

Recommended labels:

- `Color 1`
- `Color 2`
- ...
- `Color n`

### Thresholds

There is one threshold input for each entry except the last.

Labeling convention:

1. `Threshold 1 (diverge very quickly)`
2. `Threshold 2`
3. ...
4. `Threshold n-1 (diverge very slowly)`
5. No control is created for the final implicit bucket

## Default Configuration

Default entry count:

- `3`

Default colors:

1. violet
   - for fast escaping points
2. turquoise
3. black
   - for very slowly escaping points and non-escaping/interior points

Default thresholds:

1. `Threshold 1 = 10`
2. `Threshold 2 = 50`

Suggested concrete default color values for implementation:

1. violet:
   - `#a855f7`
2. turquoise:
   - `#2edcc8`
3. black:
   - `#000000`

## Threshold Rules

### Ordering

Thresholds must be strictly increasing.

For example, valid:

- `10, 50, 200`

Invalid:

- `10, 10, 50`
- `50, 10`

### Type

Thresholds are integer iteration counts.

### Relationship to current iteration limit

Thresholds may exceed the currently configured fractal iteration limit.

This is allowed, but it may collapse later bands in practice.

Implementation may:

- allow it silently
- or show a soft validation hint

It must not hard-fail the mode.

## Persistence of Hidden Entries

When the user decreases `Number of Entries`, the extra colors and thresholds must not be discarded.

They must remain in memory so that:

- if the user later increases the entry count again
- the previously entered colors and thresholds are restored

This applies to:

- hidden colors
- hidden thresholds

So the UI may shrink, but the underlying editable state should persist.

## Relationship to Existing Palette Dropdown

When `Palette Mapping = Escape Bands`:

- the explicit escape-band colors define the actual rendered colors
- normal palette-gradient interpolation is ignored

The palette dropdown may remain visible for consistency with other modes, but it does not define the color output while Escape Bands mode is active.

## Rendering Semantics

### Mandelbrot

For each point:

- if the orbit escapes in `k` iterations:
  - classify by the first threshold bucket containing `k`
- if the orbit does not escape within the iteration limit:
  - use the last entry color

### Julia

Same rule:

- use raw integer escape iteration count
- classify by thresholds
- non-escaping/interior points use the last entry color

## CPU / WebGL Consistency

This mode must behave consistently in:

- CPU renderer
- WebGL renderer

That means both rendering paths must classify using:

- raw integer escape iteration count

and not:

- smoothed normalized escape

## Non-Goal

This mode is not intended to interpolate between colors.

It is a stepped band mode, not a gradient mode.

## Validation / UX

Recommended behavior:

- if thresholds are not strictly increasing, show a validation hint and either:
  - prevent invalid commit
  - or auto-correct after edit

Preferred v1 behavior:

- keep state editable
- show validation
- use only valid ordered thresholds for rendering

If implementation simplicity requires it, auto-clamping / auto-ordering is acceptable, but the behavior should stay predictable.

## Acceptance Criteria

1. `Palette Mapping` includes `Escape Bands`.
2. When `Escape Bands` is selected, an `Advanced Settings` subsection named `Escape Bands` appears.
3. The subsection contains:
   - `Number of Entries`
   - one color control per entry
   - one threshold control per entry except the last
4. Default configuration is:
   - 3 entries
   - violet
   - turquoise
   - black
   - thresholds `10` and `50`
5. Thresholds are interpreted as raw integer escape iteration counts.
6. Thresholds are inclusive.
7. Thresholds must be strictly increasing.
8. The last color is used for:
   - points escaping after the last threshold
   - non-escaping/interior points
9. The mode works for both Mandelbrot and Julia.
10. CPU and WebGL behave consistently for this mode.
11. Reducing `Number of Entries` does not discard hidden colors or thresholds.
12. Increasing `Number of Entries` restores previously entered hidden colors and thresholds.
13. Build and lint pass after implementation.

## Recommended Implementation Shape

Keep a dedicated explorer state structure for escape-band configuration, for example:

- entry count
- colors array
- thresholds array

Render only the active prefix according to the current entry count, but preserve the full arrays in state so hidden values survive entry-count changes.
