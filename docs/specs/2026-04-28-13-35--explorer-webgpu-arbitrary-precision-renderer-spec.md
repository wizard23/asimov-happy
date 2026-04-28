# Explorer WebGPU Arbitrary-Precision Renderer Spec

## Scope

This spec applies to the `/explorer` route only.

It covers:

- a new compute-based renderer inspired by `docs/alien/FractalShaderArbPrec`
- arbitrary-precision Mandelbrot rendering
- arbitrary-precision Julia rendering
- renderer-specific explorer controls
- incremental rendering and reuse behavior

It does not apply to:

- the existing `CPU Rendering`
- the existing `WebGL Rendering`
- the existing `High Precision WebGL Rendering`
- the SOM route
- non-explorer render paths

## Goal

Add a new separate renderer called:

- `Arbitrary Precision WebGPU Rendering`

This renderer must use explicit multi-limb integer-style arithmetic for the complex state rather than:

- ordinary `f32`
- JavaScript `Number`
- `n`-float expansion arithmetic

The purpose of this renderer is to support materially deeper and more stable zoom than the current WebGL-based renderers.

## Motivation

The earlier `High Precision WebGL Rendering` work showed that modest multi-float fragment-shader arithmetic does not deliver enough practical deep-zoom improvement in the current architecture.

The alien implementation in:

- [docs/alien/FractalShaderArbPrec](/home/wizard/projects/asimov/asimov-happy/docs/alien/FractalShaderArbPrec)

uses a more structurally appropriate technique:

- per-pixel arbitrary-precision state
- integer limb arithmetic
- compute-style dispatch
- incremental iteration
- reuse of previous iteration results

This spec adopts that architectural direction for a new renderer.

## Non-Goals

This renderer does not attempt to:

- preserve implementation compatibility with the current WebGL shader pipeline
- keep parity with the current WebGL renderer structure
- guarantee smooth full-frame recomputation at all zoom levels
- provide mathematically certified exact rendering
- replace the existing renderers

## New Renderer

Add a new explorer renderer option:

- `Arbitrary Precision WebGPU Rendering`

This must be a separate renderer choice.

The following existing renderer options must remain unchanged in behavior:

- `CPU Rendering`
- `WebGL Rendering`
- `High Precision WebGL Rendering`

## Hard Platform Assumption

This renderer is based on WebGPU compute, not WebGL.

The intended architectural match is:

- storage buffers for persistent per-pixel state
- compute passes for initialization, iteration, and coloring
- explicit buffer and texture management

This renderer must not be specified as a WebGL fallback implementation.

If WebGPU is unavailable, this renderer must fail gracefully and the explorer must remain usable by switching to one of the existing renderers.

## Summary Of The Rendering Model

Each complex component is stored as:

- sign
- fixed number of limbs

The limb base should be a power-of-two radix compatible with efficient GPU integer arithmetic.

The alien implementation uses:

- base `65536`
- effectively `16` useful bits per limb

That is the recommended baseline for this renderer as well.

Each pixel persists:

- current iteration count
- current `z`
- current `c` or access to shared `c`
- optional prior-frame reuse metadata

The renderer is split into at least these logical stages:

1. coordinate initialization
2. iterative update
3. coloring / display conversion

## User-Facing Controls

### Renderer selection

Add:

- `Arbitrary Precision WebGPU Rendering`

to the renderer dropdown.

### Precision limbs

When this renderer is selected, show:

- `Precision Limbs`

Type:

- integer input or slider

Allowed range:

- `2..32`

Default:

- `12`

Reason:

- the alien implementation defaults to `12`
- `12` is a reasonable initial deep-zoom target
- lower values may be faster
- higher values may support deeper zoom at sharply higher cost

### Iteration chunk size

When this renderer is selected, show:

- `Iterations Per Pass`

Allowed range:

- `1..256`

Default:

- `32`

