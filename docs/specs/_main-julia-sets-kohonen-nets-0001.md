# Julia Set Kohonen Map — Pure Frontend Web App Specs

## 1. Goal

Create a pure frontend web application that trains and visualizes a **Kohonen network / Self-Organizing Map (SOM)** using grayscale feature vectors derived from **Julia sets**.

The application is intended as an exploratory and artistic tool that lets the user:

* generate a deterministic map of Julia-set morphologies,
* train a SOM on grayscale Julia-set feature images,
* inspect the trained map as a square or hexagonal grid,
* click a SOM cell to view the corresponding Julia set in a larger viewer,
* smoothly explore transitions between neighboring or arbitrary points in the learned map.

No backend is required. Everything must run fully in the browser.

---

## 2. Core Principles

### 2.1 Pure frontend

* No server-side processing.
* No database required.
* All computation happens in the browser.
* State may optionally be persisted to local storage or downloadable files.

### 2.2 Determinism

The application must be **fully deterministic**.

Given:

* the exact same application version,
* the exact same settings,
* the exact same random seed,

it must train **exactly the same Kohonen net** and produce exactly the same result.

This requirement is critical.

### 2.3 Reproducible randomness

* Use **XORShift128** as the canonical pseudo-random number generator.
* All randomness in the app must flow through this generator.
* No use of `Math.random()` is allowed in any training-relevant path.
* Any randomized initialization, sample generation, shuffling, interpolation sampling, or visualization choice that affects trained results must use the seeded deterministic RNG.

### 2.4 Training data representation

* The Kohonen network is trained using **grayscale feature vectors** generated from Julia sets.
* Each training sample is a grayscale image of a Julia set.
* Pixel values must be normalized to **[0, 1]**.
* The grayscale escape-time representation used for training must use the **logarithmic scaling / smooth escape-time approach** discussed previously.

### 2.5 Separation of training and viewing

Training features and visualization features are separate concerns.

* Training uses a fixed grayscale feature representation.
* The large Julia-set viewer may use separate visualization settings.
* Changing viewer-only settings must **not** retrain the SOM and must **not** alter the trained weights.

---

## 3. Main Use Case

1. User opens the app.
2. User configures SOM and Julia feature-generation parameters.
3. User sets a random seed.
4. User starts training.
5. The app deterministically generates Julia-set training samples and trains the SOM.
6. The resulting SOM is displayed as either a square or hex grid.
7. Each cell shows or represents its learned Julia-set prototype.
8. User clicks a cell.
9. A Julia-set viewer next to the SOM shows the selected Julia set at higher resolution.
10. User can smoothly interpolate across nearby positions or between cells to explore transitions in the learned map.
11. User may adjust viewer-only rendering settings such as visualization iterations without retraining.

---

## 4. User-Configurable Parameters

## 4.1 Training parameters

### 4.1.1 Size of Kohonen net

The user can set the SOM dimensions.

Fields:

* `somWidth`
* `somHeight`

Default:

* `32 x 32`

Requirements:

* Must support rectangular maps, not only square ones.
* Must validate reasonable minimum and maximum values.
* UI should provide sensible constraints to avoid freezing the browser.

### 4.1.2 Kohonen net topology

User can choose:

* `squares`
* `hexagons`

Requirements:

* Topology affects neighborhood calculations and rendering.
* The training algorithm must use the selected topology consistently.
* The visualization grid must match the topology used in training.

### 4.1.3 Iterations of Julia sets for training

Field:

* `trainingJuliaIterations`

Requirements:

* Controls how many iterations are used to generate training feature images.
* Must affect only training feature generation.
* Must be deterministic.

### 4.1.4 Size of feature vector

Fields:

* `featureWidth`
* `featureHeight`

Definition:

* Each Julia set is rendered into a grayscale image of size `featureWidth x featureHeight`.
* The image is flattened into a fixed-length feature vector.
* Pixel values are normalized to `[0, 1]` using logarithmic / smooth escape-time scaling.

Requirements:

* The feature vector length is `featureWidth * featureHeight`.
* Width and height must be independently configurable.
* Changing these parameters requires retraining.

### 4.1.5 Training rounds

Field:

* `trainingRounds`

Requirements:

* Defines the number of SOM training rounds / epochs.
* Training schedule must be deterministic.
* Learning-rate and neighborhood-radius decay must be deterministic and documented.

