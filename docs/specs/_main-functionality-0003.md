based on: https://chatgpt.com/c/69ba5e68-13a0-8385-aa83-827365e5351a
---

# Requirements Document — Client-Only Web Application for High-Dimensional Data Exploration with Kohonen Maps

## 1. Document Purpose

This document defines the requirements for a browser-based web application that allows users to load high-dimensional datasets from JSON and JSONL files and create, inspect, and compare Self-Organizing Maps (SOMs). The application is strictly client-only and requires no backend services.

The application shall support multiple SOM-related algorithms. The first mandatory algorithm is Kohonen’s original online Self-Organizing Map algorithm.

---

## 2. Scope

The application shall:

* run entirely in the browser
* allow users to load one or more local JSON or JSONL files
* parse and validate high-dimensional datasets
* allow users to configure and run SOM algorithms on loaded datasets
* visualize resulting maps and training progress
* support multiple algorithms through a pluggable algorithm architecture
* persist no server-side state by default

The application may optionally be paired with a backend API for persistence and shared data access. Such a backend is not required for the core product and must remain optional.

The application shall not require:

* run entirely in the browser
* allow users to load one or more local JSON or JSONL files
* parse and validate high-dimensional datasets
* allow users to configure and run SOM algorithms on loaded datasets
* visualize resulting maps and training progress
* support multiple algorithms through a pluggable algorithm architecture
* persist no server-side state

The application shall not require:

* a backend
* user accounts
* server-side storage
* cloud processing

---

## 3. Product Vision

The product is an interactive, local-first analysis tool for experimenting with high-dimensional datasets and topology-preserving map algorithms in the browser.

The application should be useful for:

* education and experimentation with SOMs
* exploratory data analysis
* visualization of cluster and topology structure in high-dimensional data
* side-by-side comparison of SOM variants
* reproducible experimentation with algorithm parameters

---

## 4. Definitions

### 4.1 Self-Organizing Map (SOM)

A topology-preserving unsupervised learning method that maps high-dimensional input vectors onto a low-dimensional discrete lattice.

### 4.2 Kohonen Original Algorithm

The online competitive-learning SOM algorithm in which, for each sampled input vector, the best matching unit (BMU) is determined and both the BMU and its neighbors are updated using a neighborhood function and time-dependent learning schedule.

### 4.3 BMU

Best Matching Unit. The neuron whose weight vector is closest to a given input vector according to the selected metric.

### 4.4 Dataset

A collection of vectors or vectorizable records loaded from one or more JSON or JSONL files.

### 4.5 JSONL

JSON Lines format, where each line is an independent JSON value, typically one object per line.

---

## 5. High-Level Goals

1. Make SOM experimentation accessible in a browser without installation of backend services.
2. Support high-dimensional numeric datasets from practical file formats.
3. Provide an extensible algorithm system for multiple SOM variants.
4. Make training transparent through strong visualization and inspection tools.
5. Support reproducible runs through explicit configuration, seeds, and exportable settings.

---

## 6. Core Functional Requirements

## 6.1 File Loading and Dataset Ingestion

The application shall allow the user to load one or more files from local disk.

The application shall support at least:

* `.json`
* `.jsonl`

The application shall support the following input forms:

* a JSON array of numeric vectors
* a JSON array of objects containing numeric fields
* a JSON object containing an array at a user-selectable path
* JSONL files containing one vectorizable record per line

The application shall allow combining multiple files into one logical dataset when their schemas are compatible.

The application shall process all file parsing locally in the browser.

The application shall provide clear error reporting for:

* invalid JSON
* invalid JSONL lines
* incompatible schemas across files
* missing numeric dimensions
* inconsistent vector lengths
* unsupported values such as `NaN`, `Infinity`, nested structures without a configured extraction rule, or non-numeric fields used as dimensions

The application shall allow large files to be processed incrementally where feasible, especially for JSONL.

The application should avoid blocking the UI during parsing.

---

## 6.2 Data Modeling and Dimension Extraction

The application shall transform loaded records into a numeric feature matrix suitable for SOM training.

The application shall support at least the following dimension extraction modes:

* direct use of array values as vector dimensions
* selection of numeric object fields as dimensions
* optional flattening of selected nested object paths

The application shall allow the user to inspect detected fields before training.

The application shall allow the user to include or exclude dimensions.

The application shall display dataset metadata including at least:

* number of records
* number of dimensions
* dimension names where available
* count of invalid or skipped records
* source file list

The application should allow basic handling of missing values, such as:

* reject rows with missing values
* ignore selected rows
* optionally fill with a user-selected strategy if implemented

Any imputation strategy beyond row rejection shall be clearly identified as optional and algorithm-independent preprocessing.

---

## 6.3 Data Preprocessing

The application shall provide preprocessing options prior to training.

The first version shall support at least:

