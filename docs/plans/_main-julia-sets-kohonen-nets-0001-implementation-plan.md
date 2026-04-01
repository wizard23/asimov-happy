# Implementation Plan: Julia Set Kohonen Map

## 1. Scope

This plan covers the implementation of [docs/specs/_main-julia-sets-kohonen-nets-0001.md](/Users/wizard23/projects/asimov/asimov-happy/docs/specs/_main-julia-sets-kohonen-nets-0001.md) in the existing scaffold at [code/v001](/Users/wizard23/projects/asimov/asimov-happy/code/v001).

The first implementation target is a pure frontend browser app delivered from `packages/web`, with deterministic training logic extracted into `packages/shared`. The existing `packages/server` and `packages/cli` stay non-critical for v1 and do not own any required product functionality.

## 2. Implementation Targets In `code/v001`

## 2.1 Package ownership

- `packages/web`: application shell, controls, canvases, worker wiring, local state, import/export UX.
- `packages/shared`: deterministic domain logic and shared types.
- `packages/server`: no required feature work for this spec in v1.
- `packages/cli`: no required feature work for this spec in v1.

## 2.2 Planned module layout

The final implementation should be organized roughly like this:

- `packages/shared/src/types/*`
- `packages/shared/src/config/*`
- `packages/shared/src/rng/*`
- `packages/shared/src/julia/*`
- `packages/shared/src/som/*`
- `packages/shared/src/topology/*`
- `packages/shared/src/serialization/*`
- `packages/shared/src/reproducibility/*`
- `packages/web/src/app/*`
- `packages/web/src/components/*`
- `packages/web/src/canvas/*`
- `packages/web/src/state/*`
- `packages/web/src/workers/*`
- `packages/web/src/styles/*`

Exact filenames can be adjusted during implementation, but package ownership should remain stable.

## 3. Explicit Design Decisions

This section resolves the spec's open items so implementation can proceed without re-deciding core behavior.

## 3.1 Framework and rendering choices

- Use Preact in `packages/web` because it already exists in the scaffold.
- Use Canvas 2D for:
  - SOM grid rendering
  - large Julia viewer rendering
  - optional thumbnail generation
- Use a Web Worker for training and feature generation.
- Keep the worker single-threaded. Determinism is more important than parallel throughput in v1.

## 3.2 Deterministic package boundary

All training-relevant logic must live in `packages/shared`, including:

- seed parsing
- XORShift128 RNG
- Julia feature generation
- sample generation
- SOM initialization
- BMU search
- topology distance math
- training schedules
- representative-sample assignment
- reproducibility fingerprint generation

`packages/web` may orchestrate and render, but it must not contain hidden training logic.

## 3.3 Training sample count

For v1, training sample count is fixed and derived from map size:

- `trainingSampleCount = somWidth * somHeight * 4`

Rationale:

- gives the SOM more samples than cells,
- avoids another control in the first UI,
- keeps behavior deterministic and easy to explain.

This value should be included in exported training metadata even if it is not user-editable yet.

## 3.4 Complex parameter sampling region

Use a fixed rectangular sampling region for Julia parameter `c`:

- `real in [-1.8, 1.8]`
- `imag in [-1.8, 1.8]`

Sampling strategy:

- uniform seeded sampling over that bounding box,
- include connected and disconnected Julia sets,
- generate samples in a stable indexed order from `0..trainingSampleCount-1`.

This keeps coverage broad and avoids hidden filtering logic.

## 3.5 Julia feature viewport

Use a fixed Julia rendering viewport for feature extraction and viewer rendering:

- complex `z` plane x-range `[-1.5, 1.5]`
- complex `z` plane y-range `[-1.5, 1.5]`
- sample pixel centers, not edges

The training viewport is fixed. Viewer resolution and viewer iteration count may vary, but the viewport stays fixed in v1.

## 3.6 Smooth grayscale feature formula

Use the following deterministic feature rule:

- iterate `z_{n+1} = z_n^2 + c` with `z_0 = pixelComplexCoordinate`
- bailout radius is fixed at `2`
- if the orbit escapes at iteration `n` with magnitude `|z_n| = r`, compute:
  - `smooth = n + 1 - log2(log(max(r, 2)))`
  - `value = clamp(smooth / maxIterations, 0, 1)`
- if the point does not escape within `maxIterations`, set `value = 1`

The feature vector stores row-major grayscale values in `[0, 1]`.

## 3.7 Numeric representation

- Use JavaScript `number` for all calculations.
- Store large vectors in typed arrays.
- Use `Float32Array` for feature vectors and prototype vectors in v1.
- Use stable row-major indexing everywhere.

If cross-browser drift appears during validation, the first mitigation is to upgrade training-critical arrays to `Float64Array` without changing algorithms.

## 3.8 RNG strategy

- XORShift128 is the only RNG used in any training-relevant code path.
- String seeds are hashed deterministically into four `uint32` words.
- All-zero internal state is replaced with a fixed non-zero fallback state.
- No `Math.random()` in shared logic, worker logic, or training orchestration.

## 3.9 Sample order and reshuffling

Implementation will use:

- deterministic pre-generation of all training samples,
- deterministic Fisher-Yates reshuffle per round using a round-specific RNG derived from the root seed and round index.

This gives better SOM training behavior than a fixed order while remaining reproducible.

## 3.10 SOM initialization

Prototype initialization rule:

- initialize each cell by copying one deterministically chosen training sample feature vector,
- chosen sample index comes from the seeded RNG,
- copy values into the prototype array to avoid aliasing.

This is preferable to random scalar initialization because it starts from valid feature-space points and remains deterministic.

## 3.11 Distance and tie-breaking rules

- Feature distance: squared Euclidean distance.
- BMU selection: lowest distance wins.
- Exact ties: lower linear cell index wins.
- Stable linear cell index: `y * somWidth + x`.

## 3.12 Neighborhood math

Square topology:

- grid distance uses Euclidean distance between `(x, y)` cell coordinates.

Hex topology:

- store cells in row/column layout for arrays and rendering,
- convert to axial coordinates for neighborhood distance,
- use axial hex distance for training updates,
- keep one shared conversion utility used by both trainer and renderer.

## 3.13 Learning schedule

Use per-step exponential decay across total update steps:

- `totalSteps = trainingRounds * trainingSampleCount`
- `progress = step / max(totalSteps - 1, 1)`
- `learningRate = initialLearningRate * (finalLearningRate / initialLearningRate) ^ progress`
- `radius = initialRadius * (finalRadius / initialRadius) ^ progress`

Pinned defaults:

- `initialLearningRate = 0.45`
- `finalLearningRate = 0.05`
- `initialRadius = max(somWidth, somHeight) / 2`
- `finalRadius = 1`

Neighborhood influence:

- Gaussian falloff using topology distance and current radius.

## 3.14 Mapping a trained cell back to Julia parameter `c`

Use the simplest explainable rule from the spec:

- after training, assign each SOM cell a representative source sample,
- choose the training sample whose feature vector is nearest to the trained prototype,
- store:
  - representative sample index
  - representative `c`

The large viewer always renders from representative `c`, not by decoding the prototype vector directly.

## 3.15 Smooth interpolation mode

At minimum, v1 will support continuous pointer-driven interpolation in viewer space.

Square topology:

- interpolate representative `c` values bilinearly within the local cell quad.

Hex topology:

- interpolate representative `c` values using inverse-distance weighting over the 3 nearest visible hex centers.

This keeps interpolation smooth, deterministic, and implementable without introducing complex geometry tooling.

## 3.16 Persistence and stale-state rules

- Settings changes that affect training mark the trained result as stale.
- Viewer-only changes do not mark training as stale.
- Exported trained maps include:
  - settings
  - training metadata
  - representative parameters
  - prototypes
  - reproducibility fingerprint

## 4. Data Model

The shared package should expose stable TypeScript interfaces for:

- `AppSettings`
- `TrainingSettings`
- `ViewerSettings`
- `TrainingSample`
- `SomCell`
- `SomTrainingProgress`
- `SomTrainingResult`
- `ReproducibilityFingerprint`
- `ExportedSettingsDocument`
- `ExportedTrainingResultDocument`

Important split:

- `TrainingSettings` contains only training-relevant fields.
- `ViewerSettings` contains only viewer-only fields.

This separation is required to prevent accidental retraining from viewer changes.

## 5. Planned Work Breakdown

## 5.1 Phase 1: Shared deterministic core

Deliverables:

- shared settings and result types
- XORShift128 implementation
- deterministic seed hashing
- reproducibility fingerprint helper
- typed-array helpers
- numeric clamps and indexing utilities

Exit criteria:

- unit-level deterministic inputs produce identical outputs across repeated runs,
- no training-relevant dependency on browser APIs.

## 5.2 Phase 2: Julia feature generation

Deliverables:

- complex number helpers kept minimal and allocation-light
- deterministic Julia feature renderer
- grayscale normalization implementation
- training sample generator over parameter `c`

Exit criteria:

- same seed and settings produce byte-equivalent feature vectors,
- feature vectors are normalized to `[0, 1]`,
- sample ordering is stable.

## 5.3 Phase 3: SOM engine

Deliverables:

- square and hex topology math
- SOM data structures
- BMU search
- neighborhood update logic
- training schedule
- representative sample assignment after training

Exit criteria:

- same training settings and same seed reproduce the same SOM result,
- square and hex topology paths both use shared deterministic rules,
- tie-breaking is explicit and tested.

## 5.4 Phase 4: Web Worker integration

Deliverables:

- training worker entrypoint
- typed worker message contracts
- progress events
- cancellation support
- safe worker lifecycle handling

Exit criteria:

- training no longer blocks the main UI thread,
- cancel stops cleanly and leaves last completed state consistent,
- repeated runs still remain deterministic.

## 5.5 Phase 5: Web application shell

Deliverables:

- Preact app shell
- training controls
- validation and limits
- train/cancel/reset actions
- stale-result indicators
- selection state and viewer-only controls

Exit criteria:

- all required controls from the spec are present,
- invalid inputs are blocked with clear messages,
- viewer-only controls do not trigger retraining.

## 5.6 Phase 6: Canvas rendering

Deliverables:

- square SOM canvas renderer
- hex SOM canvas renderer
- selection highlight
- large Julia viewer canvas
- interpolation behavior

Exit criteria:

- map topology matches training topology,
- selecting cells updates the viewer,
- pointer movement yields smooth viewer transitions.

## 5.7 Phase 7: Import/export

Deliverables:

- export settings JSON
- import settings JSON
- export trained map JSON
- import trained map JSON

Exit criteria:

- imported settings restore UI state,
- imported trained maps render without retraining,
- exported documents include reproducibility metadata.

## 5.8 Phase 8: Verification and hardening

Deliverables:

- deterministic regression tests in shared logic
- smoke tests for import/export round trips
- UI checks for stale-state behavior
- performance guardrails for unsafe input sizes

Exit criteria:

- core deterministic guarantees are covered,
- major stale-state and worker-cancel paths are exercised,
- browser remains responsive under default settings.

## 6. File-Level Plan

This is the intended first-pass write map in `code/v001`.

Likely new or heavily changed shared files:

- `packages/shared/src/index.ts`
- `packages/shared/src/types/*`
- `packages/shared/src/config/*`
- `packages/shared/src/rng/*`
- `packages/shared/src/julia/*`
- `packages/shared/src/som/*`
- `packages/shared/src/topology/*`
- `packages/shared/src/serialization/*`
- `packages/shared/src/reproducibility/*`

Likely new or heavily changed web files:

- `packages/web/src/main.ts`
- `packages/web/src/app/*`
- `packages/web/src/components/*`
- `packages/web/src/canvas/*`
- `packages/web/src/state/*`
- `packages/web/src/workers/*`
- `packages/web/src/styles/*`

