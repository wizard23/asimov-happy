# Explorer High Precision WebGL Renderer Spec

## Scope

This spec applies to the `/explorer` route only.

It covers:

- a new WebGL rendering mode for higher-precision complex arithmetic
- UI controls for selecting the number of float components
- rendering semantics for Mandelbrot and Julia under this mode
- performance and fallback expectations

It does not apply to:

- the SOM route
- CPU rendering
- WebGPU rendering
- non-explorer render paths

## Goal

Add an experimental separate renderer called `High Precision WebGL Rendering` that represents each real component of a complex number as a sum of `n` floats rather than a single shader float.

This mode is intended to increase useful zoom depth beyond ordinary `f32` WebGL rendering.

It must work for both:

- Mandelbrot rendering
- Julia rendering

## Summary

Each real value is represented as:

- `x = x0 + x1 + ... + x(n-1)`

where:

- each `xi` is a shader float
- the expansion is ordered from larger to smaller contributions

Each complex number becomes:

- real expansion of length `n`
- imaginary expansion of length `n`

The fractal iteration is then performed using expansion arithmetic rather than ordinary `f32` arithmetic.

## Terminology

This spec uses the following terms:

- `n-float precision`
  - representing one real value as an ordered sum of `n` floats

- `expansion arithmetic`
  - arithmetic on these multi-float representations

- `double-single`
  - the special case `n = 2`

- `active float count`
  - the user-selected number of floats currently used by the shader

## Non-Goals

This feature does not attempt to provide:

- IEEE-754 true shader doubles
- mathematically exact arbitrary precision
- guaranteed stable deep zoom at all `n`
- performance parity with the existing single-float WebGL renderer

## User-Facing Control

Add a renderer option:

- `High Precision WebGL Rendering`

This is a separate renderer choice.

The existing renderer:

- `WebGL Rendering`

must remain unchanged in implementation and behavior.

Add a control to the explorer display section when this renderer is selected:

- `Precision Floats`

Type:

- integer number input or slider

Allowed range:

- `2..8`

Default:

- `2`

This control applies only when:

- requested renderer is `High Precision WebGL Rendering`

If the active renderer is not `High Precision WebGL Rendering`:

- the control may be disabled
- or remain visible but marked as inactive

## UI Labeling

Recommended primary label:

- `Precision Floats`

Recommended help text:

- `Experimental. Higher values can improve zoom depth but may reduce frame rate sharply.`

## Default Behavior

When `High Precision WebGL Rendering` is active:

- default active float count is `2`

This corresponds to the first higher-precision mode beyond ordinary single-float rendering.

## Rendering Model

### Existing renderer compatibility

This precision setting affects only:

- the WebGL fractal image renderer

It must not change:

- overlay rendering
- axes
- orbit overlay
- markers
- hover labels
- selection logic

### Affected calculations

The following calculations must use n-float arithmetic:

- Mandelbrot complex iteration
- Julia complex iteration
- viewport coordinate construction
- parameter `c` transport into the shader
- per-pixel coordinate mapping into the current complex viewport

Using n-float arithmetic only for the iteration body is not sufficient; viewport and input coordinate transport must also use it.

## Arithmetic Requirements

### Required operations

The implementation must support:

- addition
- subtraction
- multiplication

These are sufficient for:

- `z_(n+1) = z_n^2 + c`

### Representation

Each real value is stored as an expansion of `n` floats.

The implementation may use:

- fixed maximum arrays of length `8`
- with runtime active length `n`

This is the recommended approach for WebGL shader compatibility.

### Algorithm family

The arithmetic should be based on:

- error-free transform style addition
- error-aware multiplication
- renormalization of the expansion after operations

Examples of acceptable approaches:

- `two_sum`-style expansion addition
- `two_prod` / split-based multiplication
- fixed-width renormalized float expansions

This spec does not lock a single exact algorithm, but it requires a coherent expansion-arithmetic implementation.

## Mandelbrot and Julia Semantics

The rendered fractal meaning must remain unchanged:

- same bailout radius
- same iteration limit semantics
- same palette mapping semantics
- same viewport semantics

