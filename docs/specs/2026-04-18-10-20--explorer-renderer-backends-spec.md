# Explorer Renderer Backends Spec

## Goal

Add selectable rendering backends for the `/explorer` route:

- `CPU Rendering`
- `WebGL Rendering`
- `WebGPU Rendering`

The system must prefer GPU rendering when available, but always remain functional through fallback behavior.

## Scope

This specification applies only to:

- Mandelbrot explorer view
- Julia set view
- explorer interactions tied to those views

This specification does not apply yet to:

- SOM workspace
- SOM map rendering
- training worker pipeline

## UI

Add a dropdown in the explorer controls:

- Label: `Renderer`
- Options:
  - `CPU Rendering`
  - `WebGL Rendering`
  - `WebGPU Rendering`

Add a status line near the dropdown:

- Label: `Active Renderer`
- Example values:
  - `CPU`
  - `WebGL`
  - `WebGPU`
  - `WebGL (WebGPU unavailable)`
  - `CPU (WebGL initialization failed)`

## Requested vs Active Renderer

The dropdown controls the requested renderer.

The app computes the active renderer from runtime availability and initialization success.

Examples:

- Requested `WebGL`, WebGL available -> active `WebGL`
- Requested `WebGL`, WebGL unavailable -> active `CPU`
- Requested `WebGPU`, WebGPU unavailable, WebGL available -> active `WebGL`
- Requested `WebGPU`, both GPU paths unavailable -> active `CPU`

## Default Behavior

- Default requested renderer: `WebGL Rendering`
- On first load, if WebGL is unavailable, fall back automatically
- Renderer preference must persist in local storage

## Fallback Rules

### Requested `CPU Rendering`

- Always use CPU
- No fallback is needed unless the CPU path throws unexpectedly

### Requested `WebGL Rendering`

- Try WebGL
- If unavailable or initialization fails, fall back to CPU

### Requested `WebGPU Rendering`

- Try WebGPU
- If unavailable or initialization fails, fall back to WebGL
- If WebGL is also unavailable or fails, fall back to CPU

Fallback must not crash the page.

## Support Matrix

All active renderers must support:

- Mandelbrot image rendering
- Julia image rendering
- palette selection
- Mandelbrot pan/zoom
- Julia pan/zoom
- live preview
- selected-point marker
- live-preview marker
- orbit overlay
- axes overlay

## Rendering Architecture

Use layered rendering.

Recommended structure per fractal panel:

- base rendering surface for fractal image
- overlay rendering layer for UI overlays

Fractal image responsibilities:

- CPU path may continue using 2D canvas image upload
- WebGL path renders via shader/program
- WebGPU path renders via GPU pipeline

Overlay layer responsibilities:

- axes
- orbit
- selected marker
- live-preview marker
- textual coordinate badge if retained

Overlays should remain backend-independent.

## Behavioral Requirements

Renderer switching must:

- update both Mandelbrot and Julia panels
- preserve current explorer state
- not reset:
  - selected point
  - hover behavior
  - live preview mode
  - orbit settings
  - axis visibility
  - palette
  - zoom state unless technically unavoidable

If a reset is unavoidable in v1, it must be explicitly documented and minimized.

## Visual Consistency

Backends should match closely in:

- palette mapping
- fractal framing
- interaction semantics
- overlay positions

Exact pixel identity is not required.

Visible mismatches should be minor.

## Capability Detection

### WebGL availability

- detect browser support
- require successful context creation before activation

### WebGPU availability

- detect `navigator.gpu`
- require successful adapter and device acquisition before activation

Detection must happen at runtime in browser code.

## Error Handling

If the requested backend cannot be activated:

- automatically fall back
- expose the reason in active-renderer status text
- avoid modal errors unless all rendering fails

Examples:

- `Active Renderer: CPU (WebGL unavailable)`
- `Active Renderer: WebGL (WebGPU initialization failed)`

## Persistence

Persist the requested renderer in local storage.

Rules:

- store requested renderer, not active renderer
- on reload, retry the requested renderer
- fall back again if necessary

## Performance Expectations

- CPU: compatibility path
- WebGL: primary production renderer
- WebGPU: experimental but functional path

WebGL should become the practical default for explorer usage.

## Non-Goals

Not required in this feature:

- refactoring SOM training to GPU
- GPU acceleration for SOM workspace
- exact parity benchmarking framework
- cross-tab synchronization
- server-side rendering concerns

## Acceptance Criteria

1. Explorer shows a `Renderer` dropdown with the three specified options.
2. Explorer shows an `Active Renderer` status line.
3. Default requested renderer is `WebGL Rendering`.
4. If WebGL is unavailable, explorer still works with CPU automatically.
5. If WebGPU is selected and unavailable, explorer falls back to WebGL or CPU automatically.
6. Mandelbrot and Julia both render under all supported active backends.
7. Axes, orbit, selected marker, and live-preview marker still work regardless of backend.
8. Renderer choice persists across reloads.
9. Renderer switching does not break pan/zoom, live preview, or selection behavior.
10. No hard crash occurs when GPU backend initialization fails.
