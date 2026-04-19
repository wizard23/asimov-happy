import { useEffect, useRef, useState } from "preact/hooks";

interface ResponsiveCanvasResolutionOptions {
  fallbackDisplayWidth: number;
  fallbackDisplayHeight: number;
  maxRenderWidth: number;
  maxRenderHeight: number;
  qualityScale: number;
  aspectRatio: number;
  sizingMode?: "contain" | "width-driven" | "height-driven";
}

interface CanvasResolution {
  displayWidth: number;
  displayHeight: number;
  renderWidth: number;
  renderHeight: number;
}

function getDevicePixelRatio(): number {
  if (typeof window === "undefined") {
    return 1;
  }

  return Math.max(window.devicePixelRatio || 1, 1);
}

function getBoundedRenderSize(
  displayWidth: number,
  displayHeight: number,
  devicePixelRatio: number,
  qualityScale: number,
  maxRenderWidth: number,
  maxRenderHeight: number,
): { renderWidth: number; renderHeight: number } {
  const rawRenderWidth = Math.max(1, Math.round(displayWidth * devicePixelRatio * qualityScale));
  const rawRenderHeight = Math.max(1, Math.round(displayHeight * devicePixelRatio * qualityScale));
  const scale = Math.min(
    1,
    maxRenderWidth / rawRenderWidth,
    maxRenderHeight / rawRenderHeight,
  );

  return {
    renderWidth: Math.max(1, Math.round(rawRenderWidth * scale)),
    renderHeight: Math.max(1, Math.round(rawRenderHeight * scale)),
  };
}

function resolveDisplaySize(
  measuredWidth: number,
  measuredHeight: number,
  options: ResponsiveCanvasResolutionOptions,
): { width: number; height: number } {
  const sizingMode = options.sizingMode ?? "contain";

  if (sizingMode === "contain") {
    const maxWidth = measuredWidth > 0 ? measuredWidth : options.fallbackDisplayWidth;
    const maxHeight = measuredHeight > 0 ? measuredHeight : options.fallbackDisplayHeight;

    if (maxWidth / maxHeight > options.aspectRatio) {
      const height = maxHeight;
      return {
        width: height * options.aspectRatio,
        height,
      };
    }

    const width = maxWidth;
    return {
      width,
      height: width / options.aspectRatio,
    };
  }

  if (sizingMode === "height-driven") {
    const height = measuredHeight > 0 ? measuredHeight : options.fallbackDisplayHeight;
    return {
      width: height * options.aspectRatio,
      height,
    };
  }

  const width = measuredWidth > 0 ? measuredWidth : options.fallbackDisplayWidth;
  return {
    width,
    height: width / options.aspectRatio,
  };
}

export function useResponsiveCanvasResolution(
  frameRef: preact.RefObject<HTMLElement>,
  options: ResponsiveCanvasResolutionOptions,
): CanvasResolution {
  const {
    aspectRatio,
    fallbackDisplayHeight,
    fallbackDisplayWidth,
    maxRenderHeight,
    maxRenderWidth,
    qualityScale,
    sizingMode,
  } = options;
  const resolvedSizingMode = sizingMode ?? "contain";
  const initialDisplaySize = resolveDisplaySize(fallbackDisplayWidth, fallbackDisplayHeight, options);
  const [displaySize, setDisplaySize] = useState(initialDisplaySize);
  const devicePixelRatioRef = useRef(getDevicePixelRatio());

  useEffect(() => {
    function updateDevicePixelRatio(): void {
      devicePixelRatioRef.current = getDevicePixelRatio();
      const element = frameRef.current;
      if (!element) {
        return;
      }

      const rect = element.getBoundingClientRect();
      if (rect.width > 0 && rect.height > 0) {
        setDisplaySize(
          resolveDisplaySize(rect.width, rect.height, {
            aspectRatio,
            fallbackDisplayHeight,
            fallbackDisplayWidth,
            maxRenderHeight,
            maxRenderWidth,
            qualityScale,
            sizingMode: resolvedSizingMode,
          }),
        );
      }
    }

    window.addEventListener("resize", updateDevicePixelRatio);
    return () => window.removeEventListener("resize", updateDevicePixelRatio);
  }, [
    aspectRatio,
    fallbackDisplayHeight,
    fallbackDisplayWidth,
    frameRef,
    maxRenderHeight,
    maxRenderWidth,
    qualityScale,
    resolvedSizingMode,
  ]);

  useEffect(() => {
    const element = frameRef.current;
    if (!element) {
      return;
    }

    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (!entry) {
        return;
      }

      const { width, height } = entry.contentRect;
      if (width <= 0 || height <= 0) {
        return;
      }

      setDisplaySize(
        resolveDisplaySize(width, height, {
          aspectRatio,
          fallbackDisplayHeight,
          fallbackDisplayWidth,
          maxRenderHeight,
          maxRenderWidth,
          qualityScale,
          sizingMode: resolvedSizingMode,
        }),
      );
    });

    observer.observe(element);
    return () => observer.disconnect();
  }, [
    aspectRatio,
    fallbackDisplayHeight,
    fallbackDisplayWidth,
    frameRef,
    maxRenderHeight,
    maxRenderWidth,
    qualityScale,
    resolvedSizingMode,
  ]);

  const { renderWidth, renderHeight } = getBoundedRenderSize(
    displaySize.width,
    displaySize.height,
    devicePixelRatioRef.current,
    qualityScale,
    maxRenderWidth,
    maxRenderHeight,
  );

  return {
    displayWidth: displaySize.width,
    displayHeight: displaySize.height,
    renderWidth,
    renderHeight,
  };
}
