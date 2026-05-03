import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "preact/hooks";
import type { ComplexBounds, ComplexParameter, SomTrainingResult } from "@asimov/minimal-shared";
import crosshairUrl from "../assets/noun-crosshair-59595.svg";
import {
  getPaletteCssBackground,
  type FractalPaletteId,
  type PaletteMappingMode,
  type RgbColor,
} from "./fractal-palette.js";
import { CPU_EXPLORER_IMAGE_RENDERER } from "./explorer-cpu-renderer.js";
import {
  getExplorerRendererSurfaceFamily,
  type EscapeBandConfiguration,
  type ExplorerImageRenderer,
} from "./explorer-renderer.js";
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
export const DEFAULT_MANDELBROT_VIEWPORT: ComplexBounds = {
  minReal: -2.2,
  maxReal: 1.0,
  minImaginary: -1.0666666666666667,
  maxImaginary: 1.0666666666666667,
};
const ZOOM_IN_FACTOR = 0.85;
const ZOOM_OUT_FACTOR = 1 / ZOOM_IN_FACTOR;
const DEFAULT_INTERACTIVE_QUALITY_SCALE = 0.2;
const DEFAULT_QUALITY_SETTLE_DELAY_MS = 300;

interface DragState {
  pointerStartX: number;
  pointerStartY: number;
  viewportAtStart: ComplexBounds;
}

interface PointerSample {
  x: number;
  y: number;
  pointerType: string;
}

