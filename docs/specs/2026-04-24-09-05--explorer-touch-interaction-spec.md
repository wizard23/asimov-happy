# Explorer Touch Interaction Spec

## Scope

This spec applies to the `/explorer` route only.

It covers:

- touch interaction on the Mandelbrot explorer
- touch interaction on the Julia viewer
- mobile and tablet behavior

It does not apply to:

- the SOM route
- the layout harness
- desktop-only mouse and wheel interaction behavior, except to require that it must not regress

## Goal

Make the explorer usable on touch devices without degrading the desktop experience.

The touch interaction model must support:

- touch selection in the Mandelbrot panel
- touch panning in both Mandelbrot and Julia panels
- two-finger pinch zoom in both Mandelbrot and Julia panels
- correct coexistence with the current desktop mouse/wheel behavior

## Non-Goal

This feature is not intended to add mobile-specific UI redesign.

It is specifically about making the existing explorer interaction model work correctly on touch devices.

## Current Problem

On touch devices, the current explorer relies on mouse and wheel events:

- `mousedown`
- `mousemove`
- `mouseup`
- `mouseleave`
- `wheel`

That means:

- taps do not reliably map to selection
- drags do not reliably pan
- pinch gestures do not drive fractal zoom
- browser default page scrolling/zooming may interfere

## Design Requirement

The solution must preserve current desktop interaction behavior.

Desktop users must keep:

- mouse hover preview
- mouse click selection
- mouse drag pan
- wheel zoom

Touch support must be added without replacing or degrading those paths.

## Interaction Model

### Mandelbrot panel on touch

Single-finger interaction:

- touch down begins a possible tap-or-pan gesture
- if movement stays under a small threshold and touch ends quickly:
  - treat as selection of parameter `c`
- if movement exceeds threshold:
  - treat as pan

Two-finger interaction:

- pinch changes zoom level
- zoom anchor should be the midpoint between the two touches
- when pinch is active, do not trigger tap selection

### Julia panel on touch

Single-finger interaction:

- one-finger drag pans the Julia viewport

Two-finger interaction:

- pinch changes Julia zoom level
- anchor should be the midpoint between the two touches

No tap-select behavior is required in Julia because selection is driven by Mandelbrot.

## Live Preview Behavior On Touch

There is no true hover on touch devices.

Recommended behavior:

- do not attempt hover-preview semantics from passive touch presence
- a touch move on Mandelbrot should update the active point only when interaction semantics clearly imply it

For v1:

- tap selects
- drag pans
- pinch zooms
- Live Preview remains meaningful on desktop hover
- on touch, Live Preview may update only during explicit single-touch movement if that movement is being interpreted as preview rather than pan

To avoid ambiguity and accidental behavior, recommended v1 rule:

- touch interaction does not emulate continuous hover preview
- selected point remains the main active parameter on touch devices unless explicitly changed by tap

This avoids conflict between:

- one-finger panning
- one-finger live preview scrubbing

## Gesture Recognition

### Tap threshold

Use a movement threshold to distinguish tap from drag.

Recommended default:

- `10 CSS px`

### Tap duration

Recommended:

- allow normal taps
- no long-press distinction needed in v1

### Pinch detection

Two simultaneous touches on the same canvas/frame should start pinch mode.

Pinch must track:

- initial touch midpoint
- initial touch distance
- initial viewport

On movement:

- compute current distance
- derive zoom factor from distance ratio
- compute zoom anchor from current midpoint mapped into viewport coordinates

### Pan detection

Single-touch movement beyond tap threshold enters pan mode.

Once pan mode is active:

- selection must not fire on touch end

## Browser Gesture Handling

The explorer must prevent browser-native touch gestures from interfering when interacting with the fractal canvases.

Required behavior:

- disable browser panning/zooming only on the interactive explorer canvas surfaces
- do not disable normal page behavior globally

Recommended implementation:

- apply `touch-action: none` to the interactive explorer overlay/canvas frames that own gesture handling

This is required so custom pointer or touch gesture handling can work reliably.

## Recommended Event Model

Use Pointer Events rather than separate Touch Events if possible.

Reason:

- unified handling for mouse, pen, and touch
- cleaner multi-touch tracking
- better coexistence with desktop interaction

Recommended implementation shape:

- keep existing mouse/wheel behavior working
- migrate canvas interaction handlers to pointer-event-based logic where practical
- continue to use wheel for desktop zoom
- add pointer tracking for touch pan and pinch

If full migration is too risky, a mixed model is acceptable:

- keep current mouse path
- add dedicated pointer/touch support for mobile

But unified pointer handling is preferred.

## Desktop Compatibility Requirement

The following must remain unchanged for desktop:

- Mandelbrot hover updates
- Mandelbrot click selection
- Mandelbrot drag pan
- Mandelbrot wheel zoom
- Julia drag pan
- Julia wheel zoom

Touch support must not introduce:

- pointer capture bugs for mouse
- broken hover behavior
- wheel zoom regressions
- accidental page scroll blocking outside interactive canvases

## UI / Copy

No major UI redesign is required.

Optional copy adjustment:

- current explorer hint text may mention:
  - desktop: hover, drag, scroll, click
  - touch: tap, drag, pinch

This is optional but recommended.

## Zen Mode

Touch interaction must work in both:

- normal explorer mode
- zen mode

The zen separator behavior is out of scope unless touch interaction conflicts with it.

If separator drag conflicts with canvas touch gestures, that should be handled carefully, but fractal interaction remains the priority in this spec.

## Acceptance Criteria

1. On touch devices, tapping the Mandelbrot panel selects a parameter.
2. On touch devices, dragging with one finger pans the Mandelbrot viewport.
3. On touch devices, dragging with one finger pans the Julia viewport.
4. On touch devices, pinching with two fingers zooms the Mandelbrot viewport.
5. On touch devices, pinching with two fingers zooms the Julia viewport.
6. Pinch zoom uses the touch midpoint as the zoom anchor.
7. Tap selection does not accidentally fire after a pan.
8. Browser page scroll/zoom does not interfere while actively interacting with the explorer canvases.
9. Desktop mouse hover, click, drag, and wheel behavior still works as before.
10. Zen mode still works with touch interaction.
11. Build and lint pass after implementation.

## Recommended Delivery Plan

1. Audit current canvas interaction handlers and isolate shared interaction math.
2. Add `touch-action: none` to the explorer interactive surfaces.
3. Implement pointer-based tap/pan/pinch tracking for Mandelbrot.
4. Implement pointer-based pan/pinch tracking for Julia.
5. Verify no desktop regression.
6. Verify normal mode and zen mode on mobile-size browser emulation.
