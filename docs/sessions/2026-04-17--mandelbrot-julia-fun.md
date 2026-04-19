do you understand the code?




Please make a new route for just a Mandelbrot and Julia Set explorer (no kohonen net here) that allows the user to select points on the complex plane in the mandelbrot set and visualizes the julia set for this point.  The options for this page are:
* palette
* iterations for mandelbrot
* iterations for juli set
* zen mode (just the mandelbrot and the julia set in fullscreen)


[is this clear? if anything is unclear please dont change any code and lets get the specs right first.]


There is a weird bug: when I zoom in to the maximal level it changes apsect ratio. why? please analyze the root cause.

```
• Yes. The root cause is the zoom clamp logic, not the renderer.

  In code/v001/packages/web/src/canvas/mandelbrot-overview-canvas.tsx:86 the zoom code clamps width and height independently:

  const nextWidth = Math.max(getViewportWidth(viewport) * factor, MIN_VIEWPORT_SPAN);
  const nextHeight = Math.max(getViewportHeight(viewport) * factor, MIN_VIEWPORT_SPAN);

  That is fine while both dimensions are still above the minimum. But at max zoom, the Mandelbrot viewport is 3:2, so the height reaches MIN_VIEWPORT_SPAN first and gets frozen
  while the width is still shrinking. After that:

  - height stays at 0.02
  - width keeps shrinking toward 0.02
  - the viewport ratio drifts from 1.5 toward 1.0

  So the complex-plane viewport stops matching the canvas aspect ratio, which makes the image look stretched/squashed at the deepest zoom.

  Why you mainly see it on Mandelbrot:

  - Mandelbrot canvas is 360x240 (3:2)
  - Julia viewer is 360x360 (1:1), so clamping both sides to the same minimum does not distort its aspect ratio

  So the real bug is: MIN_VIEWPORT_SPAN is being applied per-axis instead of preserving the current/canvas aspect ratio when the minimum zoom limit is reached.

  The correct fix is to clamp one dimension and derive the other from the fixed aspect ratio, rather than clamping both separately.
```

please fix

why is the mandelbrot canvas only 360x240 pixel? It should always adapt to the space it has available please.

i need  a checkbox for "always select current hover point" or "smooth mode" that automatically selects the current hover position in the mandelbrot viewer for the juli set. Now we have to click each position explicitly. Before you change anything: does this make sense? if it is unclear laet's fix the spec before we make changes.
Also: I need a better name for this mode: please suggest one or two better names.

your suggestion is good. please make it so.



please add a checkbox and a input field for a number (default 10) that draws lines in the mandelbrot set starting from the active point and going to the first n iterations. Does this make sense? How would you call teh checkbox and the input field?

your suggestion is good. please make it so.


Pleas don't include 0/0 in the orbit



couple of things:
* please add a checkbox for drawing the real and imaginary axis on top of the mandelbrot and julia set
* always highlight the last clicked point in the mandelbrot set please
  * the last clicked point should be highlighted in red
  * if live preview is active the live preview point should be blue
* blease add palettes for the explorer based on the UI themes

if anything is unclear pleas ask
You don'tr have to do it in one change. It's ok to spslit it up in smaller managable steps.


why did you change the cursor for the highlighted and the live position? please use the old cursor.


why is it so slow on my high end gpu? does the mandelbrot and julia set get redered in webgl? this is a question please give me a report but don't change antything.

