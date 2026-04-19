# Explorer Responsive Fractal Resolution Checklist

## Goal

Implement responsive, DPR-aware fractal rendering for the `/explorer` route according to:

- [2026-04-19-11-34--explorer-responsive-fractal-resolution-spec.md](/home/wizard/projects/asimov/asimov-happy/docs/specs/2026-04-19-11-34--explorer-responsive-fractal-resolution-spec.md)

## Phase 1: Measurement Model

- [x] Introduce a shared display-size model for explorer fractal panels
- [x] Add `ResizeObserver`-based measurement for Mandelbrot panel size
- [x] Add `ResizeObserver`-based measurement for Julia panel size
- [x] Handle zero-size and not-yet-measured states safely

## Phase 2: Layout Modes

- [x] Define layout primitives for:
  - fixed size with fixed ratio
  - fixed ratio with fixed width or fixed height
  - fill given area
- [x] Verify Mandelbrot canvas can use these primitives
- [x] Verify Julia canvas can use these primitives
- [ ] Preserve overlay alignment in each layout mode

## Phase 3: Backing Resolution

- [x] Replace fixed Mandelbrot backing size with dynamic width and height
- [x] Replace fixed Julia backing size with dynamic width and height
- [x] Scale backing resolution by `window.devicePixelRatio`
- [x] Apply configured maximum backing-resolution caps

## Phase 4: Renderer Integration

- [x] Ensure CPU renderer accepts dynamic dimensions everywhere
- [x] Ensure WebGL renderer accepts dynamic dimensions everywhere
- [x] Keep renderer API backend-independent for future WebGPU support
- [ ] Verify renderer switching still works after dynamic sizing

## Phase 5: Two Quality Levels Optimization

- [x] Add `Two Quality Levels` checkbox to `/explorer`
- [x] Default checkbox to enabled
- [x] Implement interactive quality scale `0.2`
- [x] Implement settled quality scale `1.0`
- [x] Add idle-delay rerender behavior
- [x] Disable reduced-quality rendering when checkbox is off

## Phase 6: Overlay Alignment

- [x] Verify axes remain aligned at all backing resolutions
- [x] Verify orbit remains aligned at all backing resolutions
- [x] Verify selected marker remains aligned at all backing resolutions
- [x] Verify live-preview marker remains aligned at all backing resolutions
- [x] Verify coordinate badge positioning remains correct

## Phase 7: Resize and Mode Changes

- [x] Verify rerender on window resize
- [x] Verify rerender on zen mode toggle
- [x] Verify rerender on layout-driven panel-size change
- [x] Verify rerender on device-pixel-ratio change when detectable

## Phase 8: Performance and Fallbacks

- [ ] Verify interaction remains responsive with `Two Quality Levels` enabled
- [ ] Verify full-quality continuous mode behaves correctly when the checkbox is off
- [x] Add lower-resolution fallback if full backing resolution fails
- [x] Ensure the explorer does not hard-crash on render-size pressure

## Phase 9: Final Verification

- [x] Run `npm run build`
- [x] Run `npm run lint`
- [ ] Manually test CPU mode on `/explorer`
- [ ] Manually test WebGL mode on `/explorer`
- [ ] Manually test:
  - fixed size with fixed ratio
  - fixed ratio with fixed width
  - fixed ratio with fixed height
  - fill given area
- [ ] Confirm all acceptance criteria from the spec are met
