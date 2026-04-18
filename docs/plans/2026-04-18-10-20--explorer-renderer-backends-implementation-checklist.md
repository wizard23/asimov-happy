# Explorer Renderer Backends Implementation Checklist

## Goal

Implement selectable explorer rendering backends according to:

- [2026-04-18-10-20--explorer-renderer-backends-spec.md](/home/wizard/projects/asimov/asimov-happy/docs/specs/2026-04-18-10-20--explorer-renderer-backends-spec.md)

## Phase 1: Architecture

- [ ] Introduce a renderer domain model for:
  - requested renderer
  - active renderer
  - fallback reason
- [ ] Define a shared explorer renderer interface for Mandelbrot and Julia image rendering
- [ ] Split fractal image rendering from explorer overlays
- [ ] Preserve current CPU rendering as the baseline implementation

## Phase 2: UI and State

- [ ] Add `Renderer` dropdown to `/explorer`
- [ ] Add `Active Renderer` status line to `/explorer`
- [ ] Default requested renderer to `WebGL Rendering`
- [ ] Persist requested renderer in local storage
- [ ] Implement runtime fallback status messaging

## Phase 3: CPU Renderer

- [ ] Wrap current Mandelbrot CPU implementation behind the renderer abstraction
- [ ] Wrap current Julia CPU implementation behind the renderer abstraction
- [ ] Verify parity with current explorer behavior

## Phase 4: Overlay Separation

- [ ] Ensure axes render independently from fractal backend
- [ ] Ensure orbit render independently from fractal backend
- [ ] Ensure selected marker render independently from fractal backend
- [ ] Ensure live-preview marker render independently from fractal backend
- [ ] Keep overlay coordinates aligned with zoom/pan state

## Phase 5: WebGL Renderer

- [ ] Add WebGL capability detection
- [ ] Initialize WebGL rendering surfaces for Mandelbrot and Julia
- [ ] Implement Mandelbrot fragment-shader rendering
- [ ] Implement Julia fragment-shader rendering
- [ ] Map explorer palette selection into WebGL uniforms
- [ ] Handle resize and viewport updates cleanly
- [ ] Implement fallback to CPU if WebGL init fails

## Phase 6: WebGPU Renderer

- [ ] Add WebGPU capability detection
- [ ] Implement adapter/device acquisition
- [ ] Implement Mandelbrot WebGPU rendering pipeline
- [ ] Implement Julia WebGPU rendering pipeline
- [ ] Map explorer palette selection into WebGPU uniforms/buffers
- [ ] Implement fallback to WebGL if WebGPU init fails
- [ ] Implement fallback to CPU if both GPU paths fail

## Phase 7: Behavior Verification

- [ ] Verify renderer switching preserves selected point
- [ ] Verify renderer switching preserves live preview behavior
- [ ] Verify renderer switching preserves orbit settings
- [ ] Verify renderer switching preserves axis visibility
- [ ] Verify renderer switching preserves palette selection
- [ ] Verify renderer switching preserves zoom state if feasible
- [ ] Verify Mandelbrot and Julia remain in sync for the active parameter

## Phase 8: Compatibility and Failure Cases

- [ ] Verify CPU-only browsers still function
- [ ] Verify browsers without WebGPU fall back correctly
- [ ] Verify browsers without usable WebGL fall back correctly
- [ ] Verify initialization failures do not hard-crash the page
- [ ] Verify active-renderer status text is accurate

## Phase 9: Final Verification

- [ ] Run `npm run build`
- [ ] Run `npm run lint`
- [ ] Manually test `/explorer` with:
  - `CPU Rendering`
  - `WebGL Rendering`
  - `WebGPU Rendering`
- [ ] Confirm acceptance criteria from the spec are met
