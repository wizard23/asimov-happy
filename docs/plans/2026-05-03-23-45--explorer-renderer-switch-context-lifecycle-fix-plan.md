# Explorer Renderer Switch Context Lifecycle Fix Plan

Date: `2026-05-03 23:45` Europe/Vienna

## Problem Summary

Renderer switching in the explorer is currently structurally unsafe.

Confirmed failure:

- switching from `WebGL Rendering` to `CPU Rendering` fails with:
  - `ERR 2D canvas context unavailable for explorer image presentation.`

Strongly indicated additional failures:

- `WebGL Rendering` <-> `Arbitrary Precision WebGL Rendering`
- `Arbitrary Precision WebGL Rendering` -> `CPU Rendering`

Root cause:

- the same visible canvas element is reused across renderer families that require different context types
- current renderer families assume incompatible context ownership:
  - CPU presentation path expects `2d`
  - plain WebGL expects `webgl`
  - AP WebGL expects `webgl2`

This is not a one-off bug. It is a renderer-lifecycle architecture bug.

## Goal

Fix renderer switching in a clean way that:

- prevents incompatible context reuse
- removes renderer-family switching hazards
- avoids future regressions of the same class
- keeps the codebase high-quality and performance-conscious

## Design Principle

Visible render surfaces must have explicit ownership.

The system should never rely on a single DOM canvas being able to mutate across:

- `2d`
- `webgl`
- `webgl2`

Instead, the app should make renderer-family ownership explicit and stable.

## Recommended Architectural Direction

Introduce renderer-surface families and stop sharing one visible image canvas across incompatible families.

Recommended family model:

1. `cpu-2d`
2. `webgl`
3. `webgl2`

Each family gets its own visible image canvas element or its own clearly owned presentation path.

The active renderer should render only into a surface that belongs to its family.

## Recommended Fix Strategy

### Option to implement

Use separate visible image canvases per renderer family and toggle which one is active.

Reason:

- cleanest lifecycle model
- avoids illegal context switching entirely
- avoids hidden state contamination in per-canvas renderer caches
- scales better if more renderers are added later

## Planned Work

### 1. Inventory current renderer family assumptions

Inspect and document:

- which renderers use `2d`
- which renderers use `webgl`
- which renderers use `webgl2`
- which helpers assume staging/presentation into a specific visible canvas type

Expected result:

- explicit mapping from renderer id to surface family

### 2. Define a renderer-family abstraction

Introduce a small internal abstraction such as:

- `RendererSurfaceFamily = "cpu-2d" | "webgl" | "webgl2"`

and a resolver:

- renderer id -> surface family

Expected result:

- renderer switching logic becomes family-aware

### 3. Split visible image canvases by family

For each explorer pane:

- Mandelbrot image surface
- Julia image surface

render with separate family-owned canvases instead of one shared image canvas.

Recommended structure:

- one overlay canvas remains separate as today
- one image canvas for `cpu-2d`
- one image canvas for `webgl`
- one image canvas for `webgl2`

Only the active family canvas should be visible and interactive.

Expected result:

- no renderer switch requires changing context type on an existing canvas

### 4. Update renderer helpers to target the correct family surface

CPU path:

- continue to use the `2d` family canvas
- keep the staged-swap logic clean and family-local

Plain WebGL path:

- use only the `webgl` family canvas

AP WebGL path:

- use only the `webgl2` family canvas

Expected result:

- renderer implementations no longer depend on accidental cross-family canvas reuse

### 5. Remove family-unsafe presentation assumptions

Audit and fix helpers such as:

- `renderExplorerImageWithFallback()`
- `renderExplorerImageWithSwap()`

Goal:

- they should not assume they can safely present into an arbitrary previously-used canvas
- they should only be called with a canvas that already belongs to the correct family

Expected result:

- presentation helpers become safe within a family

### 6. Review per-canvas renderer caches

Current caches are keyed by canvas:

- plain WebGL cache
- AP WebGL cache

After family split:

- verify that caches remain valid and do not accidentally mix stale family state
- simplify or rename caches if needed so their assumptions are explicit

Expected result:

- no stale state confusion when switching renderers

### 7. Preserve overlay and interaction behavior

Ensure that:

- markers
- hover overlays
- axes/orbit overlays
- pointer/touch interactions

still behave correctly regardless of which family-owned image canvas is active.

Expected result:

- renderer switching changes only image backend, not interaction semantics

### 8. Cleanup obsolete fallback patterns

After the family split:

- remove any logic that exists only to survive impossible context transitions
- avoid renderer-specific hacks

Expected result:

- simpler renderer lifecycle
- less risk of future second-pass or switch bugs

### 9. Verification plan

Manual and headless verification must cover:

#### CPU switch cases

- `webgl -> cpu`
- `webgl-arbitrary-precision -> cpu`
- `cpu -> webgl`
- `cpu -> webgl-arbitrary-precision`

#### WebGL switch cases

- `webgl -> webgl-arbitrary-precision`
- `webgl-arbitrary-precision -> webgl`

#### Quality-level interaction

- switch renderers with `Two Quality Levels` on
- switch renderers with `Two Quality Levels` off

#### Both panes

- Mandelbrot image still renders
- Julia image still renders
- no overlay corruption
- no blank canvases
- no `ERR ...` overlays

#### Required commands

Run from `code/v001`:

```bash
npm run build
npm run lint
```

Use headless Chromium screenshots and DOM checks for renderer switching flows.

## Explicit Non-Goals

This plan is not about:

- changing fractal math
- changing palette behavior
- changing import/export
- changing two-quality-level policy itself

It is specifically about renderer-surface lifecycle and safe switching.

## Recommended Implementation Order

1. Add renderer-family abstraction
2. Split visible image canvases by family in Mandelbrot and Julia components
3. Rewire CPU / WebGL / AP WebGL render paths to their own family surfaces
4. Remove unsafe shared-canvas assumptions
5. Run full renderer-switch verification matrix

## Acceptance Criteria

1. Switching between any supported explorer renderers no longer shows context-type errors.
2. No renderer switch relies on changing an existing canvas from `2d` to `webgl`/`webgl2` or vice versa.
3. CPU, WebGL, and AP WebGL each render on a family-owned surface.
4. Renderer switching works with both Mandelbrot and Julia panes.
5. Renderer switching works with `Two Quality Levels` both enabled and disabled.
6. Build and lint pass.
7. The final architecture reduces the chance of similar future bugs rather than adding another special-case fix.