interface PinchState {
  initialDistance: number;
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
  event: { clientX: number; clientY: number },
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
  hoveredMandelbrotParameter?: ComplexParameter | null;
  hoveredJuliaCoordinate?: ComplexParameter | null;
  onHoverParameter: (parameter: ComplexParameter | null) => void;
  onSelectParameter?: (parameter: ComplexParameter) => void;
  result?: SomTrainingResult | null;
  showSomGrid?: boolean;
  showAxes?: boolean;
  showOrbit?: boolean;
  enableTwoQualityLevels?: boolean;
  interactiveQualityScale?: number;
  qualitySettleDelayMs?: number;
  initialViewport?: ComplexBounds;
  viewportOverrideVersion?: number;
  onViewportChange?: (viewport: ComplexBounds) => void;
  orbitSteps?: number;
  iterations?: number;
  palette?: FractalPaletteId;
  paletteMappingMode?: PaletteMappingMode;
  paletteCycles?: number;
  binaryInteriorColor?: RgbColor;
  binaryExteriorColor?: RgbColor;
  escapeBands?: EscapeBandConfiguration;
  precisionLimbCount?: number;
  markerScale?: number;
  renderer?: ExplorerImageRenderer;
  resolutionSizingMode?: "contain" | "cover" | "width-driven" | "height-driven";
  attractingPeriodLabel?: string | null;
  frameStyle?: preact.JSX.CSSProperties;
}): preact.JSX.Element {
  const frameRef = useRef<HTMLDivElement | null>(null);
  const imageCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const overlayCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const dragStateRef = useRef<DragState | null>(null);
  const activePointersRef = useRef<Map<number, PointerSample>>(new Map());
  const pinchStateRef = useRef<PinchState | null>(null);
  const displaySizeRef = useRef({
    width: MANDELBROT_FALLBACK_WIDTH,
    height: MANDELBROT_FALLBACK_HEIGHT,
  });
  const enableTwoQualityLevelsRef = useRef(Boolean(props.enableTwoQualityLevels));
  const onHoverParameterRef = useRef(props.onHoverParameter);
  const onSelectParameterRef = useRef(props.onSelectParameter);
  const viewportRef = useRef<ComplexBounds>(props.initialViewport ?? DEFAULT_MANDELBROT_VIEWPORT);
  const settleQualityTimeoutRef = useRef<number | null>(null);
  const [viewport, setViewport] = useState<ComplexBounds>(props.initialViewport ?? DEFAULT_MANDELBROT_VIEWPORT);
  const [hoveredParameter, setHoveredParameter] = useState<ComplexParameter | null>(null);
  const [qualityScale, setQualityScale] = useState(1);
  const [presentedRenderSize, setPresentedRenderSize] = useState(() => ({
    width: MANDELBROT_FALLBACK_WIDTH,
    height: MANDELBROT_FALLBACK_HEIGHT,
  }));
  const [renderError, setRenderError] = useState<string | null>(null);
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
  const imageRenderer = props.renderer ?? CPU_EXPLORER_IMAGE_RENDERER;
  const rendererSurfaceFamily = getExplorerRendererSurfaceFamily(imageRenderer.id);

  const activeCrosshairPosition = useMemo(
    () => (props.parameter ? mapToRelativePosition(props.parameter, viewport) : null),
    [props.parameter, viewport],
  );
  const mandelbrotHoverCrosshairPosition = useMemo(
    () =>
      props.hoveredMandelbrotParameter
        ? mapToRelativePosition(props.hoveredMandelbrotParameter, viewport)
        : null,
    [props.hoveredMandelbrotParameter, viewport],
  );
  const juliaHoverCrosshairPosition = useMemo(
    () =>
      props.hoveredJuliaCoordinate
        ? mapToRelativePosition(props.hoveredJuliaCoordinate, viewport)
        : null,
    [props.hoveredJuliaCoordinate, viewport],
  );
  const overlayText = `${formatComplex(props.parameter)} \u00b7 ${formatZoomLevel(viewport)}${
    props.attractingPeriodLabel ? ` \u00b7 ${props.attractingPeriodLabel}` : ""
  }${renderError ? ` \u00b7 ERR ${renderError}` : ""}`;
  const hoverOverlayText = formatComplex(hoveredParameter);
  const markerSize = 36 * (props.markerScale ?? 1);

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
    props.onViewportChange?.(viewport);
  }, [props.onViewportChange, viewport]);

  useEffect(() => {
    if (!props.initialViewport) {
      return;
    }

    viewportRef.current = props.initialViewport;
    setViewport(props.initialViewport);
  }, [props.initialViewport, props.viewportOverrideVersion]);

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

    setQualityScale(props.interactiveQualityScale ?? DEFAULT_INTERACTIVE_QUALITY_SCALE);
    if (settleQualityTimeoutRef.current !== null) {
      window.clearTimeout(settleQualityTimeoutRef.current);
    }
    settleQualityTimeoutRef.current = window.setTimeout(() => {
      setQualityScale(1);
      settleQualityTimeoutRef.current = null;
    }, props.qualitySettleDelayMs ?? DEFAULT_QUALITY_SETTLE_DELAY_MS);
  }

  useEffect(() => {
    if (!props.enableTwoQualityLevels) {
      setQualityScale(1);
    }
  }, [props.enableTwoQualityLevels]);

  useEffect(() => {
    setRenderError(null);
  }, [rendererSurfaceFamily]);

  useLayoutEffect(() => {
    const canvas = imageCanvasRef.current;
    if (!canvas) {
      return;
    }

    const renderer = imageRenderer;
    const binaryColorOptions = {
      ...(props.binaryInteriorColor ? { binaryInteriorColor: props.binaryInteriorColor } : {}),
      ...(props.binaryExteriorColor ? { binaryExteriorColor: props.binaryExteriorColor } : {}),
    };
    const escapeBandOptions = props.escapeBands ? { escapeBands: props.escapeBands } : {};
    const precisionOptions =
      props.precisionLimbCount !== undefined ? { precisionLimbCount: props.precisionLimbCount } : {};
    try {
      const nextPresentedSize =
        renderer.id === "webgl" || renderer.id === "webgl-arbitrary-precision"
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
                  ...binaryColorOptions,
                  ...escapeBandOptions,
                  ...precisionOptions,
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
                  ...binaryColorOptions,
                  ...escapeBandOptions,
                  ...precisionOptions,
                });
              },
            );
      setPresentedRenderSize({
        width: nextPresentedSize.effectiveWidth,
        height: nextPresentedSize.effectiveHeight,
      });
      setRenderError(null);
    } catch (error) {
      setRenderError(error instanceof Error ? error.message : String(error));
    }
  }, [
    canvasResolution.renderHeight,
    canvasResolution.renderWidth,
    props.iterations,
    props.palette,
    props.binaryExteriorColor,
    props.binaryInteriorColor,
    props.escapeBands,
    props.paletteCycles,
    props.paletteMappingMode,
    props.precisionLimbCount,
    imageRenderer,
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

    function getTwoPointerSamples(): [PointerSample, PointerSample] | null {
      const pointerEntries = [...activePointersRef.current.values()];
      if (pointerEntries.length < 2) {
        return null;
      }
      return [pointerEntries[0]!, pointerEntries[1]!];
    }

    function updatePanFromPoint(point: { x: number; y: number }): void {
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

    function updatePinchViewport(): void {
      const pinchState = pinchStateRef.current;
      const pointers = getTwoPointerSamples();
      if (!pinchState || !pointers) {
        return;
      }

      const [first, second] = pointers;
      const midpoint = {
        x: (first.x + second.x) / 2,
        y: (first.y + second.y) / 2,
      };
      const currentDistance = Math.hypot(second.x - first.x, second.y - first.y);
      if (currentDistance <= 0) {
        return;
      }

      const anchor = mapPointToParameter(
        midpoint.x,
        midpoint.y,
        displaySizeRef.current.width,
        displaySizeRef.current.height,
        pinchState.viewportAtStart,
      );
      setViewport(
        zoomViewport(
          pinchState.viewportAtStart,
          anchor,
          pinchState.initialDistance / currentDistance,
          displaySizeRef.current.width,
          displaySizeRef.current.height,
        ),
      );
      markInteractiveQuality();
    }

    function handlePointerMove(event: PointerEvent): void {
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
      const existingPointer = activePointersRef.current.get(event.pointerId);
      if (existingPointer) {
        activePointersRef.current.set(event.pointerId, {
          x: point.x,
          y: point.y,
          pointerType: event.pointerType,
        });
      }

      if (event.pointerType === "mouse") {
        const parameter = mapPointToParameter(
          point.x,
          point.y,
          displaySizeRef.current.width,
          displaySizeRef.current.height,
          viewportRef.current,
        );
        updateHover(parameter);
      }

      if (pinchStateRef.current && activePointersRef.current.size >= 2) {
        updatePinchViewport();
        return;
      }

      if (!dragStateRef.current || activePointersRef.current.size !== 1) {
        return;
      }

      updatePanFromPoint(point);
    }

    function handlePointerLeave(event: PointerEvent): void {
      if (event.pointerType === "mouse" && !dragStateRef.current && !pinchStateRef.current) {
        updateHover(null);
      }
    }

    function handlePointerDown(event: PointerEvent): void {
      if (event.button !== 0 || (event.pointerType !== "mouse" && event.pointerType !== "touch")) {
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
      activePointersRef.current.set(event.pointerId, {
        x: point.x,
        y: point.y,
        pointerType: event.pointerType,
      });
      activeCanvas.setPointerCapture(event.pointerId);

      if (activePointersRef.current.size >= 2) {
        const pointers = getTwoPointerSamples();
        if (pointers) {
          const [first, second] = pointers;
          pinchStateRef.current = {
            initialDistance: Math.max(1, Math.hypot(second.x - first.x, second.y - first.y)),
            viewportAtStart: viewportRef.current,
          };
          dragStateRef.current = null;
        }
      } else {
        pinchStateRef.current = null;
        dragStateRef.current = {
          pointerStartX: point.x,
          pointerStartY: point.y,
          viewportAtStart: viewportRef.current,
        };
      }
      event.preventDefault();
    }

    function handlePointerUp(event: PointerEvent): void {
      const frame = frameRef.current;
      const pointerCountBeforeRelease = activePointersRef.current.size;
      const dragState = dragStateRef.current;
      const shouldSelect =
        pointerCountBeforeRelease === 1 &&
        dragState !== null &&
        event.pointerType !== "mouse" &&
        Boolean(onSelectParameterRef.current) &&
        frame !== null;

      if (shouldSelect) {
        const point = getStagePoint(
          frame,
          displaySizeRef.current.width,
          displaySizeRef.current.height,
          event,
        );
        const deltaX = point.x - dragState.pointerStartX;
        const deltaY = point.y - dragState.pointerStartY;
        const movedDistance = Math.hypot(deltaX, deltaY);

        if (movedDistance <= 10) {
          onSelectParameterRef.current!(
            mapPointToParameter(
              point.x,
              point.y,
              displaySizeRef.current.width,
              displaySizeRef.current.height,
              viewportRef.current,
            ),
          );
        }
      } else if (
        pointerCountBeforeRelease === 1 &&
        dragState &&
        onSelectParameterRef.current &&
        event.pointerType === "mouse" &&
        activeCanvas.contains(event.target as Node)
      ) {
        const frame = frameRef.current;
        if (!frame) {
          dragStateRef.current = null;
          activeCanvas.style.cursor = "none";
          return;
        }

        const point = getStagePoint(
          frame,
          displaySizeRef.current.width,
          displaySizeRef.current.height,
          event,
        );
        const deltaX = point.x - dragState.pointerStartX;
        const deltaY = point.y - dragState.pointerStartY;
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

      activePointersRef.current.delete(event.pointerId);
      if (activeCanvas.hasPointerCapture(event.pointerId)) {
        activeCanvas.releasePointerCapture(event.pointerId);
      }
      dragStateRef.current = null;
      pinchStateRef.current = null;
      activeCanvas.style.cursor = "none";
    }

    function handlePointerCancel(event: PointerEvent): void {
      activePointersRef.current.delete(event.pointerId);
      if (activeCanvas.hasPointerCapture(event.pointerId)) {
        activeCanvas.releasePointerCapture(event.pointerId);
      }
      dragStateRef.current = null;
      pinchStateRef.current = null;
      activeCanvas.style.cursor = "none";
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

    activeCanvas.style.cursor = "none";
    activeCanvas.addEventListener("pointermove", handlePointerMove);
    activeCanvas.addEventListener("pointerleave", handlePointerLeave);
    activeCanvas.addEventListener("pointerdown", handlePointerDown);
    activeCanvas.addEventListener("pointerup", handlePointerUp);
    activeCanvas.addEventListener("pointercancel", handlePointerCancel);
    activeCanvas.addEventListener("wheel", handleWheel, { passive: false });

    return () => {
      activePointersRef.current.clear();
      dragStateRef.current = null;
      pinchStateRef.current = null;
      activeCanvas.style.cursor = "";
      activeCanvas.removeEventListener("pointermove", handlePointerMove);
      activeCanvas.removeEventListener("pointerleave", handlePointerLeave);
      activeCanvas.removeEventListener("pointerdown", handlePointerDown);
      activeCanvas.removeEventListener("pointerup", handlePointerUp);
      activeCanvas.removeEventListener("pointercancel", handlePointerCancel);
      activeCanvas.removeEventListener("wheel", handleWheel);
    };
  }, []);

  return (
    <div
      ref={frameRef}
      className="canvas-frame canvas-frame--mandelbrot"
      style={props.frameStyle}
    >
      <div className="canvas-overlay">{overlayText}</div>
      <div className="canvas-overlay canvas-overlay--right">{hoverOverlayText}</div>
      <div
        className="canvas-stage"
        style={{
          width: `${canvasResolution.displayWidth}px`,
          height: `${canvasResolution.displayHeight}px`,
        }}
      >
        <canvas
          key={rendererSurfaceFamily}
          ref={imageCanvasRef}
          className="canvas canvas--mandelbrot"
          width={
            imageRenderer.id === "cpu"
              ? canvasResolution.renderWidth
              : presentedRenderSize.width
          }
          height={
            imageRenderer.id === "cpu"
              ? canvasResolution.renderHeight
              : presentedRenderSize.height
          }
          style={{ backgroundColor: getPaletteCssBackground(props.palette ?? "ember") }}
        />
        <canvas
          ref={overlayCanvasRef}
          className="canvas canvas--mandelbrot canvas--overlay"
          width={canvasResolution.renderWidth}
          height={canvasResolution.renderHeight}
        />
        {mandelbrotHoverCrosshairPosition ? (
          <img
            className="mandelbrot-crosshair mandelbrot-crosshair--hover-mandelbrot"
            src={crosshairUrl}
            alt="Hover position from the Mandelbrot set"
            style={{
              left: mandelbrotHoverCrosshairPosition.left,
              top: mandelbrotHoverCrosshairPosition.top,
              width: `${markerSize}px`,
              height: `${markerSize}px`,
            }}
          />
        ) : null}
        {juliaHoverCrosshairPosition ? (
          <img
            className="mandelbrot-crosshair mandelbrot-crosshair--hover-julia"
            src={crosshairUrl}
            alt="Hover position from the Julia set"
            style={{
              left: juliaHoverCrosshairPosition.left,
              top: juliaHoverCrosshairPosition.top,
              width: `${markerSize}px`,
              height: `${markerSize}px`,
            }}
          />
        ) : null}
        {activeCrosshairPosition ? (
          <img
            className="mandelbrot-crosshair mandelbrot-crosshair--active"
            src={crosshairUrl}
            alt="Active Julia parameter on the Mandelbrot set"
            style={{
              left: activeCrosshairPosition.left,
              top: activeCrosshairPosition.top,
              width: `${markerSize}px`,
              height: `${markerSize}px`,
            }}
          />
        ) : null}
      </div>
    </div>
  );
}
