# asimov-happy

`asimov-happy` currently contains a versioned TypeScript workspace for a browser-based Julia-set / Kohonen-map application.

The active implementation lives in `code/v001`. It is a deterministic frontend app that:

- generates grayscale Julia-set feature vectors
- trains a Self-Organizing Map (SOM / Kohonen net) in the browser
- renders the trained map as square or hex cells
- lets the user inspect representative Julia parameters and hover-interpolate across the map

## Current Status

The implementation is primarily aligned with:

- [docs/specs/_main-julia-sets-kohonen-nets-0001.md](docs/specs/_main-julia-sets-kohonen-nets-0001.md)

The current implementation-status review for that spec is here:

- [docs/progress/_main-julia-sets-kohonen-nets-0001--implementation-status.md](docs/progress/_main-julia-sets-kohonen-nets-0001--implementation-status.md)

Another existing comparison doc, for a broader generic-data spec, is here:

- [docs/progress/_main-functionality-0003--implementation-status.md](docs/progress/_main-functionality-0003--implementation-status.md)

If you are starting fresh, read those two files before assuming what the project does.

## Repository Structure

Top-level layout:

- `code/`
  Versioned implementation snapshots.
- `code/v001/`
  Active TypeScript workspace for the current app.
- `docs/specs/`
  Product and technical specifications.
- `docs/progress/`
  Implementation-status and gap-analysis documents.
- `docs/bugs/`, `docs/plans/`, `docs/sessions/`, `docs/system-description/`
  Supporting project notes.
- `resources/`
  Static assets and reference resources.
- `scripts/`
  Repository helper scripts.

## Workspace Structure

The actual app code is in `code/v001/packages/*`.

### `packages/web`

This is the real product surface.

- Preact + Vite frontend
- training controls, validation, import/export, stale-result handling
- SOM canvas, Mandelbrot overview, Julia viewer
- Web Worker orchestration for training

Important files:

- `code/v001/packages/web/src/app/app.tsx`
- `code/v001/packages/web/src/canvas/*`
- `code/v001/packages/web/src/workers/*`

### `packages/shared`

This is the deterministic core.

- app settings and validation
- Julia parameter sampling
- smooth escape-time feature rendering
- XORShift128 RNG and seed handling
- SOM initialization, BMU search, shuffling, schedule, training
- topology math for square and hex grids
- reproducibility fingerprinting
- settings/result serialization

Important files:

- `code/v001/packages/shared/src/config/*`
- `code/v001/packages/shared/src/julia/*`
- `code/v001/packages/shared/src/rng/*`
- `code/v001/packages/shared/src/som/*`
- `code/v001/packages/shared/src/topology/*`
- `code/v001/packages/shared/src/serialization/*`

### `packages/server`

Currently minimal scaffolding. It depends on `shared` but does not implement the browser app’s main workflow.

### `packages/cli`

Currently minimal scaffolding. It also depends on `shared` but is not the main product.

## Mental Model

When working on this repository, treat the package responsibilities like this:

- `shared` is the algorithm and data-model engine
- `web` is the actual application
- `server` and `cli` are placeholders or future extension points

If a question is about product behavior, the answer is usually split across:

1. `packages/shared/src/*` for deterministic logic
2. `packages/web/src/app/app.tsx` for app state and workflows
3. `packages/web/src/canvas/*` and `packages/web/src/workers/*` for rendering and training execution

## Running The App

From `code/v001`:

```bash
npm install
npm run dev:app
```

Useful scripts:

```bash
npm run dev:web
npm run dev:server
npm run dev:cli
npm run build
npm run typecheck
npm run lint
```

For shared-package tests:

```bash
npm run -w @asimov/minimal-shared test
```

## Required Verification Workflow

When changing code in this repository, use the workspace scripts in `code/v001/package.json` as the primary CI check.

Always run these commands in this exact order from `code/v001`:

```bash
npm run build
npm run lint
```

Rules:

- do not run `lint` before `build`
- if `build` fails, fix the errors before moving on to `lint`
- if `lint` fails, fix the errors and rerun `lint`
- treat this sequence as the default local CI gate for feature work and refactors

This is the expected verification method for future agents working in this repo.

## How To Implement Features

Use this workflow when adding or changing functionality:

1. Read `docs/specs/_main-julia-sets-kohonen-nets-0001.md` and the related implementation-status doc in `docs/progress/`.
2. Treat `code/v001/packages/shared` as the deterministic engine and `code/v001/packages/web` as the actual product surface.
3. Put algorithm, settings, serialization, reproducibility, and topology logic in `packages/shared`.
4. Put UI state, controls, canvases, and worker orchestration in `packages/web`.
5. After making changes, run `npm run build` and then `npm run lint` from `code/v001`.
6. If either step fails, fix the issues before considering the work complete.

## What The App Already Supports

- deterministic training using XORShift128
- square and hex SOM topologies
- configurable map size, feature size, training rounds, seed, and Julia iteration counts
- viewer-only Julia iteration control
- import/export of settings JSON
- import/export of trained-map JSON
- reproducibility fingerprinting
- hover-based map interpolation
- worker-based browser training

## Known Important Caveats

Based on the current implementation review:

- in-flight cancellation is likely only partial because the training loop is synchronous inside the worker
- hex-grid interpolation is smooth and deterministic, but not implemented with the same plainly linear approach used for square grids
- several algorithm decisions are fixed in code but not yet fully written back into the main spec

## Recommended Reading Order

If you need to understand the project quickly, read in this order:

1. `README.md`
2. `docs/specs/_main-julia-sets-kohonen-nets-0001.md`
3. `docs/progress/_main-julia-sets-kohonen-nets-0001--implementation-status.md`
4. `code/v001/package.json`
5. `code/v001/packages/web/src/app/app.tsx`
6. `code/v001/packages/shared/src/index.ts`

## Short Version

This repository is not a generic SOM platform yet. The current real implementation is a deterministic Julia-set SOM browser app in `code/v001`, with most core logic in `packages/shared` and the actual user-facing product in `packages/web`.
