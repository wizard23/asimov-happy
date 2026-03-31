# Discovered By Codex — Meta Specs v0.1

## Purpose

This document captures ambiguities and implementation decisions discovered while preparing to implement `app-monet-julia-ca--0001.md`.

It is not a competing product spec. It exists to make implicit choices explicit before coding starts.

## Current Interpretation

The implementation target is only `app-monet-julia-ca--0001.md`.

Other spec files in `docs/specs/` are reference material only and do not expand mandatory scope for this app unless their functionality is intentionally adopted later.

The currently clarified MVP is:

* Julia set point selection, and
* interpolation between points,
* plus a super-simple cellular automata toy demo and export.

The first implementation should remain frontend-only, but the frontend architecture should keep a future backend integration straightforward by:

* isolating persistence behind interfaces,
* isolating import/export contracts,
* keeping validation and domain models transport-safe,
* avoiding UI code that depends directly on `localStorage` or browser globals outside adapter layers.

## Remaining Ambiguities
The main app spec is now sufficiently clarified for implementation. The following sections record explicit decisions that close previously open areas.

### 1. Julia Point Interpolation Definition

The MVP has now been narrowed, and the interpolation model has been clarified by the user.

Locked decisions:

* a point may contain any subset of the relevant Julia scene state,
* point fields are optional,
* point data may include:
  * Julia complex parameter,
  * zoom,
  * pan,
  * palette,
  * playback-related settings,
* the UI must support multiple points,
* points must support selection,
* points must support simple reordering,
* points must support duplication,
* deletion is part of MVP,
* timeline editing must support undo and redo,
* looping must be controlled by a checkbox.

Required interpolation options:

* linear
* fade in/out
* exp
* spring
* magnet

Current implementation baseline:

* the first delivery should provide a simple but usable timeline,
* playback remains fully under user control,
* interpolation logic must be configurable per sequence or equivalent user-visible control surface.

Interpolation semantics:

* interpolate a field only when both segment endpoints define it,
* otherwise hold the last defined value,
* if no prior defined value exists, fall back to the effect default.

Timeline timing model:

* durations are segment-based,
* a global playback speed multiplier is available,
* segments default to equal duration unless edited.

Interpolation scope:

* interpolation mode is configured per segment,
* all interpolated fields within a segment share that segment mode in MVP.

Interpolation mode definitions:

* `linear`: standard linear interpolation,
* `fade in/out`: smooth ease-in-out interpolation,
* `exp`: exponential ease-in-out interpolation,
* `spring`: damped overshooting spring interpolation,
* `magnet`: attraction-biased interpolation that accelerates through the middle and slows near endpoints.

Point editing model:

* the UI provides a full inspector for all supported optional point fields,
* the UI may also provide quick-add presets for common Julia-only point types.

### 2. Cellular Automata Toy Demo Scope

The MVP now includes a deliberately simple cellular automata toy demo.

Locked decisions:

* the CA implementation is intentionally minimal for MVP,
* the UI must expose these rule options:
  * Game of Life
  * Brian's Brain
  * "Star Wars" rule
* the UI must expose:
  * palette
  * dimensions with width and height
* all simulation, rendering, and user interaction must be implemented in WebGL,
* future software and WebGPU renderers are expected later, but are out of scope for now.

Generated HTML/runtime interaction requirements:

* click on a cell increments its value modulo the rule's state count,
* bottom-center controls must include:
  * play/pause
  * single step
  * single step back
* the runtime must keep the last `N` frames for stepping backward,
* MVP value for `N` is `6`,
* `Shift` + click selects an area for cloning,
* `Ctrl` + click reinserts the cloned area,
* `Alt` + click draws a circle or ellipse defined by three points.
* the `"Star Wars"` rule is the refractory Life-like rule `B2/S345/4`.

### 3. Export Contract Shape

The spec clearly requires clean export, but it does not define the exact generated artifact structure.

Open points:

* whether MVP export should prefer JavaScript or TypeScript source,
* whether export should emit one file or multiple files,
* whether the UI should offer direct file downloads, copyable code panes, or both.

Locked MVP decision:

* MVP export should cover:
  * Julia point/interpolation configuration,
  * the toy CA configuration,
  * small framework-agnostic runtime examples,
* export should be modeled as generated artifacts rather than editor-only state,
* the MVP export package consists of:
  * `index.html`
  * `runtime.js`
  * `config.json`
  * optional `README.txt`,