* no normalization
* per-dimension min-max normalization
* per-dimension z-score standardization

The application should support additional preprocessing in later versions, such as:

* log transform for selected dimensions
* clipping or winsorization
* dimensional weighting

The application shall clearly show which preprocessing pipeline is active for a given experiment.

The application shall apply identical preprocessing to all algorithms participating in a comparison unless the user explicitly configures otherwise.

---

## 6.4 Algorithm Support

The application shall support multiple algorithms.

The first mandatory supported algorithm shall be:

* **Kohonen Original Online SOM**

The application architecture shall allow additional algorithms to be added later without redesign of the entire application.

The application shall expose each algorithm through a common interface for:

* parameter definition
* training execution
* progress reporting
* result serialization
* map visualization input

The application should support future algorithms such as:

* batch SOM
* toroidal SOM variants
* hexagonal-lattice SOM variants
* growing SOM variants
* alternative neighborhood schedules
* alternative distance metrics

These future algorithms are not mandatory for the first release unless separately specified.

---

## 6.5 Mandatory Algorithm: Kohonen Original Online SOM

The application shall implement Kohonen’s original online SOM approach as a first-class algorithm.

This implementation shall support at least:

* random or seed-based initialization of neuron weight vectors
* a configurable rectangular or hex-like map topology if topology support is part of the common map engine
* BMU search for each sampled input vector
* neighborhood-based weight updates around the BMU
* time-dependent learning rate schedule
* time-dependent neighborhood radius schedule
* training over a configurable number of iterations or epochs

The implementation shall expose parameters including at least:

* map width
* map height
* number of iterations or epochs
* learning rate initial value
* learning rate final value or decay configuration
* neighborhood radius initial value
* neighborhood radius final value or decay configuration
* random seed
* distance metric, at least Euclidean for the first release
* sampling mode, if multiple modes are supported

The implementation shall identify the BMU using the configured metric in feature space.

The implementation shall update neuron weight vectors according to Kohonen-style online learning with a neighborhood function dependent on grid distance.

The implementation should support at least one neighborhood function, preferably Gaussian.

The implementation may support additional neighborhood functions such as bubble or Mexican hat in later versions.

The requirements and UI shall identify this algorithm explicitly as the original Kohonen approach.

---

## 6.6 Experiment Configuration

The application shall allow the user to configure and run experiments.

An experiment shall include at least:

* selected dataset
* selected dimensions
* preprocessing settings
* selected algorithm
* algorithm parameters
* random seed where applicable

The application shall validate experiment configuration before training begins.

The application shall prevent training when required parameters are missing or invalid.

The application should provide sensible defaults for first-time users.

The application should provide presets for common SOM configurations.

---

## 6.7 Training Execution

Training shall execute entirely on the client.

The application shall keep the UI responsive during training.

The application should use Web Workers for long-running computation.

The application shall provide training controls at least for:

* start
* cancel
* reset

The application should provide pause and resume if feasible.

The application shall provide progress information during training, including at least:

* current iteration or epoch
* total iteration or epoch count
* current learning rate
* current neighborhood radius
* elapsed time

The application should optionally support stepwise or slowed-down training for educational visualization.

---

## 6.8 Visualization

The application shall visualize trained maps.

The first release shall support at least:

* a 2D map view of the neuron lattice
* display of neuron positions within the map topology
* assignment or hit visualization showing how many samples map to each neuron
* inspection of neuron weight vectors
* display of BMU mapping for selected data samples

The application should support the following visualizations in later phases or where feasible in the first release:

* U-Matrix
* component planes
* label overlays for selected metadata fields
* training history charts
* quantization error over time
* topographic error over time
* dataset projection overlays

The application shall distinguish clearly between:

* map topology space
* feature space
* derived visual metrics

The visualization system shall work across algorithms through a common result representation where possible.

---

## 6.9 Comparison Support

The application should allow multiple experiment runs to be compared.

Comparison support should include at least:

* side-by-side maps
* parameter comparison
* metric comparison
* shared dataset context

The application may allow the same dataset and preprocessing pipeline to be reused across multiple runs with different algorithms or parameters.

---

## 6.10 Metrics and Evaluation

The application shall compute and display basic quality metrics for each trained map.

The first release shall support at least:

* quantization error

The application should support:

* topographic error
* hit histogram statistics
* per-neuron occupancy summaries

The application shall document how each metric is defined.

---

## 6.11 Result Export and Reproducibility

The application shall allow exporting experiment results locally.

The application shall support export of at least:

* experiment configuration as JSON
* trained map weights as JSON
* derived metrics as JSON

The application should support export of:

* screenshots or rendered map images
* a full experiment bundle containing dataset metadata, preprocessing configuration, algorithm choice, parameters, seed, and results

The application shall support reloading previously exported experiment configurations.

