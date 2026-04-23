import type { ComplexParameter } from "@asimov/minimal-shared";

const MANDELBROT_ESCAPE_RADIUS_SQUARED = 4;
const MIN_TRANSIENT_DISCARD = 32;
const TRANSIENT_DISCARD_RATIO = 0.5;
const MAX_TAIL_COMPARISONS = 128;
const TAIL_COMPARISON_RATIO = 0.4;
const MIN_PASS_RATIO = 0.9;
const ABSOLUTE_TOLERANCE_FLOOR = 1e-12;
const RELATIVE_TOLERANCE_FACTOR = 1e-8;

interface OrbitPoint {
  real: number;
  imaginary: number;
}

export type OrbitPeriodDetectionResult =
  | { status: "detected"; period: number }
  | { status: "no-attracting-cycle" }
  | { status: "undetermined" };

function getMagnitude(point: OrbitPoint): number {
  return Math.hypot(point.real, point.imaginary);
}

function getOrbitDistance(left: OrbitPoint, right: OrbitPoint): number {
  return Math.hypot(left.real - right.real, left.imaginary - right.imaginary);
}

export function detectMandelbrotAttractingCyclePeriod(
  parameter: ComplexParameter,
  steps: number,
  maxDetectedPeriod: number,
): OrbitPeriodDetectionResult {
  const safeSteps = Math.max(1, Math.floor(steps));
  const safeMaxPeriod = Math.max(1, Math.floor(maxDetectedPeriod));
  const orbit: OrbitPoint[] = [];
  let currentReal = 0;
  let currentImaginary = 0;

  for (let step = 0; step < safeSteps; step += 1) {
    const nextReal = currentReal * currentReal - currentImaginary * currentImaginary + parameter.real;
    const nextImaginary = 2 * currentReal * currentImaginary + parameter.imaginary;
    currentReal = nextReal;
    currentImaginary = nextImaginary;

    if (currentReal * currentReal + currentImaginary * currentImaginary > MANDELBROT_ESCAPE_RADIUS_SQUARED) {
      return { status: "no-attracting-cycle" };
    }

    orbit.push({
      real: currentReal,
      imaginary: currentImaginary,
    });
  }

  const transientDiscard = Math.min(
    Math.max(MIN_TRANSIENT_DISCARD, Math.floor(safeSteps * TRANSIENT_DISCARD_RATIO)),
    Math.max(0, orbit.length - 1),
  );

  for (let candidatePeriod = 1; candidatePeriod <= safeMaxPeriod; candidatePeriod += 1) {
    const tailComparisons = Math.min(
      MAX_TAIL_COMPARISONS,
      Math.floor(safeSteps * TAIL_COMPARISON_RATIO),
      orbit.length - transientDiscard - candidatePeriod,
    );
    if (tailComparisons <= 0) {
      continue;
    }

    const startIndex = orbit.length - tailComparisons;
    let passingComparisons = 0;

    for (let index = startIndex; index < orbit.length; index += 1) {
      const current = orbit[index]!;
      const previous = orbit[index - candidatePeriod]!;
      const epsilon = Math.max(
        ABSOLUTE_TOLERANCE_FLOOR,
        RELATIVE_TOLERANCE_FACTOR * Math.max(1, getMagnitude(current), getMagnitude(previous)),
      );

      if (getOrbitDistance(current, previous) < epsilon) {
        passingComparisons += 1;
      }
    }

    if (passingComparisons / tailComparisons >= MIN_PASS_RATIO) {
      return {
        status: "detected",
        period: candidatePeriod,
      };
    }
  }

  return { status: "undetermined" };
}