### 4.1.6 Random seed

Field:

* `randomSeed`

Requirements:

* Must seed the XORShift128 generator.
* Same seed + same settings must produce identical training samples, initialization, and final SOM state.
* Seed format may be numeric or string, but string seeds must be converted deterministically into the XORShift128 internal state.
* Zero-state invalidity must be handled safely and deterministically.

---

## 4.2 Viewer-only visualization parameters

These settings affect only the large Julia-set viewer and must never alter the trained SOM.

### 4.2.1 Iterations for visualization

Field:

* `viewerJuliaIterations`

Requirements:

* Can be changed at any time after training.
* Must update only the viewer rendering.
* Must not change:

  * training data,
  * feature vectors,
  * SOM weights,
  * cell assignments,
  * interpolation results in SOM coordinate space.

---

## 5. Functional Requirements

## 5.1 Julia set generation for training

### 5.1.1 Parameterization

The app must define how Julia sets are sampled for training.

Recommended baseline:

* Use complex parameter `c = a + bi` as the sampled Julia-set parameter.
* Each training sample corresponds to one `c` value.

Requirements:

* The sampling strategy over the complex plane must be explicitly documented.
* Sampling must be deterministic and driven by XORShift128.
* The same seed and settings must generate the same ordered sequence of sampled `c` values.

### 5.1.2 Escape-time rendering for features

For training features:

* render in grayscale,
* normalize values to `[0, 1]`,
* use smooth/logarithmic scaling rather than plain integer banding.

Requirements:

* Avoid palette-dependent training artifacts.
* Training features must be independent of decorative color palettes.
* The training representation should emphasize structure, not cosmetic coloring.

### 5.1.3 Normalization

Requirements:

* Feature images must be normalized consistently.
* The normalization algorithm must be fixed and documented.
* No hidden browser-dependent behavior should influence results.
* Numeric precision strategy should be explicit to reduce cross-platform drift.

---

## 5.2 SOM training

### 5.2.1 SOM model

Each SOM cell contains a prototype vector with length:

* `featureWidth * featureHeight`

Requirements:

* Initial weights must be deterministic.
* Initialization strategy must be documented.
* Distance metric must be explicitly defined.

Recommended default:

* Euclidean distance in feature-vector space.

### 5.2.2 Neighborhood updates

Requirements:

* The best matching unit (BMU) must be found deterministically.
* Neighborhood update rules must depend on chosen topology.
* Learning rate and neighborhood radius must decay deterministically across training rounds.
* Tie-breaking rules must be deterministic.

### 5.2.3 Square topology

Requirements:

* Neighborhood distance must be defined on a rectangular square grid.
* Common choices include Manhattan or Euclidean grid distance; the chosen approach must be fixed in the implementation.

### 5.2.4 Hex topology

Requirements:

* Neighborhood distance must be defined correctly for a hexagonal grid.
* Coordinate system must be clearly chosen and documented, such as axial or cube coordinates.
* Rendering and training distance calculations must agree exactly.

### 5.2.5 Training progress

Requirements:

* App should show progress during training.
* Long-running training should not freeze the UI completely.
* A Web Worker is strongly recommended for training.
* Worker execution must still remain deterministic.

---

## 5.3 SOM visualization

### 5.3.1 Grid display

The result must be displayed as:

* a square grid when square topology is selected,
* a hex grid when hex topology is selected.

Requirements:

* The grid should visually encode each cell’s learned prototype.
* At minimum, each cell must be clickable and selectable.
* Optionally, each cell may show a tiny Julia thumbnail.

### 5.3.2 Cell selection

Requirements:

* Clicking a cell selects it.
* The selected state must be visually highlighted.
* The viewer panel next to the SOM must update to show the Julia set represented by that cell.

### 5.3.3 What is shown for a cell

A cell should correspond to a Julia-set parameter derived from the learned map.

Acceptable strategies include:

* store the representative source sample attached to each cell,
* store the BMU winner sample for that cell,
* decode the prototype vector back into a sampled Julia parameter,
* interpolate in parameter space using anchor samples.

This must be chosen explicitly in implementation.

Recommended baseline:

* each cell stores a representative complex parameter `c` derived from the closest training sample to that prototype.

That approach is easier to explain and preserves a meaningful Julia-set viewer.

---

## 5.4 Julia-set viewer

### 5.4.1 Large viewer panel

