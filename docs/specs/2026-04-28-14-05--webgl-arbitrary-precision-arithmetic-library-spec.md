# WebGL Arbitrary-Precision Arithmetic Library Spec

## Scope

This spec defines a new reusable arithmetic library for WebGL shaders and host-side support code.

It covers:

- arbitrary-precision real-number representation
- arbitrary-precision complex-number representation
- host-to-shader transport format
- WebGL-compatible shader arithmetic primitives
- library API boundaries for Mandelbrot and Julia rendering

It does not cover:

- old-frame reuse
- progressive refinement policy
- renderer scheduling
- UI controls beyond the minimum required to exercise the library
- non-WebGL compute pipelines

## Goal

Create a reusable WebGL arbitrary-precision arithmetic library inspired by:

- [docs/alien/FractalShaderArbPrec](/home/wizard/projects/asimov/asimov-happy/docs/alien/FractalShaderArbPrec)

This library should provide the arithmetic foundation for a future WebGL renderer that:

- represents each real component as a fixed-width array of integer-like limbs
- performs Mandelbrot and Julia iterations using limb arithmetic rather than ordinary `f32`

The immediate objective is the arithmetic layer itself, not the full optimized renderer architecture from the alien code.

## Summary

The alien code stores each real value as:

- sign
- fixed number of base-65536 limbs

This spec adopts the same conceptual model, but adapts it to WebGL constraints.

The library must support:

- signed real values
- signed complex values
- fixed-width limb arithmetic in shaders
- explicit carry and borrow propagation
- host-side encoding of viewport and parameter values into limb form

## Key Architectural Decision

This spec is for a WebGL-compatible library, not a direct port of the alien implementation.

Therefore it must not depend on:

- compute shaders
- SSBOs
- `#version 430`
- shader `double`

It must instead target the capabilities available to the existing explorer WebGL pipeline.

## Terminology

- `limb`
  - one fixed-size digit in a radix representation

- `limb count`
  - number of magnitude limbs per real value

- `sign slot`
  - explicit sign indicator separate from the magnitude limbs

- `fixed-width limb arithmetic`
  - arithmetic where each value always occupies the same number of limbs

- `arbitrary precision`
  - in this spec, practical user-configurable multi-limb precision, not unbounded symbolic precision

## Non-Goals

This library does not attempt to:

- match the alien code line-for-line
- implement old-frame reuse or progressive state reuse
- guarantee high performance
- provide mathematically exact infinite-precision arithmetic
- use desktop-GL-only features

## Primary Design Constraints

The WebGL version must work within these limits:

- no compute shader dispatch model
- limited uniform and varying capacity
- limited loop flexibility compared with desktop GL
- textures and arrays are the likely transport mechanism
- arithmetic must be expressible in WebGL GLSL

These constraints are central to the design.

## Required Representation

### Real number representation

Each real value must be represented as:

- one sign component
- `L` magnitude limbs

Recommended baseline:

- radix `2^16`
- `L` in the range `2..16` for v1

The sign and limbs must be encoded into WebGL-compatible transport data.

### Complex number representation

Each complex number is:

- one arbitrary-precision real part
- one arbitrary-precision imaginary part

## Host-Side Responsibilities

The host-side library must:

- convert JavaScript-side numeric or string values into limb arrays
- encode viewport centers and scales into shader-consumable data
- encode Julia parameter `c`
- provide predictable fixed-width memory layout

The host library may use:

- JavaScript `BigInt`
- decimal string conversion
- existing JS numeric values as intermediate inputs

The host-side arithmetic itself is not the main objective, but the encoding layer is required.

## Shader-Side Responsibilities

The shader-side library must provide reusable primitives for:

- compare magnitude
- add magnitude
- subtract magnitude
- signed add
- signed subtract
- multiply magnitude
- signed multiply
- multiply-by-two or bitshift equivalent

These are sufficient for:

- `z_(n+1) = z_n^2 + c`

## Recommended WebGL Library Shape

The library should be split into:

1. host-side encoding helpers
2. GLSL include-style helpers or generated shader snippets
3. a compact integration layer for Mandelbrot and Julia renderers

Recommended file split:

- JS/TS encode/decode helpers
- one GLSL arithmetic module for real operations
- one GLSL module for complex operations

## Radix And Storage Recommendation

### Recommended radix

Use:

- radix `65536`

Reason:

- it matches the alien implementation
- it gives `16` useful bits per limb
- it reduces carry frequency compared with smaller radices
- it is still conceptually manageable in shader code

### Important WebGL caveat

In WebGL, ordinary integer texture and array behavior is more constrained than in desktop compute pipelines.

So the spec does not require one exact transport format yet, but the library must choose a concrete WebGL-compatible storage strategy such as:

- packing limbs into texture channels
- packing limbs into uniform arrays when size allows
- packing limbs into generated constant arrays for tiny fixed-width cases

Recommended direction:

- texture-backed limb storage for the general case

## Required Arithmetic Semantics

### Addition and subtraction

The library must:

- propagate carry and borrow explicitly
- normalize results into fixed-width limb form
- handle sign correctly

### Multiplication

V1 may use schoolbook multiplication.

