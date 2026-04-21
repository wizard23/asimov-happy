import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "preact/hooks";
import type { ComplexBounds, ComplexParameter, SomTrainingResult } from "@asimov/minimal-shared";
import crosshairUrl from "../assets/noun-crosshair-59595.svg";
import {
  getPaletteCssBackground,
  type FractalPaletteId,
  type PaletteMappingMode,
} from "./fractal-palette.js";
import { CPU_EXPLORER_IMAGE_RENDERER } from "./explorer-cpu-renderer.js";
import type { ExplorerImageRenderer } from "./explorer-renderer.js";
import {
  drawMandelbrotAxesOverlay,
  drawOrbitOverlay,
  drawSomGridOverlay,
  getComplexBoundsHeight,
  getComplexBoundsWidth,
} from "./explorer-overlays.js";
import {
  renderExplorerImageWithFallback,
  renderExplorerImageWithSwap,
} from "./render-explorer-image-with-fallback.js";
import { useResponsiveCanvasResolution } from "./use-responsive-canvas-resolution.js";

const MANDELBROT_FALLBACK_WIDTH = 360;
const MANDELBROT_FALLBACK_HEIGHT = 240;
const MANDELBROT_MAX_RENDER_WIDTH = 2048;
const MANDELBROT_MAX_RENDER_HEIGHT = 1365;
const MANDELBROT_MAX_ITERATIONS = 96;
const CLICK_SELECTION_THRESHOLD = 5;
const VIEWPORT_PRECISION_SAFETY_FACTOR = 8;
const DEFAULT_MANDELBROT_VIEWPORT: ComplexBounds = {
  minReal: -2.2,
  maxReal: 1.0,
  minImaginary: -1.0666666666666667,
  maxImaginary: 1.0666666666666667,
};
const ZOOM_IN_FACTOR = 0.85;
const ZOOM_OUT_FACTOR = 1 / ZOOM_IN_FACTOR;

interface DragState {
  pointerStartX: number;
  pointerStartY: number;
  viewportAtStart: ComplexBounds;
}

function formatComplex(parameter: ComplexParameter | null): string {
  if (!parameter) {
    return "n/a";
  }

  return `${parameter.real.toFixed(6)} ${parameter.imaginary >= 0 ? "+" : "-"} ${Math.abs(parameter.imaginary).toFixed(6)}i`;
}

function formatZoomLevel(viewport: ComplexBounds): string {
  const zoom = getComplexBoundsHeight(DEFAULT_MANDELBROT_VIEWPORT) / getComplexBoundsHeight(viewport);
  const digits = zoom >= 100 ? 0 : zoom >= 10 ? 1 : 2;
  return `${zoom.toFixed(digits)}x`;
}

function mapToRelativePosition(
  parameter: ComplexParameter,
  viewport: ComplexBounds,
): { left: string; top: string } {
  const normalizedX = (parameter.real - viewport.minReal) / getComplexBoundsWidth(viewport);
  const normalizedY = (viewport.maxImaginary - parameter.imaginary) / getComplexBoundsHeight(viewport);

  return {
    left: `${normalizedX * 100}%`,
    top: `${normalizedY * 100}%`,
  };
}

function mapPointToParameter(
  x: number,
  y: number,
  width: number,
  height: number,
  viewport: ComplexBounds,
): ComplexParameter {
  const normalizedX = x / width;
  const normalizedY = y / height;

  return {
    real: viewport.minReal + getComplexBoundsWidth(viewport) * normalizedX,
    imaginary: viewport.maxImaginary - getComplexBoundsHeight(viewport) * normalizedY,
  };
}