```
• Report

  No: the Mandelbrot and Julia explorer are not rendered with WebGL, and they are not using your GPU in the way you probably
  expect.

  The current explorer path is CPU-driven JavaScript plus a 2D canvas upload:

  - Mandelbrot is computed pixel-by-pixel in JS in code/v001/packages/web/src/canvas/mandelbrot-overview-canvas.tsx:108, then
    pushed with context.putImageData(...) in code/v001/packages/web/src/canvas/mandelbrot-overview-canvas.tsx:363.
  - Julia is also computed pixel-by-pixel in JS in code/v001/packages/shared/src/julia/features.ts:25, then turned into an
    ImageData and uploaded with context.putImageData(...) in code/v001/packages/web/src/canvas/julia-viewer-canvas.tsx:163 and
    code/v001/packages/web/src/canvas/julia-viewer-canvas.tsx:174.
  - Both canvases use canvas.getContext("2d"), not "webgl" or "webgl2".

  Why It Feels Slow

  Your GPU mostly does not help with the expensive part here. The heavy work is:

  - running fractal iterations in JS on the CPU
  - allocating and filling pixel buffers
  - uploading full images to the canvas with putImageData

  There are two main bottlenecks:

  1. Full rerender on every interaction

  - Mandelbrot hover updates run from mouse move in code/v001/packages/web/src/canvas/mandelbrot-overview-canvas.tsx:406.
  - In explorer mode, activeParameter switches to the hover point when Live Preview is enabled in code/v001/packages/web/src/
    app/app.tsx:426.
  - That means moving the mouse can trigger a fresh Julia render continuously.

  2. Everything runs on the main thread

  Your high-end GPU is mostly idle for explorer rendering. This code is currently:

  - not WebGL
  - not shader-based
  - not GPU-fractal rendering
  - not worker-offloaded for explorer rendering

  It is basically a CPU rasterizer written in TypeScript/JavaScript, with a 2D canvas as the output surface.

  What This Implies

  The slowness is expected especially when:

  - Mandelbrot iterations are high
  - you pan/zoom or hover continuously

  Because each update can mean:

  - recompute the full Mandelbrot image
  - recompute the full Julia image
  - rebuild/upload image buffers again

  If you want, I can next give you a prioritized performance plan for this codebase without changing anything yet.
```


Please add a drop down list with the following options:
* CPU rendering
* WebGL renderer (default)
* WebGPU rwenderer

if anything is unclear please ask.
You don't have to do it in one change. It's ok to spslit it up in smaller managable steps.



```
• One point is unclear and risky to assume:

  Do you want:

  1. just the UI dropdown added now, with no actual rendering backend switch yet, or
  2. the dropdown plus real renderer behavior behind it?

  Right now the code only has CPU rendering, so WebGL renderer (default) would be misleading unless you want a placeholder UI
  first.
```


It also needs to be implemented. But maybe it's best if we plan this and get the specification right before changing anything in the code.

```

• Yes. This should be specified before implementation.

  Right now the code only has one real backend: CPU + 2D canvas. Adding a dropdown with WebGL renderer (default) and WebGPU
  renderer is not just a UI change. It implies:

  - a renderer abstraction
  - at least one new GPU implementation
  - fallback behavior when WebGL/WebGPU is unavailable
  - parity expectations for palettes, axes, orbit overlay, markers, zoom, and live preview

  Recommended Spec
  I’d define the feature like this:

  1. Renderer modes

  - CPU Rendering
  - WebGL Rendering
  - WebGPU Rendering

  2. Default selection behavior

  - Default requested mode: WebGL Rendering
  - If WebGL is unavailable, automatically fall back to CPU
  - If WebGPU is selected but unavailable, automatically fall back to WebGL, then CPU

  3. Status model

  - UI should distinguish:
      - requested renderer
      - active renderer actually in use
  - Example:
      - dropdown says WebGPU Rendering
      - status line says Active: WebGL (WebGPU unavailable)

  4. Scope of renderer support
     All three backends must support, for both Mandelbrot and Julia:

  - palette rendering
  - zoom/pan
  - live preview
  - selected-point marker
  - live-preview marker
  - orbit overlay
  - axes overlay

  5. Rendering model
     Best split:

  - GPU backend renders the fractal image only
  - overlays remain in 2D canvas or DOM overlay layer
    This keeps markers/axes/orbit simpler and avoids duplicating overlay logic in shaders.

  6. Canvas architecture
     Recommended:

  - one base canvas for fractal image
  - one overlay canvas or DOM layer for axes/orbit/markers
    This is especially important once WebGL/WebGPU is introduced.

  7. Performance expectations

  - CPU: compatibility path, not default-performance path
  - WebGL: primary shipping renderer
  - WebGPU: experimental/optional
    I would not make WebGPU the default yet.

  8. Error/fallback behavior

  - No hard failure if GPU init fails
  - Show small status message in UI
  - Continue rendering with best available fallback
  These need explicit answers:

  1. Should WebGPU be marked experimental in the UI?
  2. Do you want automatic fallback silently, or with a visible warning/status line?
  3. Must CPU/WebGL/WebGPU match visually pixel-for-pixel, or just approximately?
  4. Should the renderer choice persist in local storage?
  5. Should the SOM workspace also use the new renderer system later, or only /explorer for now?

  My Recommendation
  For v1:

  - implement this only on /explorer
  - make WebGL Rendering the default requested mode
  - keep WebGPU Rendering experimental
  - keep overlays out of GPU shaders
  - persist renderer preference
  - show Requested and Active renderer in the explorer UI

  Implementation Plan

  1. Introduce a renderer interface for Mandelbrot and Julia image generation.
  2. Split fractal image rendering from overlay rendering.
  3. Keep current CPU path as the fallback implementation.
  4. Add WebGL backend.
  5. Add dropdown + active-renderer status.
  6. Add WebGPU backend behind capability detection.
  7. Verify feature parity for palettes, axes, orbit, markers, zoom, and live preview.

  If you want, I can turn this into a concrete mini-spec with exact UI text, fallback rules, and acceptance criteria before
  any code changes.
```


