
Document what you learned about headless debugging this app in a new technical details section in the README

```
• Added a new Technical Details section to README.md documenting the headless debugging workflow and the main lessons from debugging the explorer zen mode.

  It now includes:

  - the preview-server command
  - headless Chromium --dump-dom and screenshot commands
  - the SwiftShader WebGL command
  - the geometry pitfalls around zen mode, stage sizing, and object-fit: cover
  - the practical rule that stage-owned cropping is safer for interactive fractal canvases than canvas-content cropping

  I only changed the README.
```