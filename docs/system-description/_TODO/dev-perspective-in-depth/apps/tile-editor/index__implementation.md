# "Tile Editor" Implementation Notes

Back to ["Tile Editor"](./index.md).

## Initialization and entry points
- Entry HTML: `tile-editor.html` mounts the layout and loads `src/apps/tile-editor/index.ts`.
- Pixi setup: `Application` is created with a fixed background; the stage contains:
  - `polygonContainer`: holds all polygon graphics and labels.
  - `previewGraphics`: axes overlay and transient visuals.
  - `labelContainer`: vertex labels (z-index above polygons).
- Tweakpane setup: "Editor Controls" binds `EditorConfig` values and wiring for save/load.

## Coordinate transforms
- `worldToScreen(point)`: converts world coordinates to pixel space using:
  - screen center + `viewOffset` + `scale`.
- `globalToWorld(point)`: converts screen pixels to world coordinates for hit testing.
- Rendering uses screen-space points, but interaction math is in world space.

## Expression evaluation and constants
- Constants input is parsed line-by-line (`NAME=EXPR`).
- `ExpressionParser` evaluates expressions with constant substitution.
- Angle expressions accept optional units (e.g., `90,deg`).
- Evaluation errors show toasts and mark expression entries invalid.

## Polygon creation and solver integration
- New polygons use `numSides` and `sideLengthExpression`.
- `?` in side/angle expressions triggers the polygon solver.
- Fallback for errors: a dummy regular polygon is synthesized to keep rendering stable.

## Rendering pipeline
- Each polygon instance owns a Pixi `Graphics` object.
- `drawPolygonInstance()` computes screen points and draws:
  - fill, stroke, and open-edge dotted connections,
  - dashed selection outline,
  - error diagonals for invalid shapes,
  - hover highlights for vertex and edge.
- Dash animation advances on the Pixi ticker (`dashOffset`).

## Selection and hover
- Selection is set on pointer down; the "Polygon Editor" binds to the selected instance.
- Hover detection:
  - find the top-most polygon by checking point-in-polygon or point-near-polyline in world space.
  - compute nearest vertex first; if none, compute nearest edge.
  - draw hover overlays in screen space with pixel sizes.

## Save/load flow
- Save serializes `SavedTilingV1` with unique descriptions and instances.
- Load rebuilds descriptions and instances, then recenters the view.
- The editor tracks unsaved state and prompts on unload/load.
