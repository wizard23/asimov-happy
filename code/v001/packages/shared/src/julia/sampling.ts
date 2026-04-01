import { JULIA_PARAMETER_BOUNDS } from "./constants.js";
import { XorShift128 } from "../rng/xorshift128.js";
import type { ComplexBounds, ComplexParameter } from "../types/settings.js";

function interpolate(min: number, max: number, t: number): number {
  return min + (max - min) * t;
}

export function sampleJuliaParameter(
  rng: XorShift128,
  bounds: ComplexBounds = JULIA_PARAMETER_BOUNDS,
): ComplexParameter {
  return {
    real: interpolate(bounds.minReal, bounds.maxReal, rng.nextFloat()),
    imaginary: interpolate(bounds.minImaginary, bounds.maxImaginary, rng.nextFloat()),
  };
}

export function generateJuliaParameters(
  seed: string,
  count: number,
  bounds: ComplexBounds = JULIA_PARAMETER_BOUNDS,
): ComplexParameter[] {
  const rng = new XorShift128(seed);
  const parameters: ComplexParameter[] = [];

  for (let index = 0; index < count; index += 1) {
    parameters.push(sampleJuliaParameter(rng, bounds));
  }

  return parameters;
}