The application should ensure that rerunning an experiment with the same dataset, preprocessing, algorithm, and random seed produces identical or intentionally documented near-identical results, subject to browser/runtime constraints.

---

## 7. User Interface Requirements

## 7.1 General UI Principles

The UI shall be understandable for both exploratory users and technically advanced users.

The application shall separate the workflow into clear stages:

* data loading
* schema/dimension inspection
* preprocessing
* algorithm selection
* parameter configuration
* training
* result inspection
* export

The UI should support progressive disclosure so that common tasks remain simple while advanced settings remain accessible.

---

## 7.2 Data Loading UI

The UI shall provide file selection via at least:

* file picker
* drag and drop

The UI shall show loaded files and parse status.

The UI shall show schema or dimension detection results before training.

The UI shall show validation warnings and errors clearly.

---

## 7.3 Algorithm Selection UI

The UI shall present a list of supported algorithms.

The algorithm list shall include Kohonen’s original online SOM as the first mandatory option.

For each algorithm, the UI should show:

* algorithm name
* short description
* supported topology types
* supported metrics
* supported parameters

The UI shall update parameter controls dynamically based on selected algorithm.

---

## 7.4 Training and Results UI

The UI shall show current run status.

The UI shall show progress during training.

The UI shall allow result inspection after training without requiring re-upload of the dataset.

The UI should allow selecting a neuron to inspect:

* its coordinates in the map
* its weight vector
* sample hits assigned to it

The UI should allow selecting a sample to inspect:

* its original vector or source record
* its BMU
* distance to BMU

---

## 8. Non-Functional Requirements

## 8.1 Client-Only Architecture

The application shall function without any backend service.

All parsing, preprocessing, training, visualization, and export shall happen locally in the browser.

The application shall not require internet access after the app assets are loaded, unless explicitly designed as a hosted static app.

An optional backend integration may be supported for persistence and sharing, but the core application behavior shall remain functional without it.

---

## 8.2 Performance

The application should handle reasonably large datasets for browser-based analysis.

Concrete supported size targets shall be defined during implementation planning, but the design shall consider at least:

* thousands to tens of thousands of samples
* tens to hundreds of dimensions

The application shall avoid unnecessary duplication of large in-memory arrays where feasible.

The application should use streaming or chunked parsing for JSONL where practical.

The application should use worker-based computation for long-running training tasks.

---

## 8.3 Responsiveness

The UI shall remain responsive during parsing and training.

Long-running tasks should report progress frequently enough that the user can understand whether work is proceeding.

---

## 8.4 Determinism

The application shall support explicit random seeds for algorithms that rely on randomness.

The application shall document any sources of nondeterminism.

---

## 8.5 Privacy

User data shall remain local to the browser unless the user explicitly exports it.

The application shall not upload datasets by default.

---

## 8.6 Portability

The application should work in current desktop browsers with modern JavaScript support.

Target browser compatibility shall be defined during implementation planning, but the design should assume modern Chromium, Firefox, and Safari-class browsers.

---

## 8.7 Accessibility

The application should follow reasonable accessibility practices, including:

* keyboard navigability
* sufficient contrast
* labeled controls
* text alternatives for major controls and charts where feasible

---

## 9. Architecture Requirements

## 9.1 Modular Design

The application shall be structured into at least the following logical modules:

* file ingestion
* schema and dimension extraction
* preprocessing pipeline
* algorithm engine
* worker execution layer
* visualization layer
* experiment persistence/export layer

---

## 9.2 Algorithm Plugin Contract

The algorithm system shall define a stable internal contract for supported algorithms.

That contract shall cover at least:

* algorithm identifier
* display name
* parameter schema
* default parameter values
* training entry point
* progress callback interface
* result format
* capability metadata

This contract shall make it possible to add algorithms beyond Kohonen’s original algorithm without rewriting unrelated application layers.

---

## 9.3 Shared Result Model

The application shall define a shared representation for map results sufficient for visualization and export.

That representation should include at least:

* map topology metadata
* neuron coordinates
* neuron weight vectors
* hit counts
* BMU assignments or a reproducible means to recompute them
* metric summaries
* training metadata

---

## 10. Error Handling Requirements

The application shall provide user-visible, actionable errors.

Errors shall be categorized where feasible, such as:

* file format error
* schema extraction error
* preprocessing configuration error
* algorithm parameter error
* training execution error
* export error

The application should avoid silent failure.

The application should preserve partial non-corrupt state when one operation fails.

---

## 11. Security Considerations

Because the application loads local files, it shall handle untrusted input defensively.

The application shall not execute arbitrary code from loaded files.

The application shall treat JSON and JSONL purely as data.

The application should validate all user-controlled configuration before worker execution.

---

## 12. Minimum First Release Requirements

The first release shall include at least:

