# Saved Context

Date: `2026-04-29 08:38` Europe/Vienna

## Current Situation

The immediate CPU renderer bug around the coarse-to-fine transition has been fixed.

What was fixed:
- The CPU path had a canvas-lifecycle bug introduced by the staged swap approach from commit `84b2bd27e5109b11c4058391391be04100acef94`.
- The visible CPU canvas had two conflicting size owners:
  - imperative presentation in `renderExplorerImageWithSwap()`
  - declarative `width` / `height` via `presentedRenderSize`
- That caused the fine render to be cleared again after presentation.

Fix that was implemented:
- [`render-explorer-image-with-fallback.ts`](/home/wizard/projects/asimov/asimov-happy/code/v001/packages/web/src/canvas/render-explorer-image-with-fallback.ts)
  - `renderExplorerImageWithSwap()` no longer resizes the visible canvas during presentation.
  - It now draws the staged result into the already-sized visible canvas.
- [`mandelbrot-overview-canvas.tsx`](/home/wizard/projects/asimov/asimov-happy/code/v001/packages/web/src/canvas/mandelbrot-overview-canvas.tsx)
- [`julia-viewer-canvas.tsx`](/home/wizard/projects/asimov/asimov-happy/code/v001/packages/web/src/canvas/julia-viewer-canvas.tsx)
  - CPU image canvases now use `canvasResolution.renderWidth` / `canvasResolution.renderHeight` directly.
  - Non-CPU renderers still use `presentedRenderSize`.

Verification already done:
- `npm run build -w @asimov/minimal-web` passed
- `npm run lint` passed
- User confirmed: “The cpu renderer bug has been fixed.”

## Arbitrary Precision WebGL Renderer

The arbitrary-precision WebGL renderer math is considered correct by the user and should be treated as such in the next session.

The open bug is not “bad AP math.” The open bug is that the second render pass somehow ends up with a black canvas.

Renderer files:
- [`explorer-webgl-arbitrary-precision-renderer.ts`](/home/wizard/projects/asimov/asimov-happy/code/v001/packages/web/src/canvas/explorer-webgl-arbitrary-precision-renderer.ts)
- [`webgl-arbitrary-precision.ts`](/home/wizard/projects/asimov/asimov-happy/code/v001/packages/web/src/canvas/webgl-arbitrary-precision.ts)
- registration in [`explorer-renderer.ts`](/home/wizard/projects/asimov/asimov-happy/code/v001/packages/web/src/canvas/explorer-renderer.ts)

Important prior work:
- The old experimental `High Precision WebGL Rendering` path was removed and replaced by the new limb-based `Arbitrary Precision WebGL Rendering`.
- The compare route exists and is useful:
  - [`/explorer-renderer-compare`]
  - implemented in [`app.tsx`](/home/wizard/projects/asimov/asimov-happy/code/v001/packages/web/src/app/app.tsx)

## What Was Learned About The AP Renderer

Important correction:
- The user explicitly verified that the AP math is correct.
- The saved context should not frame the renderer as “mathematically wrong.”

What should be assumed instead:
- The AP renderer works in principle.
- The current bug is that the second pass ends up black.
- This is likely part of a broader pattern of “messed up second passes” that has now appeared in:
  - the normal WebGL renderer earlier
  - the CPU renderer just now
  - the AP renderer now

So the likely direction is not “debug AP math again,” but:
- investigate second-pass lifecycle / presentation / canvas ownership patterns across renderers
- identify the common structural flaw
- fix it in a clean and reliable way

## Second-Pass Investigation Direction

Important correction:
- The next session should assume that the AP renderer’s visible failure is a second-pass problem until proven otherwise.
- The user explicitly connected this to the newly fixed CPU bug and the earlier normal WebGL issue.

Working hypothesis for the next session:
- there is a recurring structural bug pattern around coarse/fine or first/second pass transitions
- this may involve:
  - visible canvas ownership
  - staged presentation
  - render-size transitions
  - delayed follow-up renders
  - stale or destructive canvas resets

Goal for the next session:
- investigate the common second-pass pattern across CPU, WebGL, and AP WebGL
- fix it in a clean, reliable, performance-conscious way
- preserve a high-quality, performance-optimized codebase rather than stacking renderer-specific hacks

## Useful Routes / Tools

Useful routes:
- `/`
- `/explorer`
- `/explorer-renderer-compare`
- `/explorer-layout-harness`

Useful debugging facts:
- Headless Chromium with SwiftShader worked for AP compare/debugging.
- Typical command shape used:

```bash
chromium --headless --no-sandbox --use-gl=angle --use-angle=swiftshader --enable-unsafe-swiftshader --dump-dom http://127.0.0.1:<PORT>/explorer-renderer-compare
```

and screenshots with:

```bash
chromium --headless --no-sandbox --use-gl=angle --use-angle=swiftshader --enable-unsafe-swiftshader --window-size=1200,2800 --screenshot=/tmp/out.png http://127.0.0.1:<PORT>/explorer-renderer-compare
```

Preview command:

```bash
npm run -w @asimov/minimal-web preview -- --host 127.0.0.1 --port <PORT>
```

Build/lint working directory:
- `/home/wizard/projects/asimov/asimov-happy/code/v001`

## Cleanup State

Temporary AP debug instrumentation was removed before ending this session:
- no framebuffer sample `data-ap-debug` writes remain
- no temporary forced `gl.finish()` remains
- no temporary shader constant-color / coordinate-debug output remains
- compare route was restored so AP compare column does **not** force `enableTwoQualityLevels`

Temporary overlay error surfacing still exists and may still be useful:
- [`mandelbrot-overview-canvas.tsx`](/home/wizard/projects/asimov/asimov-happy/code/v001/packages/web/src/canvas/mandelbrot-overview-canvas.tsx)
- [`julia-viewer-canvas.tsx`](/home/wizard/projects/asimov/asimov-happy/code/v001/packages/web/src/canvas/julia-viewer-canvas.tsx)

Those currently append `ERR ...` into overlay text when the render effect throws.

## Recommended Next Step

When resuming:
1. Keep the CPU fix intact.
2. Treat the AP math as correct unless new evidence proves otherwise.
3. Focus on second-pass behavior and shared render/presentation structure.
4. Use `/explorer-renderer-compare` as the main verification route.
5. Compare the render lifecycle across:
   - CPU
   - normal WebGL
   - AP WebGL
6. Look for a common clean abstraction that avoids:
   - destructive second-pass canvas resets
   - conflicting ownership of visible canvas size/presentation
   - stale pass presentation
7. Prefer a reliable architectural cleanup over renderer-specific special cases.

## Relevant Commit / History Notes

Important commit related to the CPU bug:
- `84b2bd27e5109b11c4058391391be04100acef94`

That commit introduced the staged CPU swap pattern which caused the just-fixed CPU bug.

## Summary

- CPU coarse/fine transition bug: fixed and user-confirmed.
- AP renderer math: user-verified as correct.
- AP renderer visible failure: treat as a second-pass black-canvas bug.
- There is likely a recurring structural second-pass bug pattern across multiple renderers.
- Next session should investigate and fix that pattern cleanly and reliably, with strong attention to code quality and performance.