Requirements:

* A larger Julia-set viewer must appear next to the SOM.
* When a cell is selected, the viewer renders the corresponding Julia set.
* Viewer rendering resolution may be independent of feature-vector resolution.

### 5.4.2 Smooth interpolation between points

Requirement from user:

* “linearly interpolate between the points smoothly”

Interpretation:

* The app should allow smooth interpolation between neighboring or selected positions in the learned map.
* Interpolation should feel continuous rather than stepwise.

Minimum requirement:

* When the user moves continuously across the map, the viewer should update smoothly by interpolating between corresponding Julia parameters.

Recommended implementation direction:

* Associate each cell with a complex parameter `c`.
* Interpolate linearly in complex parameter space between adjacent cells or between multiple cell centers.
* Re-render the Julia set continuously for interpolated values.

Important note:

* Linear interpolation in `c` space is simple and deterministic, but the resulting visual transition may be highly nonlinear.
* This is acceptable and expected.

### 5.4.3 Interpolation modes

Recommended modes:

* cell-to-cell interpolation,
* hover-based continuous interpolation inside the grid,
* animation along a path between selected cells.

At minimum, one smooth interpolation mode must be implemented.

---

## 6. Determinism Requirements

This section is mandatory and high priority.

## 6.1 Sources of nondeterminism that must be avoided

* `Math.random()`
* unordered object-key iteration where order matters
* unstable sort behavior without explicit tie-breakers
* floating-point ambiguity caused by inconsistent algorithms
* browser timing affecting training order
* race conditions between worker messages
* non-seeded sample shuffling

## 6.2 Deterministic RNG

* XORShift128 must be the only RNG used for training-relevant logic.
* Seed-to-state conversion must be fixed and documented.
* Random draws must occur in a stable order.
* Conditional code paths must not accidentally consume different numbers of RNG steps depending on UI timing.

## 6.3 Deterministic sample order

* Training sample order must be reproducible.
* If reshuffling per round is used, the reshuffle must be deterministic.
* If samples are generated lazily, generation order must be explicit and stable.

## 6.4 Deterministic tie-breaking

When distances are exactly equal or effectively equal:

* choose the lower index cell,
* or otherwise use a documented stable rule.

Tie-breaking must never depend on runtime or iteration quirks.

## 6.5 Deterministic numeric handling

Requirements:

* Use JavaScript `number` consistently.
* Avoid hidden precision loss where possible.
* Use a fixed order of operations in distance and update calculations.
* Keep all arrays in a stable deterministic layout, preferably typed arrays.

## 6.6 Version sensitivity

The app should acknowledge that exact reproducibility is guaranteed only for:

* the same app version,
* same settings,
* same seed,
* same deterministic algorithms.

Optionally expose a reproducibility fingerprint including:

* app version,
* parameter hash,
* seed,
* topology,
* feature dimensions.

---

## 7. Suggested UI Structure

## 7.1 Main layout

Recommended three-panel layout:

### Left panel

Training and visualization controls.

### Center panel

SOM map display.

### Right panel

Large Julia-set viewer and cell details.

---

## 7.2 Controls panel

Suggested groups:

### SOM settings

* SOM width
* SOM height
* topology: squares / hexagons
* training rounds
* random seed

### Julia training feature settings

* training iterations
* feature width
* feature height

### Viewer settings

* visualization iterations

### Actions

* Train
* Cancel training
* Reset
* Export settings
* Import settings
* Export trained map

---

## 7.3 Result panel

Should include:

* trained SOM grid,
* current selected cell coordinates,
* corresponding Julia parameter,
* optional thumbnail,
* interpolation controls or hover preview.

---

## 8. Data Model

Suggested conceptual entities:

## 8.1 App settings

Contains:

* SOM dimensions
* topology
* training Julia iterations
* feature width
* feature height
* training rounds
* random seed
* viewer Julia iterations

## 8.2 Training sample

Contains:

* sample index
* complex parameter `c`
* grayscale feature vector

## 8.3 SOM cell

Contains:

* grid coordinates
* prototype vector
* representative parameter `c`
* optional nearest source sample id

## 8.4 Training result

Contains:

* all SOM cells
* final training metadata
* reproducibility fingerprint

---

## 9. Performance Requirements

### 9.1 Browser responsiveness

* Training should not block the UI for long periods.
* Use Web Workers for training and possibly feature generation.

