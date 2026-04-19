import { useEffect, useRef, useState } from "preact/hooks";

interface ResponsiveCanvasResolutionOptions {
  fallbackDisplayWidth: number;
  fallbackDisplayHeight: number;
  maxRenderWidth: number;
  maxRenderHeight: number;
  qualityScale: number;
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

export function useResponsiveCanvasResolution(
  frameRef: preact.RefObject<HTMLElement>,
  options: ResponsiveCanvasResolutionOptions,
): CanvasResolution {
  const [displaySize, setDisplaySize] = useState({
    width: options.fallbackDisplayWidth,
    height: options.fallbackDisplayHeight,
  });
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
        setDisplaySize({
          width: rect.width,
          height: rect.height,
        });
      }
    }

    window.addEventListener("resize", updateDevicePixelRatio);
    return () => window.removeEventListener("resize", updateDevicePixelRatio);
  }, [frameRef]);

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

      setDisplaySize({
        width,
        height,
      });
    });

    observer.observe(element);
    return () => observer.disconnect();
  }, [frameRef]);

  const { renderWidth, renderHeight } = getBoundedRenderSize(
    displaySize.width,
    displaySize.height,
    devicePixelRatioRef.current,
    options.qualityScale,
    options.maxRenderWidth,
    options.maxRenderHeight,
  );

  return {
    displayWidth: displaySize.width,
    displayHeight: displaySize.height,
    renderWidth,
    renderHeight,
  };
}
