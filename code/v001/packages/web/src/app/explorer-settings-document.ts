import type {
  ComplexBounds,
  ComplexParameter,
  JuliaViewport,
} from "@asimov/minimal-shared";
import { JULIA_VIEWPORT } from "@asimov/minimal-shared";
import {
  DEFAULT_PALETTE_CYCLES,
  DEFAULT_PALETTE_MAPPING_MODE,
  DEFAULT_FRACTAL_PALETTE_ID,
  getFractalPalettes,
  PALETTE_MAPPING_OPTIONS,
  type FractalPaletteId,
  type PaletteMappingMode,
  type RgbColor,
} from "../canvas/fractal-palette.js";
import {
  MAX_ESCAPE_BAND_ENTRIES,
  MAX_ARBITRARY_PRECISION_LIMB_COUNT,
  isExplorerRendererId,
  type ExplorerRendererId,
} from "../canvas/explorer-renderer.js";
import { DEFAULT_MANDELBROT_VIEWPORT } from "../canvas/mandelbrot-overview-canvas.js";
import { DEFAULT_ARBITRARY_PRECISION_LIMB_COUNT } from "../canvas/webgl-arbitrary-precision.js";

export type ExplorerSettingsGroupId =
  | "renderer"
  | "palette"
  | "mandelbrotView"
  | "juliaView"
  | "selection"
  | "interaction"
  | "layout";

export const EXPLORER_SETTINGS_GROUPS: Array<{
  id: ExplorerSettingsGroupId;
  label: string;
}> = [
  { id: "renderer", label: "Renderer" },
  { id: "palette", label: "Palette" },
  { id: "mandelbrotView", label: "Mandelbrot View" },
  { id: "juliaView", label: "Julia View" },
  { id: "selection", label: "Selection" },
  { id: "interaction", label: "Interaction" },
  { id: "layout", label: "Layout" },
];

export interface ExplorerWorkspaceSettingsState {
  requestedRenderer: ExplorerRendererId;
  requestedArbitraryPrecisionLimbCount: number;
  palette: FractalPaletteId;
  paletteMappingMode: PaletteMappingMode;
  paletteCycles: number;
  binaryInteriorColor: RgbColor;
  binaryExteriorColor: RgbColor;
  escapeBandEntryCount: number;
  escapeBandColors: RgbColor[];
  escapeBandThresholds: number[];
  mandelbrotIterations: number;
  mandelbrotViewport: ComplexBounds;
  showOrbit: boolean;
  orbitSteps: number;
  showAttractingPeriod: boolean;
  periodDetectionSteps: number;
  maxDetectedPeriod: number;
  juliaIterations: number;
  juliaViewport: JuliaViewport;
  selectedParameter: ComplexParameter;
  isLivePreviewEnabled: boolean;
  useTwoQualityLevels: boolean;
  interactiveQualityScale: number;
  qualitySettleDelayMs: number;
  showAxes: boolean;
  markerScale: number;
  isZenView: boolean;
  zenSplitRatio: number;
}

interface RendererGroup {
  selected: ExplorerRendererId;
  webglArbitraryPrecision?: {
    precisionLimbs: number;
  };
}

interface PaletteGroup {
  paletteId: FractalPaletteId;
  mappingMode: PaletteMappingMode;
  cycles: number;
  binary: {
    insideColor: string;
    outsideColor: string;
  };
  escapeBands: {
    entryCount: number;
    colors: string[];
    thresholds: number[];
  };
}

interface MandelbrotViewGroup {
  iterations: number;
  viewport: ComplexBounds;
  showOrbit: boolean;
  orbitSteps: number;
  periodDetection: {
    enabled: boolean;
    steps: number;
    maxDetectedPeriod: number;
  };
}

interface JuliaViewGroup {
  iterations: number;
  viewport: JuliaViewport;
}

interface SelectionGroup {
  parameter: ComplexParameter;
}

interface InteractionGroup {
  livePreview: boolean;
  twoQualityLevels: {
    enabled: boolean;
    coarsePassQualityScale: number;
    settleDelayMs: number;
  };
  showAxes: boolean;
  markerScale: number;
}

interface LayoutGroup {
  zenMode: boolean;
  zenSplitRatio: number;
}

