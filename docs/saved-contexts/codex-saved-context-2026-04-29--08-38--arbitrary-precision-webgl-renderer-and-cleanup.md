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

The arbitrary-precision WebGL renderer is still broken and needs follow-up.

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

Earlier hypotheses that are now largely ruled out:
- Not a WebGL2 context-creation failure.
- Not the earlier shader compile failure from `precision highp uint;` anymore.
- Not the same staged-swap / presented-size bug as the CPU renderer.
- Not primarily `Two Quality Levels`.

Specific AP findings from headless SwiftShader debugging:
- The AP path does render something into the framebuffer.
- Temporary instrumentation showed sampled AP pixels like:
  - Mandelbrot: `tl=25,38,65,255 | c=9,12,22,255 | tr=30,65,104,255 | bl=25,38,65,255 | br=31,65,105,255`
  - Julia: `tl=25,38,65,255 | c=9,12,22,255 | tr=25,38,65,255 | bl=25,38,65,255 | br=25,38,65,255`
- Visually, the AP column looked mostly like:
  - dark interior color near center
  - smooth blue outer field
  - little or no correct boundary structure

Interpretation:
- The AP renderer is not “blank” in the low-level sense.
- The output semantics are wrong.
- The likely problem is still inside the arbitrary-precision coordinate / recurrence math.

## Two Quality Levels Investigation

The user suspected the AP bug might be caused by the second pass from `Two Quality Levels`.

That was explicitly checked.

What was tested:
- In the compare route, `enableTwoQualityLevels` was temporarily enabled for the AP column.
- A scripted zoom event was triggered with:
  - `?debugZoomSteps=1&debugZoomTarget=right`
- The fine pass did happen.
- The AP output after the fine pass still had the same “wrong but non-empty” character.

Conclusion:
- `Two Quality Levels` is not the primary AP bug.
- The AP renderer remains wrong with and without that feature.

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

When resuming, focus on the AP renderer only.

Recommended next debugging direction:
1. Keep CPU path unchanged.
2. Use `/explorer-renderer-compare` as the main verification route.
3. Re-check the AP math layer itself:
   - limb ordering
   - fixed-point scaling / rescaling
   - `apMul`
   - coordinate reconstruction
   - bailout / recurrence correctness
4. Compare AP Mandelbrot full-view output against normal WebGL first, before deep zoom.

## Relevant Commit / History Notes

Important commit related to the CPU bug:
- `84b2bd27e5109b11c4058391391be04100acef94`

That commit introduced the staged CPU swap pattern which caused the just-fixed CPU bug.

## Summary

- CPU coarse/fine transition bug: fixed and user-confirmed.
- AP renderer: still wrong.
- AP issue is **not** the same staged-swap bug as CPU.
- AP issue is **not** primarily caused by `Two Quality Levels`.
- Next session should resume with AP math/render debugging and keep the CPU fix intact.
