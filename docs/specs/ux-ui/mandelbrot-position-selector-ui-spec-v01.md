# Mandelbrot Position Selector UI Spec v0.1

## Purpose

This document specifies the dedicated Mandelbrot-based position selector UI used to choose the complex parameter for Julia set points in the Interactive WebGL Backgrounds Webapp.

This control is important enough to be treated as its own UI component specification because it affects:

* point editing workflow,
* Julia data modeling,
* undo/redo semantics,
* layout,
* interaction behavior,
* renderer architecture.

## Scope

This selector is a focused editor control, not a general-purpose fractal exploration product.

Its purpose is to:

* render the Mandelbrot set,
* let the user select a complex parameter `c`,
* help the user understand the relationship between Mandelbrot positions and Julia outputs,
* support zooming, panning, and resizing for precise point selection.

## Primary Behavior

The Mandelbrot Position Selector edits the currently selected Julia timeline point.

When the user selects a position in the Mandelbrot set:

* the active Julia point's `complexRe` is updated,
* the active Julia point's `complexIm` is updated,
* the point inspector numeric fields stay synchronized,
* the Julia preview updates accordingly.

The selector does not edit all points at once.

The selector does not edit the whole interpolated timeline state directly.

## Ownership Of Data

The selected Julia complex parameter belongs to the active Julia point.

The Mandelbrot selector viewport belongs to shared editor state.

This distinction is required.

### Julia Point Data

Each Julia point continues to own:

* `complexRe`
* `complexIm`

### Mandelbrot Selector State

The selector owns shared viewport/editor state such as:

* viewport center real value,
* viewport center imaginary value,
* viewport zoom,
* selector panel width,
* selector panel height.

## Rendering Requirements

The Mandelbrot selector shall:

* render using WebGL2,
* use its own dedicated canvas,
* support on-demand rerendering when state changes,
* avoid continuous animation when the user is not interacting.

The selector should rerender when:

* viewport changes,
* size changes,
* active point changes,
* point values change,
* theme changes if rendering colors depend on theme.

## Required Interactions

### 1. Click To Set Point

Primary click on the Mandelbrot view shall:

* select a complex position,
* assign that location to the active Julia point,
* place a visible marker at the chosen location.

### 2. Drag To Pan

Dragging inside the selector shall:

* pan the Mandelbrot viewport,
* not continuously rewrite the Julia point value while dragging.

Click selects the point.

Drag pans the viewport.

These are intentionally separate behaviors.

### 3. Wheel To Zoom

Pointer wheel or equivalent trackpad zoom shall:

* zoom in or out,
* use the pointer position as the zoom anchor.

### 4. Double Click To Zoom In

Double click shall:

* zoom in centered on the clicked location.

### 5. Reset

The selector shall include a reset control that restores the default Mandelbrot framing.

## Resizing

The selector must be resizable.

The resize model for MVP is:

* free two-dimensional resizing,
* a visible resize handle,
* user-controlled width and height,
* minimum size approximately `280 x 220`,
* default size approximately `420 x 320`,
* maximum size constrained by the surrounding layout.

The current size should persist with the project.

## Visual Requirements

The selector must display:

* the Mandelbrot rendering,
* a visible marker for the currently selected complex parameter,
* current complex coordinate readout,
* current zoom readout,
* which Julia point is currently being edited.

The selector should also display:

* hover coordinates,
* a subtle crosshair or precision cue where useful.

## Synchronization Requirements

The Mandelbrot selector and numeric inputs must stay synchronized.

### Selector To Inputs

When the user clicks in the Mandelbrot selector:

* `complexRe` updates in the point inspector,
* `complexIm` updates in the point inspector.

### Inputs To Selector

When the user edits `complexRe` or `complexIm` numerically:

* the selector marker updates,
* the selector should continue to show the marker if that location remains within the current viewport.

## Active Point Rules

The selector always edits the currently selected Julia point.

The application should avoid a state where no Julia point is selected.

If necessary, the editor should automatically keep one point selected.

## Undo / Redo Semantics

Point selection through the Mandelbrot selector is an undoable Julia point edit.

Viewport operations are not Julia timeline edits.

### Undoable

These actions must participate in Julia undo/redo:

* choosing a new Mandelbrot location for the active point.

### Not Undoable In The Julia Timeline Stack

These actions should not use the Julia timeline undo/redo stack:

* panning the selector viewport,
* zooming the selector viewport,
* resizing the selector panel.

These are shared editor UI state operations, not timeline content edits.

## Layout Placement

The Mandelbrot selector belongs in the Julia editor pane, not the final preview pane.

Recommended placement order:

1. timeline controls
2. point list
3. point inspector
4. Mandelbrot Position Selector
5. optional quick actions

Reason:

* the selector edits point data,
* it is part of authoring,
* it is not part of the final background presentation preview.

## Performance Requirements

The selector should feel precise and responsive.

Requirements:

* viewport panning should feel immediate,
* zooming should feel immediate,
* marker updates should be immediate,
* idle CPU and GPU usage should remain low when not interacting.

## Non-Goals For MVP

The selector does not need to support:

* multi-cursor editing,
* Mandelbrot bookmarks,
* path authoring directly inside the selector,
* advanced overlays such as orbit traces,
* touch-specific gesture design beyond baseline pointer compatibility.

## Locked Decisions

The following are explicitly locked for implementation:

* free two-dimensional resizing,
* click selects the Julia point value,
* drag pans the Mandelbrot viewport,
* wheel zoom is enabled,
* double-click zoom-in is enabled,
* selector viewport state persists with the project,
* hover coordinates should be shown,
* no special reverse-sync tool beyond normal numeric-field synchronization.

## Implementation Notes

The implementation should treat this selector as a dedicated reusable UI component with:

* its own state model,
* its own WebGL renderer,
* explicit communication with Julia point editing state.

It should not be hard-coded as incidental logic inside unrelated preview code.