yes please create the spec


```
• Renderer Spec

  This spec covers the /explorer route only.

  Goal
  Add selectable rendering backends for Mandelbrot and Julia rendering:

  - CPU Rendering
  - WebGL Rendering
  - WebGPU Rendering

  The system must prefer GPU rendering when available, but always remain functional via fallback.

  Scope
  Applies only to:

  - Mandelbrot explorer view
  - Julia set view
  - explorer interactions tied to those views

  Does not apply yet to:

  - SOM workspace
  - SOM map rendering
  - training worker pipeline

  UI
  Add a dropdown in the explorer controls:

  - Label: Renderer
  - Options:
      - CPU Rendering
      - WebGL Rendering
      - WebGPU Rendering

  Add a status line near the dropdown:

  - Label: Active Renderer
  - Value examples:
      - CPU
      - WebGL
      - WebGPU
      - WebGL (WebGPU unavailable)
      - CPU (WebGL initialization failed)

  Requested vs Active Renderer
  The dropdown controls the requested renderer.
  The app computes the active renderer from availability and runtime success.

  Examples:

  - Requested WebGL, WebGL available -> active WebGL
  - Requested WebGL, WebGL unavailable -> active CPU
  - Requested WebGPU, WebGPU unavailable, WebGL available -> active WebGL
  - Requested WebGPU, both GPU paths unavailable -> active CPU

  Default Behavior

  - Default requested renderer: WebGL Rendering
  - On first load, if WebGL is unavailable, fall back automatically
  - Renderer preference should persist in local storage

  Fallback Rules

  1. Requested CPU Rendering

  - Always use CPU
  - No fallback needed unless CPU path throws unexpectedly

  2. Requested WebGL Rendering

  - Try WebGL
  - If unavailable or initialization fails, fall back to CPU

  3. Requested WebGPU Rendering

  - Try WebGPU
  - If unavailable or initialization fails, fall back to WebGL
  - If WebGL is also unavailable or fails, fall back to CPU

  Fallback must not crash the page.

  Support Matrix
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

  Rendering Architecture
  Use layered rendering.

  Recommended structure per fractal panel:

  - base rendering surface for fractal image
  - overlay rendering layer for UI overlays

  Fractal image:

  - CPU path may keep using 2D canvas image upload
  - WebGL path renders via shader/program
  - WebGPU path renders via GPU pipeline

  Overlay layer:

  - axes
  - orbit
  - selected marker
  - live-preview marker
  - textual coordinate badge if retained

  Overlays should remain backend-independent.

  Behavioral Requirements
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

  Visual Consistency
  Backends should match closely in:

  - palette mapping
  - fractal framing
  - interaction semantics
  - overlay positions

  Exact pixel identity is not required.
  Visible mismatches should be minor.

  Capability Detection
  WebGL availability:

  - detect browser support and successful context creation

  WebGPU availability:

  - detect navigator.gpu
  - require successful adapter/device acquisition before activation

  Detection should happen at runtime in browser code.

  Error Handling
  If requested backend cannot be activated:

  - automatically fall back
  - expose reason in active-renderer status text
  - avoid modal errors unless all rendering fails

  Examples:

  - Active Renderer: CPU (WebGL unavailable)
  - Active Renderer: WebGL (WebGPU initialization failed)

  Persistence
  Persist requested renderer in local storage.

  Rules:

  - store requested renderer, not active renderer
  - on reload, retry requested renderer
  - fallback again if necessary

  Performance Expectations

  - CPU: compatibility path
  - WebGL: primary production renderer
  - WebGPU: experimental but functional path

  WebGL should become the practical default for explorer usage.

  Non-Goals
  Not required in this feature:

  - refactoring SOM training to GPU
  - GPU acceleration for SOM workspace
  - exact parity benchmarking framework
  - cross-tab synchronization
  - server-side rendering concerns

  Acceptance Criteria

  1. Explorer shows a Renderer dropdown with the three specified options.
  2. Explorer shows an Active Renderer status line.
  3. Default requested renderer is WebGL Rendering.
  4. If WebGL is unavailable, explorer still works with CPU automatically.
  5. If WebGPU is selected and unavailable, explorer falls back to WebGL or CPU automatically.
  6. Mandelbrot and Julia both render under all supported active backends.
  7. Axes, orbit, selected marker, and live-preview marker still work regardless of backend.
  8. Renderer choice persists across reloads.
  9. Renderer switching does not break pan/zoom, live preview, or selection behavior.
  10. No hard crash occurs when GPU backend initialization fails.

  Recommended Delivery Plan

  1. Introduce renderer abstraction and requested/active renderer model.
  2. Split fractal image rendering from overlays.
  3. Keep current CPU renderer as baseline implementation.
  4. Implement WebGL renderer.
  5. Add dropdown, persistence, and fallback status.
  6. Implement WebGPU renderer as experimental backend.
  7. Verify feature parity on /explorer.

  If you want, next I can turn this into an implementation checklist with file-level design notes before coding.
```


