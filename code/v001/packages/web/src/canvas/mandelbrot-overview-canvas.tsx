import { useEffect, useMemo, useRef, useState } from "preact/hooks";
import type { ComplexBounds, ComplexParameter } from "@asimov/minimal-shared";
import crosshairUrl from "../assets/noun-crosshair-59595.svg";

const MANDELBROT_WIDTH = 360;
const MANDELBROT_HEIGHT = 240;
const MANDELBROT_MAX_ITERATIONS = 96;
const DEFAULT_MANDELBROT_VIEWPORT: ComplexBounds = {
  minReal: -2.2,
  maxReal: 1.0,
  minImaginary: -1.4,
  maxImaginary: 1.4,
};
const MIN_VIEWPORT_SPAN = 0.02;
const ZOOM_IN_FACTOR = 0.85;
const ZOOM_OUT_FACTOR = 1 / ZOOM_IN_FACTOR;

interface DragState {
  pointerStartX: number;
  pointerStartY: number;
  viewportAtStart: ComplexBounds;
}

function clampByte(value: number): number {
  return Math.max(0, Math.min(255, Math.round(value)));
}

function getViewportWidth(viewport: ComplexBounds): number {
  return viewport.maxReal - viewport.minReal;
}

function getViewportHeight(viewport: ComplexBounds): number {
  return viewport.maxImaginary - viewport.minImaginary;
}

function formatComplex(parameter: ComplexParameter | null): string {
  if (!parameter) {
    return "n/a";
  }

  return `${parameter.real.toFixed(6)} ${parameter.imaginary >= 0 ? "+" : "-"} ${Math.abs(parameter.imaginary).toFixed(6)}i`;
}

function mapToPixelPosition(
  parameter: ComplexParameter,
  viewport: ComplexBounds,
): { left: number; top: number } {
  const normalizedX = (parameter.real - viewport.minReal) / getViewportWidth(viewport);
  const normalizedY = (viewport.maxImaginary - parameter.imaginary) / getViewportHeight(viewport);

  return {
    left: normalizedX * MANDELBROT_WIDTH,
    top: normalizedY * MANDELBROT_HEIGHT,
  };
}

function mapToRelativePosition(
  parameter: ComplexParameter,
  viewport: ComplexBounds,
): { left: string; top: string } {
  const pixelPosition = mapToPixelPosition(parameter, viewport);

  return {
    left: `${(pixelPosition.left / MANDELBROT_WIDTH) * 100}%`,
    top: `${(pixelPosition.top / MANDELBROT_HEIGHT) * 100}%`,
  };
}

function mapPointToParameter(
  x: number,
  y: number,
  viewport: ComplexBounds,
): ComplexParameter {
  const normalizedX = x / MANDELBROT_WIDTH;
  const normalizedY = y / MANDELBROT_HEIGHT;

  return {
    real: viewport.minReal + getViewportWidth(viewport) * normalizedX,
    imaginary: viewport.maxImaginary - getViewportHeight(viewport) * normalizedY,
  };
}

function zoomViewport(
  viewport: ComplexBounds,
  anchor: ComplexParameter,
  factor: number,
): ComplexBounds {
  const nextWidth = Math.max(getViewportWidth(viewport) * factor, MIN_VIEWPORT_SPAN);
  const nextHeight = Math.max(getViewportHeight(viewport) * factor, MIN_VIEWPORT_SPAN);
  const normalizedX = (anchor.real - viewport.minReal) / getViewportWidth(viewport);
  const normalizedY = (viewport.maxImaginary - anchor.imaginary) / getViewportHeight(viewport);

  return {
    minReal: anchor.real - nextWidth * normalizedX,
    maxReal: anchor.real + nextWidth * (1 - normalizedX),
    minImaginary: anchor.imaginary - nextHeight * (1 - normalizedY),
    maxImaginary: anchor.imaginary + nextHeight * normalizedY,
  };
}

