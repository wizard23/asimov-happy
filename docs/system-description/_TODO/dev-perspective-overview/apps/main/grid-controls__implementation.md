# "Grid Controls" Implementation Notes

Back to ["Grid Controls"](./grid-controls.md) and ["Main"](./index.md).

## Orbit Distance Visibility
The Orbit Distance slider is created in the Particles folder but hidden by default. It is shown only when `edgeSelectionRule` is set to `orbitCursor`, toggled by updating the element style.

## Grid Scale Sync
Mouse wheel zoom updates `gridScale` programmatically and refreshes the Grid Scale binding so the slider stays in sync with the current value.