Yes please put the spec (with a timestamp in the filename) in ./docs/specs
and please create the checklist in ./docs/plans


```
• Created the two docs:

  - Spec: docs/specs/2026-04-18-10-20--explorer-renderer-backends-spec.md
  - Plan/checklist: docs/plans/2026-04-18-10-20--explorer-renderer-backends-implementation-checklist.md

  I did not change any app code. If you want, the next step is to turn Phase 1 of the checklist into an implementation patch.
```

yes please do it.

```
• Phase 1 is implemented.

  I introduced a renderer abstraction and CPU backend in code/v001/packages/web/src/canvas/explorer-renderer.ts and code/v001/
  packages/web/src/canvas/explorer-cpu-renderer.ts. I also split fractal image rendering from explorer overlays by moving
  axes/orbit/grid drawing into code/v001/packages/web/src/canvas/explorer-overlays.ts and updating both code/v001/packages/
  web/src/canvas/mandelbrot-overview-canvas.tsx and code/v001/packages/web/src/canvas/julia-viewer-canvas.tsx to use separate
  base-image and overlay canvases. The explorer route now resolves an internal requested/active renderer state, but still uses
  the CPU backend only, as intended for this phase.

  I also added the overlay-canvas styling in code/v001/packages/web/src/styles/app.css. Verification passed with npm run build
  and npm run lint from code/v001.

  The next step is Phase 2: add the actual renderer dropdown, active-renderer status, and persisted requested-renderer state
  to the explorer UI.
```

yes please.


