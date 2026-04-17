# "Polygon Editor"

"Polygon Editor" edits the selected polygon. It separates instance values from type values.

Back to ["Tile Editor"](./index.md).

## Instance Values
- Position (x/y) of the selected polygon instance.
- Rotation expression (supports units via the same syntax as angle expressions).

## Type Values
- Side length expressions per edge.
- Interior angle expressions per vertex.
- Expressions support constants and "?" for solver-assisted unknowns.

## Behavior
- Changes to type values propagate to all instances that share the same description.
- Invalid type expressions show a toast and keep the expression; invalid inputs are highlighted in red and dummy geometry is used for interaction.
- Solver failures also show a toast and keep the expression while switching to dummy geometry.
