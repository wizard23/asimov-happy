import { renderJuliaFeatureVector } from "@asimov/minimal-shared";
import { clampByte, getMappedPaletteColor } from "./fractal-palette.js";
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
  paletteMappingMode,
  paletteCycles,
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
        const color = getMappedPaletteColor(palette, 0, {
          isInterior: true,
          mappingMode: paletteMappingMode,
          cycles: paletteCycles,
        });
        imageData.data[pixelIndex] = color.red;
        imageData.data[pixelIndex + 1] = color.green;
        imageData.data[pixelIndex + 2] = color.blue;
        imageData.data[pixelIndex + 3] = 255;
        continue;
      }

      const magnitudeSquared = real * real + imaginary * imaginary;
      const smoothedIteration = iteration + 1 - Math.log2(Math.log2(Math.max(magnitudeSquared, 4)));
      const normalized = Math.max(0, Math.min(1, smoothedIteration / iterations));
      const color = getMappedPaletteColor(palette, normalized, {
        mappingMode: paletteMappingMode,
        cycles: paletteCycles,
      });
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
  paletteMappingMode,
  paletteCycles,
}: JuliaRenderParams): ImageData {
  const featureVector = renderJuliaFeatureVector(parameter, width, height, iterations, viewport);
  const imageData = new ImageData(width, height);

  for (let index = 0; index < featureVector.length; index += 1) {
    const pixelIndex = index * 4;
    const value = featureVector[index] ?? 0;
    const color = getMappedPaletteColor(palette, value, {
      isInterior: value >= 1,
      mappingMode: paletteMappingMode,
      cycles: paletteCycles,
    });
    imageData.data[pixelIndex] = color.red;
    imageData.data[pixelIndex + 1] = color.green;
    imageData.data[pixelIndex + 2] = color.blue;
    imageData.data[pixelIndex + 3] = 255;
  }

  return imageData;
}

export const CPU_EXPLORER_IMAGE_RENDERER: ExplorerImageRenderer = {
  id: "cpu",
  renderMandelbrot(canvas, params) {
    const context = canvas.getContext("2d");
    if (!context) {
      throw new Error("2D canvas context unavailable for CPU Mandelbrot rendering.");
    }
    context.putImageData(renderMandelbrotImage(params), 0, 0);
  },
  renderJulia(canvas, params) {
    const context = canvas.getContext("2d");
    if (!context) {
      throw new Error("2D canvas context unavailable for CPU Julia rendering.");
    }
    context.putImageData(renderJuliaImage(params), 0, 0);
  },
};