function zoomViewport(
  viewport: ComplexBounds,
  anchor: ComplexParameter,
  factor: number,
  displayWidth: number,
  displayHeight: number,
): ComplexBounds {
  const viewportWidth = getComplexBoundsWidth(viewport);
  const viewportHeight = getComplexBoundsHeight(viewport);
  const aspectRatio = viewportWidth / viewportHeight;
  const centerReal = (viewport.minReal + viewport.maxReal) / 2;
  const centerImaginary = (viewport.minImaginary + viewport.maxImaginary) / 2;
  const realUlp = Number.EPSILON * Math.max(1, Math.abs(centerReal));
  const imaginaryUlp = Number.EPSILON * Math.max(1, Math.abs(centerImaginary));
  const minimumWidth = Math.max(
    realUlp * Math.max(1, displayWidth) * VIEWPORT_PRECISION_SAFETY_FACTOR,
    imaginaryUlp * Math.max(1, displayHeight) * aspectRatio * VIEWPORT_PRECISION_SAFETY_FACTOR,
  );
  const minimumHeight = minimumWidth / aspectRatio;
  const nextHeight = Math.max(viewportHeight * factor, minimumHeight);
  const nextWidth = Math.max(viewportWidth * factor, minimumWidth);
  const normalizedX = (anchor.real - viewport.minReal) / getComplexBoundsWidth(viewport);
  const normalizedY = (viewport.maxImaginary - anchor.imaginary) / getComplexBoundsHeight(viewport);

  return {
    minReal: anchor.real - nextWidth * normalizedX,
    maxReal: anchor.real + nextWidth * (1 - normalizedX),
    minImaginary: anchor.imaginary - nextHeight * (1 - normalizedY),
    maxImaginary: anchor.imaginary + nextHeight * normalizedY,
  };
}

