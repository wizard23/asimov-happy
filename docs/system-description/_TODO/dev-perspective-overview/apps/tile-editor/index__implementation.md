# "Tile Editor" Implementation Notes

Back to ["Tile Editor"](./index.md).

## Expression evaluation
- Expressions are parsed by `ExpressionParser`.
- A multiline constants block defines named values; each line is evaluated in order and can reference earlier constants.
- Angle expressions support optional unit suffixes (e.g. `90,deg`).

## Polygon description vs. instance
- Geometry expressions and evaluated geometry live in `PolygonDescription`.
- Instances store only position and rotation; their `points` are derived by rotating the type's base points.
- When a type expression changes, all instances that reference it are updated in place.
 - Base points are centered using `getPolygonCenter` before rotation; instance position represents the center.

## Unknown values and solver integration
- If any side or angle expression is `?`, the solver is used to fill missing values.
- Constraints are built from provided expressions; vertex kinds are inferred by angle values.
- The solver returns side lengths and interior angles in radians; these populate the type cache.
 - Invalid expressions or solver failures switch the type to a dummy regular n-gon and mark it as errored.

## Cloning algorithm
- Double-clicking an existing polygon clones it.
- The clone direction is from the polygon center to the mouse position.
- A ray intersection test finds the furthest edge intersection along that direction.
- The clone is placed at twice the center-to-intersection distance in that direction.

## Save/load format
- Saved tilings are JSON with a `version` field (currently `1`).
- The file stores editor defaults, polygon descriptions (type expressions), and instances (position + rotation expression).
- On load, scale and view offset are not restored; the app runs the same logic as "Center View" to fit the content.
- The editor tracks whether the current tiling has been saved and warns on unload/load when unsaved polygons exist.

## Coordinate system and axes
- Geometry is constructed in math coordinates (first edge along +X) and then displayed with Y flipped.
- Optional axes render unit-length lines from the origin for X and Y to make the orientation visible.

## Rendering pipeline
- Pixi.js `Graphics` instances draw each polygon.
- Selection and hover state update stroke/outline styling.
- Hover state also computes a nearest vertex or edge and draws a highlight on the hovered element (vertex takes priority over edge).
- The polygon labels are regenerated on selection updates.
