# "Polygon Editor" Implementation Notes

Back to ["Polygon Editor"](./polygon-editor.md).

## Binding model
- The pane is rebuilt on selection changes.
- Instance bindings write to `PolygonData` (`x`, `y`, `rotationExpression`).
- Type bindings write to `PolygonDescription` expression arrays.

## Expression application
- Changing a type expression calls `tryApplyDescriptionExpressions()`.
- This updates cached geometry for all instances that share the type.
- Invalid expressions set per-entry flags used by `expression-invalid` styling.
