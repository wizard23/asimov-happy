import type { ComplexBounds, ComplexParameter, JuliaViewport } from "@asimov/minimal-shared";
import type { FractalPaletteId, PaletteMappingMode, RgbColor } from "./fractal-palette.js";

export type ExplorerRendererId = "cpu" | "webgl" | "webgl-arbitrary-precision" | "webgpu";
export const MAX_ESCAPE_BAND_ENTRIES = 12;
export const MAX_ARBITRARY_PRECISION_LIMB_COUNT = 16;

export interface EscapeBandConfiguration {
  entryCount: number;
  colors: RgbColor[];
  thresholds: number[];
}

export const EXPLORER_RENDERER_OPTIONS: Array<{
  id: ExplorerRendererId;
  label: string;
}> = [
  { id: "cpu", label: "CPU Rendering" },
  { id: "webgl", label: "WebGL Rendering" },
  { id: "webgl-arbitrary-precision", label: "Arbitrary Precision WebGL Rendering" },
  { id: "webgpu", label: "WebGPU Rendering" },
];

export interface ExplorerRendererSelection {
  requested: ExplorerRendererId;
  active: ExplorerRendererId;
  fallbackReason: string | null;
}

export interface MandelbrotRenderParams {
  viewport: ComplexBounds;
  width: number;
  height: number;
  iterations: number;
  palette: FractalPaletteId;
  paletteMappingMode: PaletteMappingMode;
  paletteCycles: number;
  binaryInteriorColor?: RgbColor;
  binaryExteriorColor?: RgbColor;
  escapeBands?: EscapeBandConfiguration;
  precisionLimbCount?: number;
}

export interface JuliaRenderParams {
  parameter: ComplexParameter;
  viewport: JuliaViewport;
  width: number;
  height: number;
  iterations: number;
  palette: FractalPaletteId;
  paletteMappingMode: PaletteMappingMode;
  paletteCycles: number;
  binaryInteriorColor?: RgbColor;
  binaryExteriorColor?: RgbColor;
  escapeBands?: EscapeBandConfiguration;
  precisionLimbCount?: number;
}

export interface ExplorerImageRenderer {
  id: ExplorerRendererId;
  renderMandelbrot(canvas: HTMLCanvasElement, params: MandelbrotRenderParams): void;
  renderJulia(canvas: HTMLCanvasElement, params: JuliaRenderParams): void;
}

export function isExplorerRendererId(value: string): value is ExplorerRendererId {
  return EXPLORER_RENDERER_OPTIONS.some((option) => option.id === value);
}

export function getExplorerRendererLabel(rendererId: ExplorerRendererId): string {
  return EXPLORER_RENDERER_OPTIONS.find((option) => option.id === rendererId)?.label ?? rendererId;
}

export function detectAvailableExplorerRenderers(): ExplorerRendererId[] {
  const availableRenderers: ExplorerRendererId[] = ["cpu"];

  if (typeof document !== "undefined") {
    const canvas = document.createElement("canvas");
    const webglContext =
      canvas.getContext("webgl", { preserveDrawingBuffer: true }) ??
      canvas.getContext("experimental-webgl", { preserveDrawingBuffer: true });
    if (webglContext) {
      availableRenderers.push("webgl");
      if (canvas.getContext("webgl2")) {
        availableRenderers.push("webgl-arbitrary-precision");
      }
    }
  }

  return availableRenderers;
}

export function resolveExplorerRendererSelection(
  requested: ExplorerRendererId,
  availableRenderers: ExplorerRendererId[],
): ExplorerRendererSelection {
  if (availableRenderers.includes(requested)) {
    return {
      requested,
      active: requested,
      fallbackReason: null,
    };
  }

  const active = availableRenderers[0] ?? "cpu";
  return {
    requested,
    active,
    fallbackReason: `${requested} renderer not yet available.`,
  };
}