function renderMandelbrotSet(viewport: ComplexBounds): ImageData {
  const imageData = new ImageData(MANDELBROT_WIDTH, MANDELBROT_HEIGHT);

  for (let y = 0; y < MANDELBROT_HEIGHT; y += 1) {
    for (let x = 0; x < MANDELBROT_WIDTH; x += 1) {
      const normalizedX = (x + 0.5) / MANDELBROT_WIDTH;
      const normalizedY = (y + 0.5) / MANDELBROT_HEIGHT;
      const cReal = viewport.minReal + getViewportWidth(viewport) * normalizedX;
      const cImaginary = viewport.maxImaginary - getViewportHeight(viewport) * normalizedY;

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

function getCanvasPoint(canvas: HTMLCanvasElement, event: MouseEvent | WheelEvent): { x: number; y: number } {
  const rect = canvas.getBoundingClientRect();
  return {
    x: ((event.clientX - rect.left) / rect.width) * canvas.width,
    y: ((event.clientY - rect.top) / rect.height) * canvas.height,
  };
}

export function MandelbrotOverviewCanvas(props: {
  parameter: ComplexParameter | null;
  onHoverParameter: (parameter: ComplexParameter | null) => void;
}): preact.JSX.Element {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const dragStateRef = useRef<DragState | null>(null);
  const [viewport, setViewport] = useState<ComplexBounds>(DEFAULT_MANDELBROT_VIEWPORT);
  const [hoveredParameter, setHoveredParameter] = useState<ComplexParameter | null>(null);

  const crosshairPosition = useMemo(
    () => (props.parameter ? mapToRelativePosition(props.parameter, viewport) : null),
    [props.parameter, viewport],
  );
  const overlayLabel = hoveredParameter ?? props.parameter;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) {
      return;
    }

    const context = canvas.getContext("2d");
    if (!context) {
      return;
    }

    context.putImageData(renderMandelbrotSet(viewport), 0, 0);
  }, [viewport]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) {
      return;
    }
    const activeCanvas = canvas;

    function updateHover(parameter: ComplexParameter | null): void {
      setHoveredParameter(parameter);
      props.onHoverParameter(parameter);
    }

    function handleMove(event: MouseEvent): void {
      const point = getCanvasPoint(activeCanvas, event);
      const parameter = mapPointToParameter(point.x, point.y, viewport);
      updateHover(parameter);

      const dragState = dragStateRef.current;
      if (!dragState) {
        return;
      }

      const deltaX = point.x - dragState.pointerStartX;
      const deltaY = point.y - dragState.pointerStartY;
      const viewportWidth = getViewportWidth(dragState.viewportAtStart);
      const viewportHeight = getViewportHeight(dragState.viewportAtStart);
      const realShift = (deltaX / MANDELBROT_WIDTH) * viewportWidth;
      const imaginaryShift = (deltaY / MANDELBROT_HEIGHT) * viewportHeight;

      setViewport({
        minReal: dragState.viewportAtStart.minReal - realShift,
        maxReal: dragState.viewportAtStart.maxReal - realShift,
        minImaginary: dragState.viewportAtStart.minImaginary + imaginaryShift,
        maxImaginary: dragState.viewportAtStart.maxImaginary + imaginaryShift,
      });
    }

    function handleLeave(): void {
      if (!dragStateRef.current) {
        updateHover(null);
      }
    }

    function handleMouseDown(event: MouseEvent): void {
      if (event.button !== 0) {
        return;
      }

      const point = getCanvasPoint(activeCanvas, event);
      dragStateRef.current = {
        pointerStartX: point.x,
        pointerStartY: point.y,
        viewportAtStart: viewport,
      };
      activeCanvas.style.cursor = "grabbing";
      event.preventDefault();
    }

    function handleMouseUp(): void {
      dragStateRef.current = null;
      activeCanvas.style.cursor = "crosshair";
    }

    function handleWheel(event: WheelEvent): void {
      event.preventDefault();
      const point = getCanvasPoint(activeCanvas, event);
      const anchor = mapPointToParameter(point.x, point.y, viewport);
      setViewport((current) =>
        zoomViewport(current, anchor, event.deltaY < 0 ? ZOOM_IN_FACTOR : ZOOM_OUT_FACTOR),
      );
      updateHover(anchor);
    }

    activeCanvas.style.cursor = "crosshair";
    activeCanvas.addEventListener("mousemove", handleMove);
    activeCanvas.addEventListener("mouseleave", handleLeave);
    activeCanvas.addEventListener("mousedown", handleMouseDown);
    activeCanvas.addEventListener("wheel", handleWheel, { passive: false });
    window.addEventListener("mouseup", handleMouseUp);

    return () => {
      dragStateRef.current = null;
      activeCanvas.style.cursor = "";
      activeCanvas.removeEventListener("mousemove", handleMove);
      activeCanvas.removeEventListener("mouseleave", handleLeave);
      activeCanvas.removeEventListener("mousedown", handleMouseDown);
      activeCanvas.removeEventListener("wheel", handleWheel);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [props, viewport]);

  return (
    <div className="canvas-frame canvas-frame--mandelbrot">
      <div className="canvas-overlay">{formatComplex(overlayLabel)}</div>
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
