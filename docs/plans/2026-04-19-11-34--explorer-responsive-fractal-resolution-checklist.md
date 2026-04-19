# Explorer Responsive Fractal Resolution Checklist

## Goal

Implement responsive, DPR-aware fractal rendering for the `/explorer` route according to:

- [2026-04-19-11-34--explorer-responsive-fractal-resolution-spec.md](/home/wizard/projects/asimov/asimov-happy/docs/specs/2026-04-19-11-34--explorer-responsive-fractal-resolution-spec.md)

## Phase 1: Measurement Model

- [ ] Introduce a shared display-size model for explorer fractal panels
- [ ] Add `ResizeObserver`-based measurement for Mandelbrot panel size
- [ ] Add `ResizeObserver`-based measurement for Julia panel size
- [ ] Handle zero-size and not-yet-measured states safely

## Phase 2: Layout Modes

- [ ] Define layout primitives for:
  - fixed size with fixed ratio
  - fixed ratio with fixed width or fixed height
  - fill given area
- [ ] Verify Mandelbrot canvas can use these primitives
- [ ] Verify Julia canvas can use these primitives
- [ ] Preserve overlay alignment in each layout mode

## Phase 3: Backing Resolution

- [ ] Replace fixed Mandelbrot backing size with dynamic width and height
- [ ] Replace fixed Julia backing size with dynamic width and height
- [ ] Scale backing resolution by `window.devicePixelRatio`
- [ ] Apply configured maximum backing-resolution caps

## Phase 4: Renderer Integration

- [ ] Ensure CPU renderer accepts dynamic dimensions everywhere
- [ ] Ensure WebGL renderer accepts dynamic dimensions everywhere
- [ ] Keep renderer API backend-independent for future WebGPU support
- [ ] Verify renderer switching still works after dynamic sizing

## Phase 5: Two Quality Levels Optimization

- [ ] Add `Two Quality Levels` checkbox to `/explorer`
- [ ] Default checkbox to enabled
- [ ] Implement interactive quality scale `0.2`
- [ ] Implement settled quality scale `1.0`
- [ ] Add idle-delay rerender behavior
- [ ] Disable reduced-quality rendering when checkbox is off

## Phase 6: Overlay Alignment

- [ ] Verify axes remain aligned at all backing resolutions
- [ ] Verify orbit remains aligned at all backing resolutions
- [ ] Verify selected marker remains aligned at all backing resolutions
- [ ] Verify live-preview marker remains aligned at all backing resolutions
- [ ] Verify coordinate badge positioning remains correct

## Phase 7: Resize and Mode Changes

- [ ] Verify rerender on window resize
- [ ] Verify rerender on zen mode toggle
- [ ] Verify rerender on layout-driven panel-size change
- [ ] Verify rerender on device-pixel-ratio change when detectable

## Phase 8: Performance and Fallbacks

- [ ] Verify interaction remains responsive with `Two Quality Levels` enabled
- [ ] Verify full-quality continuous mode behaves correctly when the checkbox is off
- [ ] Add lower-resolution fallback if full backing resolution fails
- [ ] Ensure the explorer does not hard-crash on render-size pressure

## Phase 9: Final Verification

- [ ] Run `npm run build`
- [ ] Run `npm run lint`
- [ ] Manually test CPU mode on `/explorer`
- [ ] Manually test WebGL mode on `/explorer`
- [ ] Manually test:
  - fixed size with fixed ratio
  - fixed ratio with fixed width
  - fixed ratio with fixed height
  - fill given area
- [ ] Confirm all acceptance criteria from the spec are met
