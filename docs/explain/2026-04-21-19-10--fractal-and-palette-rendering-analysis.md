# Fractal And Palette Rendering Analysis

## Scope

This document explains the current `/explorer` rendering path in `code/v001`:

- what is calculated for the Mandelbrot set
- what is calculated for the Julia set
- how those scalar results are mapped into colors
- how palettes are defined and generated
- which helper functions generate palettes from other data
- whether the current system can produce a strict even/odd checkerboard banding effect

It describes the current implementation, not an idealized model.

## Mandelbrot: what is calculated

### Mathematical object

For each pixel, the explorer evaluates the Mandelbrot escape-time iteration

`z_(n+1) = z_n^2 + c`

with:

- `z_0 = 0`
- `c` = the complex coordinate corresponding to that pixel in the current Mandelbrot viewport

If the orbit escapes beyond radius `2`, the point is considered outside the set.
If it does not escape within the configured iteration limit, it is treated as interior.

### CPU implementation

The CPU Mandelbrot renderer is in [`explorer-cpu-renderer.ts`](/home/wizard/projects/asimov/asimov-happy/code/v001/packages/web/src/canvas/explorer-cpu-renderer.ts).

Per pixel it does:

1. Convert pixel center `(x + 0.5, y + 0.5)` into a complex coordinate `(cReal, cImaginary)` using the current viewport.
2. Initialize `real = 0`, `imaginary = 0`.
3. Iterate:
   - `nextReal = real^2 - imaginary^2 + cReal`
   - `nextImaginary = 2 * real * imaginary + cImaginary`
4. Stop if `real^2 + imaginary^2 > 4`.
5. If it escaped, compute a smoothed escape value:

`smoothedIteration = iteration + 1 - log2(log2(max(|z|^2, 4)))`

6. Normalize:

`normalized = clamp(smoothedIteration / iterations, 0, 1)`

7. Send that normalized scalar into palette mapping.

If the point did not escape, the renderer uses the palette's `interior` color directly.

### WebGL implementation

The WebGL Mandelbrot renderer is in [`explorer-webgl-renderer.ts`](/home/wizard/projects/asimov/asimov-happy/code/v001/packages/web/src/canvas/explorer-webgl-renderer.ts).

It computes the same Mandelbrot formula in the fragment shader:

- `u_mode == 0` means Mandelbrot
- `z = vec2(0.0, 0.0)`
- `c = coordinate`

For escaped points it computes the same style of smooth iteration:

`smoothedIteration = iteration + 1 - log2(log2(magnitudeSquared))`

then:

`normalizedEscape = clamp(smoothedIteration / float(u_iterations), 0.0, 1.0)`

This normalized scalar is then fed into the shader's palette logic.

## Julia: what is calculated

### Mathematical object

For the Julia set, the explorer evaluates

`z_(n+1) = z_n^2 + c`

but now:

- `c` is fixed to the selected Mandelbrot parameter
- `z_0` is the complex coordinate corresponding to the pixel in the Julia viewport

So Mandelbrot varies `c` across the image, while Julia varies the initial `z`.

### Shared Julia smooth escape helper

The core shared helper is [`getSmoothEscapeValue()`](/home/wizard/projects/asimov/asimov-happy/code/v001/packages/shared/src/julia/escape-time.ts) in `shared`.

It:

1. Starts from `(startReal, startImaginary)` as the initial `z`.
2. Uses the fixed `parameter` as `c`.
3. Iterates the Julia formula.
4. If it escapes beyond `JULIA_BAILOUT_RADIUS`, computes:

`smoothIteration = iteration + 1 - log(log(max(|z|, bailout))) / log(2)`

5. Returns:

`clamp(smoothIteration / maxIterations, 0, 1)`

6. Returns `1` for non-escaping points.

So the Julia shared path encodes:

- escaped points as a continuous value in `[0, 1)`
- interior/non-escaped points as exactly `1`

### CPU Julia implementation

