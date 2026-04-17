# "Editor Controls" Implementation Notes

Back to ["Editor Controls"](./editor-controls.md).

## Tweakpane setup
- The pane is created in `initTweakpane()` and organized into folders.
- All controls bind directly to `EditorConfig` fields.
- The constants field uses `@pangenerator/tweakpane-textarea-plugin` with `view: 'textarea'`.

## Change propagation
- Scale changes call `updateScale()` and redraw polygons.
- View offset changes call `updateViewportCenter()`.
- Edge width changes trigger a redraw to update stroke widths.
- Axes toggles re-render the axes overlay.
- Constants changes trigger re-evaluation for all polygon descriptions.
