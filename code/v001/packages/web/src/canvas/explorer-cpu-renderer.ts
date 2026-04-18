import { renderJuliaFeatureVector } from "@asimov/minimal-shared";
import { clampByte, getPaletteColor } from "./fractal-palette.js";
import type {
  ExplorerImageRenderer,
  JuliaRenderParams,
  MandelbrotRenderParams,
} from "./explorer-renderer.js";

function getViewportWidth(viewport: MandelbrotRenderParams["viewport"]): number {
  return viewport.maxReal - viewport.minReal;
}

function getViewportHeight(viewport: MandelbrotRenderParams["viewport"]): number {
  return viewport.maxImaginary - viewport.minImaginary;
}

function renderMandelbrotImage({
  viewport,
  width,
  height,
  iterations,
  palette,
}: MandelbrotRenderParams): ImageData {
  const imageData = new ImageData(width, height);

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const normalizedX = (x + 0.5) / width;
      const normalizedY = (y + 0.5) / height;
      const cReal = viewport.minReal + getViewportWidth(viewport) * normalizedX;
      const cImaginary = viewport.maxImaginary - getViewportHeight(viewport) * normalizedY;

      let real = 0;
      let imaginary = 0;
      let escaped = false;
      let iteration = 0;

      for (; iteration < iterations; iteration += 1) {
        const nextReal = real * real - imaginary * imaginary + cReal;
        const nextImaginary = 2 * real * imaginary + cImaginary;
        real = nextReal;
        imaginary = nextImaginary;

        if (real * real + imaginary * imaginary > 4) {
          escaped = true;
          break;
        }
      }

      const pixelIndex = (y * width + x) * 4;
      if (!escaped) {
        const color = getPaletteColor(palette, 0, { isInterior: true });
        imageData.data[pixelIndex] = color.red;
        imageData.data[pixelIndex + 1] = color.green;
        imageData.data[pixelIndex + 2] = color.blue;
        imageData.data[pixelIndex + 3] = 255;
        continue;
      }

      const magnitudeSquared = real * real + imaginary * imaginary;
      const smoothedIteration = iteration + 1 - Math.log2(Math.log2(Math.max(magnitudeSquared, 4)));
      const normalized = Math.max(0, Math.min(1, smoothedIteration / iterations));
      const color = getPaletteColor(palette, normalized);
      imageData.data[pixelIndex] = clampByte(color.red);
      imageData.data[pixelIndex + 1] = clampByte(color.green);
      imageData.data[pixelIndex + 2] = clampByte(color.blue);
      imageData.data[pixelIndex + 3] = 255;
    }
  }

  return imageData;
}

function renderJuliaImage({
  parameter,
  viewport,
  width,
  height,
  iterations,
  palette,
}: JuliaRenderParams): ImageData {
  const featureVector = renderJuliaFeatureVector(parameter, width, height, iterations, viewport);
  const imageData = new ImageData(width, height);

  for (let index = 0; index < featureVector.length; index += 1) {
    const pixelIndex = index * 4;
    const value = featureVector[index] ?? 0;
    const color = getPaletteColor(palette, value);
    imageData.data[pixelIndex] = color.red;
    imageData.data[pixelIndex + 1] = color.green;
    imageData.data[pixelIndex + 2] = color.blue;
    imageData.data[pixelIndex + 3] = 255;
  }

  return imageData;
}

export const CPU_EXPLORER_IMAGE_RENDERER: ExplorerImageRenderer = {
  id: "cpu",
  renderMandelbrot(params) {
    return renderMandelbrotImage(params);
  },
  renderJulia(params) {
    return renderJuliaImage(params);
  },
};
