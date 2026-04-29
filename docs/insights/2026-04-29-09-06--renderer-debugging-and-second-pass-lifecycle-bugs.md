# Renderer Debugging And Second-Pass Lifecycle Bugs

Date: `2026-04-29 09:06` Europe/Vienna

## Why This Note Exists

Several seemingly different explorer renderer bugs turned out to rhyme:

- an earlier normal WebGL coarse/fine transition bug
- a CPU renderer coarse/fine transition bug
- an open arbitrary-precision WebGL renderer black-second-pass bug

The durable lesson is that these bugs are often not “math bugs” first. They are frequently render-lifecycle and canvas-ownership bugs.

## Core Insight: Second Passes Are Dangerous

Any renderer with:

- a coarse pass followed by a fine pass
- adaptive render resolution
- staged presentation
- delayed follow-up rendering
- fallback rendering

should be treated as vulnerable to second-pass bugs.

The main failure modes seen in this codebase are:

- the visible canvas gets cleared after a successful draw because `width` / `height` are reassigned later
- two different layers of code both believe they own visible canvas size
- a second pass renders correctly but is then destroyed by presentation-state reconciliation
- renderer plumbing looks broken even when the real problem is that the final visible bitmap was reset after rendering

## The Most Important Architectural Rule

For a visible canvas, there should be exactly one owner of:

- backing-buffer size
- presentation timing
- final visible swap/blit

If imperative render code and declarative component state both own canvas sizing, bugs are likely.

This was the root lesson behind the CPU fix:

- commit `84b2bd27e5109b11c4058391391be04100acef94`
  - subject: `buggy fix for blank frame problem during transition between coarse and detailed rendering`
- commit `41f70cc4c00f3f9fd882679afd8d06169cbc2ccc`
  - subject: `fix cpu renderer *but why not everything)`

The CPU bug happened because the renderer presented a staged image imperatively and component state later reapplied `width` / `height`, which cleared the visible bitmap.

## Practical Debugging Workflow

### 1. Do Not Start By Assuming Math Is Wrong

When a renderer looks blank, black, or blocky:

- first ask whether the image was rendered and then destroyed
- or whether the second pass failed structurally

Do not jump straight to fractal arithmetic.

### 2. Use A Real Browser Render Pass

For renderer bugs, build/lint is necessary but insufficient.

Use headless Chromium with a real preview server.

Useful pattern:

```bash
npm run -w @asimov/minimal-web preview -- --host 127.0.0.1 --port 4173
chromium --headless --no-sandbox --use-gl=angle --use-angle=swiftshader --enable-unsafe-swiftshader \
  --window-size=1366,768 --screenshot=/tmp/out.png \
  http://127.0.0.1:4173/explorer-renderer-compare
```

### 3. Prefer Side-By-Side Comparison

The route `/explorer-renderer-compare` is valuable because it lets you compare:

- normal WebGL
- experimental / AP WebGL

under the same UI, controls, and interaction model.

### 4. Distinguish “No Draw” From “Draw Then Lost”

Key diagnostic questions:

- did the WebGL context exist?
- did the shader compile?
- did the draw call happen?
- were non-black pixels ever written?
- was the visible canvas later cleared or resized?

This distinction matters. A renderer can be fully alive and still appear broken because a later lifecycle step destroys the frame.

### 5. Be Careful With Temporary Diagnostics

Useful temporary diagnostics included:

- overlaying thrown render errors into canvas text
- forcing debug fragment output
- inspecting framebuffer state
- comparing coarse and fine pass behavior explicitly

But temporary diagnostics should be removed after use unless they are clearly worth keeping.

## Codebase-Specific Lessons

### CPU Path

The CPU path used staged presentation and separate `presentedRenderSize` state. That created conflicting ownership of the visible canvas size and caused second-pass failures.

Clean fix pattern:

- keep visible canvas size owned directly by render resolution
- render to staging if needed
- present into an already-sized visible canvas
- do not let a later JSX size update clear the just-presented frame

### WebGL / AP WebGL Paths

Even when the exact bug is different, use the CPU fix as a reference model:

- inspect ownership of visible canvas size
- inspect who performs the final draw/present
- inspect whether a later transition or state update invalidates the result

The CPU fix is a useful template because it solved a real second-pass lifecycle bug cleanly rather than hiding symptoms.

## Quality Standard Going Forward

For this codebase, the target is:

- clean renderer architecture
- reliable multi-pass presentation
- performance-aware fixes
- no renderer-specific hacks unless proven necessary

When a renderer has a coarse/fine or first/second pass, treat its presentation lifecycle as a first-class design concern, not an implementation detail.
