# Implementation Status: `_main-julia-sets-kohonen-nets-0001`

## 1. Purpose

This document summarizes the current implementation status of [../specs/_main-julia-sets-kohonen-nets-0001.md](../specs/_main-julia-sets-kohonen-nets-0001.md) against the code currently present in `code/v001`.

The central finding is:

- the current implementation is clearly built from this Julia/SOM spec
- most of the core product requirements are implemented in usable form
- several open design decisions from the spec have now been resolved in code
- two notable gaps remain: true in-flight training cancellation is likely not implemented, and hex-grid interpolation is smooth but not strictly linear in the same sense as the square-grid implementation

## 2. Code Areas Reviewed

The implementation assessment in this document is based primarily on:

- `code/v001/packages/web/src/app/app.tsx`
- `code/v001/packages/web/src/workers/training-client.ts`
- `code/v001/packages/web/src/workers/training-worker.ts`
- `code/v001/packages/web/src/canvas/julia-viewer-canvas.tsx`
- `code/v001/packages/web/src/canvas/mandelbrot-overview-canvas.tsx`
- `code/v001/packages/web/src/canvas/map-geometry.ts`
- `code/v001/packages/web/src/canvas/som-map-canvas.tsx`
- `code/v001/packages/shared/src/config/*`
- `code/v001/packages/shared/src/julia/*`
- `code/v001/packages/shared/src/rng/*`
- `code/v001/packages/shared/src/reproducibility/*`
- `code/v001/packages/shared/src/serialization/*`
- `code/v001/packages/shared/src/som/*`
- `code/v001/packages/shared/src/topology/*`
- `code/v001/packages/shared/src/types/settings.ts`

## 3. Overall Status

### 3.1 Implemented well enough to count as present

- pure browser-side app behavior for the actual product flow
- deterministic XORShift128-based sample generation, initialization, and shuffling
- grayscale Julia feature generation using smooth escape-time normalization
- configurable SOM dimensions, topology, training iterations, feature dimensions, training rounds, seed, and viewer iterations
- square and hex topology support in both training and rendering
- deterministic BMU search, deterministic tie-breaking, and deterministic neighborhood updates
- Web Worker-based training with progress updates
- map rendering, cell selection, and large Julia viewer rendering
- hover-based interpolation on the map
- stale-result detection when training-relevant settings change
- export/import of settings JSON
- export/import of trained map JSON
- reproducibility fingerprint generation

### 3.2 Partially implemented

- cancellation exists in the UI and worker protocol, but likely does not interrupt a synchronous training run already in progress
- interpolation is fully smooth, but the hex interpolation method is inverse-distance weighting rather than a plainly linear local interpolation rule
- the spec’s open design decisions have mostly been decided in code, but those decisions are not yet documented back into the spec itself
- accessibility support exists in some UI areas, but not yet in the SOM-map interaction model itself

### 3.3 Not implemented

- keyboard navigation for SOM cells
- persistent storage of app state beyond file export/import and theme storage
- path animation interpolation mode
- cell thumbnails based on re-rendered Julia sets rather than prototype grayscale vectors

## 4. Requirement Status By Spec Section

## 4.1 Goal and Core Product Shape

Status: implemented

The application currently matches the main product concept well:

- it trains a SOM on grayscale Julia-set feature vectors
- it displays the result as a square or hex grid
- clicking a cell drives a larger Julia viewer
- the viewer updates continuously during map hover

The implementation under `code/v001/packages/web` and `code/v001/packages/shared` is substantially aligned with the spec’s intended product, not merely adjacent to it.

## 4.2 Pure Frontend

Status: implemented

The active application flow is browser-only:

- training is done in a Web Worker
- no backend is used by the web app
- settings and results are exchanged via downloadable/importable JSON files

There are `server` and `cli` workspace packages, but they are currently scaffolding and do not participate in the actual Julia/SOM product flow.

## 4.3 Determinism and Reproducible Randomness

Status: implemented strongly

Implemented characteristics include:

- XORShift128 is the canonical RNG
- string and numeric seeds are deterministically converted into an internal XORShift128 state
- zero-state invalidity is handled via a deterministic fallback state
- sample generation is deterministic
- SOM initialization is deterministic
- per-round sample shuffling is deterministic
- BMU tie-breaking is deterministic
- reproducibility fingerprints are generated from stable serialized settings plus algorithm version

