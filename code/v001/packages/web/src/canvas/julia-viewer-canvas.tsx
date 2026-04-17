import { useEffect, useMemo, useRef, useState } from "preact/hooks";
import {
  JULIA_VIEWPORT,
  renderJuliaFeatureVector,
  type ComplexParameter,
  type JuliaViewport,
} from "@asimov/minimal-shared";
import {
  getPaletteColor,
  getPaletteCssBackground,
  type FractalPaletteId,
} from "./fractal-palette.js";

const VIEWER_SIZE = 360;
const MIN_VIEWPORT_SPAN = 0.02;
const ZOOM_IN_FACTOR = 0.85;
const ZOOM_OUT_FACTOR = 1 / ZOOM_IN_FACTOR;

interface DragState {
  pointerStartX: number;
  pointerStartY: number;
  viewportAtStart: JuliaViewport;
}

function getViewportWidth(viewport: JuliaViewport): number {
  return viewport.maxReal - viewport.minReal;
}

function getViewportHeight(viewport: JuliaViewport): number {
  return viewport.maxImaginary - viewport.minImaginary;
}

function formatComplex(parameter: ComplexParameter | null): string {
  if (!parameter) {
    return "n/a";
  }

  return `${parameter.real.toFixed(6)} ${parameter.imaginary >= 0 ? "+" : "-"} ${Math.abs(parameter.imaginary).toFixed(6)}i`;
}

function mapPointToCoordinate(
  x: number,
  y: number,
  viewport: JuliaViewport,
): ComplexParameter {
  const normalizedX = x / VIEWER_SIZE;
  const normalizedY = y / VIEWER_SIZE;

  return {
    real: viewport.minReal + getViewportWidth(viewport) * normalizedX,
    imaginary: viewport.maxImaginary - getViewportHeight(viewport) * normalizedY,
  };
}

function zoomViewport(
  viewport: JuliaViewport,
  anchor: ComplexParameter,
  factor: number,
): JuliaViewport {
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

function getCanvasPoint(canvas: HTMLCanvasElement, event: MouseEvent | WheelEvent): { x: number; y: number } {
  const rect = canvas.getBoundingClientRect();
  return {
    x: ((event.clientX - rect.left) / rect.width) * canvas.width,
    y: ((event.clientY - rect.top) / rect.height) * canvas.height,
  };
}

export function JuliaViewerCanvas(props: {
  parameter: ComplexParameter | null;
  iterations: number;
  palette: FractalPaletteId;
}): preact.JSX.Element {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const dragStateRef = useRef<DragState | null>(null);
  const viewportRef = useRef<JuliaViewport>(JULIA_VIEWPORT);
  const [viewport, setViewport] = useState<JuliaViewport>(JULIA_VIEWPORT);

  const featureVector = useMemo(() => {
    if (!props.parameter) {
      return null;
    }
    return renderJuliaFeatureVector(
      props.parameter,
      VIEWER_SIZE,
      VIEWER_SIZE,
      props.iterations,
      viewport,
    );
  }, [props.parameter, props.iterations, viewport]);

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

    context.clearRect(0, 0, canvas.width, canvas.height);
    context.fillStyle = getPaletteCssBackground(props.palette);
    context.fillRect(0, 0, canvas.width, canvas.height);

    if (!featureVector) {
      context.fillStyle = "#6c7b89";
      context.font = '16px "IBM Plex Sans", sans-serif';
      context.fillText("Select or hover a cell to render the Julia set.", 20, 40);
      return;
    }

    const imageData = context.createImageData(VIEWER_SIZE, VIEWER_SIZE);
    for (let index = 0; index < featureVector.length; index += 1) {
      const pixelIndex = index * 4;
      const value = featureVector[index] ?? 0;
      const color = getPaletteColor(props.palette, value);
      imageData.data[pixelIndex] = color.red;
      imageData.data[pixelIndex + 1] = color.green;
      imageData.data[pixelIndex + 2] = color.blue;
      imageData.data[pixelIndex + 3] = 255;
    }

    context.putImageData(imageData, 0, 0);
  }, [featureVector, props.palette]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) {
      return;
    }
    const activeCanvas = canvas;

    function handleMouseDown(event: MouseEvent): void {
      if (event.button !== 0 || !props.parameter) {
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

    function handleMouseMove(event: MouseEvent): void {
      const dragState = dragStateRef.current;
      if (!dragState) {
        return;
      }

      const point = getCanvasPoint(activeCanvas, event);
      const deltaX = point.x - dragState.pointerStartX;
      const deltaY = point.y - dragState.pointerStartY;
      const viewportWidth = getViewportWidth(dragState.viewportAtStart);
      const viewportHeight = getViewportHeight(dragState.viewportAtStart);
      const realShift = (deltaX / VIEWER_SIZE) * viewportWidth;
      const imaginaryShift = (deltaY / VIEWER_SIZE) * viewportHeight;

      setViewport({
        minReal: dragState.viewportAtStart.minReal - realShift,
        maxReal: dragState.viewportAtStart.maxReal - realShift,
        minImaginary: dragState.viewportAtStart.minImaginary + imaginaryShift,
        maxImaginary: dragState.viewportAtStart.maxImaginary + imaginaryShift,
      });
    }

    function handleMouseUp(): void {
      dragStateRef.current = null;
      activeCanvas.style.cursor = props.parameter ? "grab" : "default";
    }

    function handleWheel(event: WheelEvent): void {
      if (!props.parameter) {
        return;
      }

      event.preventDefault();
      const point = getCanvasPoint(activeCanvas, event);
      const anchor = mapPointToCoordinate(point.x, point.y, viewportRef.current);
      setViewport((current) =>
        zoomViewport(current, anchor, event.deltaY < 0 ? ZOOM_IN_FACTOR : ZOOM_OUT_FACTOR),
      );
    }

    activeCanvas.style.cursor = props.parameter ? "grab" : "default";
    activeCanvas.addEventListener("mousedown", handleMouseDown);
    activeCanvas.addEventListener("mousemove", handleMouseMove);
    activeCanvas.addEventListener("wheel", handleWheel, { passive: false });
    window.addEventListener("mouseup", handleMouseUp);

    return () => {
      dragStateRef.current = null;
      activeCanvas.style.cursor = "";
      activeCanvas.removeEventListener("mousedown", handleMouseDown);
      activeCanvas.removeEventListener("mousemove", handleMouseMove);
      activeCanvas.removeEventListener("wheel", handleWheel);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [props.parameter]);

  return (
    <div className="canvas-frame">
      <div className="canvas-overlay">{formatComplex(props.parameter)}</div>
      <canvas
        ref={canvasRef}
        className="canvas canvas--viewer"
        width={VIEWER_SIZE}
        height={VIEWER_SIZE}
        style={{ backgroundColor: getPaletteCssBackground(props.palette) }}
      />
    </div>
  );
}
