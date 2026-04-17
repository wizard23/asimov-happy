# "Main" Types

Back to ["Main"](./index.md).

## AppConfig
Defined in `src/apps/main/index.ts`.

Key fields:
- `gridWidth`, `gridHeight`: grid dimensions in cells.
- `gridType`: grid geometry type (`squares`, `hexagons`, `triangles`, `cairo`).
- `gridScale`: size of a grid unit in pixels.
- `numStates`, `drawState`: number of cell states and the currently active state.
- `palette`, `selectedPalette`: cell color mapping and chosen palette.
- `edgePalette`, `selectedEdgePalette`: edge delta palette mapping and chosen palette.
- `edgeColor`, `edgeWidth`, `edgeHighlightColor`: edge styling and hover highlight color.
- `visualizeEdgeDelta`: toggles per-edge delta coloring.
- `showCoordinates`: toggles cell coordinate labels.
- `leftClickMode`: interaction mode (`draw`, `spawnParticle`, `smart`).
- `particleSpeed`: particle motion speed.
- `edgeSelectionRule`: particle edge selection strategy (see below).
- `orbitDistance`: target distance for the `orbitCursor` rule.

## EdgeSelectionRule
Defined in `src/types/index.ts` and consumed by `ParticleSystem`.

Supported values:
- `randomNoBacktrack`
- `randomWithBacktrack`
- `clockwise`
- `counterClockwise`
- `followCursor`
- `avoidCursor`
- `orbitCursor`
- `highestEdgeDelta`

## LeftClickMode
Defined in `src/apps/main/index.ts`.

Supported values:
- `draw`
- `spawnParticle`
- `smart`

## Cell State Storage
- `cellStates`: `number[][]` indexed as `[row][col]`, stores the draw state per cell.
