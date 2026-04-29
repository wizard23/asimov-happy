import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "preact/hooks";
import {
  JULIA_VIEWPORT,
  type ComplexParameter,
  type JuliaViewport,
} from "@asimov/minimal-shared";
import crosshairUrl from "../assets/noun-crosshair-59595.svg";
import {
  getPaletteCssBackground,
  type FractalPaletteId,
  type PaletteMappingMode,
  type RgbColor,
} from "./fractal-palette.js";
import { CPU_EXPLORER_IMAGE_RENDERER } from "./explorer-cpu-renderer.js";
import type { EscapeBandConfiguration, ExplorerImageRenderer } from "./explorer-renderer.js";
import { drawJuliaAxesOverlay } from "./explorer-overlays.js";
import {
  renderExplorerImageWithFallback,
  renderExplorerImageWithSwap,
} from "./render-explorer-image-with-fallback.js";
import { useResponsiveCanvasResolution } from "./use-responsive-canvas-resolution.js";

const VIEWER_FALLBACK_SIZE = 360;
const VIEWER_MAX_RENDER_SIZE = 2048;
const VIEWPORT_PRECISION_SAFETY_FACTOR = 8;
const CLICK_SELECTION_THRESHOLD = 5;
const ZOOM_IN_FACTOR = 0.85;
const ZOOM_OUT_FACTOR = 1 / ZOOM_IN_FACTOR;

interface DragState {
  pointerStartX: number;
  pointerStartY: number;
  viewportAtStart: JuliaViewport;
}

interface PointerSample {
  x: number;
  y: number;
}