```
• Phase 2 is implemented.

  The /explorer controls now include a real Renderer dropdown with:

  - CPU Rendering
  - WebGL Rendering
  - WebGPU Rendering

  and an Active Renderer status line that reflects the resolved backend. The requested renderer now persists in local storage
  under the explorer route state, and the internal renderer-selection model is used to resolve the active backend. Since only
  the CPU backend exists so far, WebGL and WebGPU currently fall back to CPU as intended for this phase.

  The main changes are in code/v001/packages/web/src/app/app.tsx and code/v001/packages/web/src/canvas/explorer-renderer.ts.

  Verification passed with npm run build and npm run lint from code/v001.

  The next step is Phase 5: implement the actual WebGL renderer and hook it into the existing renderer selection.
```

yes please continue.

```
• Phase 5 is in place: /explorer now has a real WebGL image renderer for both Mandelbrot and Julia.

  I changed the renderer abstraction so backends paint directly into the image canvas instead of returning ImageData, which
  allows WebGL to render natively. The CPU path was updated to match that interface, and I added a shader-based WebGL backend
  in code/v001/packages/web/src/canvas/explorer-webgl-renderer.ts. The explorer now detects WebGL availability at runtime and
  uses it when WebGL Rendering is requested; WebGPU Rendering still falls back because that backend is not implemented yet.
  The main integration points are code/v001/packages/web/src/canvas/explorer-renderer.ts, code/v001/packages/web/src/canvas/
  mandelbrot-overview-canvas.tsx, code/v001/packages/web/src/canvas/julia-viewer-canvas.tsx, and code/v001/packages/web/src/
  app/app.tsx.

  Verification passed with npm run build and npm run lint from code/v001.

  The next step is WebGPU, or if you prefer, I can first harden the WebGL path with better failure reporting and more explicit
  fallback messages in the UI.
```


We will continue later with the WebGPU renderer because the webgl mode is a little bit buggy:
The coordinate system is messed up in the webgl mode as soon as I move around and zoom in or out. Please don't change anything but just analyze what is wrong with the coordinate system and give me a detailed tecnical report.

```

• Report

  The primary coordinate-system bug in WebGL mode is a Y-axis inversion mismatch between:

  - the WebGL fractal image renderer
  - the overlay/input/viewport math used by the rest of the explorer

  This is why the image looks “okay enough” at first, but becomes obviously wrong once you pan or zoom.

  Primary Root Cause

  In the WebGL shader, texture-style UV coordinates are generated from clip-space:

  - code/v001/packages/web/src/canvas/explorer-webgl-renderer.ts:12 sets:
    v_uv = (a_position + 1.0) * 0.5;

  That means:

  - left = 0
  - right = 1
  - bottom = 0
  - top = 1

  Then the fragment shader maps v_uv into the complex plane:

  - code/v001/packages/web/src/canvas/explorer-webgl-renderer.ts:52
  - code/v001/packages/web/src/canvas/explorer-webgl-renderer.ts:54

  It computes:

  - real = mix(minReal, maxReal, v_uv.x)
  - imag = mix(maxImag, minImag, v_uv.y)

  Because v_uv.y = 0 at the bottom of the WebGL canvas, the bottom of the image is mapped to maxImag.
  That is the opposite of the explorer’s CPU/input convention.

  What the explorer expects

  The rest of the explorer uses normal DOM/canvas coordinates:

  - y = 0 is the top
  - larger y means moving downward

  You can see that in the Mandelbrot input mapping:

  - code/v001/packages/web/src/canvas/mandelbrot-overview-canvas.tsx:63

  It maps:

  - real = minReal + width * normalizedX
  - imag = maxImag - height * normalizedY

  Same for Julia:

  - code/v001/packages/web/src/canvas/julia-viewer-canvas.tsx:39

  That is a top-left-origin mapping.

  So:

  - overlays
  - mouse hover
  - click selection
  - zoom anchors
  - pan behavior

  all assume top-left-origin math,

  while the WebGL fractal image is effectively rendered with a bottom-left-origin Y interpretation.

  Why it becomes obvious only after moving/zooming

  At the default Mandelbrot view, the image is close to vertically symmetric around the real axis, so a vertical flip is easy to miss.

  Once you:

  - pan away from the symmetric center, or
  - zoom into an asymmetric region,

  the mismatch becomes obvious because:

  - the rendered fractal is vertically mirrored relative to the overlays and interaction math
  - zoom anchors are computed from the mouse point in one coordinate system, but the image is rendered in the other
  - vertical drag/pan behavior feels inconsistent with the rendered content

  So the issue is not that zoom math itself is wrong. The zoom math is internally consistent in the CPU/input layer. The problem is that the WebGL image layer is using a different Y-axis convention than the explorer state layer.

  Secondary Issue

  There is also a smaller sampling mismatch:

  - CPU rendering samples pixel centers
  - WebGL rendering samples edge-based interpolated UVs

  CPU Mandelbrot uses (x + 0.5) / width, (y + 0.5) / height:

  - code/v001/packages/web/src/canvas/mandelbrot-overview-canvas.tsx:68

  CPU Julia feature rendering also uses pixel centers:

  - code/v001/packages/shared/src/julia/features.ts:16

  The WebGL shader uses raw interpolated v_uv, not pixel-center-adjusted coordinates:

  - code/v001/packages/web/src/canvas/explorer-webgl-renderer.ts:52

  That produces a half-pixel-style offset compared with CPU behavior. This is not the main bug, but it can make:

  - crosshair alignment
  - axes alignment
  - orbit alignment

  look slightly off even after the major Y-flip issue is fixed.

  Affected Features

  Because overlays are separate 2D layers and use the non-WebGL coordinate model, the mismatch affects:

  - Mandelbrot hover position
  - click selection
  - red selected marker
  - blue live-preview marker
  - orbit overlay
  - axes overlay
  - zoom anchor behavior
  - vertical panning intuition

  Julia is also affected because it uses the same WebGL renderer path and the same top-left-origin interaction math.

  Bottom Line

  The main bug is:

  - WebGL image rendering uses bottom-left Y semantics
  - Explorer interaction and overlays use top-left Y semantics

  That split coordinate system is the root cause of the “messed up” behavior in WebGL mode.

  The smaller secondary bug is:

  - WebGL samples at UV edges, while CPU logic samples pixel centers

  That causes additional but smaller alignment error.

  If you want later, I can turn this into a concrete fix plan with exact code changes, but I have not changed anything here.
```

