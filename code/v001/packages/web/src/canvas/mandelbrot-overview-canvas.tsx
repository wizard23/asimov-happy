import { useEffect, useMemo, useRef, useState } from "preact/hooks";
import type { ComplexBounds, ComplexParameter, SomTrainingResult } from "@asimov/minimal-shared";
import crosshairUrl from "../assets/noun-crosshair-59595.svg";
import {
  clampByte,
  getPaletteColor,
  getPaletteCssBackground,
  type FractalPaletteId,
} from "./fractal-palette.js";

const MANDELBROT_WIDTH = 360;
const MANDELBROT_HEIGHT = 240;
const MANDELBROT_MAX_ITERATIONS = 96;
const CLICK_SELECTION_THRESHOLD = 5;
const DEFAULT_MANDELBROT_VIEWPORT: ComplexBounds = {
  minReal: -2.2,
  maxReal: 1.0,
  minImaginary: -1.0666666666666667,
  maxImaginary: 1.0666666666666667,
};
const MIN_VIEWPORT_SPAN = 0.02;
const ZOOM_IN_FACTOR = 0.85;
const ZOOM_OUT_FACTOR = 1 / ZOOM_IN_FACTOR;

interface DragState {
  pointerStartX: number;
  pointerStartY: number;
  viewportAtStart: ComplexBounds;
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
  const viewportWidth = getViewportWidth(viewport);
  const viewportHeight = getViewportHeight(viewport);
  const aspectRatio = viewportWidth / viewportHeight;
  const minimumWidth = MIN_VIEWPORT_SPAN * aspectRatio;
  const nextHeight = Math.max(viewportHeight * factor, MIN_VIEWPORT_SPAN);
  const nextWidth = Math.max(viewportWidth * factor, minimumWidth);
  const normalizedX = (anchor.real - viewport.minReal) / getViewportWidth(viewport);
  const normalizedY = (viewport.maxImaginary - anchor.imaginary) / getViewportHeight(viewport);

  return {
    minReal: anchor.real - nextWidth * normalizedX,
    maxReal: anchor.real + nextWidth * (1 - normalizedX),
    minImaginary: anchor.imaginary - nextHeight * (1 - normalizedY),
    maxImaginary: anchor.imaginary + nextHeight * normalizedY,
  };
}

