# Instructions for the AI
## Scope and Purpose of this Documentation
Please document the current functionality and architecture of the "Tile Editor" app here. This document should strictly document the current functionality of the app as it is implemented now. Don't include any planned features or possible new features.

Since this is the page describing the app itself it is called index.md. All relevant, non trial sub-apps or sub components of this app have their own naming scheme described below. 

Please keep the documentation short if possible. But don't leave out relevant details just for the sake of keeping the documentation short. The documentation should be complete. 

Focus on the use cases that are relevant for developers and users of the system. Explain how the developer perspective and the user perspective come together so developers and users can find and use a common language. 

The main audience of the documentation are the developers but it should be understandable for technically minded users as well. 

Please document the types|interfaces|data structures|etc. in index__types.md and the (non trivial) implementation details in index__implementation.md

### Deciding what details to include
By reading the documentation a developer should be able to understand the architecture of the app and a user should be able to find out about all features the app supports. 

#### These details need to be included in the documentation
Ensure that these details are definitely included in the documentation:
* The different coordinate systems that are used in the app.
* All kinds of user interactions that are supported by the app. 

## Documenting Sub-Apps
The following section is about how sub-apps of the app described in this document ought to be documented. It uses the sub-app "Editor Controls" as a specific example but it is, of course, meant to describe the general way for documenting sub-apps:

To ensure this document is well structured and does not loose focus by describing small details please use separate files to describe the sub-apps. This way it is enough to just reference the sub-apps in this and other documents. Referencing a sub-app should be done like this:

"Editor Controls" (put the name of the sub-app in quotation marks to clearly distinguish between normal text and a references to a specific sub-app)

The naming scheme for documenting the sub-apps of this app goes like this: 

* the current functionality of the sub-app should be documented in editor-controls.md
* any specific typescript types/interfaces/data structures/etc. should be documented in editor-controls__types.md (only create this file if it is really needed. Some sub-apps might not have any special types).
* any specific implementation detail that is not trivial should be documented in editor-controls__implementation.md (only create this file if it is really needed. Some sub-apps might not have any non trivial implementation details worth mentioning).

## Links between Files
When referencing something that is described in another file please create links to the referenced file like this:
["Editor Controls"](./editor-controls.md)

Use a clear and consistent linking scheme. All separate files in the documentation must be reachable via links. So please ensure that no file is orphaned. Also ensure that it is always possible to get back to where one came from via clicking a link. So there must not be any dead ends in the navigation between files. It is not necessarily required to be able to reach every file from every other file so please only link what is relevant.

## FAQ for the AI
* If anything is unclear please just ask.
* Please keep these instructions as they are and only make changes below the line that follows. Don't use any lines in the documentation except to keep the instructions for the AI separated from the documentation itself.
---

# "Tile Editor"
The Tile Editor is a browser-based tool for creating and editing polygon instances on a 2D canvas. Users place polygons, edit their geometry through expressions (including constants), and clone instances to build tiled layouts. Developers interact with a Pixi.js canvas and a Tweakpane-driven UI that keeps polygon types and instances in sync.

## User-facing overview
- Create a new polygon by double-clicking empty canvas space.
- Select a polygon by clicking it to edit instance and type values.
- Drag polygons to move them; drag the background to pan the view.
- Scroll to zoom; use the "Center View" button to fit all polygons.
- Double-click a polygon to clone it along a ray defined by the click direction.
- Enter math expressions for side lengths and angles; use "?" for solver-assisted unknowns.
- Define constants once and reuse them across all expressions.
- Save and load tilings via JSON; loading recenters the view.
- Optionally draw unit-length axes at the origin to see the coordinate orientation.

## Developer-facing overview
- The app is a single-page entry in `tile-editor.html` and `src/apps/tile-editor/index.ts`.
- Rendering is handled by Pixi.js. UI controls are built with Tweakpane.
- Geometry expressions are parsed by `ExpressionParser` and evaluated against a constants map.
- Polygon types (shared geometry definitions) and instances (position + rotation) are separate.
- Instance position represents the polygon center; geometry is centered before rotation.

## Core sub-apps
- ["Editor Controls"](./editor-controls.md) for global editing inputs like scale, view offset, constants, and centering.
- ["Polygon Editor"](./polygon-editor.md) for selected polygon instance and type editing.
- ["Current Values"](./current-values.md) for live summaries of view, constants, and polygon geometry.
- ["Unit Cell Editor"](./unit-cell-editor.md) for interactive canvas editing and polygon visualization.

## Data flow summary
1. A polygon type stores side/angle expressions and cached evaluated geometry.
2. Polygon instances reference a type and store center position and rotation.
3. When type expressions change, all referencing instances recompute their rotated points.
4. The render layer draws instances from cached points and style state.

## Related documentation
- ["Tile Editor" Types](./index__types.md)
- ["Tile Editor" Implementation Notes](./index__implementation.md)
