import { JULIA_VIEWPORT } from "./constants.js";
import { getSmoothEscapeValue } from "./escape-time.js";
import type { ComplexParameter, JuliaViewport, TrainingSettings } from "../types/settings.js";

function interpolate(min: number, max: number, t: number): number {
  return min + (max - min) * t;
}

export function getPixelCenterComplexCoordinate(
  x: number,
  y: number,
  width: number,
  height: number,
  viewport: JuliaViewport = JULIA_VIEWPORT,
): ComplexParameter {
  const normalizedX = (x + 0.5) / width;
  const normalizedY = (y + 0.5) / height;

  return {
    real: interpolate(viewport.minReal, viewport.maxReal, normalizedX),
    imaginary: interpolate(viewport.maxImaginary, viewport.minImaginary, normalizedY),
  };
}

export function renderJuliaFeatureVector(
  parameter: ComplexParameter,
  width: number,
  height: number,
  maxIterations: number,
  viewport: JuliaViewport = JULIA_VIEWPORT,
): Float32Array {
  const featureVector = new Float32Array(width * height);

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const coordinate = getPixelCenterComplexCoordinate(x, y, width, height, viewport);
      const featureIndex = y * width + x;
      featureVector[featureIndex] = getSmoothEscapeValue(
        coordinate.real,
        coordinate.imaginary,
        parameter,
        maxIterations,
      );
    }
  }

  return featureVector;
}

export function renderJuliaFeatureVectorForTraining(
  parameter: ComplexParameter,
  settings: TrainingSettings,
): Float32Array {
  return renderJuliaFeatureVector(
    parameter,
    settings.featureWidth,
    settings.featureHeight,
    settings.trainingJuliaIterations,
  );
}
