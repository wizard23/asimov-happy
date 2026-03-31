# Performance Monitoring Component Spec v0.1

## Purpose

This document defines a performance monitoring component for the Interactive WebGL Backgrounds Webapp.

The main use case is:

* optimizing the WebGL renderer,
* optimizing the render loop,
* identifying CPU and GPU hotspots,
* observing simulation cadence separately from display cadence,
* doing so with low enough overhead that the monitor does not significantly distort the numbers it reports.

This component should combine the strengths of:

* `stats.js`
  * tiny footprint,
  * low UI overhead,
  * easy-to-read live widget,
* the `minimal-npm-workspace` monitor
  * richer subsystem breakdowns,
  * slower publishing cadence,
  * developer-focused controls,
* the current CA timing approach in this app
  * clear separation between simulation step timing and render cadence,
  * accumulator-driven simulation semantics.

## Design Goals

The component shall:

* measure real browser frame cadence,
* distinguish simulation timing from rendering timing,
* distinguish CPU cost from presentation cadence,
* optionally measure GPU timing when supported,
* support a compact always-on widget,
* support a richer developer panel,
* publish updates at a configurable slower cadence,
* keep the measurement backend separate from the UI,
* remain safe to leave enabled during normal development.

## Non-Goals

The first version does not need to:

* become a full browser profiler,
* replace browser devtools,
* capture full tracing timelines,
* upload telemetry to a backend,
* provide long-term historical analytics,
* guarantee perfectly precise GPU timing on all devices.

## Core Principle

Measurement, aggregation, and presentation must be separate layers.

This is the main architectural rule.

The system shall be split into:

1. instrumentation layer
2. metrics store / aggregator
3. presentation layer

This avoids the main weakness of ad hoc monitors where metrics and UI are tightly coupled.

## Functional Requirements

## 1. Measurement Sources

The system shall collect at minimum:

* real frame cadence from `requestAnimationFrame`,
* frame delta in milliseconds,
* simulation step count per frame,
* simulation CPU time,
* render CPU time,
* resize CPU time,
* UI update CPU time,
* total DOM writes attributable to dev overlays where measurable.

The system should optionally collect:

* GPU timing for render passes,
* shader compile counts,
* framebuffer or texture allocation counts,
* WebGL context loss / restore events.

During development in Chrome-compatible environments, the system shall also collect Chrome-specific heap allocation metrics where available.

## 2. Metric Categories

The monitor shall distinguish at least these categories:

### 2.1 Cadence Metrics

* FPS based on real `requestAnimationFrame` cadence
* frame delta
* dropped-frame indicators where practical

### 2.2 Simulation Metrics

* simulation running state
* target simulation step rate
* actual step count per frame
* simulation accumulator depth if applicable
* simulation CPU time

### 2.3 Render Metrics

* render CPU time
* optional GPU time
* draw-call count if measurable
* shader program switches if measurable
* render pass count if measurable

### 2.4 UI Metrics

* UI update CPU time
* monitor update cost
* DOM write count attributable to UI

### 2.5 Resource Metrics

* active textures
* active framebuffers
* active programs
* canvas resolution
* device pixel ratio

### 2.6 Allocation Metrics

For development builds in Chrome-compatible browsers, the monitor shall support:

* current used JS heap bytes,
* heap delta bytes per frame,
* rolling average heap delta,
* rolling peak heap delta,
* suspected GC events inferred from sharp negative heap deltas,
* optional broader browser memory snapshots when supported.

These metrics are explicitly important for this project because allocation pressure can have a large impact on WebGL and render-loop performance.

## 3. Timing Semantics

Timing semantics must be explicit.

### 3.1 FPS Definition

FPS shall mean:

* actual `requestAnimationFrame` cadence,
* not simulation step count,
* not a target frame rate.

### 3.2 Simulation Rate Definition

Simulation speed shall mean:

* target or effective simulation step rate,
* independent of display FPS.

This is important for CA and other fixed-step systems.

### 3.3 CPU Timing Definition

CPU timings shall measure:

* the wall-clock time spent in explicitly instrumented code sections.

Scope timing semantics:

* named CPU scopes may be nested,
* repeated scope names may occur more than once in the same frame,
* scope instances are tracked by stack order during collection,
* scope results are aggregated by scope name after frame completion,
* overlapping sibling scopes are not allowed unless represented by proper nesting.

### 3.4 GPU Timing Definition

GPU timings, if enabled, shall be:

* best-effort measurements,
* clearly labeled as optional and capability-dependent,
* hidden or marked unavailable when not supported.

### 3.5 Heap Allocation Definition

Heap allocation metrics in development mode shall mean:

* Chrome-specific heap measurements such as `performance.memory.usedJSHeapSize`,
* frame-to-frame heap deltas derived from those values,
* optional `performance.measureUserAgentSpecificMemory()` snapshots when supported and useful.