export interface ExplorerSettingsDocument {
  format: "asimov-explorer-settings";
  version: 1;
  exportedAt: string;
  groups: Partial<{
    renderer: RendererGroup;
    palette: PaletteGroup;
    mandelbrotView: MandelbrotViewGroup;
    juliaView: JuliaViewGroup;
    selection: SelectionGroup;
    interaction: InteractionGroup;
    layout: LayoutGroup;
  }>;
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) {
    throw new Error(message);
  }
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function isHexColorString(value: unknown): value is string {
  return typeof value === "string" && /^#[0-9a-fA-F]{6}$/.test(value);
}

function rgbColorToHex(color: RgbColor): string {
  const channel = (value: number) => value.toString(16).padStart(2, "0");
  return `#${channel(color.red)}${channel(color.green)}${channel(color.blue)}`;
}

function hexToRgbColor(value: string): RgbColor {
  return {
    red: Number.parseInt(value.slice(1, 3), 16),
    green: Number.parseInt(value.slice(3, 5), 16),
    blue: Number.parseInt(value.slice(5, 7), 16),
  };
}

function normalizeComplexParameter(value: unknown, fieldName: string): ComplexParameter {
  assert(isObject(value), `${fieldName} must be an object.`);
  assert(isFiniteNumber(value.real), `${fieldName}.real must be a finite number.`);
  assert(isFiniteNumber(value.imaginary), `${fieldName}.imaginary must be a finite number.`);
  return {
    real: value.real,
    imaginary: value.imaginary,
  };
}

function normalizeComplexBounds(value: unknown, fieldName: string): ComplexBounds {
  assert(isObject(value), `${fieldName} must be an object.`);
  assert(isFiniteNumber(value.minReal), `${fieldName}.minReal must be a finite number.`);
  assert(isFiniteNumber(value.maxReal), `${fieldName}.maxReal must be a finite number.`);
  assert(isFiniteNumber(value.minImaginary), `${fieldName}.minImaginary must be a finite number.`);
  assert(isFiniteNumber(value.maxImaginary), `${fieldName}.maxImaginary must be a finite number.`);
  assert(value.minReal < value.maxReal, `${fieldName}.minReal must be less than ${fieldName}.maxReal.`);
  assert(
    value.minImaginary < value.maxImaginary,
    `${fieldName}.minImaginary must be less than ${fieldName}.maxImaginary.`,
  );
  return {
    minReal: value.minReal,
    maxReal: value.maxReal,
    minImaginary: value.minImaginary,
    maxImaginary: value.maxImaginary,
  };
}

function normalizeJuliaViewport(value: unknown, fieldName: string): JuliaViewport {
  return normalizeComplexBounds(value, fieldName);
}

function isFractalPaletteId(value: unknown): value is FractalPaletteId {
  return typeof value === "string" && getFractalPalettes().some((palette) => palette.id === value);
}

function isPaletteMappingMode(value: unknown): value is PaletteMappingMode {
  return typeof value === "string" && PALETTE_MAPPING_OPTIONS.some((option) => option.id === value);
}

function createDefaultEscapeBandColors(): RgbColor[] {
  const defaultColors: RgbColor[] = [
    { red: 168, green: 85, blue: 247 },
    { red: 46, green: 220, blue: 200 },
    { red: 0, green: 0, blue: 0 },
  ];

  while (defaultColors.length < MAX_ESCAPE_BAND_ENTRIES) {
    defaultColors.push({ red: 0, green: 0, blue: 0 });
  }

  return defaultColors;
}

function createDefaultEscapeBandThresholds(): number[] {
  const thresholds = [10, 5000];
  while (thresholds.length < MAX_ESCAPE_BAND_ENTRIES - 1) {
    thresholds.push(thresholds[thresholds.length - 1]! + 5000);
  }
  return thresholds;
}

export function createDefaultExplorerWorkspaceSettingsState(): ExplorerWorkspaceSettingsState {
  return {
    requestedRenderer: "webgl",
    requestedArbitraryPrecisionLimbCount: DEFAULT_ARBITRARY_PRECISION_LIMB_COUNT,
    palette: DEFAULT_FRACTAL_PALETTE_ID,
    paletteMappingMode: DEFAULT_PALETTE_MAPPING_MODE,
    paletteCycles: DEFAULT_PALETTE_CYCLES,
    binaryInteriorColor: { red: 10, green: 8, blue: 18 },
    binaryExteriorColor: { red: 245, green: 240, blue: 225 },
    escapeBandEntryCount: 3,
    escapeBandColors: createDefaultEscapeBandColors(),
    escapeBandThresholds: createDefaultEscapeBandThresholds(),
    mandelbrotIterations: 64,
    mandelbrotViewport: DEFAULT_MANDELBROT_VIEWPORT,
    showOrbit: false,
    orbitSteps: 100,
    showAttractingPeriod: false,
    periodDetectionSteps: 10000,
    maxDetectedPeriod: 3000,
    juliaIterations: 64,
    juliaViewport: JULIA_VIEWPORT,
    selectedParameter: {
      real: -0.74543,
      imaginary: 0.11301,
    },
    isLivePreviewEnabled: true,
    useTwoQualityLevels: true,
    interactiveQualityScale: 0.2,
    qualitySettleDelayMs: 300,
    showAxes: false,
    markerScale: 1.5,
    isZenView: false,
    zenSplitRatio: 0.5,
  };
}