function getStagePoint(
  frame: HTMLElement,
  displayWidth: number,
  displayHeight: number,
  event: MouseEvent | WheelEvent,
): { x: number; y: number } {
  const rect = frame.getBoundingClientRect();
  const horizontalInset = (rect.width - displayWidth) / 2;
  const verticalInset = (rect.height - displayHeight) / 2;

  return {
    x: Math.max(0, Math.min(displayWidth, event.clientX - rect.left - horizontalInset)),
    y: Math.max(0, Math.min(displayHeight, event.clientY - rect.top - verticalInset)),
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
  enableTwoQualityLevels?: boolean;
  orbitSteps?: number;
  iterations?: number;
  palette?: FractalPaletteId;
  paletteMappingMode?: PaletteMappingMode;
  paletteCycles?: number;
  renderer?: ExplorerImageRenderer;
  resolutionSizingMode?: "contain" | "width-driven" | "height-driven";
  frameStyle?: preact.JSX.CSSProperties;
}): preact.JSX.Element {
  const frameRef = useRef<HTMLDivElement | null>(null);
  const imageCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const overlayCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const dragStateRef = useRef<DragState | null>(null);
  const displaySizeRef = useRef({
    width: MANDELBROT_FALLBACK_WIDTH,
    height: MANDELBROT_FALLBACK_HEIGHT,
  });
  const enableTwoQualityLevelsRef = useRef(Boolean(props.enableTwoQualityLevels));
  const onHoverParameterRef = useRef(props.onHoverParameter);
  const onSelectParameterRef = useRef(props.onSelectParameter);
  const viewportRef = useRef<ComplexBounds>(DEFAULT_MANDELBROT_VIEWPORT);
  const settleQualityTimeoutRef = useRef<number | null>(null);
  const [viewport, setViewport] = useState<ComplexBounds>(DEFAULT_MANDELBROT_VIEWPORT);
  const [hoveredParameter, setHoveredParameter] = useState<ComplexParameter | null>(null);
  const [qualityScale, setQualityScale] = useState(1);
  const [presentedRenderSize, setPresentedRenderSize] = useState(() => ({
    width: MANDELBROT_FALLBACK_WIDTH,
    height: MANDELBROT_FALLBACK_HEIGHT,
  }));
  const resolutionOptions = useMemo(
    () => ({
      fallbackDisplayWidth: MANDELBROT_FALLBACK_WIDTH,
      fallbackDisplayHeight: MANDELBROT_FALLBACK_HEIGHT,
      maxRenderWidth: MANDELBROT_MAX_RENDER_WIDTH,
      maxRenderHeight: MANDELBROT_MAX_RENDER_HEIGHT,
      qualityScale,
      aspectRatio: 3 / 2,
      sizingMode: props.resolutionSizingMode ?? "contain",
    }),
    [props.resolutionSizingMode, qualityScale],
  );
  const canvasResolution = useResponsiveCanvasResolution(frameRef, resolutionOptions);

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
  const overlayText = `${formatComplex(overlayLabel)} \u00b7 ${formatZoomLevel(viewport)}`;

  useEffect(() => {
    onHoverParameterRef.current = props.onHoverParameter;
  }, [props.onHoverParameter]);

  useEffect(() => {
    onSelectParameterRef.current = props.onSelectParameter;
  }, [props.onSelectParameter]);

  useEffect(() => {
    enableTwoQualityLevelsRef.current = Boolean(props.enableTwoQualityLevels);
  }, [props.enableTwoQualityLevels]);

  useEffect(() => {
    viewportRef.current = viewport;
  }, [viewport]);

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

  useLayoutEffect(() => {
    const canvas = imageCanvasRef.current;
    if (!canvas) {
      return;
    }

    const renderer = props.renderer ?? CPU_EXPLORER_IMAGE_RENDERER;
    const nextPresentedSize =
      renderer.id === "webgl"
        ? renderExplorerImageWithFallback(
            canvas,
            canvasResolution.renderWidth,
            canvasResolution.renderHeight,
            (effectiveWidth, effectiveHeight) => {
              renderer.renderMandelbrot(canvas, {
                viewport,
                width: effectiveWidth,
                height: effectiveHeight,
                iterations: props.iterations ?? MANDELBROT_MAX_ITERATIONS,
                palette: props.palette ?? "ember",
                paletteMappingMode: props.paletteMappingMode ?? "logarithmic",
                paletteCycles: props.paletteCycles ?? 6,
              });
            },
          )
        : renderExplorerImageWithSwap(
            canvas,
            canvasResolution.renderWidth,
            canvasResolution.renderHeight,
            (renderTarget, effectiveWidth, effectiveHeight) => {
              renderer.renderMandelbrot(renderTarget, {
                viewport,
                width: effectiveWidth,
                height: effectiveHeight,
                iterations: props.iterations ?? MANDELBROT_MAX_ITERATIONS,
                palette: props.palette ?? "ember",
                paletteMappingMode: props.paletteMappingMode ?? "logarithmic",
                paletteCycles: props.paletteCycles ?? 6,
              });
            },
          );
    setPresentedRenderSize({
      width: nextPresentedSize.effectiveWidth,
      height: nextPresentedSize.effectiveHeight,
    });
  }, [
    canvasResolution.renderHeight,
    canvasResolution.renderWidth,
    props.iterations,
    props.palette,
    props.paletteCycles,
    props.paletteMappingMode,
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
      drawMandelbrotAxesOverlay(
        context,
        viewport,
        canvasResolution.renderWidth,
        canvasResolution.renderHeight,
      );
    }
    if (props.showSomGrid && props.result) {
      drawSomGridOverlay(
        context,
        props.result,
        viewport,
        canvasResolution.renderWidth,
        canvasResolution.renderHeight,
      );
    }
    if (props.showOrbit && props.parameter) {
      drawOrbitOverlay(
        context,
        props.parameter,
        viewport,
        canvasResolution.renderWidth,
        canvasResolution.renderHeight,
        Math.max(1, props.orbitSteps ?? 10),
      );
    }
  }, [
    canvasResolution.renderHeight,
    canvasResolution.renderWidth,
    viewport,
    props.orbitSteps,
    props.parameter,
    props.result,
    props.showAxes,
    props.showOrbit,
    props.showSomGrid,
  ]);

  useEffect(() => {
    const canvas = overlayCanvasRef.current;
    if (!canvas) {
      return;
    }
    const activeCanvas = canvas;

    function updateHover(parameter: ComplexParameter | null): void {
      setHoveredParameter(parameter);
      onHoverParameterRef.current(parameter);
    }

    function handleMove(event: MouseEvent): void {
      const frame = frameRef.current;
      if (!frame) {
        return;
      }

      const point = getStagePoint(
        frame,
        displaySizeRef.current.width,
        displaySizeRef.current.height,
        event,
      );
      const parameter = mapPointToParameter(
        point.x,
        point.y,
        displaySizeRef.current.width,
        displaySizeRef.current.height,
        viewportRef.current,
      );
      updateHover(parameter);

      const dragState = dragStateRef.current;
      if (!dragState) {
        return;
      }

      const deltaX = point.x - dragState.pointerStartX;
      const deltaY = point.y - dragState.pointerStartY;
      const viewportWidth = getComplexBoundsWidth(dragState.viewportAtStart);
      const viewportHeight = getComplexBoundsHeight(dragState.viewportAtStart);
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

    function handleLeave(): void {
      if (!dragStateRef.current) {
        updateHover(null);
      }
    }

    function handleMouseDown(event: MouseEvent): void {
      if (event.button !== 0) {
        return;
      }

      const frame = frameRef.current;
      if (!frame) {
        return;
      }

      const point = getStagePoint(
        frame,
        displaySizeRef.current.width,
        displaySizeRef.current.height,
        event,
      );
      dragStateRef.current = {
        pointerStartX: point.x,
        pointerStartY: point.y,
        viewportAtStart: viewportRef.current,
      };
      activeCanvas.style.cursor = "grabbing";
      event.preventDefault();
    }

    function handleMouseUp(event: MouseEvent): void {
      if (dragStateRef.current && onSelectParameterRef.current && activeCanvas.contains(event.target as Node)) {
        const frame = frameRef.current;
        if (!frame) {
          dragStateRef.current = null;
          activeCanvas.style.cursor = "crosshair";
          return;
        }

        const point = getStagePoint(
          frame,
          displaySizeRef.current.width,
          displaySizeRef.current.height,
          event,
        );
        const deltaX = point.x - dragStateRef.current.pointerStartX;
        const deltaY = point.y - dragStateRef.current.pointerStartY;
        const movedDistance = Math.hypot(deltaX, deltaY);

        if (movedDistance <= CLICK_SELECTION_THRESHOLD) {
          onSelectParameterRef.current(
            mapPointToParameter(
              point.x,
              point.y,
              displaySizeRef.current.width,
              displaySizeRef.current.height,
              viewportRef.current,
            ),
          );
        }
      }

      dragStateRef.current = null;
      activeCanvas.style.cursor = "crosshair";
    }

    function handleWheel(event: WheelEvent): void {
      event.preventDefault();
      const frame = frameRef.current;
      if (!frame) {
        return;
      }

      const point = getStagePoint(
        frame,
        displaySizeRef.current.width,
        displaySizeRef.current.height,
        event,
      );
      const anchor = mapPointToParameter(
        point.x,
        point.y,
        displaySizeRef.current.width,
        displaySizeRef.current.height,
        viewportRef.current,
      );
      setViewport((current) =>
        zoomViewport(
          current,
          anchor,
          event.deltaY < 0 ? ZOOM_IN_FACTOR : ZOOM_OUT_FACTOR,
          displaySizeRef.current.width,
          displaySizeRef.current.height,
        ),
      );
      updateHover(anchor);
      markInteractiveQuality();
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
  }, []);

  return (
    <div
      ref={frameRef}
      className="canvas-frame canvas-frame--mandelbrot"
      style={props.frameStyle}
    >
      <div className="canvas-overlay">{overlayText}</div>
      <div
        className="canvas-stage"
        style={{
          width: `${canvasResolution.displayWidth}px`,
          height: `${canvasResolution.displayHeight}px`,
        }}
      >
        <canvas
          ref={imageCanvasRef}
          className="canvas canvas--mandelbrot"
          width={presentedRenderSize.width}
          height={presentedRenderSize.height}
          style={{ backgroundColor: getPaletteCssBackground(props.palette ?? "ember") }}
        />
        <canvas
          ref={overlayCanvasRef}
          className="canvas canvas--mandelbrot canvas--overlay"
          width={canvasResolution.renderWidth}
          height={canvasResolution.renderHeight}
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
    </div>
  );
}
