# WebGL Arbitrary-Precision Arithmetic Library Implementation Checklist

## Status

This plan implements the spec:

- [2026-04-28-14-05--webgl-arbitrary-precision-arithmetic-library-spec.md](/home/wizard/projects/asimov/asimov-happy/docs/specs/2026-04-28-14-05--webgl-arbitrary-precision-arithmetic-library-spec.md)

It also explicitly replaces the old experimental WebGL high-precision renderer path rather than keeping two overlapping experimental WebGL precision tracks.

## Open Questions

No blocking open questions remain for the plan itself.

Implementation may still surface one practical choice:

- exact WebGL transport format for limbs

But that is a phase-1 engineering decision, not a planning blocker.

## Replacement Strategy

Use a full replacement strategy for the old experimental renderer:

- remove `High Precision WebGL Rendering`
- replace it with the new arbitrary-precision WebGL renderer built on the new arithmetic library
- reuse existing UI controls only where that clearly improves continuity
- rename labels and state to match the new model

This is cleaner than keeping both:

- an old `n`-float expansion renderer
- and a new limb-based arbitrary-precision WebGL renderer

The goal is one experimental WebGL precision path, not two.

## Phase 1: Inventory And Design Lock

- [ ] Read and re-check:
  - [2026-04-28-14-05--webgl-arbitrary-precision-arithmetic-library-spec.md](/home/wizard/projects/asimov/asimov-happy/docs/specs/2026-04-28-14-05--webgl-arbitrary-precision-arithmetic-library-spec.md)
  - [2026-04-27-21-20--explorer-webgl-n-float-precision-renderer-spec.md](/home/wizard/projects/asimov/asimov-happy/docs/specs/2026-04-27-21-20--explorer-webgl-n-float-precision-renderer-spec.md)
- [ ] Inventory all current code paths related to the old experimental renderer:
  - renderer enum / labels
  - UI controls
  - state fields
  - shader files
  - compare/debug routes
  - docs references
- [ ] Decide and document the concrete v1 limb transport format for WebGL:
  - texture-backed if needed
  - or another WebGL-safe fixed-width representation
- [ ] Lock the fixed-point convention:
  - radix
  - limb order
  - sign representation
  - truncation rule

## Phase 2: Host-Side Arithmetic Support

- [ ] Add host-side encode helpers for arbitrary-precision real values.
- [ ] Add host-side encode helpers for arbitrary-precision complex values.
- [ ] Support fixed-width limb arrays for configurable limb counts.
- [ ] Support encoding of:
  - Mandelbrot viewport center
  - Julia viewport center
  - Julia parameter `c`
  - scale / viewport span data in the chosen fixed-point model
- [ ] Add focused unit-style test coverage for representative encoding cases if the current test setup makes that practical.

## Phase 3: GLSL Arithmetic Library

- [ ] Create a dedicated GLSL arithmetic module for:
  - magnitude comparison
  - magnitude add
  - magnitude subtract
  - signed add
  - signed subtract
  - schoolbook multiplication
  - multiply-by-two or shift helper
- [ ] Create a GLSL complex-arithmetic layer exposing:
  - `complexAdd`
  - `complexSub`
  - `complexMul`
  - `complexSquare`
  - `complexScale2`
- [ ] Keep the library independent from renderer-specific palette and UI logic.
- [ ] Add inline implementation comments that explain:
  - fixed-point interpretation
  - truncation behavior
  - sign handling

## Phase 4: Minimal Mandelbrot/Julia Integration

- [ ] Create a new renderer implementation file for the new WebGL arbitrary-precision path.
- [ ] Use the new arithmetic library for Mandelbrot iteration:
  - `z0 = 0`
  - arbitrary-precision per-pixel `c`
- [ ] Use the new arithmetic library for Julia iteration:
  - arbitrary-precision per-pixel `z0`
  - arbitrary-precision global `c`
- [ ] Add a bailout estimate derived from the arbitrary-precision state.
- [ ] Keep smoothing simple in the first integration pass.
- [ ] Ensure the renderer integrates with existing explorer overlays without changing overlay behavior.

## Phase 5: UI Replacement

- [ ] Remove the old renderer option:
  - `High Precision WebGL Rendering`
- [ ] Add the new renderer option:
  - `Arbitrary Precision WebGL Rendering`
- [ ] Replace old `Precision Floats` UI with:
  - `Precision Limbs`
- [ ] Reuse existing control placement only if it remains semantically correct.
- [ ] Rename state, props, and plumbing away from `float count` terminology.
- [ ] Update compare/debug UI so it compares:
  - `WebGL Rendering`
  - `Arbitrary Precision WebGL Rendering`

## Phase 6: Cleanup Of Old Experimental Renderer

- [ ] Remove old experimental renderer implementation files that are no longer used.
- [ ] Remove old `n`-float shader helpers and renderer-specific code paths that are no longer used.
- [ ] Remove stale state fields related to the old renderer.
- [ ] Remove stale compare/debug route logic that is specific only to the old experimental renderer design.
- [ ] Remove or update stale docs references that still describe the old experimental renderer as active.
- [ ] Preserve historical docs/specs as docs, but make sure active code and active UI no longer reference the old path.

## Phase 7: Verification

- [ ] Run a targeted search for old experimental renderer remains, including:
  - `High Precision WebGL Rendering`
  - `precision floats`
  - `float count`
  - old renderer module names
- [ ] Verify the explorer still works in:
  - CPU Rendering
  - WebGL Rendering
  - Arbitrary Precision WebGL Rendering
- [ ] Verify the compare route still works and reflects the new renderer.
- [ ] Verify normal mode and zen mode.
- [ ] Verify build passes.
- [ ] Verify lint passes.

## Phase 8: Final Documentation Pass

- [ ] Update active explain/docs notes if they refer to the old experimental renderer as the current path.
- [ ] Add a short technical note describing the new arbitrary-precision WebGL architecture and how it differs from the removed `n`-float renderer.
- [ ] Ensure the obsolete experimental path is clearly documented as superseded if it remains in historical docs.

## Success Criteria

- [ ] The old experimental `High Precision WebGL Rendering` path is fully replaced in active code.
- [ ] The explorer exposes only one experimental WebGL precision renderer path.
- [ ] The new path is limb-based and matches the new arithmetic library spec.
- [ ] No stale active references to the old renderer remain in UI or runtime code.
- [ ] Build and lint succeed after cleanup.