There are also deterministic tests covering:

- RNG output stability
- sample generation stability
- SOM-training stability

## 4.4 Training Data Representation

Status: implemented

The training pipeline uses:

- one Julia parameter `c` per training sample
- one grayscale feature image per sample
- normalized feature values in `[0, 1]`
- a smooth escape-time formula rather than palette-based rendering
- typed arrays for feature vectors

This matches the spec’s intended representation closely.

## 4.5 Separation of Training and Viewing

Status: implemented

The code separates training settings from viewer settings. In practice:

- `splitAppSettings()` separates `training` from `viewer`
- `viewerJuliaIterations` is used only by the Julia viewer
- training fingerprints are computed from training settings only
- changing viewer-only settings does not mark results stale and does not retrain the SOM

The current implementation even adds another viewer-only setting, `showMandelbrotSomGrid`, without mixing it into the training fingerprint.

## 4.6 User-Configurable Parameters

Status: implemented with extensions

Implemented required controls:

- `somWidth`
- `somHeight`
- `topology`
- `trainingJuliaIterations`
- `featureWidth`
- `featureHeight`
- `trainingRounds`
- `randomSeed`
- `viewerJuliaIterations`

Also implemented beyond the original spec:

- sample-cache toggle
- neighborhood-pruning toggle
- neighborhood-pruning threshold
- performance mode presets
- Mandelbrot overlay toggle

Validation and safe limits are present and wired into the UI.

## 4.7 Julia Parameter Sampling

Status: implemented, but under-documented at the spec level

The current code has made a concrete choice for a design question that was still open in the spec:

- Julia parameters are sampled uniformly from a fixed complex-plane bounding box
- the current bounds are `[-1.8, 1.8]` on both real and imaginary axes
- sampling order is deterministic and seed-driven

This satisfies the spec operationally, but the exact bounds and strategy should now be documented as part of the spec or a derived implementation note.

## 4.8 Escape-Time Rendering and Normalization

Status: implemented

The implementation uses:

- deterministic per-pixel coordinate mapping
- a fixed bailout radius
- smooth/logarithmic escape-time normalization
- stable row-major feature-vector layout
- `Float32Array` storage for generated vectors

This is directly aligned with the spec’s grayscale-feature and normalization requirements.

## 4.9 SOM Model and Training

Status: implemented strongly

Implemented characteristics include:

- one prototype vector per SOM cell
- prototype-vector length equal to `featureWidth * featureHeight`
- deterministic initialization
- Euclidean feature-space distance
- deterministic BMU selection
- deterministic neighborhood decay schedule
- topology-aware neighborhood distance
- deterministic representative-sample assignment after training

The decay schedule has been concretized in code:

- fixed initial/final learning rates
- initial radius equal to half the larger map dimension
- fixed final radius of `1`
- exponential interpolation over total training steps

Again, this resolves an open design point from the spec, but that resolved choice is not yet written back into the spec.

## 4.10 Square and Hex Topology

Status: implemented

Square topology:

- implemented in training
- implemented in rendering
- uses Euclidean grid distance

Hex topology:

- implemented in training
- implemented in rendering
- uses an offset-grid to axial-coordinate conversion and hex distance calculation

This is consistent with the spec’s requirement that rendering and training agree on topology. The hex coordinate-system choice is now explicit in code.

## 4.11 Training Progress and Responsiveness

Status: implemented with one caveat

Implemented:

- training runs in a dedicated Web Worker
- progress updates include total steps, completed steps, current round, and current sample
- the UI shows state, progress percentage, progress bar, round, and sample index

Caveat:

- cancellation likely does not truly interrupt an already-running synchronous training loop

The code posts a `cancel` message to the worker, but the worker’s training execution is synchronous and does not poll any shared cancellation flag inside the loop. That means cancellation is likely only handled after the current training run yields back to the worker event loop.

So responsiveness is good, but hard cancellation appears only partially implemented.

## 4.12 SOM Visualization

Status: implemented

Implemented:

- square grid rendering for square topology
- hex grid rendering for hex topology
- each cell visually encodes its learned prototype using grayscale image data
- each cell is clickable/selectable
- selected and highlighted cells are visually distinguished

This satisfies the main visualization requirement, though the cell imagery is the learned grayscale prototype vector rather than a separately rendered Julia thumbnail.

## 4.13 Cell Selection and Cell Meaning

Status: implemented

