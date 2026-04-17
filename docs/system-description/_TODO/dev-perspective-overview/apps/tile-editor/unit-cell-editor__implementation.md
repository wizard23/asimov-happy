# "Unit Cell Editor" Implementation Notes

Back to ["Unit Cell Editor"](./unit-cell-editor.md).

## Hover detection and highlights
- Hovering checks the cursor in world space against polygons from top-most to bottom-most.
- A polygon counts as hovered if the point is inside the polygon or within edge tolerance (`pointInPolygon` or `pointNearPolyline` with `closePath = true`).
- Vertex highlighting runs first; if a vertex is within the vertex tolerance, that vertex is highlighted and edge highlighting is skipped.
- Edge highlighting computes the closest edge segment and highlights it if within the edge tolerance.
- Closed polygons skip the duplicate closing point for hover tests; open polygons use all points and do not close the last edge.

## Hover tolerances and styling
- Edge hover tolerance is `max(0.1, (edgeWidth / scale) * 2)` via `getHitTolerance()`.
- Vertex hover tolerance is based on `DRAW_CONFIG.hoverVertex` (`radiusPx`, `minWorld`, `toleranceScale`) and scales with zoom.
- Hovered edges are drawn with `DRAW_CONFIG.hoverEdge` (color and width).
- Hovered vertices are drawn as filled circles using `DRAW_CONFIG.hoverVertex` (color and size).
