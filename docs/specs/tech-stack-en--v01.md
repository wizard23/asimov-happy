# Tech Stack — English v0.1

## Purpose

This document defines the initial technical stack and architecture baseline for implementing the Interactive WebGL Backgrounds Webapp described in `app-monet-julia-ca--0001.md`.

The stack is chosen to:

* fit the current workspace,
* support a frontend-only MVP,
* keep renderer code fast and modular,
* allow future backend integration without major rewrites.

The currently clarified MVP is narrower than the full app vision and centers on:

* Julia set point selection,
* interpolation between Julia points,
* responsive preview of that interpolation workflow,
* a simple cellular automata toy demo,
* exportable HTML/runtime output for both areas.

The current UX requirements also add:

* a `gui-settings` route,
* theme selection,
* meaningful theme previews,
* a default dark theme plus named alternative themes.

## Baseline Stack

### Language

* TypeScript

Reason:

* the app spec explicitly calls for a TypeScript-first internal architecture,
* strong typing is valuable for effect configs, validators, export contracts, and persistence payloads.

### Build Tool

* Vite

Reason:

* already present in the workspace,
* fast iteration for a graphics-heavy frontend,
* clean support for ES modules and static asset handling,
* good fit for client-only export previews and generated code examples.

### UI Runtime

* Preact

Reason:

* already present in the workspace,
* lightweight app shell and editor UI runtime,
* sufficient for a focused editor with preview, point list, and interpolation controls without adding unnecessary overhead.

### Rendering Layer

* Raw WebGL2 via thin internal utilities

Reason:

* the spec is specifically about WebGL-based backgrounds,
* the export runtime should stay small and editor-independent,
* an internal renderer layer avoids coupling exports to a large rendering framework,
* CA simulation and Julia rendering both benefit from explicit control over shaders, framebuffers, textures, and resource lifecycles.

Current baseline:

* WebGL2 primary path,
* graceful unsupported fallback UI when unavailable,
* no WebGL1 renderer in the first implementation unless explicitly required later.

For the current MVP, the renderer focus should remain on:

* Julia parameter rendering,
* fast updates while selecting or dragging points,
* stable playback of interpolation sequences,
* CA simulation fully on GPU,
* GPU-based interaction mapping for cell edits, region selection, cloning, and ellipse drawing.

Locked renderer baseline:

* WebGL2 is required,
* unsupported environments should receive a clear fallback message,
* WebGL1, software rendering, and WebGPU are reserved for later architectures.

## Recommended Supporting Libraries

These are the recommended categories and likely choices for implementation. They are not all installed yet.

### Validation and Parsing

* `zod`

Use for:

* project documents,
* Julia point definitions,
* Julia interpolation sequences,
* CA toy configurations,
* theme preference documents,
* import validation,
* conversion of validation failures into friendly editor errors.

Reason:

* strong TypeScript integration,
* good ergonomics for parsing untrusted imported data,
* suitable for sharing validation logic across forms, JSON editors, persistence, and export.

### JSON and JSONL Editing

* CodeMirror 6 for text editing surfaces

Use for:

* JSON editor,
* JSONL editor,
* syntax highlighting,
* undo/redo,
* search,
* keyboard-heavy workflows.

Reason:

* modular,
* browser-friendly,
* lighter integration footprint than heavier IDE-style editors,
* flexible enough to add validation decorations and line-level JSONL diagnostics.

MVP note:

* JSON editing remains useful for inspectability and future-proofing,
* JSONL editing can be deferred unless the first implementation exposes point sequences or presets in a line-oriented format.

### Drag and Drop Reordering

* prefer native pointer-driven reordering first,
* add a focused drag-and-drop helper library only if the UX proves too costly to build cleanly.

Reason:

* keeps bundle size and interaction complexity under control,
* avoids premature dependency growth.

### Color and Palette Math

* `hsluv` for HSLuv conversions,
* small internal utilities for sRGB, linear RGB, HSL, and palette interpolation,
* optional later addition of an OKLab or OKLCH helper library if needed.

Reason:

* HSLuv is explicitly required by the spec,
* palette interpolation rules should remain transparent and application-owned.

MVP note:

* palette tooling should not dominate the first delivery,
* only the palette capability needed to make Julia point interpolation visually meaningful should be built initially.

### State Management

* no global state library initially,
* use Preact signals or local reducer-style state modules if needed during implementation.

Reason:

* the current app does not justify a large external state container,
* editor state and domain state can be kept modular with explicit stores and adapters.

### Styling

* application-owned CSS with design tokens,
* CSS variables for themes, panel surfaces, spacing, and typography scales.

Reason:

* the product needs a distinctive visual identity,
* generated export code should not depend on the editor styling system,
* avoiding a large UI framework keeps the shell more intentional and easier to tune.

Theme baseline:

* implement the required named themes in the editor shell,
* keep theme tokens centralized,
* use HSLuv-aware palette construction where it improves cross-theme consistency,
* provide meaningful visual previews in the `gui-settings` route rather than plain text theme names.

## Proposed Frontend Architecture

The frontend should be split into clearly separated modules.

### 1. App Shell

Responsibilities:

* navigation,
* route/page selection,
* layout,
* theme selection and persistence,
* global keyboard handling,
* persistence bootstrap,
* top-level error boundaries.

### 2. Domain Models

Responsibilities:

* canonical TypeScript types,
* schema definitions,
* parsing and normalization,
* versioned document contracts.

Examples:

* project document,
* Julia config,
* Julia point sequence,
* Julia segment timing and interpolation settings,
* CA toy config,
* playback settings,
* theme preference,
* export document.

### 3. Effect Registry

Responsibilities:

* effect metadata,
* default config,
* presets,
* inspector definitions,
* renderer factory,
* export adapter.

This should be the primary pluggable boundary for Julia, cellular automata, and future effects.

For the current MVP:

* the Julia branch must be fully implemented,
* the CA branch may remain a small toy implementation with a stable export contract.

### 4. Renderer Core

Responsibilities:

* WebGL context setup,
* shader compilation,
* program lifecycle,
* texture and framebuffer management,
* resize and DPR handling,
* deterministic cleanup,
* animation loop control.

This layer should know nothing about editor UI.

### 5. Effect Engines

Responsibilities:

* Julia renderer implementation,
* CA toy renderer/simulation implementation,
* effect-specific uniforms, interpolation application, simulation stepping, and defaults.

Julia interpolation baseline:

* segment-based durations,
* global playback speed multiplier,
* per-segment interpolation mode,
* field interpolation only when both endpoints define the field,
* otherwise hold-last-defined semantics with fallback to effect defaults.

### 6. Editor Layer

Responsibilities:

* point creation and selection,
* point list or timeline editing,
* reordering, duplication, and deletion,
* interpolation controls,
* CA rule and dimension controls,
* palette controls needed for Julia and CA toy output,
* validation display,
* preview playback controls,
* structured config inspection.

Interpolation controls must include:

* linear
* fade in/out
* exp
* spring
* magnet

Timeline baseline:

* start with a simple timeline UI,
* include undo and redo for timeline edits,
* keep the playback model explicitly user-controlled,
* include a loop checkbox.

Point editing baseline:

* full inspector for all optional point fields,
* optional quick-add helpers for common Julia-only points.

CA runtime interaction baseline:

* bottom-center runtime controls for play/pause, step, and step-back,
* frame history ring buffer with `N = 6`,
* click-to-increment cell state,
* `Shift` + click area clone selection,
* `Ctrl` + click cloned-area insertion,
* `Alt` + click three-point ellipse drawing.

CA rule baseline:

* Game of Life
* Brian's Brain
* Star Wars as `B2/S345/4`

CA simulation baseline:

* explicit per-state colors,
* simulation dimensions are grid dimensions only,
* toroidal wrapping,
* random seed with density control,
* clear-grid reset,
* manual cell editing writes into history.

### 7. Import/Export Layer

Responsibilities:

* parse uploaded files,
* validate imported documents,
* assemble generated export artifacts,
* provide code preview models,
* produce downloadable files.

Important rule:

* generated runtime artifacts must not import editor modules.

### 8. Persistence Layer

Responsibilities:

* autosave,
* named local projects,
* storage versioning,
* future backend adapter compatibility.

Design rule:

* define a storage interface now, even if the first adapter is browser storage only.

## Future Backend Compatibility

Even though the MVP is client-only, the code should be written so that a backend can later be introduced with minimal churn.

### Required Boundaries

* persistence behind repository-style interfaces,
* import/export contracts separated from UI code,
* effect/project documents serializable without UI-only fields,
* no component should talk directly to remote transport concepts,
* validation should happen on plain data objects, not DOM state.

### Suggested Adapter Seams

* `ProjectRepository`
* `ExportArtifactProvider`
* `PaletteRepository`
* `EvolutionHistoryRepository`

In MVP these can be implemented with browser storage and in-memory generators.

Persistence baseline:

* autosave workspace,
* manual named saves,
* versioned stored documents,
* import validation before activation.

Later they can be backed by:

* REST APIs,
* file APIs,
* cloud sync endpoints,
* local-first sync layers.

## Testing Strategy

### Unit Tests

Focus on:

* schema parsing,
* Julia point interpolation math,
* point-sequence validation,
* optional-field merge behavior across timeline points,
* CA rule stepping correctness,
* CA history ring-buffer behavior,
* export artifact generation,
* persistence migrations.

### Component Tests

Focus on:

* point selection synchronization,
* reorder, duplicate, and delete interactions,
* interpolation playback controls,
* timeline undo and redo behavior,
* CA interaction gestures,
* bottom-center runtime controls,
* theme selection and preview behavior,
* error rendering,
* import flows,
* local project save/load interactions.

### Runtime Smoke Tests

Focus on:

* WebGL initialization,
* renderer cleanup,
* shader compilation failure handling,
* export preview bootstrapping.

## Non-Goals For The Initial Stack

The initial implementation should avoid:

* adding a backend dependency,
* coupling the app to a heavyweight rendering engine,
* coupling exported code to Preact,
* introducing a large UI component framework unless implementation pressure proves it necessary,
* introducing a complex global state framework before the app has demonstrated the need.

## Initial Recommendation Summary

The first implementation should use:

* TypeScript
* Vite
* Preact
* raw WebGL2 through internal renderer utilities
* `zod` for schemas and validation
* CodeMirror 6 for JSON editing and optional later JSONL editing
* `hsluv` plus internal palette math utilities
* browser storage behind a repository interface

This gives a practical path to the required MVP while keeping later backend integration and future effect expansion clean.
