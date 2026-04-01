import { JULIA_BAILOUT_RADIUS } from "./constants.js";
import type { ComplexParameter } from "../types/settings.js";

const LOG_2 = Math.log(2);

function clampToUnitInterval(value: number): number {
  if (value <= 0) {
    return 0;
  }
  if (value >= 1) {
    return 1;
  }
  return value;
}

export function getSmoothEscapeValue(
  startReal: number,
  startImaginary: number,
  parameter: ComplexParameter,
  maxIterations: number,
): number {
  let real = startReal;
  let imaginary = startImaginary;

  for (let iteration = 0; iteration < maxIterations; iteration += 1) {
    const nextReal = real * real - imaginary * imaginary + parameter.real;
    const nextImaginary = 2 * real * imaginary + parameter.imaginary;

    real = nextReal;
    imaginary = nextImaginary;

    const magnitudeSquared = real * real + imaginary * imaginary;
    if (magnitudeSquared > JULIA_BAILOUT_RADIUS * JULIA_BAILOUT_RADIUS) {
      const magnitude = Math.sqrt(magnitudeSquared);
      const smoothIteration =
        iteration + 1 - Math.log(Math.log(Math.max(magnitude, JULIA_BAILOUT_RADIUS))) / LOG_2;

      return clampToUnitInterval(smoothIteration / maxIterations);
    }
  }

  return 1;
}