The CPU Julia renderer in [`explorer-cpu-renderer.ts`](/home/wizard/projects/asimov/asimov-happy/code/v001/packages/web/src/canvas/explorer-cpu-renderer.ts) does not directly iterate per pixel inline.

Instead it calls [`renderJuliaFeatureVector()`](/home/wizard/projects/asimov/asimov-happy/code/v001/packages/shared/src/julia/features.ts), which:

1. Converts each pixel center to a complex coordinate in the Julia viewport.
2. Calls `getSmoothEscapeValue(...)`.
3. Stores one float per pixel in a `Float32Array`.

Then the CPU web renderer turns that feature vector into color:

- `value >= 1` is treated as interior
- otherwise `value` is treated as the normalized escape scalar

### WebGL Julia implementation

The WebGL Julia renderer does not call the shared feature-vector helper.

Instead, the fragment shader computes Julia directly:

- `u_mode == 1`
- `z = coordinate`
- `c = u_parameter`

It then performs the same smooth-escape-style normalization and palette mapping inside the shader.

So the CPU Julia path and WebGL Julia path are structurally different:

- CPU: `shared` feature vector first, color second
- WebGL: escape computation and coloring happen in one shader pass

But they aim to represent the same quantity: a normalized smooth escape value plus a separate interior case.

## How the scalar result is mapped onto palettes

The palette pipeline lives in [`fractal-palette.ts`](/home/wizard/projects/asimov/asimov-happy/code/v001/packages/web/src/canvas/fractal-palette.ts).

The key concept is:

- fractal math produces a scalar value
- palette mapping mode transforms that scalar
- palette stop interpolation turns the transformed scalar into RGB

### Step 1: raw scalar

For escaped points:

- Mandelbrot uses `smoothedIteration / iterations`
- Julia uses a normalized smooth escape value from `getSmoothEscapeValue()` or the equivalent shader logic

For interior points:

- the renderer bypasses stop interpolation and uses `palette.interior`

### Step 2: mapping mode

`mapPaletteValue(value, mode, cycles)` transforms the normalized scalar before palette lookup.

Current modes:

- `binary`
  - returns `0` or `1` depending on whether normalized value is below or above `0.5`
- `linear`
  - returns the normalized value unchanged
- `logarithmic`
  - returns `log(1 + value * 99) / log(100)`
  - this expands low escape values and compresses high ones
- `cyclic`
  - returns `fract(value * cycles)`
- `cyclic-mirrored`
  - returns a ping-pong value that goes forward then backward through the palette

### Step 3: palette color lookup

`getPaletteColor(paletteId, value)`:

1. Clamps the value to `[0, 1]`
2. Finds the first stop whose `position` is `>= value`
3. Finds the previous stop
4. Linearly interpolates RGB channel-by-channel between those two stop colors

So palette lookup is piecewise linear interpolation over palette stops.

### Interior handling

Interior handling is separate from stop interpolation:

- `getPaletteColor(..., { isInterior: true })` returns `palette.interior`
- `getMappedPaletteColor(..., { isInterior: true })` also returns `palette.interior`

For current Mandelbrot and Julia rendering, non-escaping points are therefore a flat solid color.

### Special case: binary mapping

`getMappedPaletteColor()` treats binary differently from the other modes.

For `binary`:

- values below threshold return `palette.interior`
- values above threshold return the last palette stop color

So binary mode is not "two arbitrary stop colors".
It is currently:

- one color = `interior`
- the other color = final stop color

## How palettes work at the moment

Each palette is a `FractalPaletteDefinition`:

- `id`
- `label`
- `background`
- `interior`
- `stops[]`

`background` is used for canvas/background styling.
`interior` is used for points that do not escape.
`stops` define the gradient used for escaped points.

### Palette categories currently in the code

There are three palette sources:

1. Custom static palettes
   - `ember`
   - `oceanic`
   - `graphite`

2. Alternating `Color / Black` palettes
   - `Red / Black`
   - `Orange / Black`
   - `Yellow / Black`
   - `Lime / Black`
   - `Green / Black`
   - `Cyan / Black`
   - `Blue / Black`
   - `Magenta / Black`

