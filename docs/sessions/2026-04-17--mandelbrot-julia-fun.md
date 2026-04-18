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