This controls how many recurrence iterations one compute dispatch advances before the image is presented.

### Reuse toggle

When this renderer is selected, show:

- `Reuse Previous Iteration State`

Type:

- checkbox

Default:

- enabled

This controls whether prior iteration textures and buffers may be reused during pan/zoom updates.

## Advanced Settings Placement

The new renderer-specific controls should live in the left settings panel.

Recommended layout:

- render backend section
- renderer-specific subsection shown only when `Arbitrary Precision WebGPU Rendering` is active

Recommended controls in that subsection:

- `Precision Limbs`
- `Iterations Per Pass`
- `Reuse Previous Iteration State`

Additional internal tuning controls are not required in v1.

## Number Representation

### Required representation

Each real value must be represented as:

- one sign indicator
- fixed-width limb array

Recommended baseline:

- one sign slot
- `Precision Limbs` magnitude limbs
- radix `2^16`

This matches the core idea of the alien implementation and avoids dependence on shader floating-point precision for orbit evolution.

### Required precision behavior

The following quantities must use the limb representation:

- Mandelbrot viewport center
- Julia viewport center
- Julia parameter `c`
- per-pixel initial coordinate
- per-pixel `z`
- per-pixel `c` where applicable
- intermediate arithmetic during iteration

It is not sufficient to use arbitrary precision only for a subset of the recurrence.

## Arithmetic Requirements

### Required operations

The renderer must support:

- comparison of magnitudes
- signed addition
- signed subtraction
- signed multiplication
- multiply-by-two or equivalent shift path

These operations are sufficient for:

- `z_(n+1) = z_n^2 + c`

### Arithmetic model

The arithmetic should follow a fixed-width limb approach:

- schoolbook multiply in v1 is acceptable
- carry propagation must be explicit
- sign handling must be explicit
- truncation strategy must be defined and consistent

### Recommended v1 truncation rule

Use fixed-width arithmetic that preserves the most significant limbs after each operation.

This is acceptable for v1 because:

- it matches the alien implementation style
- it is much simpler than dynamically growing precision
- it keeps storage layout predictable on GPU buffers

## Initialization Stage

### Purpose

For each pixel, initialize:

- `z`
- `c`
- iteration count

### Mandelbrot

For Mandelbrot:

- `z0 = 0`
- `c` is derived from the pixel coordinate in the current viewport

### Julia

For Julia:

- `z0` is derived from the pixel coordinate in the current viewport
- `c` is the current selected Julia parameter

### Coordinate construction

Coordinate construction must be performed from high-precision viewport state, not from `f32` pixel-space interpolation alone.

The initialization step may use mixed precision internally, but the final stored per-pixel values must be written into limb form.

## Iteration Stage

### Required behavior

The renderer must support advancing the fractal in chunks rather than requiring all iterations in one pass.

Each dispatch should advance at most:

- `Iterations Per Pass`

additional recurrence steps for each unfinished pixel.

### Persistent state

The iteration stage must operate on persistent GPU buffers so that:

- work done in one pass is available to the next pass
- the renderer can progressively refine the image

### Completion semantics

A pixel is considered finished for the current frame when either:

- it has escaped
- it has reached the current max iteration limit

## Escape Testing

The renderer may use an approximate bailout test derived from the leading limbs of the arbitrary-precision magnitude.

This is acceptable in v1, provided that:

- the orbit evolution itself remains limb-based
- the bailout approximation is derived from the arbitrary-precision state
- the approximation is stable enough not to collapse immediately back to ordinary `f32` behavior

The bailout threshold should match the renderer’s chosen smoothing model and be internally consistent.

## Coloring Stage

### Separation of concerns

Coloring should be a separate compute or render step, not fused into the main arbitrary-precision iteration logic unless profiling later proves fusion superior.

### Inputs

The coloring stage consumes:

- current iteration count buffer
- current palette settings
- optional prior frame reuse textures or buffers

### Reuse behavior

