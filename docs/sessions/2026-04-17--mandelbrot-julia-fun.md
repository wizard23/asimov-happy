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