These Chrome-specific capabilities are explicitly acceptable for development-time monitoring in this project.

The purpose is to capture actual runtime allocation pressure, including allocations not directly visible through app-level counters alone.

Sampling policy:

* `performance.memory.usedJSHeapSize` should be sampled every frame in development mode when heap monitoring is enabled,
* `performance.measureUserAgentSpecificMemory()` must not run every frame,
* `performance.measureUserAgentSpecificMemory()` should be used only on manual refresh or a slow cadence such as every `5` to `10` seconds,
* heap monitoring should be enabled by default in development builds when the required Chrome-specific APIs are available,
* heap monitoring must remain user-disableable.

Suspected GC heuristic:

* a suspected GC event is recorded when frame-to-frame heap delta is negative by at least the larger of:
  * `256 KB`, or
  * `15%` of the previous frame's used heap.

## 4. Aggregation Model

The metrics backend shall support both:

* raw frame samples,
* aggregated display values.

### 4.1 Raw Samples

The system should keep a short rolling buffer of recent frame samples.

Recommended MVP:

* last 120 frames.

### 4.2 Aggregated Values

The system shall expose:

* instantaneous values where appropriate,
* smoothed values for readability,
* rolling min/max where useful.

Recommended behavior:

* compact widget uses smoothed values,
* detailed panel may expose both smoothed and raw/rolling values.

For allocation metrics:

* expose current heap used,
* expose current frame heap delta,
* expose rolling average heap delta,
* expose recent allocation spikes,
* expose suspected GC drops.

## 5. Presentation Modes

The component shall provide two presentation modes.

### 5.1 Compact Widget

This is the equivalent of the best part of `stats.js`.

Requirements:

* small always-available floating widget,
* extremely low UI overhead,
* compact sparkline or tiny graph,
* quick mode switching between core metric groups,
* minimal DOM churn.

Recommended implementation:

* canvas-based rendering or similarly retained low-overhead rendering,
* no repeated large `innerHTML` rewrites.

Compact widget interaction model:

* the widget is a single compact surface,
* it shows one primary metric mode at a time,
* click cycles between available modes,
* the current active mode must be visually labeled.

### 5.2 Detailed Developer Panel

This is the equivalent of the best part of the richer custom monitor.

Requirements:

* grouped metric sections,
* readable labels,
* optional explanations,
* configuration controls,
* current capability display such as GPU timing availability,
* development-time memory capability display for Chrome-specific heap metrics.

The detailed panel may be DOM-based because it updates less often.

## 6. Update Cadence

The monitor UI shall update on a slower cadence than the render loop.

### 6.1 Widget Refresh Interval

Recommended default:

* around `250ms` to `500ms`.

### 6.2 Detailed Panel Refresh Interval

Recommended default:

* around `500ms` to `1000ms`.

### 6.3 Measurement Cadence

Measurement itself still happens every frame.

The separation is:

* measure every frame,
* publish UI less frequently.

Chrome heap sampling may also occur every frame in development mode when enabled.

## 7. Benchmark Mode

The component shall support a benchmark-oriented mode.

Requirements:

* hide or minimize nonessential overlay work,
* keep collecting metrics in the backend,
* optionally expose only a minimal compact widget or no widget at all,
* allow benchmark mode to reduce self-inflicted monitoring noise.

Heap sampling should be separately toggleable because Chrome memory instrumentation may add measurable overhead.

## 8. WebGL-Specific Requirements

Because the main use case is render-loop optimization, the system should support WebGL-specific instrumentation.

### 8.1 Render Pass Instrumentation

The monitor should support named timing scopes such as:

* `scene`
* `simulation-step`
* `blit`
* `postprocess`
* `ui-overlay`

### 8.2 GPU Timing

When available, the system should support GPU timing via WebGL2-compatible timer queries.

Requirements:

* capability detection,
* asynchronous result handling,
* no blocking readback,
* clear fallback when unsupported.

### 8.3 Resource Counters

The monitor should support internal counters for:

* textures,
* framebuffers,
* programs,
* shader recompiles,
* context resets.

Counter source semantics:

* these counters are application-instrumented counters,
* they are not assumed to be browser-reported truth,
* renderer code should increment or set them through the instrumentation layer at the point of allocation, disposal, compilation, bind, or draw where appropriate.

### 8.4 Chrome Heap Instrumentation

The monitor shall support a Chrome-focused development path for heap diagnostics.

Recommended sources:

* `performance.memory.usedJSHeapSize`
* related Chrome-specific heap fields when available
* `performance.measureUserAgentSpecificMemory()` when available and useful

Requirements:

* capability detection,
* clear labeling that this is development-only and Chrome-specific,
* ability to enable or disable heap sampling,
* frame-to-frame heap delta calculation,
* rolling history for heap deltas,
* visual indication of likely garbage collection events.