function renderMandelbrotSet(
  viewport: ComplexBounds,
  iterations: number,
  palette: FractalPaletteId,
): ImageData {
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

      const pixelIndex = (y * MANDELBROT_WIDTH + x) * 4;
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

function drawSomGridOverlay(
  context: CanvasRenderingContext2D,
  result: SomTrainingResult,
  viewport: ComplexBounds,
): void {
  const cellsByCoordinates = new Map<string, ComplexParameter>();

  for (const cell of result.cells) {
    if (!cell.representativeParameter) {
      continue;
    }
    cellsByCoordinates.set(`${cell.x},${cell.y}`, cell.representativeParameter);
  }

  context.save();
  context.strokeStyle = "rgba(248, 219, 120, 0.65)";
  context.lineWidth = 1.5;

  for (const cell of result.cells) {
    const current = cell.representativeParameter;
    if (!current) {
      continue;
    }

    const currentPoint = mapToPixelPosition(current, viewport);
    const right = cellsByCoordinates.get(`${cell.x + 1},${cell.y}`);
    if (right) {
      const rightPoint = mapToPixelPosition(right, viewport);
      context.beginPath();
      context.moveTo(currentPoint.left, currentPoint.top);
      context.lineTo(rightPoint.left, rightPoint.top);
      context.stroke();
    }

    const below = cellsByCoordinates.get(`${cell.x},${cell.y + 1}`);
    if (below) {
      const belowPoint = mapToPixelPosition(below, viewport);
      context.beginPath();
      context.moveTo(currentPoint.left, currentPoint.top);
      context.lineTo(belowPoint.left, belowPoint.top);
      context.stroke();
    }
  }

  context.fillStyle = "rgba(255, 244, 197, 0.85)";
  for (const cell of result.cells) {
    if (!cell.representativeParameter) {
      continue;
    }

    const point = mapToPixelPosition(cell.representativeParameter, viewport);
    context.beginPath();
    context.arc(point.left, point.top, 2.5, 0, Math.PI * 2);
    context.fill();
  }

  context.restore();
}

function drawOrbitOverlay(
  context: CanvasRenderingContext2D,
  parameter: ComplexParameter,
  viewport: ComplexBounds,
  steps: number,
): void {
  const orbitPoints: ComplexParameter[] = [];
  let currentReal = 0;
  let currentImaginary = 0;

  for (let step = 0; step < steps; step += 1) {
    const nextReal = currentReal * currentReal - currentImaginary * currentImaginary + parameter.real;
    const nextImaginary = 2 * currentReal * currentImaginary + parameter.imaginary;
    currentReal = nextReal;
    currentImaginary = nextImaginary;
    orbitPoints.push({
      real: currentReal,
      imaginary: currentImaginary,
    });
  }

  context.save();
  context.strokeStyle = "rgba(255, 244, 197, 0.9)";
  context.fillStyle = "rgba(255, 244, 197, 0.95)";
  context.lineWidth = 1.5;

  context.beginPath();
  orbitPoints.forEach((point, index) => {
    const position = mapToPixelPosition(point, viewport);
    if (index === 0) {
      context.moveTo(position.left, position.top);
      return;
    }
    context.lineTo(position.left, position.top);
  });
  context.stroke();

  orbitPoints.forEach((point, index) => {
    const position = mapToPixelPosition(point, viewport);
    context.beginPath();
    context.arc(position.left, position.top, index === 0 ? 3 : 2.25, 0, Math.PI * 2);
    context.fill();
  });

  context.restore();
}

function drawAxesOverlay(
  context: CanvasRenderingContext2D,
  viewport: ComplexBounds,
): void {
  context.save();
  context.strokeStyle = "rgba(255, 255, 255, 0.45)";
  context.lineWidth = 1;
  context.setLineDash([5, 4]);

  if (viewport.minReal <= 0 && viewport.maxReal >= 0) {
    const x = mapToPixelPosition({ real: 0, imaginary: viewport.minImaginary }, viewport).left;
    context.beginPath();
    context.moveTo(x, 0);
    context.lineTo(x, MANDELBROT_HEIGHT);
    context.stroke();
  }

  if (viewport.minImaginary <= 0 && viewport.maxImaginary >= 0) {
    const y = mapToPixelPosition({ real: viewport.minReal, imaginary: 0 }, viewport).top;
    context.beginPath();
    context.moveTo(0, y);
    context.lineTo(MANDELBROT_WIDTH, y);
    context.stroke();
  }

  context.restore();
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
  selectedParameter?: ComplexParameter | null;
  onHoverParameter: (parameter: ComplexParameter | null) => void;
  onSelectParameter?: (parameter: ComplexParameter) => void;
  result?: SomTrainingResult | null;
  showSomGrid?: boolean;
  showAxes?: boolean;
  showOrbit?: boolean;
  orbitSteps?: number;
  iterations?: number;
  palette?: FractalPaletteId;
}): preact.JSX.Element {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const dragStateRef = useRef<DragState | null>(null);
  const onHoverParameterRef = useRef(props.onHoverParameter);
  const viewportRef = useRef<ComplexBounds>(DEFAULT_MANDELBROT_VIEWPORT);
  const [viewport, setViewport] = useState<ComplexBounds>(DEFAULT_MANDELBROT_VIEWPORT);
  const [hoveredParameter, setHoveredParameter] = useState<ComplexParameter | null>(null);

  const selectedParameter = props.selectedParameter ?? props.parameter;
  const selectedCrosshairPosition = useMemo(
    () => (selectedParameter ? mapToRelativePosition(selectedParameter, viewport) : null),
    [selectedParameter, viewport],
  );
  const liveCrosshairPosition = useMemo(() => {
    if (
      !props.parameter ||
      (selectedParameter &&
        props.parameter.real === selectedParameter.real &&
        props.parameter.imaginary === selectedParameter.imaginary)
    ) {
      return null;
    }

    return mapToRelativePosition(props.parameter, viewport);
  }, [props.parameter, selectedParameter, viewport]);
  const overlayLabel = hoveredParameter ?? props.parameter;

  useEffect(() => {
    onHoverParameterRef.current = props.onHoverParameter;
  }, [props.onHoverParameter]);

  useEffect(() => {
    viewportRef.current = viewport;
  }, [viewport]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) {
      return;
    }

    const context = canvas.getContext("2d");
    if (!context) {
      return;
    }

    context.putImageData(
      renderMandelbrotSet(
        viewport,
        props.iterations ?? MANDELBROT_MAX_ITERATIONS,
        props.palette ?? "ember",
      ),
      0,
      0,
    );
    if (props.showAxes) {
      drawAxesOverlay(context, viewport);
    }
    if (props.showSomGrid && props.result) {
      drawSomGridOverlay(context, props.result, viewport);
    }
    if (props.showOrbit && props.parameter) {
      drawOrbitOverlay(context, props.parameter, viewport, Math.max(1, props.orbitSteps ?? 10));
    }
  }, [
    viewport,
    props.iterations,
    props.orbitSteps,
    props.palette,
    props.parameter,
    props.result,
    props.selectedParameter,
    props.showAxes,
    props.showOrbit,
    props.showSomGrid,
  ]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) {
      return;
    }
    const activeCanvas = canvas;

    function updateHover(parameter: ComplexParameter | null): void {
      setHoveredParameter(parameter);
      onHoverParameterRef.current(parameter);
    }

    function handleMove(event: MouseEvent): void {
      const point = getCanvasPoint(activeCanvas, event);
      const parameter = mapPointToParameter(point.x, point.y, viewportRef.current);
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
        viewportAtStart: viewportRef.current,
      };
      activeCanvas.style.cursor = "grabbing";
      event.preventDefault();
    }

    function handleMouseUp(event: MouseEvent): void {
      if (dragStateRef.current && props.onSelectParameter && activeCanvas.contains(event.target as Node)) {
        const point = getCanvasPoint(activeCanvas, event);
        const deltaX = point.x - dragStateRef.current.pointerStartX;
        const deltaY = point.y - dragStateRef.current.pointerStartY;
        const movedDistance = Math.hypot(deltaX, deltaY);

        if (movedDistance <= CLICK_SELECTION_THRESHOLD) {
          props.onSelectParameter(mapPointToParameter(point.x, point.y, viewportRef.current));
        }
      }

      dragStateRef.current = null;
      activeCanvas.style.cursor = "crosshair";
    }

    function handleWheel(event: WheelEvent): void {
      event.preventDefault();
      const point = getCanvasPoint(activeCanvas, event);
      const anchor = mapPointToParameter(point.x, point.y, viewportRef.current);
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
  }, [props.onSelectParameter]);

  return (
    <div className="canvas-frame canvas-frame--mandelbrot">
      <div className="canvas-overlay">{formatComplex(overlayLabel)}</div>
      <canvas
        ref={canvasRef}
        className="canvas canvas--mandelbrot"
        width={MANDELBROT_WIDTH}
        height={MANDELBROT_HEIGHT}
        style={{ backgroundColor: getPaletteCssBackground(props.palette ?? "ember") }}
      />
      {selectedCrosshairPosition ? (
        <img
          className="mandelbrot-crosshair mandelbrot-crosshair--selected"
          src={crosshairUrl}
          alt="Selected Julia parameter on the Mandelbrot set"
          style={{
            left: selectedCrosshairPosition.left,
            top: selectedCrosshairPosition.top,
          }}
        />
      ) : null}
      {liveCrosshairPosition ? (
        <img
          className="mandelbrot-crosshair mandelbrot-crosshair--live"
          src={crosshairUrl}
          alt="Live preview Julia parameter on the Mandelbrot set"
          style={{
            left: liveCrosshairPosition.left,
            top: liveCrosshairPosition.top,
          }}
        />
      ) : null}
    </div>
  );
}
