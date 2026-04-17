# "Tile Editor" Types

Back to ["Tile Editor"](./index.md).

## Core configuration
- `EditorConfig`: editor-wide state bound to "Editor Controls".
  - `scale`: zoom factor in world->screen transform.
  - `numSides`, `sideLengthExpression`: defaults for new polygons.
  - `constantsText`: multiline constants input.
  - `edgeWidth`: pixel stroke width for polygon edges.
  - `drawAxes`, `axesColor`, `axesLineWidth`: axes rendering controls.
  - `closedPolygonEpsilon`: tolerance for closure detection.
  - `viewOffset`: world-space pan offset.

## Geometry types
- `Point` (from `src/apps/tile-editor/types.ts`): `{ x: number; y: number }`.
- `PolygonDescription`: shared type definition for a polygon.
  - `sideLengthExpressions`, `interiorAngleExpressions`: expression strings.
  - `sideLengths`, `interiorAngles`: evaluated numeric values.
  - `points`: centered local points (Y inverted for display orientation).
  - `isClosed`, `hasError`, `errorType`: evaluation state.
  - `invalidSideExpressions`, `invalidAngleExpressions`: per-entry validation flags.
- `PolygonData`: a polygon instance.
  - `x`, `y`: instance center in world space.
  - `rotationExpression`, `rotation`: rotation expression and evaluated radians.
  - `description`: pointer to a `PolygonDescription`.
  - `points`: rotated points (cached for rendering).
  - `graphics`: Pixi `Graphics` used for drawing.
  - `isHovered`, `hoveredVertexIndex`, `hoveredEdgeIndex`: hover state.

## Evaluation helpers
- `ConstantEntry`: parsed constants with `name`, `value`, and `error` fields.
- `DescriptionEvaluation`: evaluation result for a polygon description.
  - Carries evaluated lengths/angles, points, closure, and error metadata.

## Persistence
- `SavedTilingV1`: JSON payload used for save/load.
  - `version`: format version (currently `1`).
  - `config`: editor defaults (without view offset).
  - `descriptions`: unique polygon types by id.
  - `instances`: polygon instances with position and rotation expression.