This is explicitly desirable because it captures the actual runtime allocation behavior more directly than manual object-count instrumentation alone.

## 9. API Requirements

The monitoring system should expose a small internal API.

Recommended shape:

* `beginFrame(now)`
* `endFrame(now)`
* `beginScope(name)`
* `endScope(name)`
* `recordCounter(name, value)`
* `incrementCounter(name, amount?)`
* `setCapability(name, value)`
* `getSnapshot()`

For simulation-specific loops:

* `recordSimulationStep()`
* `recordAccumulatorDepth(value)`
* `recordTargetStepRate(value)`

For GPU timing:

* `beginGpuScope(name)`
* `endGpuScope(name)`

For heap diagnostics:

* `sampleHeapMemory()`
* `recordHeapSample(bytesUsed)`
* `setMemoryCapability(name, value)`

GPU scope APIs may no-op when unsupported.

Snapshot structure:

* `frame`
* `simulation`
* `render`
* `ui`
* `resources`
* `memory`
* `capabilities`
* `scopes`

This structure should be stable enough for UI consumers and JSON export.

## 10. Storage And Export

The first version should support:

* in-memory rolling history,
* optional copy/export of current snapshot JSON from the developer panel.

It does not need persistent telemetry storage in MVP.

## 11. UI Requirements

### 11.1 Compact Widget UI

The compact widget shall:

* be movable or placeable in a predictable corner,
* show a primary metric prominently,
* support switching between:
  * FPS
  * frame ms
  * simulation
  * render CPU
  * optional GPU

The compact widget should also support a memory mode showing:

* current heap used,
* heap delta trend,
* recent allocation spikes.

### 11.2 Detailed Panel UI

The detailed panel shall include:

* current snapshot,
* rolling averages,
* capability status,
* benchmark mode controls,
* refresh interval controls,
* monitor visibility controls,
* memory instrumentation enable/disable controls,
* allocation-focused development views.

## 12. Performance Requirements

The monitor itself shall be designed not to materially distort performance.

Requirements:

* compact widget must avoid heavy DOM rebuilding,
* detailed panel must update on throttled intervals,
* instrumentation should use lightweight counters and timers,
* GPU timing should never force synchronous stalls,
* the monitor must be disableable.

For heap instrumentation:

* heap sampling must be clearly marked as development-only,
* heap sampling must be disableable,
* reported values must be labeled as Chrome-specific where applicable.

## 13. Architecture Requirements

### 13.1 Instrumentation Layer

Responsibilities:

* collect timestamps,
* collect counters,
* expose lightweight APIs,
* know nothing about UI layout.

### 13.2 Aggregator Layer

Responsibilities:

* store rolling samples,
* compute smoothed values,
* compute rolling min/max/average,
* produce snapshots for UI consumers,
* compute heap deltas and heap spike indicators.

### 13.3 Presentation Layer

Responsibilities:

* render compact widget,
* render developer panel,
* subscribe to snapshots,
* never directly measure frame timing itself.

## 14. Recommended MVP

A practical first implementation should include:

* frame cadence measurement,
* simulation step measurement,
* render CPU timing,
* UI timing,
* rolling sample buffer,
* compact widget,
* detailed panel,
* throttled UI updates,
* benchmark mode,
* WebGL capability reporting,
* Chrome-specific heap sampling in development mode,
* heap delta and suspected GC indicators,
* optional GPU timing hook points even if the first pass leaves them disabled.

## 15. Recommended Design Choices

To get the best of all three reviewed systems:

### From `stats.js`

Adopt:

* tiny retained widget mindset,
* low-overhead visual presentation,
* simple live readability.

Do not adopt:

* tight coupling of widget and instrumentation backend.

### From `minimal-npm-workspace`

Adopt:

* richer subsystem metrics,
* throttled publishing cadence,
* benchmark-mode visibility controls.

Do not adopt:

* large repeated `innerHTML` rewrites,
* duplicated rendering paths,
* mixing metric collection and UI publishing in one place.

### From Current CA Timing

Adopt:

* clear distinction between simulation rate and render cadence,
* accumulator-aware metrics for fixed-step systems.

Do not adopt:

* treating loop timing itself as the monitor architecture.

## 16. Open Questions For Refinement

The following can be refined later:

1. exact compact-widget visual design,
2. exact rolling-window sizes,
3. which WebGL counters are easiest to expose first,
4. whether GPU timing ships in MVP or behind a capability flag,
5. whether snapshots should be exportable as JSONL in addition to JSON,
6. whether heap sampling is enabled by default in development builds or opt-in.

## 17. Bottom Line

The desired component is:

* as lightweight as `stats.js`,
* more informative like the richer custom monitor,
* and semantically correct for fixed-step WebGL simulations.

The main rule is simple:

* measure every frame,
* aggregate centrally,
* publish UI slowly,
* keep the widget cheap,
* keep the backend reusable.
