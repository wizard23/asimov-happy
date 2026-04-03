# "Polygon Editor"

"Polygon Editor" is the per-selection pane that edits a polygon instance and its shared type.

Back to ["Tile Editor"](./index.md).
Implementation details: ["Polygon Editor" Implementation Notes](./polygon-editor__implementation.md).

## Instance values
- Position: edits the instance center in world space.
- Rotation Expression: expression evaluated as radians (supports angle units).

## Type values
- Side length expressions: per-edge length inputs.
- Angle expressions: per-vertex interior angle inputs.
- Expressions are shared across all instances of the same type.

## Validation feedback
- Invalid expressions are styled with the `expression-invalid` class.
- Errors are also reflected in polygon rendering (error strokes and diagonals).