great analysis. please fix both errors,


```
```

It gives an error on the js console in the browser:
debug.js:115 Uncaught Error: ERROR: 0:74: 'normalized' : redefinition
ERROR: 0:75: 'getPaletteColor' : no matching overloaded function found
ERROR: 0:75: 'constructor' : not enough data provided for construction
 
    at createShader (explorer-webgl-renderer.ts:127:11)
    at createProgram (explorer-webgl-renderer.ts:135:26)
    at getRendererState (explorer-webgl-renderer.ts:183:19)
    at renderToCanvas (explorer-webgl-renderer.ts:242:17)
    at Object.renderMandelbrot (explorer-webgl-renderer.ts:281:5)
    at Object.__ (mandelbrot-overview-canvas.tsx:162:53)
    at B (index.js:530:22)
    at Array.some (<anonymous>)
    at j (index.js:454:26)




```

```

why is the mandelbrot so pixelated? I would  don't change anything yet nit give me a technical report



```
• Report

  The Mandelbrot looks pixelated because the explorer is rendering a very small fixed-resolution image and then scaling it up in CSS.

  Primary Cause

  The Mandelbrot image is rendered at a hard-coded internal size:

  - code/v001/packages/web/src/canvas/mandelbrot-overview-canvas.tsx: MANDELBROT_WIDTH = 360, MANDELBROT_HEIGHT = 240

  That means the fractal image is only:

  - 360 x 240 = 86,400 pixels

  Then the canvas is displayed responsively:

  - code/v001/packages/web/src/styles/app.css: .canvas { width: 100%; height: auto; }
  - code/v001/packages/web/src/styles/app.css: .canvas--mandelbrot { aspect-ratio: 3 / 2; }

  So on a large monitor, that 360x240 bitmap is stretched to a much larger on-screen size. The browser has to upscale it, which makes it look coarse.

  Why it is more noticeable in WebGL mode

  WebGL renders exactly to the canvas backing resolution:

  - the WebGL viewport uses canvas.width and canvas.height
  - in this code that is still only 360 x 240

  So even though WebGL is faster, it is still drawing a low-resolution image. GPU rendering does not automatically increase detail if the backing buffer stays small.

  Why zooming makes it feel even more pixelated

  When you zoom in, the code still renders into the same fixed 360x240 grid. That means:

  - the complex-plane area gets smaller
  - but the number of rendered samples stays the same
  - each pixel covers a larger visible portion of the zoomed structure

  So detail does not increase with zoom; you just magnify the same sparse sampling.

  Secondary Cause

  The explorer currently does not render at device-pixel-ratio resolution.

  There is no logic that scales the backing canvas size by window.devicePixelRatio, and there is no resize-driven resolution update. So on high-DPI displays:

  - the browser may display the canvas at many more physical pixels
  - but the fractal is still computed at the low logical backing resolution

  That further increases perceived softness/pixelation.

  Not the Cause

  This is not mainly caused by:

  - palette choice
  - overlay layers
  - WebGL itself
  - the coordinate-system bug you found earlier

  Those can affect appearance or alignment, but the blocky look is primarily a resolution problem.

  Bottom Line

  The Mandelbrot is pixelated because it is rendered into a fixed low-resolution buffer (360x240) and then scaled up on screen. WebGL speeds up rendering, but it does not fix image quality unless the backing render resolution is increased.

  If you want later, I can propose a spec and implementation plan for:

  - responsive backing resolution
  - device-pixel-ratio rendering
  - optional quality/performance presets
  - adaptive resolution while dragging vs idle rendering
```

