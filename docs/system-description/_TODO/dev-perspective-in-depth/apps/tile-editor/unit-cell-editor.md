# "Unit Cell Editor"

"Unit Cell Editor" is the interactive Pixi.js canvas for creating and manipulating polygon instances.

Back to ["Tile Editor"](./index.md).
Implementation details: ["Unit Cell Editor" Implementation Notes](./unit-cell-editor__implementation.md).

## User interactions
- Double-click empty space to create a new polygon instance.
- Double-click a polygon to clone it along the click ray.
- Click to select; the "Polygon Editor" updates to the selection.
- Drag a polygon to move it; drag the background to pan.
- Scroll the mouse wheel to zoom.
- Hovering highlights polygons, vertices, and edges.

## Visual overlays
- Unit axes at the origin (optional).
- Dashed selection outline and dotted open-edge indicator.
- Error diagonals for solver/expression failures.