1. local loading of JSON and JSONL files
2. transformation of loaded records into numeric vectors
3. dimension selection
4. preprocessing with at least none, min-max, and z-score
5. support for at least one algorithm interface and one implemented algorithm
6. implementation of Kohonen’s original online SOM algorithm
7. configuration of map size, learning schedule, neighborhood schedule, seed, and iteration count
8. browser-local training execution
9. visualization of the resulting map and hit distribution
10. quantization error display
11. export of experiment configuration and map result as JSON

---

## 13. Optional Backend API Extension

This section defines an optional backend API extension. This backend is not required for the first release and must not be necessary for core application functionality.

The purpose of the optional backend API is to support persistence, reuse, and sharing of datasets and algorithm configurations across sessions or users.

### 13.1 Goals

The optional backend API may support at least:

* loading datasets from a remote persistence layer
* saving datasets for later reuse
* loading saved algorithm configurations
* saving algorithm configurations for later reuse
* optional sharing of saved datasets or configurations between users or environments

### 13.2 Non-Goals

The optional backend API is not required to perform SOM training.

The optional backend API is not required to execute preprocessing or algorithms on the server.

The optional backend API is not required for the user to use the application locally.

### 13.3 Functional Requirements

If a backend API is implemented, it shall support at least the following resource categories:

* datasets
* algorithm configurations

If a backend API is implemented, the application should be able to:

* upload dataset files or normalized dataset payloads
* retrieve saved datasets or dataset metadata
* save algorithm configurations
* load previously saved algorithm configurations
* list available datasets and saved configurations
* delete previously saved datasets and configurations if permitted by the deployment model

The backend API should distinguish between raw uploaded source files and normalized extracted datasets where both are supported.

The backend API should support metadata for datasets, including at least:

* dataset identifier
* display name
* source format
* schema summary
* record count
* dimension count
* creation timestamp
* optional tags or description

The backend API should support metadata for algorithm configurations, including at least:

* configuration identifier
* display name
* algorithm identifier
* parameter values
* preprocessing configuration
* creation timestamp
* optional tags or description

### 13.4 API Style

If implemented, the backend API should expose a stable, documented interface.

A REST-style JSON API is the preferred baseline unless another style is explicitly chosen.

The API should use explicit versioning.

The API should return structured validation errors.

### 13.5 Client Integration Requirements

If backend support is enabled, the UI shall clearly distinguish between:

* local-only data
* remotely persisted data

The UI shall continue to allow local workflows even when the backend is unavailable.

Backend failures shall not corrupt local in-memory experiment state.

The application should allow importing remote datasets into a local client-only workflow.

The application should allow exporting a locally created algorithm configuration to the backend when connected.

### 13.6 Security and Privacy Requirements

If a backend API is implemented, it shall validate uploaded content defensively.

If a backend API is implemented, it shall treat uploaded JSON and JSONL as untrusted data.

If authentication or multi-user access is supported, authorization rules shall be defined separately.

The client application shall not assume that backend persistence is private unless explicitly guaranteed by the deployment model.

### 13.7 Compatibility Requirement

The existence of an optional backend API shall not change the requirement that Kohonen’s original online SOM algorithm must be runnable fully on the client.

The existence of an optional backend API shall not make server communication mandatory for dataset loading, configuration, training, visualization, or export.

---

## 14. Future Extensions (Additional Enhancements)

Potential future extensions include:

* additional SOM algorithms
* toroidal and alternative topologies
* GPU acceleration
* dimensionality reduction overlays
* richer comparison workflows
* dataset labeling and annotation
* clustering on top of trained maps
* timeline playback of training
* PWA/offline packaging
* session persistence in IndexedDB

These extensions are desirable but not required for the first release.

---

## 15. Open Design Questions (To Be Resolved)

The following questions should be resolved during design refinement:

1. What exact dataset size targets must be supported in the browser?
2. Should the first release support both rectangular and hexagonal map topologies, or only one?
3. Should JSON object-path extraction be rule-based in the first release or deferred?
4. What metrics beyond quantization error are mandatory for release 1?
5. Is experiment persistence in browser storage required in release 1?
6. Should educational step-through training visualization be mandatory or optional?
7. What exact plugin contract should be used for future algorithms?

---

## 16. Acceptance Criteria Summary (Release Validation)

The product shall be considered to satisfy the base requirements when a user can:

* open the application in a browser
* load one or more JSON or JSONL files from local disk
* inspect and select numeric dimensions from the dataset
* choose Kohonen’s original SOM algorithm
* configure training parameters
* train a map locally with no backend
* inspect the resulting map visually
* see at least basic quality metrics
* export the resulting experiment configuration and trained map

---

## 17. Mandatory Statement on Algorithm Support (Normative Requirement)

The application must support multiple algorithms.

Kohonen’s original online Self-Organizing Map algorithm is the first mandatory algorithm and must be supported in the initial release.