Sounds good. yes please propose a spec for this 

```
• Responsive Mandelbrot Quality Spec

  Goal
  Reduce visible pixelation in the explorer by making fractal rendering resolution track the actual displayed canvas size and device pixel ratio, while keeping interaction responsive.

  Scope
  Applies to /explorer only:

  - Mandelbrot panel
  - Julia panel

  Does not apply yet to:

  - SOM workspace
  - SOM map canvas
  - training pipeline

  Problem Statement
  Current explorer rendering uses fixed backing resolutions:

  - Mandelbrot: 360x240
  - Julia: 360x360

  These are then scaled up in CSS, which causes:

  - blocky Mandelbrot output
  - underutilization of high-DPI displays
  - no increase in detail when zooming

  Requirements

  1. Responsive Backing Resolution
     Each fractal image canvas must render using the panel’s displayed size, not a fixed hard-coded size.

  Rules:

  - measure the rendered canvas container size in CSS pixels
  - compute backing width/height from that size
  - use those backing dimensions for CPU/WebGL/WebGPU image rendering
  - preserve the existing aspect ratio:
      - Mandelbrot: 3:2
      - Julia: 1:1

  2. Device Pixel Ratio Support
     Backing resolution must scale by window.devicePixelRatio.

  Rules:

  - backingWidth = round(displayWidth * devicePixelRatio)
  - backingHeight = round(displayHeight * devicePixelRatio)
  - cap DPR-scaled size with a performance limit

  3. Resolution Caps
     To avoid runaway GPU/CPU cost, apply configurable maximum dimensions.

  Initial recommended caps:

  - Mandelbrot max backing width: 2048
  - Mandelbrot max backing height: 1365
  - Julia max backing width/height: 2048

  Cap must apply after DPR scaling.

  4. Interaction Responsiveness
     Rendering must remain responsive while:

  - panning
  - zooming
  - live preview

  Use two quality levels:

  - interactive quality
  - settled quality

  Behavior:

  - while dragging / wheel-zooming / rapid hover updates, render at reduced scale
  - after a short idle delay, rerender at full quality

  Recommended initial scales:

  - interactive scale: 0.5
  - settled scale: 1.0

  Recommended idle delay:

  - 120ms to 200ms

  5. Backend Independence
     The resolution system must work consistently for:

  - CPU renderer
  - WebGL renderer
  - future WebGPU renderer

  The renderer API should consume dynamic width/height values rather than fixed constants.

  6. Overlay Alignment
     Overlay layers must stay aligned with the rendered fractal image at all sizes.

  Applies to:

  - axes
  - orbit
  - red selected marker
  - blue live-preview marker
  - coordinate badge positioning

  Overlay coordinates must derive from the same current backing/display geometry as the fractal image.

  7. Resize Handling
     Explorer canvases must rerender when:

  - window size changes
  - layout changes change panel size
  - zen mode toggles
  - device pixel ratio changes

  Preferred implementation:

  - ResizeObserver on the canvas frame or image container
  - recompute display size and backing resolution from the observed box

  8. Quality Controls
     No user-facing quality controls are required in v1.

  Optional later feature:

  - Auto / Balanced / Sharp quality selector

  For now, quality should be automatic.

  Rendering Model

  Each explorer fractal panel should have:

  - measured display size in CSS pixels
  - derived backing resolution in device pixels
  - renderer invoked with backing width/height
  - overlay layer sized to the same displayed box

  The image canvas should:

  - set canvas.width and canvas.height to backing resolution
  - keep CSS size equal to display size

  Behavioral Requirements

  1. Mandelbrot no longer appears obviously blocky on large screens.
  2. Julia also benefits from DPR-aware rendering.
  3. Panning/zooming remains responsive.
  4. Final image sharpens after interaction stops.
  5. WebGL and CPU modes both use the same sizing policy.
  6. Overlays remain correctly aligned during interaction and after rerender.

  Failure / Fallback Behavior
  If measured size is unavailable or zero:

  - skip render for that frame
  - retry on next layout/resize/update event

  If full-resolution render fails due to resource constraints:

  - fall back to lower backing resolution
  - do not crash the explorer

  Acceptance Criteria

  1. Explorer no longer uses fixed 360x240 / 360x360 backing resolution for displayed fractal output.
  2. Backing resolution follows actual display size and DPR.
  3. Mandelbrot looks visibly sharper on high-resolution displays.
  4. Interaction remains smooth during drag/zoom/live preview.
  5. A higher-quality rerender occurs after interaction settles.
  6. Overlays remain aligned with the fractal image.
  7. CPU and WebGL backends both support the sizing system.

  Recommended Implementation Plan

  1. Add measured display-size state via ResizeObserver.
  2. Replace fixed fractal render sizes with dynamic backing dimensions.
  3. Update renderer interfaces to consume dynamic dimensions everywhere.
  4. Add DPR scaling and max caps.
  5. Add interactive-vs-settled quality scaling.
  6. Verify overlay alignment in CPU and WebGL modes.
  7. Later extend the same system to WebGPU.

  If you want, I can next write this into a timestamped spec file in docs/specs and a checklist in docs/plans, matching the earlier renderer docs.
```