export function createExplorerSettingsDocument(
  state: ExplorerWorkspaceSettingsState,
  selectedGroups: Set<ExplorerSettingsGroupId>,
): ExplorerSettingsDocument {
  const groups: ExplorerSettingsDocument["groups"] = {};

  if (selectedGroups.has("renderer")) {
    groups.renderer = {
      selected: state.requestedRenderer,
      webglArbitraryPrecision: {
        precisionLimbs: state.requestedArbitraryPrecisionLimbCount,
      },
    };
  }

  if (selectedGroups.has("palette")) {
    groups.palette = {
      paletteId: state.palette,
      mappingMode: state.paletteMappingMode,
      cycles: state.paletteCycles,
      binary: {
        insideColor: rgbColorToHex(state.binaryInteriorColor),
        outsideColor: rgbColorToHex(state.binaryExteriorColor),
      },
      escapeBands: {
        entryCount: state.escapeBandEntryCount,
        colors: state.escapeBandColors.slice(0, state.escapeBandEntryCount).map(rgbColorToHex),
        thresholds: state.escapeBandThresholds.slice(0, Math.max(0, state.escapeBandEntryCount - 1)),
      },
    };
  }

  if (selectedGroups.has("mandelbrotView")) {
    groups.mandelbrotView = {
      iterations: state.mandelbrotIterations,
      viewport: state.mandelbrotViewport,
      showOrbit: state.showOrbit,
      orbitSteps: state.orbitSteps,
      periodDetection: {
        enabled: state.showAttractingPeriod,
        steps: state.periodDetectionSteps,
        maxDetectedPeriod: state.maxDetectedPeriod,
      },
    };
  }

  if (selectedGroups.has("juliaView")) {
    groups.juliaView = {
      iterations: state.juliaIterations,
      viewport: state.juliaViewport,
    };
  }

  if (selectedGroups.has("selection")) {
    groups.selection = {
      parameter: state.selectedParameter,
    };
  }

  if (selectedGroups.has("interaction")) {
    groups.interaction = {
      livePreview: state.isLivePreviewEnabled,
      twoQualityLevels: {
        enabled: state.useTwoQualityLevels,
        coarsePassQualityScale: state.interactiveQualityScale,
        settleDelayMs: state.qualitySettleDelayMs,
      },
      showAxes: state.showAxes,
      markerScale: state.markerScale,
    };
  }

  if (selectedGroups.has("layout")) {
    groups.layout = {
      zenMode: state.isZenView,
      zenSplitRatio: state.zenSplitRatio,
    };
  }

  return {
    format: "asimov-explorer-settings",
    version: 1,
    exportedAt: new Date().toISOString(),
    groups,
  };
}

