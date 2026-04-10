# SOM Training Performance Optimization Plan

## 1. Purpose

This document proposes a practical optimization plan for the current Julia-set SOM implementation in `code/v001`.

The goal is to improve training speed without accidentally changing the current product behavior more than necessary.

The current implementation is deterministic and correct enough in principle, but it performs a large amount of work per run:

- generation of many Julia-set feature vectors
- full BMU scan across all cells for every sample
- full-cell update pass for every sample

The plan below prioritizes optimizations that are:

- high impact
- low to medium implementation risk
- compatible with current deterministic behavior

---

## 2. Main Bottlenecks

## 2.1 Training sample generation

Current path:

- `packages/web/src/workers/training-worker.ts`
- `packages/shared/src/julia/training-samples.ts`
- `packages/shared/src/julia/features.ts`

Each sample requires:

- deterministic Julia parameter generation
- full grayscale render of `featureWidth x featureHeight`
- repeated escape-time computation per pixel

This cost grows with:

- sample count
- feature width
- feature height
- training Julia iterations

This is an embarrassingly parallel workload.

## 2.2 SOM BMU search

Current path:

- `packages/shared/src/som/train.ts`
- `packages/shared/src/som/bmu.ts`

For every sample in every round, BMU search scans all cells.

This cost grows with:

- rounds
- sample count
- number of cells
- feature vector length

## 2.3 SOM neighborhood update

Current path:

- `packages/shared/src/som/train.ts`

After finding the BMU, the code loops over all cells and applies an update.

This is expensive because the current algorithm updates every cell even when the neighborhood influence is effectively near zero.

---

## 3. Optimization Strategy

Recommended priority:

1. Optimize without changing the learning algorithm.
2. Add caching where recomputation is currently wasteful.
3. Parallelize sample generation before parallelizing training.
4. Only consider algorithm-level changes after the above is complete.

---

## 4. Phase 1: Low-Risk High-Value Optimizations

## 4.1 Cache generated training samples

### Problem

Training samples are regenerated every time training starts, even when the sample-generation settings are unchanged.

### Current behavior

The worker always calls:

- `generateTrainingSamples(settings)`

before calling:

- `trainSom(...)`

### Proposed change

Introduce a cache key based on the settings that affect sample generation:

- `trainingJuliaIterations`
- `featureWidth`
- `featureHeight`
- `randomSeed`
- derived sample count

If the cache key matches the previous training input, reuse the already-generated samples.

### Expected impact

High impact for repeated training runs where SOM settings change but sample-generation settings do not.

### Risk

Low.

### Notes

The cache should be treated as viewer/session-local state and invalidated whenever training-sample settings change.

---

## 4.2 Skip negligible neighborhood updates

### Problem

The current training loop updates every cell on every sample.

For a Gaussian neighborhood, distant cells often contribute almost nothing.

### Proposed change

Add a neighborhood cutoff:

- only update cells within a maximum topology distance derived from the current radius
- optionally skip cells whose influence falls below a threshold such as `1e-4`

### Expected impact

Very high for larger maps.

### Risk

Low to medium.

### Notes

This should remain deterministic.
The threshold or cutoff should be fixed and documented.

---

## 4.3 Precompute neighborhood relationships

### Problem

Topology distances are recomputed repeatedly during training.

### Proposed change

For each cell, precompute nearby-cell indices grouped by topology distance or precompute a neighbor table up to a practical radius.

### Expected impact

Medium.

### Risk

Low to medium.

### Notes

This works especially well together with the neighborhood cutoff approach.

---

## 4.4 Reduce object-heavy inner loops

### Problem

The current code stores:

- cells as objects
- samples as objects
- vectors inside per-object properties

This increases property access overhead and reduces memory locality in hot loops.

### Proposed change

Gradually move performance-critical loops toward typed-array-friendly layouts:

- flattened prototype matrix
- flattened sample matrix
- compact arrays for cell coordinates