* the export UI should support downloadable files and code preview panes,
* generated runtime source should be JavaScript for widest drop-in usability.

### 4. WebGL Baseline

The spec leaves open whether WebGL2 is required or whether WebGL1 fallback is needed.

Locked decision:

* target WebGL2 as the primary renderer baseline,
* provide graceful unsupported-state handling instead of a WebGL1 renderer,
* keep engine boundaries clean enough that a fallback renderer could be added later if needed.

Reason:

* this materially simplifies implementation and keeps the renderer architecture cleaner for simulation workloads.

### 5. JSON and JSONL Contract Definitions

The app requires strong JSON and JSONL editing, but the exact data contracts are not yet defined in the main spec.

Locked decision:

* define application-owned schemas during implementation for:
  * project snapshots,
  * Julia control points,
  * Julia interpolation sequences,
  * CA toy configurations,
  * export settings,
* JSONL can be deferred unless it is needed for point-sequence editing or preset collections in the first cut.

### 6. Palette Scope

The spec explicitly wants HSLuv support, but does not define how broad the palette tool must be in v1.

Locked decision:

* implement a focused palette tool optimized for indexed visual outputs,
* include anchors, interpolation mode, cyclic behavior, hard steps, strip preview, and effect preview integration,
* defer advanced color-management workflows not required by the main app.

CA palette model:

* for CA in MVP, use one explicit color per state,
* palette presets may generate these colors automatically,
* state-color editing should remain user-visible and deterministic.

### 7. UX Requirements Source

The UX requirements file is now populated and adds concrete theming requirements.

Locked decisions:

* the frontend must include a `gui-settings` route,
* the user must be able to choose a UI theme there,
* available themes for now are:
  * dark
  * light
  * ocean
  * forest
  * volcano
  * purple
  * navy
  * army
  * air force
* dark is the default,
* the theme selector must provide meaningful previews,
* themes should be distinctive and web-standards-conforming,
* theme construction should consider HSLuv-based color relationships.

Meaningful theme preview definition:

* the `gui-settings` route should show preview cards containing:
  * panel surface,
  * text color,
  * accent color,
  * border treatment,
  * button styling,
  * a small live or representative canvas treatment.

### 8. Local Persistence Semantics

The spec requires autosave and named local projects, but the persistence lifecycle is not fully specified.

Locked decisions:

* keep a single autosave workspace plus named project saves,
* version stored documents,
* validate imports before activation,
* never destroy the current workspace until imported data has parsed and validated successfully.

Additional persistence decisions:

* MVP includes autosave and a manual named-save list,
* imports do not overwrite active state until validation succeeds.

### 9. CA Grid Semantics

Locked decisions:

* `width` and `height` define simulation grid dimensions,
* canvas display size is responsive and independent of simulation resolution,
* boundary behavior is toroidal wrap for MVP,
* initial state support in MVP includes:
  * random seed with density control,
  * clear grid,
  * direct click editing.

### 10. CA Interaction Semantics

Locked decisions:

* every mutating CA action pushes a history state,
* CA history is capped at `6` frames,
* clone selection uses a rectangular region for MVP,
* ellipse drawing uses three clicks:
  * click 1 defines center,
  * click 2 defines major radius,
  * click 3 defines minor radius and orientation.

### 11. Undo/Redo Scope

Locked decisions:

* Julia timeline undo/redo covers timeline edits and point-inspector edits,
* CA canvas edits do not share the Julia undo stack,
* CA interaction history uses the dedicated 6-frame step-back model instead.

## Implementation Decisions Locked For Start

These decisions are now considered safe to proceed with unless explicitly overridden later.

* The app remains client-only.
* Frontend code should be structured so a backend can later replace storage/import/export adapters without rewriting domain logic.
* The web package is the implementation target.
* The existing workspace stack of TypeScript, Vite, and Preact is acceptable for the app shell.
* Export defaults should stay framework-agnostic.
* Generated runtime code must not depend on the editor app itself.
* Active MVP scope is Julia set point selection and interpolation between points, plus a simple CA toy demo.
* WebGL2 is required for MVP rendering and interaction.

## Decision Log Format For Later Refinement

If later decisions override any current assumption, they should be recorded with:

* date,
* decision,
* affected modules,
* migration impact,
* whether exported artifact contracts changed.
