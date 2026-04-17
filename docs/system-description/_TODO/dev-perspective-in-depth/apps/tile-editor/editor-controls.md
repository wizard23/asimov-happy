# "Editor Controls"

"Editor Controls" is the Tweakpane panel that configures editor-wide behavior and commands.

Back to ["Tile Editor"](./index.md).
Implementation details: ["Editor Controls" Implementation Notes](./editor-controls__implementation.md).

## Commands
- Center View: fits all polygons in view and recenters the camera.
- Save Tiling: downloads the current tiling as JSON.
- Load Tiling: loads a JSON tiling (warns if unsaved changes exist).

## Tiling
- Number of Sides: default side count for new polygons.
- Side Length Expr: default side-length expression for new polygons.
- Constants: multiline constants input (NAME=EXPR per line).

## View
- Scale: zoom level (mouse wheel uses the same scale value).
- View Offset: pan value in world coordinates.

## Gui Settings
- Edge Width: pixel width for polygon strokes.
- Draw Axes: toggle unit axis drawing.
- Axes Color / Axes Line Width: styling for axes.

## Advanced/Debug
- Closed Polygon Epsilon: tolerance for closure detection and error display.