The renderer should support reusing prior iteration data across viewport updates.

This is a key architectural requirement, not an optional optimization, because it is one of the main reasons this renderer can remain interactive at all.

### Palette compatibility

The new renderer must respect the existing explorer coloring modes where feasible:

- linear
- logarithmic
- cyclic
- cyclic mirrored
- binary
- escape bands

If a v1 limitation exists, it must be explicit and renderer-scoped.

## Interaction Semantics

This renderer must integrate with existing explorer behavior:

- pan
- zoom
- marker overlays
- hover readouts
- Julia parameter selection
- zen mode

The renderer must not change the overlay or interaction model.

It only changes how the fractal image is produced.

## Update Policy

### Full invalidation cases

The renderer must fully reinitialize per-pixel state when any of the following change:

- renderer selection into this renderer
- Mandelbrot viewport reset
- Julia viewport reset
- selected Julia parameter `c`
- precision limb count
- image dimensions

### Partial reuse cases

The renderer may reuse prior state during:

- small pan changes
- small zoom changes
- palette-only changes

Palette-only changes should not force recomputation of the arbitrary-precision orbit state.

## Performance Expectations

This renderer is expected to be substantially slower per fresh recomputation than:

- `WebGL Rendering`
- `High Precision WebGL Rendering`

The main cost drivers are:

- limb-based multiplication
- persistent buffer traffic
- multiple compute passes

### Cost model

With schoolbook multiplication, one multiply is roughly:

- `O(L^2)`

where:

- `L = Precision Limbs`

Each Mandelbrot or Julia iteration requires multiple such operations.

Therefore runtime cost will grow sharply as `Precision Limbs` increases.

### Expected practical behavior

Expected v1 behavior:

- low limbs with low iteration counts may remain moderately interactive
- default `12` limbs will likely require progressive refinement
- high limb counts should be considered expensive and possibly slow

The renderer should therefore optimize for:

- visible progressive improvement
- responsiveness under incremental refinement

not:

- instant full-quality recomputation every frame

## Fallback Behavior

If WebGPU initialization fails, the explorer must:

- show a clear renderer availability message
- preserve the requested setting in UI if reasonable
- fall back to a working renderer only after explicit or defined app behavior

Recommended fallback target:

- `WebGL Rendering`

## Diagnostics

When this renderer is active, the overlay or diagnostics area should expose at least:

- active renderer name
- active precision limb count
- active iterations per pass

This is important because visual changes may be progressive and slower than the other renderers.

## Acceptance Criteria

1. A new renderer called `Arbitrary Precision WebGPU Rendering` exists in `/explorer`.
2. The existing WebGL and CPU renderers remain unchanged.
3. Mandelbrot and Julia rendering under this mode use limb-based arbitrary-precision state rather than ordinary `f32` orbit updates.
4. The renderer uses persistent GPU state and incremental iteration rather than a single-shot fragment pipeline.
5. `Precision Limbs` is user-configurable with default `12`.
6. `Iterations Per Pass` is user-configurable.
7. Palette-only changes do not require full orbit recomputation.
8. The renderer supports both normal explorer mode and zen mode.
9. The renderer fails gracefully when WebGPU is unavailable.

## Recommended Implementation Phases

### Phase 1

- add renderer selection and availability plumbing
- create WebGPU device / pipeline bootstrap
- implement Mandelbrot initialization and iteration with fixed limb count
- render grayscale or simple iteration visualization first

### Phase 2

- add Julia support
- add full coloring pass
- add persistent state reuse

### Phase 3

- wire explorer controls
- add palette mode compatibility
- add progressive diagnostics and performance tuning

## Notes

This renderer is inspired by the alien implementation but is not required to be a literal line-by-line port.

The key ideas that must be preserved are:

- multi-limb complex state
- compute-based iteration
- persistent GPU buffers
- progressive refinement
- reuse of prior results where possible
