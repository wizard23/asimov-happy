# Explorer Responsive Fractal Resolution Spec

## Goal

Reduce visible pixelation in the `/explorer` fractal views by making fractal rendering resolution track the displayed canvas size and device pixel ratio, while keeping interaction responsive.

## Scope

This specification applies only to:

- Mandelbrot explorer view
- Julia set view
- explorer interactions tied to those views

This specification does not apply yet to:

- SOM workspace
- SOM map canvas
- training pipeline

## Problem Statement

Current explorer rendering uses fixed backing resolutions:

- Mandelbrot: `360x240`
- Julia: `360x360`

These are then scaled up in CSS, which causes:

- blocky Mandelbrot output
- underutilization of high-DPI displays
- no increase in detail when zooming

## Requirements

### 1. Responsive Backing Resolution

Each fractal image canvas must render using the panel’s displayed size, not a fixed hard-coded size.

Rules:

- measure the rendered canvas container size in CSS pixels
- compute backing width and height from that displayed size
- use those backing dimensions for CPU, WebGL, and future WebGPU image rendering

### 2. Device Pixel Ratio Support

Backing resolution must scale by `window.devicePixelRatio`.

Rules:

- `backingWidth = round(displayWidth * devicePixelRatio * qualityScale)`
- `backingHeight = round(displayHeight * devicePixelRatio * qualityScale)`
- cap DPR-scaled size with a performance limit

### 3. Resolution Caps

To avoid runaway CPU or GPU cost, apply configurable maximum dimensions.

Initial recommended caps:

- Mandelbrot max backing width: `2048`
- Mandelbrot max backing height: `1365`
- Julia max backing width: `2048`
- Julia max backing height: `2048`

Caps apply after DPR scaling and quality scaling.

### 4. Two Quality Levels Optimization

The explorer must support an optional optimization with two quality levels:

- interactive quality
- settled quality

Behavior when optimization is enabled:

- while dragging, wheel-zooming, or rapidly hover-updating, render at reduced scale
- after a short idle delay, rerender at full quality

Required user-facing control:

- Checkbox label: `Two Quality Levels`
- Default: enabled

Semantics:

- enabled: use reduced interactive quality and full settled quality
- disabled: always render at full quality

Initial required scales:

- interactive scale: `0.2`
- settled scale: `1.0`

Recommended idle delay:

- `120ms` to `200ms`

### 5. Backend Independence

The resolution system must work consistently for:

- CPU renderer
- WebGL renderer
- future WebGPU renderer

The renderer API must consume dynamic width and height values rather than fixed constants.

### 6. Overlay Alignment

Overlay layers must stay aligned with the rendered fractal image at all sizes.

This applies to:

- axes
- orbit
- red selected marker
- blue live-preview marker
- coordinate badge positioning

Overlay coordinates must derive from the same current backing and display geometry as the fractal image.

### 7. Resize Handling

Explorer canvases must rerender when:

- window size changes
- layout changes change panel size
- zen mode toggles
- device pixel ratio changes

Preferred implementation:

- `ResizeObserver` on the canvas frame or image container
- recompute display size and backing resolution from the observed box

### 8. Canvas Layout Modes

Fractal canvases must support the following layout use cases:

#### A. Fixed size with fixed ratio

Examples:

- explicit `360x240`
- explicit `720x720`

Rules:

- displayed width and height are fixed
- backing resolution derives from those displayed dimensions and DPR

#### B. Fixed ratio with either fixed width or fixed height

Examples:

- width constrained by layout, height derived from aspect ratio
- height constrained by layout, width derived from aspect ratio

Rules:

- displayed size is solved from one fixed dimension plus aspect ratio
- backing resolution derives from the solved displayed dimensions and DPR

#### C. Fill given area

Examples:

- fullscreen
- zen mode
- a parent panel with a target bounding box

Rules:

- canvas must be able to fill the assigned area
- implementation must define whether the fractal image is contained or cropped
- overlays must remain aligned in this mode

For v1, default behavior should remain visually compatible with the current explorer layout unless a specific fullscreen mode requires different fitting behavior.

## Rendering Model

Each explorer fractal panel should have:

- measured display size in CSS pixels
- derived backing resolution in device pixels
- renderer invoked with backing width and height
- overlay layer sized to the same displayed box

The image canvas should:

- set `canvas.width` and `canvas.height` to backing resolution
- keep CSS size equal to display size

## Behavioral Requirements

1. Mandelbrot no longer appears obviously blocky on large screens.
2. Julia also benefits from DPR-aware rendering.
3. Panning and zooming remain responsive.
4. Final image sharpens after interaction stops when `Two Quality Levels` is enabled.
5. Full-quality rendering is used continuously when `Two Quality Levels` is disabled.
6. WebGL and CPU modes both use the same sizing policy.
7. Overlays remain correctly aligned during interaction and after rerender.
8. All three required layout modes are supported.

## Failure and Fallback Behavior

If measured size is unavailable or zero:

- skip render for that frame
- retry on the next layout, resize, or state-change event

If full-resolution render fails due to resource constraints:

- fall back to lower backing resolution
- do not crash the explorer

## Acceptance Criteria

1. Explorer no longer uses fixed `360x240` and `360x360` backing resolutions for displayed fractal output.
2. Backing resolution follows actual display size and DPR.
3. Mandelbrot looks visibly sharper on high-resolution displays.
4. Interaction remains smooth during drag, zoom, and live preview.
5. A higher-quality rerender occurs after interaction settles when `Two Quality Levels` is enabled.
6. Full-quality rendering is continuous when `Two Quality Levels` is disabled.
7. Overlays remain aligned with the fractal image.
8. CPU and WebGL backends both support the sizing system.
9. Fractal canvases support:
   - fixed size with fixed ratio
   - fixed ratio with either fixed width or fixed height
   - fill given area

