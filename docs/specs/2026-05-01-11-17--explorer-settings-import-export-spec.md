# Explorer Settings Import/Export Spec

Date: `2026-05-01 11:17` Europe/Vienna

## Goal

Add selective import/export for explorer settings.

The user should be able to:

- export current explorer settings to a JSON file
- import explorer settings from a JSON file
- choose which groups of settings are exported
- choose which groups from an imported file are applied

This feature is for explorer state and behavior, not for transient UI state.

## UI Overview

Add a new section in the explorer controls sidebar:

- `Import / Export`

This section contains:

- an `Export` button
- an `Import` button
- a list of checkboxes for selectable settings groups

The same group model is used for both export and import.

## Settings Groups

Use these groups in v1:

1. `Renderer`
2. `Palette`
3. `Mandelbrot View`
4. `Julia View`
5. `Selection`
6. `Interaction`
7. `Layout`

## Group Definitions

### 1. Renderer

Purpose:

- rendering backend choice and backend-specific tuning

Fields:

- selected renderer id
- renderer-specific parameter objects

Current known renderer-specific fields:

- arbitrary-precision WebGL precision limbs

JSON shape:

```json
"renderer": {
  "selected": "webgl",
  "webglArbitraryPrecision": {
    "precisionLimbs": 2
  }
}
```

Rules:

- future renderer-specific settings must be nested under renderer-specific subkeys
- unknown renderer-specific subkeys must be ignored safely on import

### 2. Palette

Purpose:

- fractal coloring configuration

Fields:

- palette id
- palette mapping mode
- palette cycles
- binary inside color
- binary outside color
- escape band entry count
- escape band colors
- escape band thresholds

JSON shape:

```json
"palette": {
  "paletteId": "ember",
  "mappingMode": "logarithmic",
  "cycles": 6,
  "binary": {
    "insideColor": "#000000",
    "outsideColor": "#ffffff"
  },
  "escapeBands": {
    "entryCount": 3,
    "colors": ["#a855f7", "#2edcc8", "#000000"],
    "thresholds": [10, 5000]
  }
}
```

Rules:

- colors must use JSON strings in `#RRGGBB` form
- `escapeBands.thresholds.length` must be `entryCount - 1`
- invalid colors or malformed escape-band arrays must be rejected for that group

### 3. Mandelbrot View

Purpose:

- settings and state specific to the Mandelbrot pane

Fields:

- Mandelbrot iterations
- Mandelbrot viewport
- show orbit
- orbit steps
- attracting-period detection enabled
- period detection steps
- max detected period

JSON shape:

```json
"mandelbrotView": {
  "iterations": 1000,
  "viewport": {
    "minReal": -2.2,
    "maxReal": 1.0,
    "minImaginary": -1.0666666666666667,
    "maxImaginary": 1.0666666666666667
  },
  "showOrbit": false,
  "orbitSteps": 100,
  "periodDetection": {
    "enabled": false,
    "steps": 10000,
    "maxDetectedPeriod": 3000
  }
}
```

Rules:

- viewport values must be finite numbers
- `minReal < maxReal`
- `minImaginary < maxImaginary`

### 4. Julia View

Purpose:

- settings and state specific to the Julia pane

Fields:

- Julia iterations
- Julia viewport

JSON shape:

```json
"juliaView": {
  "iterations": 1000,
  "viewport": {
    "minReal": -1.6,
    "maxReal": 1.6,
    "minImaginary": -1.6,
    "maxImaginary": 1.6
  }
}
```

Rules:

- viewport values must be finite numbers
- `minReal < maxReal`
- `minImaginary < maxImaginary`

### 5. Selection

Purpose:

- shared explorer selection state

Fields:

- selected parameter / active Julia constant `c`

JSON shape:

```json
"selection": {
  "parameter": {
    "real": -0.74543,
    "imaginary": 0.11301
  }
}
```

Rules:

- the selected parameter is intentionally separate from `Julia View`
- this keeps the model semantically clean because the parameter is shared between Mandelbrot and Julia behavior

### 6. Interaction

Purpose:

- interaction behavior and overlay/display controls

Fields:

- live preview
- two quality levels enabled
- coarse-pass quality scale
- settle delay before fine pass
- show axes
- marker scale

JSON shape:

```json
"interaction": {
  "livePreview": true,
  "twoQualityLevels": {
    "enabled": true,
    "coarsePassQualityScale": 0.2,
    "settleDelayMs": 300
  },
  "showAxes": false,
  "markerScale": 1.5
}
```

Rules:

- `coarsePassQualityScale` must be a finite number
- `settleDelayMs` must be a finite integer
- `markerScale` is stored as the internal scale factor, not as a UI percent string

### 7. Layout

Purpose:

- explorer page arrangement state

Fields:

- zen mode
- zen split ratio

JSON shape:

```json
"layout": {
  "zenMode": false,
  "zenSplitRatio": 0.5
}
```

Rules:

- `zenSplitRatio` must be a finite number
- imported values should be clamped to the runtime-supported range

## What Must Not Be Exported

Do not export:

- hover state
- temporary active coarse/fine pass state
- measured canvas size
- render errors
- open/closed advanced-settings disclosure state
- temporary pointer/touch interaction state
- detected current hover coordinates
- transient compare/debug route parameters

## JSON File Format

Use a versioned JSON object.

Top-level shape:

```json
{
  "format": "asimov-explorer-settings",
  "version": 1,
  "exportedAt": "2026-05-01T11:17:00Z",
  "groups": {
    "renderer": {},
    "palette": {},
    "mandelbrotView": {},
    "juliaView": {},
    "selection": {},
    "interaction": {},
    "layout": {}
  }
}
```

Rules:

- `format` is required
- `version` is required
- `exportedAt` is recommended but not required for import
- `groups` is required
- only selected groups are written into `groups`
- group names are stable API keys and must not depend on UI labels

## Export Behavior

### UX

The `Import / Export` section should show checkboxes for all settings groups.

Recommended default:

- all groups checked

When the user clicks `Export`:

1. collect the checked groups
2. serialize only those groups
3. generate the JSON file
4. download it with a sensible filename

Recommended filename pattern:

- `asimov-explorer-settings-YYYY-MM-DDTHH-mm-ss.json`

### Export Validation

Before writing:

- ensure only valid, serializable values are emitted
- normalize colors to `#RRGGBB`
- ensure numbers are finite

## Import Behavior

### UX

Import is a two-step process:

1. the user chooses a JSON file
2. the app parses the file and presents the same group checkboxes, enabled only for groups actually present in the file
3. the user confirms which present groups to apply

If a group is not present in the file:

- its checkbox should be disabled for that import action

### Merge Semantics

Import must merge selected groups into the current explorer state.

Rules:

- only selected groups are applied
- unselected groups remain unchanged
- groups not present in the file remain unchanged
- missing fields inside a selected group remain unchanged
- unknown top-level or group fields are ignored safely

This is intentionally a merge, not a full reset.

### Error Handling

If the file is invalid JSON:

- show a user-facing parse error
- do not change any state

If the file has the wrong `format` or unsupported `version`:

- show a user-facing validation error
- do not change any state

If one selected group is invalid but others are valid:

- recommended v1 behavior: reject the import operation and apply nothing

Rationale:

- all-or-nothing import is safer and easier to reason about than partial silent failure

## Validation Rules

Import validation should include:

- top-level `format === "asimov-explorer-settings"`
- supported `version`
- object-valued `groups`
- known group structure for each selected group
- finite numeric values
- valid booleans where expected
- valid renderer ids where applicable
- valid palette ids / mapping modes where applicable
- valid viewport ordering
- valid color strings in `#RRGGBB`
- valid threshold counts for escape bands

## Forward Compatibility

The format must be designed to evolve.

Rules:

- unknown group keys must be ignored
- unknown fields inside known groups must be ignored
- renderer-specific settings should stay namespaced under renderer-specific objects
- future versions may add new groups without breaking v1 readers

## UI Notes

Recommended UI section title:

- `Import / Export`

Recommended group labels:

- `Renderer`
- `Palette`
- `Mandelbrot View`
- `Julia View`
- `Selection`
- `Interaction`
- `Layout`

Recommended button labels:

- `Export Selected`
- `Import Selected`

## Acceptance Criteria

1. The explorer sidebar contains an `Import / Export` section.
2. The section contains export and import actions.
3. The section shows checkboxes for all v1 settings groups.
4. Export writes only the selected groups into a versioned JSON file.
5. Import allows applying only selected groups from the file.
6. Import merges selected groups into current state instead of resetting all state.
7. Invalid JSON or invalid format/version is rejected with a visible error.
8. Transient hover/debug/render state is not exported.
9. The JSON structure is stable, explicit, and forward-compatible.

## Out Of Scope For V1

- exporting training/workspace `/som` settings
- exporting compare-route debug state
- importing/exporting currently open UI disclosures
- named presets
- per-field import instead of per-group import
- automatic migration from arbitrary older ad-hoc JSON shapes
