# "Tile Editor" Types

Back to ["Tile Editor"](./index.md).

## Shared Types
- `Point`: `{ x: number; y: number }`

## Tile Editor Data Structures
- `EditorConfig`
  - `scale`: number
  - `numSides`: number
  - `sideLengthExpression`: string
  - `constantsText`: string
  - `edgeWidth`: number
  - `drawAxes`: boolean
  - `axesColor`: string
  - `axesLineWidth`: number
  - `closedPolygonEpsilon`: number
  - `viewOffset`: `{ x: number; y: number }`

- `PolygonDescription`
  - Purpose: shared geometry definition for multiple instances.
  - `sides`: number
  - `sideLengthExpressions`: string[]
  - `interiorAngleExpressions`: string[]
  - `sideLengths`: number[] (evaluated)
  - `interiorAngles`: number[] (evaluated, radians)
  - `points`: `Point[]` (evaluated, unrotated)
  - `isClosed`: boolean
  - `hasError`: boolean
  - `errorType`: `'expression' | 'solver' | null`
  - `invalidSideExpressions`: boolean[]
  - `invalidAngleExpressions`: boolean[]

- `PolygonData`
  - Purpose: an instance of a polygon type.
  - `x`, `y`: number (instance center position)
  - `rotationExpression`: string (instance-level expression)
  - `rotation`: number (evaluated, radians)
  - `description`: `PolygonDescription`
  - `points`: `Point[]` (rotated, instance-level cached points)
  - `isClosed`: boolean (mirrors type state)
  - `graphics`: Pixi `Graphics`
  - `isHovered`: boolean

- `ConstantEntry`
  - `name`: string
  - `value?`: number
  - `error?`: string

## Saved Tiling Format
- `SavedTilingV1`
  - `version`: `1`
  - `config`: editor defaults to restore (except scale/view offset), includes axes settings
  - `descriptions`: polygon type definitions (expressions only)
  - `instances`: polygon instance data (position + rotation expression)

## Solver Types (used when expressions contain "?")
Imported from `src/core/utils/solver-types.ts`:
- `PolygonConstraint`
- `VertexKinds`
- `SimplePolygonSolveOptions`
- `PolygonData` (solver output)

The Tile Editor consumes the solver's `PolygonData` output to populate `sideLengths`, `interiorAngles`, and base `points` for a `PolygonDescription`.