export function parseExplorerSettingsDocument(text: string): ExplorerSettingsDocument {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error("Invalid JSON: failed to parse explorer settings document.");
  }

  assert(isObject(parsed), "Explorer settings document must be a JSON object.");
  assert(parsed.format === "asimov-explorer-settings", "Unsupported explorer settings format.");
  assert(parsed.version === 1, "Unsupported explorer settings version.");
  assert(isObject(parsed.groups), "Explorer settings document must contain an object-valued groups field.");

  const groups = parsed.groups;
  const normalized: ExplorerSettingsDocument["groups"] = {};

  if (groups.renderer !== undefined) {
    assert(isObject(groups.renderer), "groups.renderer must be an object.");
    assert(isExplorerRendererId(String(groups.renderer.selected)), "groups.renderer.selected is invalid.");
    const renderer: RendererGroup = {
      selected: groups.renderer.selected as ExplorerRendererId,
    };
    if (groups.renderer.webglArbitraryPrecision !== undefined) {
      assert(isObject(groups.renderer.webglArbitraryPrecision), "groups.renderer.webglArbitraryPrecision must be an object.");
      assert(
        isFiniteNumber(groups.renderer.webglArbitraryPrecision.precisionLimbs),
        "groups.renderer.webglArbitraryPrecision.precisionLimbs must be a finite number.",
      );
      renderer.webglArbitraryPrecision = {
        precisionLimbs: clamp(
          Math.round(groups.renderer.webglArbitraryPrecision.precisionLimbs),
          2,
          MAX_ARBITRARY_PRECISION_LIMB_COUNT,
        ),
      };
    }
    normalized.renderer = renderer;
  }

  if (groups.palette !== undefined) {
    assert(isObject(groups.palette), "groups.palette must be an object.");
    assert(isFractalPaletteId(groups.palette.paletteId), "groups.palette.paletteId is invalid.");
    assert(isPaletteMappingMode(groups.palette.mappingMode), "groups.palette.mappingMode is invalid.");
    assert(isFiniteNumber(groups.palette.cycles), "groups.palette.cycles must be a finite number.");
    assert(isObject(groups.palette.binary), "groups.palette.binary must be an object.");
    assert(isHexColorString(groups.palette.binary.insideColor), "groups.palette.binary.insideColor must be #RRGGBB.");
    assert(isHexColorString(groups.palette.binary.outsideColor), "groups.palette.binary.outsideColor must be #RRGGBB.");
    assert(isObject(groups.palette.escapeBands), "groups.palette.escapeBands must be an object.");
    assert(isFiniteNumber(groups.palette.escapeBands.entryCount), "groups.palette.escapeBands.entryCount must be a finite number.");
    assert(Array.isArray(groups.palette.escapeBands.colors), "groups.palette.escapeBands.colors must be an array.");
    assert(Array.isArray(groups.palette.escapeBands.thresholds), "groups.palette.escapeBands.thresholds must be an array.");
    const entryCount = clamp(Math.round(groups.palette.escapeBands.entryCount), 2, MAX_ESCAPE_BAND_ENTRIES);
    assert(
      groups.palette.escapeBands.colors.length >= entryCount,
      "groups.palette.escapeBands.colors must include at least entryCount entries.",
    );
    assert(
      groups.palette.escapeBands.thresholds.length >= entryCount - 1,
      "groups.palette.escapeBands.thresholds must include at least entryCount - 1 entries.",
    );
    const colors = groups.palette.escapeBands.colors.slice(0, entryCount) as unknown[];
    const normalizedColors: string[] = [];
    for (const color of colors) {
      assert(isHexColorString(color), "groups.palette.escapeBands.colors must contain only #RRGGBB strings.");
      normalizedColors.push(color);
    }
    const thresholds = groups.palette.escapeBands.thresholds.slice(
      0,
      Math.max(0, entryCount - 1),
    ) as unknown[];
    const normalizedThresholds: number[] = [];
    for (let index = 0; index < thresholds.length; index += 1) {
      const threshold = thresholds[index];
      assert(isFiniteNumber(threshold), "groups.palette.escapeBands.thresholds must contain only finite numbers.");
      if (index > 0) {
        assert(threshold > normalizedThresholds[index - 1]!, "groups.palette.escapeBands.thresholds must be strictly increasing.");
      }
      normalizedThresholds.push(Math.max(1, Math.round(threshold)));
    }
    normalized.palette = {
      paletteId: groups.palette.paletteId,
      mappingMode: groups.palette.mappingMode,
      cycles: Math.max(1, Math.round(groups.palette.cycles)),
      binary: {
        insideColor: groups.palette.binary.insideColor,
        outsideColor: groups.palette.binary.outsideColor,
      },
      escapeBands: {
        entryCount,
        colors: normalizedColors,
        thresholds: normalizedThresholds,
      },
    };
  }

  if (groups.mandelbrotView !== undefined) {
    assert(isObject(groups.mandelbrotView), "groups.mandelbrotView must be an object.");
    assert(isFiniteNumber(groups.mandelbrotView.iterations), "groups.mandelbrotView.iterations must be a finite number.");
    assert(typeof groups.mandelbrotView.showOrbit === "boolean", "groups.mandelbrotView.showOrbit must be a boolean.");
    assert(isFiniteNumber(groups.mandelbrotView.orbitSteps), "groups.mandelbrotView.orbitSteps must be a finite number.");
    assert(isObject(groups.mandelbrotView.periodDetection), "groups.mandelbrotView.periodDetection must be an object.");
    assert(typeof groups.mandelbrotView.periodDetection.enabled === "boolean", "groups.mandelbrotView.periodDetection.enabled must be a boolean.");
    assert(isFiniteNumber(groups.mandelbrotView.periodDetection.steps), "groups.mandelbrotView.periodDetection.steps must be a finite number.");
    assert(isFiniteNumber(groups.mandelbrotView.periodDetection.maxDetectedPeriod), "groups.mandelbrotView.periodDetection.maxDetectedPeriod must be a finite number.");
    normalized.mandelbrotView = {
      iterations: Math.max(1, Math.round(groups.mandelbrotView.iterations)),
      viewport: normalizeComplexBounds(groups.mandelbrotView.viewport, "groups.mandelbrotView.viewport"),
      showOrbit: groups.mandelbrotView.showOrbit,
      orbitSteps: Math.max(1, Math.round(groups.mandelbrotView.orbitSteps)),
      periodDetection: {
        enabled: groups.mandelbrotView.periodDetection.enabled,
        steps: Math.max(1, Math.round(groups.mandelbrotView.periodDetection.steps)),
        maxDetectedPeriod: Math.max(1, Math.round(groups.mandelbrotView.periodDetection.maxDetectedPeriod)),
      },
    };
  }

  if (groups.juliaView !== undefined) {
    assert(isObject(groups.juliaView), "groups.juliaView must be an object.");
    assert(isFiniteNumber(groups.juliaView.iterations), "groups.juliaView.iterations must be a finite number.");
    normalized.juliaView = {
      iterations: Math.max(1, Math.round(groups.juliaView.iterations)),
      viewport: normalizeJuliaViewport(groups.juliaView.viewport, "groups.juliaView.viewport"),
    };
  }

  if (groups.selection !== undefined) {
    normalized.selection = {
      parameter: normalizeComplexParameter(groups.selection && (groups.selection as Record<string, unknown>).parameter, "groups.selection.parameter"),
    };
  }

  if (groups.interaction !== undefined) {
    assert(isObject(groups.interaction), "groups.interaction must be an object.");
    assert(typeof groups.interaction.livePreview === "boolean", "groups.interaction.livePreview must be a boolean.");
    assert(typeof groups.interaction.showAxes === "boolean", "groups.interaction.showAxes must be a boolean.");
    assert(isFiniteNumber(groups.interaction.markerScale), "groups.interaction.markerScale must be a finite number.");
    assert(isObject(groups.interaction.twoQualityLevels), "groups.interaction.twoQualityLevels must be an object.");
    assert(typeof groups.interaction.twoQualityLevels.enabled === "boolean", "groups.interaction.twoQualityLevels.enabled must be a boolean.");
    assert(
      isFiniteNumber(groups.interaction.twoQualityLevels.coarsePassQualityScale),
      "groups.interaction.twoQualityLevels.coarsePassQualityScale must be a finite number.",
    );
    assert(
      isFiniteNumber(groups.interaction.twoQualityLevels.settleDelayMs),
      "groups.interaction.twoQualityLevels.settleDelayMs must be a finite number.",
    );
    normalized.interaction = {
      livePreview: groups.interaction.livePreview,
      twoQualityLevels: {
        enabled: groups.interaction.twoQualityLevels.enabled,
        coarsePassQualityScale: groups.interaction.twoQualityLevels.coarsePassQualityScale,
        settleDelayMs: Math.round(groups.interaction.twoQualityLevels.settleDelayMs),
      },
      showAxes: groups.interaction.showAxes,
      markerScale: groups.interaction.markerScale,
    };
  }

  if (groups.layout !== undefined) {
    assert(isObject(groups.layout), "groups.layout must be an object.");
    assert(typeof groups.layout.zenMode === "boolean", "groups.layout.zenMode must be a boolean.");
    assert(isFiniteNumber(groups.layout.zenSplitRatio), "groups.layout.zenSplitRatio must be a finite number.");
    normalized.layout = {
      zenMode: groups.layout.zenMode,
      zenSplitRatio: groups.layout.zenSplitRatio,
    };
  }

  return {
    format: "asimov-explorer-settings",
    version: 1,
    exportedAt: typeof parsed.exportedAt === "string" ? parsed.exportedAt : new Date().toISOString(),
    groups: normalized,
  };
}

