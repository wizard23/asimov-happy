# "Unit Cell Editor" Implementation Notes

Back to ["Unit Cell Editor"](./unit-cell-editor.md).

## Rendering model
- World geometry is projected to screen space by `worldToScreen()`.
- Polygons are drawn in pixel space using Pixi `Graphics` commands.
- The container itself is not scaled; zoom is applied in the projection math.

## Hover detection and highlights
- Hit testing runs in world space:
  - `pointInPolygon` for interior checks.
  - `pointNearPolyline` for edge proximity (treated as closed loops).
- Vertex hover is checked before edge hover; vertex wins if both are close.
- Hover highlights are drawn in screen space:
  - vertices as filled circles,
  - edges as thicker strokes on the hovered segment.

## Selection and dragging
- Selection uses the same hit test as hover (top-most polygon wins).
- Dragging updates instance center in world space and redraws.

## Axes and preview overlay
- Axes are drawn from world origin to unit endpoints and projected to screen.
- Axis labels use pixel-sized stroke and font sizes.
