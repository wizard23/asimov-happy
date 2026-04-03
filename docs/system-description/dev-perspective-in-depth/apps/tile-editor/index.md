# Instructions for the AI
## Scope and Purpose of this Documentation
Please document the current functionality and architecture of the "Tile Editor" app here. This document should strictly document the current functionality of the app as it is implemented now. Don't include any planned features or possible new features.

Since this is the page describing the app itself it is called index.md. All sub components of this app have their own naming scheme described below. 

The intended audience of the documentation are developers with a mathematical background that are tasked with maintaining the app but it should be understandable for technically minded users as well. 

Structure the documentation by focusing on the use cases and explain how the developer perspective and the user perspective come together so developers and users can can use a common language.

The documentation should be complete without being unnecessary verbose.

Please document the types|interfaces|data structures|etc. in index__types.md and the implementation details in index__implementation.md

### Deciding what details to include
By reading the documentation a developer should be able to understand the architecture of the app and be able to get an idea of:
* How a new feature fits into the existing architecture.
* Where a bug might originate from.

#### These details need to be included in the documentation
Ensure that these details are definitely included in the documentation:
* The different coordinate systems that are used in the app.
* All kinds of user interactions that are supported by the app. 

## Documenting Sub-Apps
The following section is about how sub-apps of the app described in this document ought to be documented. It uses the sub-app "Editor Controls" as a specific example but it is, of course, meant to describe the general way for documenting sub-apps:

To ensure this document is well structured please use separate files to describe the sub-apps. This way it is enough to just reference the sub-apps in this and other documents. Referencing a sub-app should be done like this:

"Editor Controls" (put the name of the sub-app in quotation marks to clearly distinguish between normal text and a references to a specific sub-app)

The naming scheme for documenting the sub-apps of this app goes like this: 

* the current functionality of the sub-app should be documented in editor-controls.md
* any specific typescript types/interfaces/data structures/etc should be documented in editor-controls__types.md . Only create this file if it is really needed. Some sub-apps might not have any special types.
* any specific implementation detail that is not trivial should be documented in editor-controls__implementation.md . Only create this file if it is really needed. Some sub-apps might not have any non trivial implementation details worth mentioning.

## Links between Files
When referencing something that is described in another file please create links to the referenced file like this:
["Editor Controls"](./editor-controls.md)

Use a clear and consistent linking scheme. All separate files in the documentation must be reachable via links. So please ensure that no file is orphaned. Also ensure that it is always possible to get back to where one came from via clicking a link. So there must not be any dead ends in the navigation between files. It is not necessarily required to be able to reach every file from every other file so please only link what is relevant.

## FAQ for the AI
* If anything is unclear please just ask.
* Please keep these instructions as they are and only make changes below the line that follows. Don't use any lines in the documentation except to keep the instructions for the AI separated from the documentation itself.
---

# "Tile Editor"
The Tile Editor is a Pixi.js-based canvas tool for defining polygon types from expressions and placing polygon instances into a tiling. Users interact with a 2D view and Tweakpane-driven UI; developers maintain the model (types + instances), expression evaluation, and rendering pipeline in one module.

Back to system docs root: ["Tile Editor" (system description)](../../apps/tile-editor/index.md).

## Coordinate systems
The app uses multiple coordinate spaces, and switching between them is central to rendering and hit testing.
- Screen/canvas space: pixel coordinates from pointer events and Pixi's screen space (`e.global`, canvas size).
- World space: the logical editor coordinate system (view offset + scale applied to render). All interaction math (selection, hover, hit testing) uses world coordinates.
- Polygon-local space: `PolygonDescription.points` are centered local points for a type; instances offset these by `poly.x`/`poly.y`.
- Construction/math space: points are built with +Y up, then flipped to display orientation (Y inverted).
- Render space: polygons and labels are drawn in screen space; world points are projected via a world->screen transform.

## User interactions (overview)
- Create a polygon: double-click empty canvas space.
- Select polygon: click on a polygon instance.
- Edit instance/type values: use the "Polygon Editor" pane.
- Drag instance: click-and-drag a polygon.
- Pan: drag empty canvas space.
- Zoom: mouse wheel or the "Scale" control.
- Clone: double-click a polygon to duplicate along the click ray.
- Hover: moving the mouse highlights polygons, vertices, and edges.
- Save/load: use "Save Tiling" and "Load Tiling" in "Editor Controls".

## Architecture at a glance
- UI controls are in "Editor Controls" (Tweakpane) and "Polygon Editor".
- Geometry expressions define polygon types; instances reference types.
- The render loop draws polygons, outlines, labels, hover highlights, and axes.
- The solver fills in missing side/angle values when expressions include `?`.

## Core sub-apps
- ["Editor Controls"](./editor-controls.md): global controls, commands, and constants.
- ["Polygon Editor"](./polygon-editor.md): instance/type editing and validation feedback.
- ["Current Values"](./current-values.md): live readout of view and polygon measurements.
- ["Unit Cell Editor"](./unit-cell-editor.md): canvas interactions and rendering.

## Data flow summary
1. User input updates `EditorConfig`, polygon types, or polygon instances.
2. Expressions are evaluated against constants; results are stored in `PolygonDescription`.
3. Instances derive rotated points from their type's centered points.
4. Rendering projects world points to screen coordinates and draws with Pixi Graphics.
5. Hit testing and hover detection run in world space, with feedback drawn in screen space.

## Related technical docs
- ["Tile Editor" Types](./index__types.md)
- ["Tile Editor" Implementation Notes](./index__implementation.md)
