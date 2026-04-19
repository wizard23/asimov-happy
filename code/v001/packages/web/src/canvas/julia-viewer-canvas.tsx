import { useEffect, useMemo, useRef, useState } from "preact/hooks";
import {
  JULIA_VIEWPORT,
  type ComplexParameter,
  type JuliaViewport,
} from "@asimov/minimal-shared";
import { getPaletteCssBackground, type FractalPaletteId } from "./fractal-palette.js";
import { CPU_EXPLORER_IMAGE_RENDERER } from "./explorer-cpu-renderer.js";
import type { ExplorerImageRenderer } from "./explorer-renderer.js";
import { drawJuliaAxesOverlay } from "./explorer-overlays.js";
import { renderExplorerImageWithFallback } from "./render-explorer-image-with-fallback.js";
import { useResponsiveCanvasResolution } from "./use-responsive-canvas-resolution.js";

const VIEWER_FALLBACK_SIZE = 360;
const VIEWER_MAX_RENDER_SIZE = 2048;
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
  width: number,
  height: number,
  viewport: JuliaViewport,
): ComplexParameter {
  const normalizedX = x / width;
  const normalizedY = y / height;

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
    x: event.clientX - rect.left,
    y: event.clientY - rect.top,
  };
}

export function JuliaViewerCanvas(props: {
  parameter: ComplexParameter | null;
  iterations: number;
  palette: FractalPaletteId;
  showAxes?: boolean;
  enableTwoQualityLevels?: boolean;
  renderer?: ExplorerImageRenderer;
  resolutionSizingMode?: "contain" | "width-driven" | "height-driven";
  frameStyle?: preact.JSX.CSSProperties;
}): preact.JSX.Element {
  const frameRef = useRef<HTMLDivElement | null>(null);
  const imageCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const overlayCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const dragStateRef = useRef<DragState | null>(null);
  const displaySizeRef = useRef({
    width: VIEWER_FALLBACK_SIZE,
    height: VIEWER_FALLBACK_SIZE,
  });
  const enableTwoQualityLevelsRef = useRef(Boolean(props.enableTwoQualityLevels));
  const parameterRef = useRef(props.parameter);
  const viewportRef = useRef<JuliaViewport>(JULIA_VIEWPORT);
  const settleQualityTimeoutRef = useRef<number | null>(null);
  const [viewport, setViewport] = useState<JuliaViewport>(JULIA_VIEWPORT);
  const [qualityScale, setQualityScale] = useState(1);
  const resolutionOptions = useMemo(
    () => ({
      fallbackDisplayWidth: VIEWER_FALLBACK_SIZE,
      fallbackDisplayHeight: VIEWER_FALLBACK_SIZE,
      maxRenderWidth: VIEWER_MAX_RENDER_SIZE,
      maxRenderHeight: VIEWER_MAX_RENDER_SIZE,
      qualityScale,
      aspectRatio: 1,
      sizingMode: props.resolutionSizingMode ?? "contain",
    }),
    [props.resolutionSizingMode, qualityScale],
  );
  const canvasResolution = useResponsiveCanvasResolution(frameRef, resolutionOptions);

  useEffect(() => {
    viewportRef.current = viewport;
  }, [viewport]);

  useEffect(() => {
    parameterRef.current = props.parameter;
  }, [props.parameter]);

  useEffect(() => {
    enableTwoQualityLevelsRef.current = Boolean(props.enableTwoQualityLevels);
  }, [props.enableTwoQualityLevels]);

  useEffect(() => {
    displaySizeRef.current = {
      width: canvasResolution.displayWidth,
      height: canvasResolution.displayHeight,
    };
  }, [canvasResolution.displayHeight, canvasResolution.displayWidth]);

  useEffect(() => {
    return () => {
      if (settleQualityTimeoutRef.current !== null) {
        window.clearTimeout(settleQualityTimeoutRef.current);
      }
    };
  }, []);

  function markInteractiveQuality(): void {
    if (!enableTwoQualityLevelsRef.current) {
      return;
    }

    setQualityScale(0.2);
    if (settleQualityTimeoutRef.current !== null) {
      window.clearTimeout(settleQualityTimeoutRef.current);
    }
    settleQualityTimeoutRef.current = window.setTimeout(() => {
      setQualityScale(1);
      settleQualityTimeoutRef.current = null;
    }, 160);
  }

  useEffect(() => {
    if (!props.enableTwoQualityLevels) {
      setQualityScale(1);
    }
  }, [props.enableTwoQualityLevels]);

  useEffect(() => {
    if (props.parameter) {
      markInteractiveQuality();
    }
  }, [props.parameter]);

  useEffect(() => {
    const canvas = imageCanvasRef.current;
    if (!canvas) {
      return;
    }

    if (!props.parameter) {
      canvas.width = canvasResolution.renderWidth;
      canvas.height = canvasResolution.renderHeight;
      const context = canvas.getContext("2d");
      if (!context) {
        return;
      }

      context.clearRect(0, 0, canvas.width, canvas.height);
      context.fillStyle = getPaletteCssBackground(props.palette);
      context.fillRect(0, 0, canvas.width, canvas.height);
      context.fillStyle = "#6c7b89";
      context.font = '16px "IBM Plex Sans", sans-serif';
      context.fillText("Select or hover a cell to render the Julia set.", 20, 40);
      return;
    }

    const renderer = props.renderer ?? CPU_EXPLORER_IMAGE_RENDERER;
    const parameter = props.parameter;
    renderExplorerImageWithFallback(
      canvas,
      canvasResolution.renderWidth,
      canvasResolution.renderHeight,
      (effectiveWidth, effectiveHeight) => {
        renderer.renderJulia(canvas, {
          parameter,
          viewport,
          width: effectiveWidth,
          height: effectiveHeight,
          iterations: props.iterations,
          palette: props.palette,
        });
      },
    );
  }, [
    canvasResolution.renderHeight,
    canvasResolution.renderWidth,
    props.iterations,
    props.palette,
    props.parameter,
    props.renderer,
    viewport,
  ]);

  useEffect(() => {
    const canvas = overlayCanvasRef.current;
    if (!canvas) {
      return;
    }

    const context = canvas.getContext("2d");
    if (!context) {
      return;
    }

    context.clearRect(0, 0, canvas.width, canvas.height);
    if (props.showAxes) {
      drawJuliaAxesOverlay(
        context,
        viewport,
        canvasResolution.renderWidth,
        canvasResolution.renderHeight,
      );
    }
  }, [canvasResolution.renderHeight, canvasResolution.renderWidth, props.showAxes, viewport]);

  useEffect(() => {
    const canvas = overlayCanvasRef.current;
    if (!canvas) {
      return;
    }
    const activeCanvas = canvas;

    function handleMouseDown(event: MouseEvent): void {
      if (event.button !== 0 || !parameterRef.current) {
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
      const realShift = (deltaX / displaySizeRef.current.width) * viewportWidth;
      const imaginaryShift = (deltaY / displaySizeRef.current.height) * viewportHeight;

      setViewport({
        minReal: dragState.viewportAtStart.minReal - realShift,
        maxReal: dragState.viewportAtStart.maxReal - realShift,
        minImaginary: dragState.viewportAtStart.minImaginary + imaginaryShift,
        maxImaginary: dragState.viewportAtStart.maxImaginary + imaginaryShift,
      });
      markInteractiveQuality();
    }

    function handleMouseUp(): void {
      dragStateRef.current = null;
      activeCanvas.style.cursor = parameterRef.current ? "grab" : "default";
    }

    function handleWheel(event: WheelEvent): void {
      if (!parameterRef.current) {
        return;
      }

      event.preventDefault();
      const point = getCanvasPoint(activeCanvas, event);
      const anchor = mapPointToCoordinate(
        point.x,
        point.y,
        displaySizeRef.current.width,
        displaySizeRef.current.height,
        viewportRef.current,
      );
      setViewport((current) =>
        zoomViewport(current, anchor, event.deltaY < 0 ? ZOOM_IN_FACTOR : ZOOM_OUT_FACTOR),
      );
      markInteractiveQuality();
    }

    activeCanvas.style.cursor = parameterRef.current ? "grab" : "default";
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
  }, []);

  useEffect(() => {
    const canvas = overlayCanvasRef.current;
    if (!canvas || dragStateRef.current) {
      return;
    }

    canvas.style.cursor = props.parameter ? "grab" : "default";
  }, [props.parameter]);

  return (
    <div
      ref={frameRef}
      className="canvas-frame canvas-frame--viewer"
      style={props.frameStyle}
    >
      <div className="canvas-overlay">{formatComplex(props.parameter)}</div>
      <div
        className="canvas-stage"
        style={{
          width: `${canvasResolution.displayWidth}px`,
          height: `${canvasResolution.displayHeight}px`,
        }}
      >
        <canvas
          key={`julia-image-${props.renderer?.id ?? "cpu"}`}
          ref={imageCanvasRef}
          className="canvas canvas--viewer"
          width={canvasResolution.renderWidth}
          height={canvasResolution.renderHeight}
          style={{ backgroundColor: getPaletteCssBackground(props.palette) }}
        />
        <canvas
          ref={overlayCanvasRef}
          className="canvas canvas--viewer canvas--overlay"
          width={canvasResolution.renderWidth}
          height={canvasResolution.renderHeight}
        />
      </div>
    </div>
  );
}