Possible package config changes:

- `packages/web/package.json`
- `packages/shared/package.json`
- tsconfig files only if new worker or module paths require them

No required v1 changes:

- `packages/server/src/main.ts`
- `packages/cli/src/main.ts`

## 7. Validation Strategy

## 7.1 Determinism checks

The implementation should include repeatable checks for:

- identical seed hashing
- identical RNG output sequences
- identical sample generation order
- identical feature vectors
- identical final prototype arrays
- identical representative `c` assignments
- identical reproducibility fingerprints

## 7.2 Behavioral checks

- square topology trains and renders correctly
- hex topology trains and renders correctly
- clicking a cell updates the viewer
- viewer-only iteration changes do not alter the current trained map
- changing training settings marks results stale
- import/export round trips preserve usable state

## 7.3 Performance checks

- default config completes in a reasonable time on a modern laptop browser
- progress updates occur during training
- UI remains interactive while worker is active

## 8. Risks And Mitigations

## 8.1 Cross-browser numeric drift

Risk:

- floating-point differences could challenge exact reproducibility.

Mitigation:

- keep algorithms simple,
- keep operation order fixed,
- use typed arrays,
- validate determinism primarily within the supported browser set for v1,
- upgrade to `Float64Array` for training-critical arrays if needed.

## 8.2 Hex interpolation complexity

Risk:

- hex rendering and interpolation can diverge if geometry utilities are duplicated.

Mitigation:

- one canonical hex coordinate utility module,
- renderer and trainer both depend on the same conversion functions.

## 8.3 Browser freeze from unsafe settings

Risk:

- large map and feature settings can exceed memory or compute budgets.

Mitigation:

- apply hard UI limits,
- compute estimated workload before training,
- block settings above known-safe thresholds in v1.

## 8.4 Worker/main-thread logic drift

Risk:

- training logic partially duplicated across worker and UI could break determinism.

Mitigation:

- keep worker orchestration thin,
- keep all training logic in shared modules only.

## 9. Recommended Default Settings

First-pass defaults:

- `somWidth = 32`
- `somHeight = 32`
- `topology = "squares"`
- `trainingJuliaIterations = 96`
- `featureWidth = 32`
- `featureHeight = 32`
- `trainingRounds = 12`
- `randomSeed = "default-seed-0001"`
- `viewerJuliaIterations = 192`

These values are conservative enough for a browser-first v1 while still generating meaningful output.

## 10. Acceptance Mapping

This plan satisfies the spec by explicitly targeting:

- pure frontend execution in `packages/web`
- deterministic RNG via XORShift128
- deterministic Julia-derived grayscale features
- deterministic SOM training for square and hex topologies
- clickable SOM visualization
- large Julia viewer tied to selected cells
- smooth interpolation in viewer behavior
- separation of training settings from viewer-only settings
- export/import of settings and trained results

## 11. Implementation Order

Recommended execution order:

1. Build and test the shared deterministic core.
2. Implement Julia feature generation and sample generation.
3. Implement the SOM engine for square topology first.
4. Add hex topology support once square training is stable.
5. Move training into a worker.
6. Build the Preact UI and canvas renderers.
7. Add import/export.
8. Finish with deterministic regression coverage and performance tuning.

This order reduces integration risk and gives an earlier determinism checkpoint before UI complexity grows.

## 12. Out Of Scope For The First Implementation Pass

Not required for the first implementation pass:

- WebGL renderer
- thumbnails in every cell
- path animation mode
- keyboard navigation polish beyond basic accessibility support
- server persistence
- multi-seed comparison views
- advanced analytical overlays such as U-Matrix

## 13. Ready-To-Implement Definition

This plan is ready for implementation because it fixes the remaining ambiguous choices:

- sample count
- parameter sampling region
- feature viewport
- grayscale formula
- initialization strategy
- topology distance rules
- decay schedule
- representative-sample mapping
- interpolation strategy
- package/module ownership

No additional design document is required before starting implementation in `code/v001`.