interface PinchState {
  initialDistance: number;
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

function formatZoomLevel(viewport: JuliaViewport): string {
  const zoom = getViewportHeight(JULIA_VIEWPORT) / getViewportHeight(viewport);
  const digits = zoom >= 100 ? 0 : zoom >= 10 ? 1 : 2;
  return `${zoom.toFixed(digits)}x`;
}

function mapToRelativePosition(
  parameter: ComplexParameter,
  viewport: JuliaViewport,
): { left: string; top: string } | null {
  const normalizedX = (parameter.real - viewport.minReal) / getViewportWidth(viewport);
  const normalizedY = (viewport.maxImaginary - parameter.imaginary) / getViewportHeight(viewport);

  if (normalizedX < 0 || normalizedX > 1 || normalizedY < 0 || normalizedY > 1) {
    return null;
  }

  return {
    left: `${normalizedX * 100}%`,
    top: `${normalizedY * 100}%`,
  };
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
  displayWidth: number,
  displayHeight: number,
): JuliaViewport {
  const viewportWidth = getViewportWidth(viewport);
  const viewportHeight = getViewportHeight(viewport);
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
  const normalizedX = (anchor.real - viewport.minReal) / getViewportWidth(viewport);
  const normalizedY = (viewport.maxImaginary - anchor.imaginary) / getViewportHeight(viewport);

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

export function JuliaViewerCanvas(props: {
  parameter: ComplexParameter | null;
  selectedParameter?: ComplexParameter | null;
  hoveredMandelbrotParameter?: ComplexParameter | null;
  hoveredJuliaCoordinate?: ComplexParameter | null;
  onSelectParameter?: (parameter: ComplexParameter) => void;
  onHoverCoordinate?: (parameter: ComplexParameter | null) => void;
  iterations: number;
  palette: FractalPaletteId;
  paletteMappingMode?: PaletteMappingMode;
  paletteCycles?: number;
  binaryInteriorColor?: RgbColor;
  binaryExteriorColor?: RgbColor;
  escapeBands?: EscapeBandConfiguration;
  precisionLimbCount?: number;
  markerScale?: number;
  showAxes?: boolean;
  enableTwoQualityLevels?: boolean;
  renderer?: ExplorerImageRenderer;
  resolutionSizingMode?: "contain" | "cover" | "width-driven" | "height-driven";
  frameStyle?: preact.JSX.CSSProperties;
}): preact.JSX.Element {
  const frameRef = useRef<HTMLDivElement | null>(null);
  const imageCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const overlayCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const dragStateRef = useRef<DragState | null>(null);
  const activePointersRef = useRef<Map<number, PointerSample>>(new Map());
  const pinchStateRef = useRef<PinchState | null>(null);
  const displaySizeRef = useRef({
    width: VIEWER_FALLBACK_SIZE,
    height: VIEWER_FALLBACK_SIZE,
  });
  const enableTwoQualityLevelsRef = useRef(Boolean(props.enableTwoQualityLevels));
  const parameterRef = useRef(props.parameter);
  const onSelectParameterRef = useRef(props.onSelectParameter);
  const onHoverCoordinateRef = useRef(props.onHoverCoordinate);
  const viewportRef = useRef<JuliaViewport>(JULIA_VIEWPORT);
  const settleQualityTimeoutRef = useRef<number | null>(null);
  const [viewport, setViewport] = useState<JuliaViewport>(JULIA_VIEWPORT);
  const [hoveredCoordinate, setHoveredCoordinate] = useState<ComplexParameter | null>(null);
  const [qualityScale, setQualityScale] = useState(1);
  const [presentedRenderSize, setPresentedRenderSize] = useState(() => ({
    width: VIEWER_FALLBACK_SIZE,
    height: VIEWER_FALLBACK_SIZE,
  }));
  const [renderError, setRenderError] = useState<string | null>(null);
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
    renderError ? ` \u00b7 ERR ${renderError}` : ""
  }`;
  const hoverOverlayText = formatComplex(hoveredCoordinate);
  const markerSize = 36 * (props.markerScale ?? 1);

  useEffect(() => {
    viewportRef.current = viewport;
  }, [viewport]);

  useEffect(() => {
    parameterRef.current = props.parameter;
  }, [props.parameter]);

  useEffect(() => {
    onSelectParameterRef.current = props.onSelectParameter;
  }, [props.onSelectParameter]);

  useEffect(() => {
    onHoverCoordinateRef.current = props.onHoverCoordinate;
  }, [props.onHoverCoordinate]);

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

  useLayoutEffect(() => {
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
                renderer.renderJulia(canvas, {
                  parameter,
                  viewport,
                  width: effectiveWidth,
                  height: effectiveHeight,
                  iterations: props.iterations,
                  palette: props.palette,
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
                renderer.renderJulia(renderTarget, {
                  parameter,
                  viewport,
                  width: effectiveWidth,
                  height: effectiveHeight,
                  iterations: props.iterations,
                  palette: props.palette,
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
    props.parameter,
    props.precisionLimbCount,
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

      const anchor = mapPointToCoordinate(
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

    function handlePointerDown(event: PointerEvent): void {
      if (event.button !== 0 || !parameterRef.current) {
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
      if (activePointersRef.current.has(event.pointerId)) {
        activePointersRef.current.set(event.pointerId, {
          x: point.x,
          y: point.y,
        });
      }
      if (event.pointerType === "mouse" && parameterRef.current) {
        const hoveredPoint = mapPointToCoordinate(
          point.x,
          point.y,
          displaySizeRef.current.width,
          displaySizeRef.current.height,
          viewportRef.current,
        );
        setHoveredCoordinate(hoveredPoint);
        onHoverCoordinateRef.current?.(hoveredPoint);
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

    function handlePointerUp(event: PointerEvent): void {
      const pointerCountBeforeRelease = activePointersRef.current.size;
      const dragState = dragStateRef.current;
      const frame = frameRef.current;
      if (
        pointerCountBeforeRelease === 1 &&
        dragState &&
        onSelectParameterRef.current &&
        frame &&
        activeCanvas.contains(event.target as Node)
      ) {
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
            mapPointToCoordinate(
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
      activeCanvas.style.cursor = parameterRef.current ? "none" : "default";
    }

    function handlePointerCancel(event: PointerEvent): void {
      activePointersRef.current.delete(event.pointerId);
      if (activeCanvas.hasPointerCapture(event.pointerId)) {
        activeCanvas.releasePointerCapture(event.pointerId);
      }
      dragStateRef.current = null;
      pinchStateRef.current = null;
      activeCanvas.style.cursor = parameterRef.current ? "none" : "default";
    }

    function handlePointerLeave(event: PointerEvent): void {
      if (event.pointerType === "mouse") {
        setHoveredCoordinate(null);
        onHoverCoordinateRef.current?.(null);
      }
    }

    function handleWheel(event: WheelEvent): void {
      if (!parameterRef.current) {
        return;
      }

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
      const anchor = mapPointToCoordinate(
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
      markInteractiveQuality();
    }

    activeCanvas.style.cursor = parameterRef.current ? "none" : "default";
    activeCanvas.addEventListener("pointerdown", handlePointerDown);
    activeCanvas.addEventListener("pointermove", handlePointerMove);
    activeCanvas.addEventListener("pointerup", handlePointerUp);
    activeCanvas.addEventListener("pointercancel", handlePointerCancel);
    activeCanvas.addEventListener("pointerleave", handlePointerLeave);
    activeCanvas.addEventListener("wheel", handleWheel, { passive: false });

    return () => {
      activePointersRef.current.clear();
      dragStateRef.current = null;
      pinchStateRef.current = null;
      activeCanvas.style.cursor = "";
      activeCanvas.removeEventListener("pointerdown", handlePointerDown);
      activeCanvas.removeEventListener("pointermove", handlePointerMove);
      activeCanvas.removeEventListener("pointerup", handlePointerUp);
      activeCanvas.removeEventListener("pointercancel", handlePointerCancel);
      activeCanvas.removeEventListener("pointerleave", handlePointerLeave);
      activeCanvas.removeEventListener("wheel", handleWheel);
    };
  }, []);

  useEffect(() => {
    const canvas = overlayCanvasRef.current;
    if (!canvas || dragStateRef.current) {
      return;
    }

    canvas.style.cursor = props.parameter ? "none" : "default";
  }, [props.parameter]);

  return (
    <div
      ref={frameRef}
      className="canvas-frame canvas-frame--viewer"
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
          ref={imageCanvasRef}
          className="canvas canvas--viewer"
          width={presentedRenderSize.width}
          height={presentedRenderSize.height}
          style={{ backgroundColor: getPaletteCssBackground(props.palette) }}
        />
        <canvas
          ref={overlayCanvasRef}
          className="canvas canvas--viewer canvas--overlay"
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
            alt="Active Julia parameter in the Julia set"
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