That is acceptable because:

- it matches the alien implementation
- it is the simplest numerically coherent starting point

Multiplication must define:

- how partial products are accumulated
- how carries are propagated
- how truncation back to fixed width is performed

### Truncation policy

The library must explicitly define which limbs are preserved after multiplication.

Recommended v1 rule:

- preserve the most significant limbs that best maintain the represented value in the chosen fixed-point convention

This must be documented in implementation comments because it is crucial to numerical behavior.

## Fixed-Point Convention

The library must choose and document a fixed-point interpretation for the limbs.

The alien code effectively uses a fixed-width base representation whose meaning depends on limb position.

For the WebGL library, this must be made explicit:

- which limb corresponds to the highest-order magnitude
- where the binary point conceptually lies
- how viewport coordinates and scales are encoded

This is a required part of the implementation, not an optional detail.

## Minimal Complex API

The shader library must make these complex operations available:

- `complexAdd(a, b)`
- `complexSub(a, b)`
- `complexMul(a, b)`
- `complexSquare(a)`
- `complexScale2(a)` or equivalent

Even if `complexSquare` is implemented via `complexMul`, it should exist as a named library operation because it is central to fractal iteration.

## Mandelbrot And Julia Integration Requirements

The arithmetic library must be sufficient to support two integration paths:

### Mandelbrot

- initialize `z0 = 0`
- initialize arbitrary-precision per-pixel `c`
- iterate `z = z^2 + c`

### Julia

- initialize arbitrary-precision per-pixel `z0`
- initialize arbitrary-precision global `c`
- iterate `z = z^2 + c`

## Escape Test

The library must expose a way to estimate whether:

- `|z|^2 > bailout`

The estimate may be approximate, as in the alien code, but it must be derived from the arbitrary-precision state and not from a totally separate ordinary-float orbit.

V1 is allowed to:

- approximate bailout from leading limbs

This approximation must be explicitly documented as part of the arithmetic library contract.

## Expected Integration Pattern In WebGL

Because WebGL lacks compute-style persistent buffer iteration as used in the alien code, the likely first integration pattern is:

- one fragment shader invocation computes one pixel
- all limb arithmetic for that pixel occurs inside that invocation
- the orbit is iterated entirely within that shader invocation

This is much less efficient than the alien pipeline, but it is the intended simplified starting point for the library.

## Potential Pitfalls Beyond Performance

### 1. WebGL compatibility gap

The alien code relies on desktop GL compute features and shader doubles.

The biggest technical risk is not arithmetic correctness but finding a WebGL-compatible representation and transport strategy that is practical.

### 2. Precision can still be lost at the boundaries between host and shader

If host encoding or shader decoding is sloppy, the library can lose the very precision it is trying to preserve before iteration even starts.

### 3. Fixed-point interpretation can be wrong or inconsistent

If the binary-point convention is not defined very carefully, multiplication and truncation can be numerically wrong even if the carry logic looks correct.

### 4. Shader code size and loop complexity

Large limb counts can make GLSL code large, branchy, and difficult for drivers to optimize.

### 5. Texture packing bugs

If limbs are packed into textures, channel ordering, normalization assumptions, and integer-vs-float conversion behavior can easily introduce subtle bugs.

### 6. Escape classification may still become the weak link

Even with arbitrary-precision orbit updates, a weak bailout estimate can still reduce visible benefit if it collapses too aggressively.

### 7. WebGL portability across browsers and drivers

A numerically coherent shader can still behave differently across browsers or GPU drivers if integer-like behavior is encoded through float-oriented paths.

## User-Facing Control Assumptions

The future renderer using this library should likely expose:

- `Precision Limbs`

Recommended initial range:

- `2..16`

Recommended initial default:

- `8`

This is lower than the alien implementation’s `12`, because WebGL fragment execution is likely to be significantly less forgiving than the alien compute pipeline.

## Acceptance Criteria For The Library

1. Host-side code can encode real and complex values into fixed-width limb form.
2. Shader-side code can decode and operate on that form.
3. Signed addition, subtraction, and multiplication work coherently for representative test cases.
4. The library is sufficient to express Mandelbrot and Julia recurrence in shader code.
5. The library does not depend on compute shaders, SSBOs, or shader `double`.
6. The library contract explicitly defines radix, limb ordering, fixed-point convention, and truncation behavior.

## Recommended Implementation Phases

### Phase 1

- define host-side encoding format
- define radix and fixed-point convention
- implement shader magnitude add/subtract
- implement signed add/subtract

### Phase 2

- implement schoolbook multiplication
- implement complex operations
- verify simple Mandelbrot recurrence on small limb counts

### Phase 3

- integrate bailout estimate
- wire into a minimal renderer path
- compare against existing WebGL and CPU outputs at controlled zoom levels

## Bottom-Line Recommendation

This library is a valid direction if the goal is:

- a WebGL-compatible experiment in true multi-limb fractal arithmetic

But it should be treated as a separate research track from the compute-oriented alien architecture.

The main pitfalls are not just speed.

The real technical risks are:

- WebGL-compatible data transport
- fixed-point correctness
- shader portability
- ensuring the bailout path does not become the new precision bottleneck