Only the numerical precision of the WebGL arithmetic changes.

## Performance Expectations

This renderer is experimental and must explicitly acknowledge its performance cost.

### Expected scaling

Performance cost is expected to grow superlinearly with `n`.

Rough expectation relative to current single-float WebGL:

- `n = 2`
  - approximately `4x` to `8x` shader cost
- `n = 3`
  - approximately `8x` to `18x`
- `n = 4`
  - approximately `14x` to `30x`
- `n = 5..8`
  - potentially much higher and often unsuitable for smooth interaction

These are planning estimates, not guaranteed measurements.

### UX implication

Values above `2` must be treated as increasingly expensive.

The implementation must remain compatible with:

- the explorer adaptive-quality system
- reduced interactive resolution while moving
- higher-quality rerender after settling

## Warnings and Status

The UI should communicate that this mode is experimental.

Recommended behavior:

- show a small note or status text near the control
- include current float count in the active renderer status when this renderer is active

Example:

- `Active Renderer: High Precision WebGL · Precision Floats: 2`

## Fallback and Failure Behavior

If the `High Precision WebGL Rendering` shader cannot be compiled or linked:

- fall back to the existing `WebGL Rendering` renderer if possible
- otherwise fall back according to the existing renderer fallback rules

The explorer must not hard-crash.

If a requested float count is unsupported by the implementation:

- clamp to the nearest supported value
- or fall back to `2`

The UI should continue to function.

## Persistence

The selected `Precision Floats` value should persist with explorer UI state.

On reload:

- restore the requested value
- attempt to use it again when `High Precision WebGL Rendering` is active

## Constraints

### Maximum float count

Hard maximum:

- `8`

Reason:

- shader complexity
- register pressure
- interactive feasibility
- maintainable fixed-array implementation

### Minimum float count

Minimum:

- `2`

Reason:

- the feature is specifically for multi-float precision
- `1` is already covered by the existing `WebGL Rendering` renderer

## Relationship to Existing WebGL Rendering

The current `WebGL Rendering` renderer remains the baseline.

This feature introduces a separate renderer choice rather than extending the existing `WebGL Rendering` path.

Required interpretation:

- `WebGL Rendering` continues to exist unchanged
- `High Precision WebGL Rendering` is a new renderer option
- `Precision Floats` is specific to `High Precision WebGL Rendering`

## Openly Acknowledged Risks

The spec explicitly recognizes these risks:

- severe performance degradation at high `n`
- increased shader register pressure
- driver/platform variability
- limited practical benefit if viewport coordinate transport is not also upgraded
- precision improvement that is still not equivalent to true hardware doubles

## Acceptance Criteria

1. Explorer exposes a new renderer option: `High Precision WebGL Rendering`.
2. Allowed range is `2..8`.
3. Default value is `2`.
4. The existing `WebGL Rendering` renderer remains unchanged.
5. Mandelbrot high-precision WebGL rendering uses n-float arithmetic for complex iteration.
6. Julia high-precision WebGL rendering uses n-float arithmetic for complex iteration.
6. Viewport coordinate transport into the shader also uses the n-float representation.
7. Existing overlays and interaction systems continue to work unchanged.
8. Adaptive-quality rendering remains compatible with this mode.
9. Failure to initialize the higher-precision shader does not crash the explorer.
10. The selected float count persists across reloads.

## Recommended Delivery Plan

1. Add `High Precision WebGL Rendering` as a new explorer renderer option.
2. Introduce a precision-float control in explorer state and UI for that renderer only.
3. Implement a fixed-width expansion representation up to `8` floats.
4. Implement expansion add/subtract/multiply helpers in GLSL.
5. Upgrade viewport and parameter transport to multi-float uniforms.
6. Use the new arithmetic in Mandelbrot and Julia iteration.
7. Keep the existing `WebGL Rendering` path unchanged.
8. Keep overlays and non-image explorer behavior unchanged.
9. Verify correctness at `n = 2` first before enabling broader values.
10. Profile interactive behavior and confirm adaptive-quality fallback remains effective.
