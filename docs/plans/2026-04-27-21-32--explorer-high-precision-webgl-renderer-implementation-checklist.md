# Explorer High Precision WebGL Renderer Implementation Checklist

## Goal

Implement the separate explorer renderer:

- `High Precision WebGL Rendering`

with:

- `Precision Floats` control
- range `2..8`
- default `2`

while keeping the existing:

- `WebGL Rendering`

path unchanged.

## Guiding Constraints

- `n = 2` should use a specialized double-single implementation
- `n = 3..8` should use a fixed-width renormalized expansion path
- viewport and parameter transport must use multi-float decomposition
- overlays and explorer interaction must remain unchanged
- adaptive-quality rendering must continue to work

## Phase 1: UI and Renderer Selection

- [ ] Add new renderer id for `High Precision WebGL Rendering`
- [ ] Add the new renderer to the explorer renderer dropdown
- [ ] Keep existing `WebGL Rendering` unchanged
- [ ] Add `Precision Floats` UI control
- [ ] Show `Precision Floats` only when `High Precision WebGL Rendering` is selected
- [ ] Enforce allowed range `2..8`
- [ ] Set default to `2`
- [ ] Persist selected float count in explorer state
- [ ] Update active-renderer status text to include float count when this renderer is active

## Phase 2: Renderer API Extension

- [ ] Extend explorer renderer configuration to carry active float count
- [ ] Keep CPU renderer interface working without change in behavior
- [ ] Introduce a separate high-precision WebGL renderer implementation file
- [ ] Ensure renderer fallback logic can fall back from high-precision WebGL to ordinary WebGL or CPU

## Phase 3: CPU-Side Float Decomposition

- [ ] Implement decomposition of JS `Number` values into `n` float components
- [ ] Support decomposition for:
  - viewport min/max real
  - viewport min/max imaginary
  - Julia parameter real
  - Julia parameter imaginary
- [ ] Verify decomposition ordering is stable and deterministic
- [ ] Confirm that `n = 2` decomposition matches the intended double-single transport model

## Phase 4: High Precision GLSL Helpers

- [ ] Add shader-side fixed maximum width support up to `8`
- [ ] Implement dedicated `n = 2` double-single helpers
- [ ] Implement generic fixed-width expansion helpers for `n = 3..8`
- [ ] Implement expansion add
- [ ] Implement expansion subtract
- [ ] Implement expansion multiply
- [ ] Implement renormalization / canonicalization after operations
- [ ] Avoid assuming portable FMA availability

## Phase 5: High Precision Coordinate Reconstruction

- [ ] Reconstruct Mandelbrot pixel coordinates from multi-float viewport data
- [ ] Reconstruct Julia pixel coordinates from multi-float viewport data
- [ ] Ensure normalized pixel coordinates are combined into complex coordinates using expansion arithmetic
- [ ] Verify top-left-origin coordinate conventions remain identical to current renderer behavior

## Phase 6: Mandelbrot Iteration

- [ ] Implement Mandelbrot iteration with high-precision arithmetic
- [ ] Preserve current bailout semantics
- [ ] Preserve current iteration-limit semantics
- [ ] Preserve current palette mapping behavior
- [ ] Preserve current binary mode behavior
- [ ] Preserve current escape-bands behavior

## Phase 7: Julia Iteration

- [ ] Implement Julia iteration with high-precision arithmetic
- [ ] Preserve current bailout semantics
- [ ] Preserve current iteration-limit semantics
- [ ] Preserve current palette mapping behavior
- [ ] Preserve current binary mode behavior
- [ ] Preserve current escape-bands behavior

## Phase 8: Integration With Existing Explorer UX

- [ ] Ensure Mandelbrot hover, click, and live preview still work
- [ ] Ensure Julia click-to-select still works
- [ ] Ensure markers remain unchanged
- [ ] Ensure axes and orbit overlays remain unchanged
- [ ] Ensure zen mode still works
- [ ] Ensure touch interactions remain unchanged

## Phase 9: Adaptive Quality and Performance Safety

- [ ] Keep compatibility with coarse/settled quality switching
- [ ] Confirm rendering still works with responsive backing resolution
- [ ] Confirm staging/fallback behavior still works if used by the image pipeline
- [ ] Add internal guardrails if very high `n` values create obvious instability or failure

## Phase 10: Fallback Behavior

- [ ] If high-precision shader compile/link fails, fall back to ordinary WebGL if possible
- [ ] If ordinary WebGL is unavailable, fall back to CPU
- [ ] Expose a useful active-renderer status message explaining the fallback

## Phase 11: Verification

- [ ] Build passes
- [ ] Lint passes
- [ ] Manual browser verification in ordinary `WebGL Rendering`
  - confirm unchanged behavior
- [ ] Manual browser verification in `High Precision WebGL Rendering`
  - `n = 2`
  - `n = 3`
  - `n = 4`
- [ ] Verify deep-zoom improvement at `n = 2` relative to ordinary WebGL
- [ ] Verify palette modes still behave correctly
- [ ] Verify zen mode still behaves correctly

## Recommended Delivery Order

1. UI, renderer id, and persisted state
2. CPU-side float decomposition
3. Specialized `n = 2` shader path
4. Mandelbrot integration
5. Julia integration
6. Fallback and status handling
7. Generic `n = 3..8` expansion path
8. Performance tuning and manual QA

## Recommended First Milestone

Ship a first milestone with:

- separate renderer selection
- working `n = 2`
- stable fallback behavior
- no regression in ordinary `WebGL Rendering`

Only after that:

- expand to `n = 3..8`
- tune generic expansion performance
