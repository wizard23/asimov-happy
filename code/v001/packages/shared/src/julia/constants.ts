import type { ComplexBounds, JuliaViewport } from "../types/settings.js";

export const JULIA_PARAMETER_BOUNDS: ComplexBounds = {
  minReal: -1.8,
  maxReal: 1.8,
  minImaginary: -1.8,
  maxImaginary: 1.8,
};

export const JULIA_VIEWPORT: JuliaViewport = {
  minReal: -1.5,
  maxReal: 1.5,
  minImaginary: -1.5,
  maxImaginary: 1.5,
};

export const JULIA_BAILOUT_RADIUS = 2;