3. Theme-derived palettes
   - one palette per UI theme

### How custom palettes are defined

The custom palettes are literal hard-coded RGB stop lists in `CUSTOM_PALETTES`.

No helper generation is involved there.

### How the alternating palettes are generated

These are generated from a simpler source table:

- `ALTERNATING_BLACK_PALETTE_COLORS`

Each entry provides:

- `id`
- `label`
- one pastel RGB color

That table is converted into full palette definitions by:

- `createAlternatingBlackPalette(id, label, color)`

This helper builds:

- `background = black`
- `interior = black`
- 6 alternating stops:
  - color
  - black
  - color
  - black
  - color
  - black

So yes, there is a helper that generates a palette from a simpler data structure.

### How theme palettes are generated

Theme palettes are also generated rather than written out manually.

The helper chain is:

- `getThemeColor(theme, variableName)`
- `parseHslColor(value)`
- `createThemePalette(theme)`

`createThemePalette(theme)` pulls colors from theme CSS variables such as:

- `--canvas-mandelbrot`
- `--accent`
- `--accent-strong`
- `--text-color`
- `--muted`

It then constructs:

- `background` from the theme canvas color
- `interior` by darkening the background
- 4 stops derived from mixes of background/accent/accentStrong/text/muted

So yes, there is also a helper-generated palette path from theme definitions.

## Important implementation detail: CPU and WebGL do not currently support the same number of stops

This is important.

### CPU path

The CPU palette logic in `getPaletteColor()` supports any number of stops.

It searches the `palette.stops` array dynamically and interpolates between neighboring stops.

### WebGL path

The current WebGL shader is hard-coded to:

- `u_stopColors[4]`
- `u_stopPositions[4]`

and loops only across 4 stops.

That means the WebGL path currently assumes exactly 4 palette stops.

### Consequence

At the moment:

- CPU rendering can faithfully use 6-stop alternating palettes
- WebGL rendering only has explicit shader support for 4 stops

The JS side still uploads all stop data, but the shader interface itself is fixed to 4 entries.

So palette behavior is not fully identical between CPU and WebGL for palettes with more than 4 stops.

That is part of "how palettes work at the moment".

## Are there helper functions that generate a palette from other data structures?

Yes.

The current helpers are:

- `createThemePalette(theme)`
  - generates a palette from a `ThemeDefinition`
- `createAlternatingBlackPalette(id, label, color)`
  - generates a palette from a simpler `{ id, label, color }` description

Supporting helpers used in that generation:

- `getThemeColor(theme, variableName)`
- `parseHslColor(value)`
- `mixRgb(first, second, ratio)`
- `darken(color, ratio)`

## Can a checkerboard palette be generated that produces visual bands where odd iterations are one color and even iterations are another?

### Short answer

Not exactly with the current palette system alone.

### Why not

The current palette system receives a continuous normalized scalar, not the raw integer iteration count parity.

Specifically:

- Mandelbrot uses a smoothed escape value
- Julia uses a smoothed normalized escape value
- palette lookup then works on that continuous value

That means:

- parity information from the raw integer iteration count is not preserved as the main palette input
- palette stops and mapping modes cannot reliably say "odd iteration -> color A, even iteration -> color B"

### What the current system can do

It can create banded looks:

- `binary` can split the image into two classes by threshold
- `cyclic` and `cyclic-mirrored` with alternating palettes can create repeated bands

But those bands are based on the continuous normalized escape scalar, not strict odd/even iteration parity.

So they can look striped or banded, but they are not a true "odd iterations vs even iterations" checkerboard rule.

### What would be needed for a true odd/even band palette

You would need a rendering path that exposes the integer escape iteration count before smoothing, or in addition to smoothing, and then colors by:

- `iteration % 2 == 0` -> color A
- `iteration % 2 == 1` -> color B

That is possible as a renderer feature, but it is not achievable with the current palette-definition mechanism by itself.