The implementation has made an explicit and sensible choice for the “what a cell represents” requirement:

- after training, each cell is assigned the closest training sample in feature-vector space
- the cell stores that sample’s `sampleIndex` and Julia parameter `c`
- the viewer uses that representative parameter for selected-cell display

This is exactly one of the acceptable strategies discussed in the spec and is very close to the recommended baseline.

## 4.14 Julia Viewer

Status: implemented

Implemented:

- a larger Julia viewer next to the map
- rendering driven by the selected or hovered Julia parameter
- viewer iteration count separate from training feature generation
- viewer panning and zooming
- viewer resolution independent of training feature resolution

This matches the spec well and in some ways goes beyond the minimum requirement.

## 4.15 Smooth Interpolation Between Points

Status: implemented, but only partially aligned with the exact interpretation

Implemented:

- continuous hover-based interpolation within the SOM map
- continuous viewer updates during hover
- linear mixing for square grids via bilinear interpolation of neighboring cell parameters

Partially aligned:

- hex interpolation is implemented as inverse-distance weighting across the three nearest cell centers

This means:

- the user-facing requirement for smooth interpolation is satisfied
- the acceptance criterion for “supports smooth linear interpolation between points” is fully satisfied for square mode
- hex mode is smooth and deterministic, but not strictly the same kind of linear interpolation

So this is best classified as partial alignment rather than a clean miss.

## 4.16 Export / Import

Status: implemented strongly

Implemented:

- export settings to JSON
- import settings from JSON
- export trained map to JSON
- import trained map without retraining

The trained-map document includes:

- settings
- representative parameters
- prototype vectors
- metadata
- reproducibility fingerprint

This is one of the stronger spec-aligned areas.

## 4.17 Error Handling and Stale Results

Status: implemented

Implemented:

- numeric validation errors are surfaced in the UI
- invalid imported settings documents are rejected
- invalid imported training-result documents are rejected
- changing training-relevant settings marks the current result stale
- cancellation leaves the UI in a defined state

The only caveat here is the earlier cancellation point: the UI state is coherent, but actual interruption of the worker computation is likely incomplete.

## 4.18 Accessibility and UX

Status: partial

Implemented:

- selected cells are visually obvious
- training/loading states are visible
- viewer-only settings are labeled as viewer-only
- some general UI accessibility work exists in the shell and theme-selection UI

Missing or weak:

- no keyboard navigation for the SOM map
- canvas interactions are primarily pointer-driven
- there is no obvious keyboard-accessible cell focus model

This is consistent with the spec’s “desirable” rather than strictly mandatory wording for keyboard navigation, but it remains unfinished.

## 5. Resolved Design Decisions Now Present In Code

The following spec open questions have concrete answers in `code/v001`:

- training sample count: `somWidth * somHeight * 4`
- parameter-space sampling region: fixed bounding box `[-1.8, 1.8] x [-1.8, 1.8]`
- smooth grayscale formula: smooth escape-time normalized by `maxIterations`
- cell-to-parameter mapping: nearest training sample to the final prototype vector
- square topology distance: Euclidean grid distance
- hex topology distance: offset-grid to axial conversion with hex distance
- training schedule: exponential decay from fixed defaults
- square interpolation: bilinear parameter interpolation
- hex interpolation: inverse-distance weighting over nearby cell centers

These choices make the implementation concrete and reproducible. They should be documented back into the spec set.

## 6. Summary Matrix

- implemented: pure frontend execution
- implemented: deterministic training pipeline
- implemented: XORShift128 everywhere that affects training
- implemented: smooth grayscale Julia feature vectors
- implemented: square and hex SOM support
- implemented: map rendering, selection, viewer rendering
- implemented: import/export and reproducibility fingerprinting
- implemented: stale-result detection
- partial: cancellation of an in-flight training run
- partial: exact interpretation of “linear interpolation” for hex topology
- partial: keyboard accessibility for SOM interaction

## 7. Recommended Next Actions

If the goal is to make `code/v001` cleanly conform to the spec rather than merely align with it, the next priorities should be:

1. Implement true cooperative cancellation inside the training loop so the worker can stop promptly.
2. Decide whether hex interpolation should be reworked to a more explicitly linear local scheme, or whether the spec should be updated to accept the current inverse-distance method.
3. Write the now-resolved implementation choices back into the Julia/SOM spec so the documentation matches the actual deterministic algorithm.