### Expected impact

Medium to high for large training runs.

### Risk

Medium.

### Notes

This is still compatible with current behavior, but it is more invasive than caching and cutoff logic.

---

## 5. Phase 2: Parallelization

## 5.1 Parallelize training sample generation

### Why this is the best first parallelization target

Each sample is independent during generation.

That makes the workload ideal for:

- multiple Web Workers
- chunked sample index ranges
- merge of deterministic ordered results

### Proposed change

Split sample generation into N chunks:

- worker 1 generates sample indices `0..k`
- worker 2 generates sample indices `k+1..m`
- etc.

Each worker returns its chunk.
The main training worker or orchestration layer merges them in deterministic index order.

### Expected impact

High, especially for large feature sizes and high Julia iteration counts.

### Risk

Medium.

### Notes

This preserves the online SOM algorithm exactly because only sample generation is parallelized, not training order.

---

## 5.2 Optional: Parallelize BMU search within a single sample step

### Problem

BMU search is a full scan across all cells.

### Proposed change

For one sample:

- split cell ranges across workers
- each worker returns its local best BMU candidate
- reduce to the global best BMU

### Expected impact

Potentially medium to high for very large maps.

### Risk

High relative to sample-generation parallelism.

### Notes

This requires careful attention to:

- worker overhead
- transfer cost
- deterministic tie-breaking

This should not be the first parallelization task.

---

## 5.3 Optional: Parallelize cell updates within a single sample step

### Problem

After BMU selection, each cell update is independent for that step.

### Proposed change

Split the cell-update range across workers and update disjoint slices.

### Expected impact

Unclear.

### Risk

High.

### Notes

This only becomes attractive if:

- prototype storage is flattened
- shared memory or efficient transfer is available
- worker overhead is shown to be acceptable

This is not recommended early.

---

## 6. Phase 3: Product and Algorithm Options

## 6.1 Expose performance-oriented presets

Add presets such as:

- fast preview
- balanced
- high detail

These presets should coordinate:

- map size
- feature resolution
- training rounds
- Julia iterations

This is not a core engine optimization, but it improves usability and perceived performance.

---

## 6.2 Add progressive training mode

Instead of doing one full expensive training run immediately, allow:

- low-resolution preview training first
- then optional refinement

This provides faster feedback even if total compute remains similar.

---

## 6.3 Consider batch SOM later

Batch SOM or related variants may parallelize better than the current online algorithm.

However, this changes the algorithm and therefore should be treated as a later product decision, not as a direct optimization of the current implementation.

---

## 7. Recommended Implementation Order

## Step 1

Add lightweight instrumentation:

- sample generation duration
- training duration
- BMU search time
- update-pass time

This should be done first so the rest of the work can be measured rather than guessed.

## Step 2

Add training-sample caching.

## Step 3

Add neighborhood cutoff and skip negligible updates.

## Step 4

Precompute topology-neighborhood data where useful.

## Step 5

Parallelize training sample generation across multiple workers.

## Step 6

Only after profiling again, decide whether flattened typed-array refactors are justified.

## Step 7

Only after that, consider parallel BMU/update strategies.

---

## 8. Recommendations

Most practical near-term plan:

1. Add instrumentation.
2. Add sample-generation caching.
3. Add neighborhood cutoff.
4. Parallelize sample generation.

This sequence should produce meaningful speedups without forcing a redesign of the SOM engine.

Parallelizing the online training loop itself is possible in limited ways, but it is not the cleanest first move because the current algorithm is inherently sequential across samples.

The cleanest parallel win is sample generation.

---

## 9. Summary

Best opportunities:

- cache training samples
- stop updating distant cells
- precompute neighborhood information
- parallelize Julia sample generation

Less attractive early options:

- parallel BMU search
- parallel cell updates
- algorithm replacement

If the goal is a fast and safe improvement path, the first serious engineering target should be:

**parallel sample generation plus neighborhood-cutoff optimization**
