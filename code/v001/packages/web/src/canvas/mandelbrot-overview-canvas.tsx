import { useEffect, useMemo, useRef } from "preact/hooks";
import type { ComplexParameter } from "@asimov/minimal-shared";
import crosshairUrl from "../assets/noun-crosshair-59595.svg";

const MANDELBROT_WIDTH = 360;
const MANDELBROT_HEIGHT = 240;
const MANDELBROT_MAX_ITERATIONS = 96;
const MANDELBROT_VIEWPORT = {
  minReal: -2.2,
  maxReal: 1.0,
  minImaginary: -1.4,
  maxImaginary: 1.4,
};

function clampByte(value: number): number {
  return Math.max(0, Math.min(255, Math.round(value)));
}

function mapToPixelPosition(parameter: ComplexParameter): { left: number; top: number } {
  const normalizedX =
    (parameter.real - MANDELBROT_VIEWPORT.minReal) /
    (MANDELBROT_VIEWPORT.maxReal - MANDELBROT_VIEWPORT.minReal);
  const normalizedY =
    (MANDELBROT_VIEWPORT.maxImaginary - parameter.imaginary) /
    (MANDELBROT_VIEWPORT.maxImaginary - MANDELBROT_VIEWPORT.minImaginary);

  return {
    left: normalizedX * MANDELBROT_WIDTH,
    top: normalizedY * MANDELBROT_HEIGHT,
  };
}

function mapToRelativePosition(parameter: ComplexParameter): { left: string; top: string } {
  const pixelPosition = mapToPixelPosition(parameter);

  return {
    left: `${(pixelPosition.left / MANDELBROT_WIDTH) * 100}%`,
    top: `${(pixelPosition.top / MANDELBROT_HEIGHT) * 100}%`,
  };
}

function mapPointToParameter(
  x: number,
  y: number,
): ComplexParameter {
  const normalizedX = x / MANDELBROT_WIDTH;
  const normalizedY = y / MANDELBROT_HEIGHT;

  return {
    real:
      MANDELBROT_VIEWPORT.minReal +
      (MANDELBROT_VIEWPORT.maxReal - MANDELBROT_VIEWPORT.minReal) * normalizedX,
    imaginary:
      MANDELBROT_VIEWPORT.maxImaginary -
      (MANDELBROT_VIEWPORT.maxImaginary - MANDELBROT_VIEWPORT.minImaginary) * normalizedY,
  };
}

function renderMandelbrotSet(): ImageData {
  const imageData = new ImageData(MANDELBROT_WIDTH, MANDELBROT_HEIGHT);

  for (let y = 0; y < MANDELBROT_HEIGHT; y += 1) {
    for (let x = 0; x < MANDELBROT_WIDTH; x += 1) {
      const normalizedX = (x + 0.5) / MANDELBROT_WIDTH;
      const normalizedY = (y + 0.5) / MANDELBROT_HEIGHT;
      const cReal =
        MANDELBROT_VIEWPORT.minReal +
        (MANDELBROT_VIEWPORT.maxReal - MANDELBROT_VIEWPORT.minReal) * normalizedX;
      const cImaginary =
        MANDELBROT_VIEWPORT.maxImaginary -
        (MANDELBROT_VIEWPORT.maxImaginary - MANDELBROT_VIEWPORT.minImaginary) * normalizedY;

      let real = 0;
      let imaginary = 0;
      let escaped = false;
      let iteration = 0;

      for (; iteration < MANDELBROT_MAX_ITERATIONS; iteration += 1) {
        const nextReal = real * real - imaginary * imaginary + cReal;
        const nextImaginary = 2 * real * imaginary + cImaginary;
        real = nextReal;
        imaginary = nextImaginary;

        if (real * real + imaginary * imaginary > 4) {
          escaped = true;
          break;
        }
      }

      const pixelIndex = (y * MANDELBROT_WIDTH + x) * 4;
      if (!escaped) {
        imageData.data[pixelIndex] = 17;
        imageData.data[pixelIndex + 1] = 33;
        imageData.data[pixelIndex + 2] = 58;
        imageData.data[pixelIndex + 3] = 255;
        continue;
      }

      const tone = clampByte((iteration / MANDELBROT_MAX_ITERATIONS) * 255);
      imageData.data[pixelIndex] = clampByte(tone * 0.72);
      imageData.data[pixelIndex + 1] = clampByte(tone * 0.84);
      imageData.data[pixelIndex + 2] = tone;
      imageData.data[pixelIndex + 3] = 255;
    }
  }

  return imageData;
}

export function MandelbrotOverviewCanvas(props: {
  parameter: ComplexParameter | null;
  onHoverParameter: (parameter: ComplexParameter | null) => void;
}): preact.JSX.Element {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const crosshairPosition = useMemo(
    () => (props.parameter ? mapToRelativePosition(props.parameter) : null),
    [props.parameter],
  );

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) {
      return;
    }

    const context = canvas.getContext("2d");
    if (!context) {
      return;
    }

    context.putImageData(renderMandelbrotSet(), 0, 0);
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) {
      return;
    }
    const activeCanvas = canvas;

    function handleMove(event: MouseEvent): void {
      const rect = activeCanvas.getBoundingClientRect();
      const x = ((event.clientX - rect.left) / rect.width) * activeCanvas.width;
      const y = ((event.clientY - rect.top) / rect.height) * activeCanvas.height;
      props.onHoverParameter(mapPointToParameter(x, y));
    }

    function handleLeave(): void {
      props.onHoverParameter(null);
    }

    activeCanvas.addEventListener("mousemove", handleMove);
    activeCanvas.addEventListener("mouseleave", handleLeave);

    return () => {
      activeCanvas.removeEventListener("mousemove", handleMove);
      activeCanvas.removeEventListener("mouseleave", handleLeave);
    };
  }, [props]);

  return (
    <div className="canvas-frame canvas-frame--mandelbrot">
      <canvas
        ref={canvasRef}
        className="canvas canvas--mandelbrot"
        width={MANDELBROT_WIDTH}
        height={MANDELBROT_HEIGHT}
      />
      {crosshairPosition ? (
        <img
          className="mandelbrot-crosshair"
          src={crosshairUrl}
          alt="Selected Julia parameter on the Mandelbrot set"
          style={{
            left: crosshairPosition.left,
            top: crosshairPosition.top,
          }}
        />
      ) : null}
    </div>
  );
}
