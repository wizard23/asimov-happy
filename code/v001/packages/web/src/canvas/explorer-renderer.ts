import type { ComplexBounds, ComplexParameter, JuliaViewport } from "@asimov/minimal-shared";
import type { FractalPaletteId } from "./fractal-palette.js";

export type ExplorerRendererId = "cpu" | "webgl" | "webgpu";

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
}

export interface JuliaRenderParams {
  parameter: ComplexParameter;
  viewport: JuliaViewport;
  width: number;
  height: number;
  iterations: number;
  palette: FractalPaletteId;
}

export interface ExplorerImageRenderer {
  id: ExplorerRendererId;
  renderMandelbrot(params: MandelbrotRenderParams): ImageData;
  renderJulia(params: JuliaRenderParams): ImageData;
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
