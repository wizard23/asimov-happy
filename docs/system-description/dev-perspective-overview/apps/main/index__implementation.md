# "Main" Implementation Notes

Back to ["Main"](./index.md).

## Grid Centering
The grid is centered using true polygon bounds. For each cell, the app collects `getCellPolygon` vertices to compute min/max bounds and then offsets all render containers so the grid’s bounding box is centered in the PixiJS viewport. This avoids visual drift for non-rectangular grids (hexagon/triangle/Cairo).

## Cell State Resizing
When `gridWidth` or `gridHeight` changes, the app resizes `cellStates` by copying the overlap of old and new dimensions and zero-filling only new rows/columns. This preserves painted data when the grid expands or shrinks.

## Smart Input Resolution
Smart mode uses the same thresholds as the existing modes. On hover and click, the app attempts edge detection first (edge wins when within threshold). If no edge is hit, it falls back to cell selection.

## Orbit Cursor Rule UI
The Orbit Cursor rule exposes an `Orbit Distance` slider in the Particles folder only when the rule is selected. The slider element is shown/hidden based on the current rule to keep the panel concise.