Yes please create the specs and checklist as you suggested with these small tweaks

* interactive scale: 0.2
* Devices with a good GPU won't need the two quality levels (interactive quality vs settled quality) so please add a checkbox for this in the spec. Default is active (meaning two quaity levels optimization is active)

Just to make sure: fractal canvases must support the following use cases:
* fixed size with fixed ratio
* fixed ratio with either fixed width or fixed height
* fill given area (for fullscreen for example)



```
• Created both docs with your tweaks:

  - Spec: docs/specs/2026-04-19-11-34--explorer-responsive-fractal-resolution-spec.md
  - Checklist: docs/plans/2026-04-19-11-34--explorer-responsive-fractal-resolution-checklist.md

  They include:

  - interactive scale: 0.2
  - a Two Quality Levels checkbox in the spec, default enabled
  - the three required canvas layout modes:
      - fixed size with fixed ratio
      - fixed ratio with fixed width or fixed height
      - fill given area

  I did not change any app code.
```

ready to start? or are there any questions?


```
• Ready to start.

  One small implementation-level choice is still open, but I can make a reasonable default without blocking:

  - For the fill given area mode, should the fractal image contain inside the area or cover it?
    My default would be contain, because it preserves the full fractal viewport and avoids cropping.

  If you’re fine with that default, I can start Phase 1.
```

yes thats fine. Please start.

```
```