export function getExplorerSettingsDocumentGroupIds(
  document: ExplorerSettingsDocument,
): ExplorerSettingsGroupId[] {
  return EXPLORER_SETTINGS_GROUPS.map((group) => group.id).filter((groupId) => document.groups[groupId] !== undefined);
}

export function mergeExplorerWorkspaceSettingsState(
  current: ExplorerWorkspaceSettingsState,
  document: ExplorerSettingsDocument,
  selectedGroups: Set<ExplorerSettingsGroupId>,
): ExplorerWorkspaceSettingsState {
  const next = { ...current };

  if (selectedGroups.has("renderer") && document.groups.renderer) {
    next.requestedRenderer = document.groups.renderer.selected;
    next.requestedArbitraryPrecisionLimbCount =
      document.groups.renderer.webglArbitraryPrecision?.precisionLimbs ??
      next.requestedArbitraryPrecisionLimbCount;
  }

  if (selectedGroups.has("palette") && document.groups.palette) {
    next.palette = document.groups.palette.paletteId;
    next.paletteMappingMode = document.groups.palette.mappingMode;
    next.paletteCycles = document.groups.palette.cycles;
    next.binaryInteriorColor = hexToRgbColor(document.groups.palette.binary.insideColor);
    next.binaryExteriorColor = hexToRgbColor(document.groups.palette.binary.outsideColor);
    next.escapeBandEntryCount = document.groups.palette.escapeBands.entryCount;
    const colors = createDefaultEscapeBandColors();
    document.groups.palette.escapeBands.colors.forEach((color, index) => {
      colors[index] = hexToRgbColor(color);
    });
    next.escapeBandColors = colors;
    const thresholds = createDefaultEscapeBandThresholds();
    document.groups.palette.escapeBands.thresholds.forEach((threshold, index) => {
      thresholds[index] = threshold;
    });
    next.escapeBandThresholds = thresholds;
  }

  if (selectedGroups.has("mandelbrotView") && document.groups.mandelbrotView) {
    next.mandelbrotIterations = document.groups.mandelbrotView.iterations;
    next.mandelbrotViewport = document.groups.mandelbrotView.viewport;
    next.showOrbit = document.groups.mandelbrotView.showOrbit;
    next.orbitSteps = document.groups.mandelbrotView.orbitSteps;
    next.showAttractingPeriod = document.groups.mandelbrotView.periodDetection.enabled;
    next.periodDetectionSteps = document.groups.mandelbrotView.periodDetection.steps;
    next.maxDetectedPeriod = document.groups.mandelbrotView.periodDetection.maxDetectedPeriod;
  }

  if (selectedGroups.has("juliaView") && document.groups.juliaView) {
    next.juliaIterations = document.groups.juliaView.iterations;
    next.juliaViewport = document.groups.juliaView.viewport;
  }

  if (selectedGroups.has("selection") && document.groups.selection) {
    next.selectedParameter = document.groups.selection.parameter;
  }

  if (selectedGroups.has("interaction") && document.groups.interaction) {
    next.isLivePreviewEnabled = document.groups.interaction.livePreview;
    next.useTwoQualityLevels = document.groups.interaction.twoQualityLevels.enabled;
    next.interactiveQualityScale = clamp(document.groups.interaction.twoQualityLevels.coarsePassQualityScale, 0.05, 0.5);
    next.qualitySettleDelayMs = clamp(document.groups.interaction.twoQualityLevels.settleDelayMs, 100, 5000);
    next.showAxes = document.groups.interaction.showAxes;
    next.markerScale = document.groups.interaction.markerScale;
  }

  if (selectedGroups.has("layout") && document.groups.layout) {
    next.isZenView = document.groups.layout.zenMode;
    next.zenSplitRatio = clamp(document.groups.layout.zenSplitRatio, 0.2, 0.8);
  }

  next.requestedArbitraryPrecisionLimbCount = clamp(
    Math.round(next.requestedArbitraryPrecisionLimbCount),
    2,
    MAX_ARBITRARY_PRECISION_LIMB_COUNT,
  );
  next.markerScale = clamp(next.markerScale, 0.5, 5);
  next.escapeBandEntryCount = clamp(Math.round(next.escapeBandEntryCount), 2, MAX_ESCAPE_BAND_ENTRIES);
  next.paletteCycles = Math.max(1, Math.round(next.paletteCycles));
  next.mandelbrotIterations = Math.max(1, Math.round(next.mandelbrotIterations));
  next.juliaIterations = Math.max(1, Math.round(next.juliaIterations));
  next.orbitSteps = Math.max(1, Math.round(next.orbitSteps));
  next.periodDetectionSteps = Math.max(1, Math.round(next.periodDetectionSteps));
  next.maxDetectedPeriod = Math.max(1, Math.round(next.maxDetectedPeriod));

  return next;
}
