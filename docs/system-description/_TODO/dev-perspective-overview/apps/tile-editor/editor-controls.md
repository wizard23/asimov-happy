# "Editor Controls"

"Editor Controls" provides global controls for the Tile Editor.

Back to ["Tile Editor"](./index.md).

## User-facing behavior
- Scale zoom control for the canvas.
- Number of sides and default side-length expression for new polygons.
- Edge width, closure epsilon, and view offset controls.
- Axis visibility, color, and line width controls for the origin axes.
- Constants text area for defining named values used in expressions.
- "Center View" button to fit all polygons into the visible area.
- "Save Tiling" downloads a JSON snapshot of the current tiling.
- "Load Tiling" restores a saved tiling and recenters the view.
- Save state tracking triggers warnings when leaving or loading if unsaved polygons exist.

## Developer notes
- Implemented via Tweakpane in `src/apps/tile-editor/index.ts`.
- The constants textarea is appended directly to the pane container to support multiline input.