### 9.2 Memory efficiency

* Feature vectors and SOM weights should use typed arrays where practical.
* The app should avoid unnecessary copying of large arrays.

### 9.3 Progressive feedback

* Show progress percentage or current round.
* Show approximate counts of samples processed.

### 9.4 Safe limits

The UI should prevent absurd settings that would likely crash or freeze the browser.

Examples:

* very large SOM sizes,
* huge feature-vector dimensions,
* excessive training rounds.

---

## 10. Export / Import

Recommended requirements:

### 10.1 Export settings

User can export the current settings as JSON.

### 10.2 Import settings

User can import settings from JSON.

### 10.3 Export trained map

User can export a trained SOM result including:

* settings,
* seed,
* representative parameters,
* prototype vectors or a compressed representation,
* app version / reproducibility fingerprint.

### 10.4 Import trained map

User can re-open a previously exported SOM result without retraining.

---

## 11. Error Handling

Requirements:

* Invalid numeric fields must show clear validation errors.
* Seed parsing errors must be handled clearly.
* Training cancellation must leave the app in a consistent state.
* If settings change after training, the UI should indicate whether the current result is stale.

---

## 12. Accessibility and UX

Requirements:

* Click targets in the SOM grid should be large enough to use comfortably.
* Keyboard navigation for cells is desirable.
* Selected cell must be visually obvious.
* Loading and training states must be clearly communicated.
* Viewer-only controls must be clearly labeled as not affecting training.

---

## 13. Recommended Technical Approach

## 13.1 Frontend stack

Recommended:

* TypeScript
* React
* Canvas 2D for grid and Julia rendering
* Web Workers for training

Optional:

* WebGL for faster Julia rendering in the large viewer

## 13.2 Deterministic numeric structures

Recommended:

* `Float32Array` or `Float64Array` for prototype vectors
* explicit row-major indexing
* deterministic helper utilities for coordinate transforms

## 13.3 Rendering separation

Recommended separation into modules:

* RNG / XORShift128
* Julia generation
* feature extraction
* SOM training
* square-grid math
* hex-grid math
* UI state
* viewer rendering
* import/export

---

## 14. Open Design Decisions to Refine

These choices should be made explicit during implementation:

1. **How many training samples are generated?**

   * equal to number of cells?
   * a multiple of number of cells?
   * user-configurable?

2. **What exact region of complex parameter space is sampled for `c`?**

   * fixed bounding box?
   * only connected Julia sets?
   * include disconnected dust-like sets?

3. **What exact smooth/logarithmic grayscale formula is used?**

   * normalized iteration count formula should be fixed precisely.

4. **How is a SOM cell mapped back to a Julia parameter for the viewer?**

   * nearest source sample is the simplest initial choice.

5. **What exact neighborhood distance and decay schedule are used?**

   * these must be pinned down for reproducibility.

6. **How should interpolation across hex cells work in UI space?**

   * barycentric-like local interpolation,
   * neighbor interpolation,
   * path interpolation.

---

## 15. Acceptance Criteria

The app is successful when:

1. It runs fully in the browser with no backend.
2. User can configure:

   * SOM size,
   * topology,
   * Julia training iterations,
   * feature width and height,
   * training rounds,
   * random seed,
   * viewer visualization iterations.
3. The SOM is trained on grayscale Julia-set feature vectors.
4. Training uses logarithmically scaled grayscale features.
5. Training is deterministic.
6. Same settings + same seed produce exactly the same trained map.
7. RNG uses XORShift128.
8. The resulting SOM is rendered as square or hex grid according to topology.
9. Clicking a cell updates the Julia-set viewer.
10. The viewer supports smooth linear interpolation between points.
11. Viewer-only settings do not affect training results.

---

## 16. Nice-to-Have Features

* miniature Julia thumbnails inside every cell
* hover preview without click
* animated interpolation path mode
* export viewer image as PNG
* save and load presets
* training-history charts
* U-Matrix or distance overlay
* option to color cells by metadata such as connectedness or escape statistics
* compare multiple seeds side by side

---

## 17. Out of Scope for First Version

* backend storage
* collaborative editing
* GPU-accelerated SOM training
* 3D SOMs
* arbitrary fractal families beyond Julia sets
* palette-based training features
* non-deterministic or heuristic “improved” training shortcuts that would break reproducibility
