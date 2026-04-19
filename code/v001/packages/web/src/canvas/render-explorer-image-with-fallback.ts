export function renderExplorerImageWithFallback(
  canvas: HTMLCanvasElement,
  width: number,
  height: number,
  render: (effectiveWidth: number, effectiveHeight: number) => void,
): { effectiveWidth: number; effectiveHeight: number } {
  let effectiveWidth = Math.max(1, width);
  let effectiveHeight = Math.max(1, height);
  let lastError: unknown = null;

  while (true) {
    canvas.width = effectiveWidth;
    canvas.height = effectiveHeight;

    try {
      render(effectiveWidth, effectiveHeight);
      return { effectiveWidth, effectiveHeight };
    } catch (error) {
      lastError = error;
      const nextWidth = Math.max(1, Math.floor(effectiveWidth / 2));
      const nextHeight = Math.max(1, Math.floor(effectiveHeight / 2));

      if (nextWidth === effectiveWidth && nextHeight === effectiveHeight) {
        throw lastError;
      }

      effectiveWidth = nextWidth;
      effectiveHeight = nextHeight;
    }
  }
}

export function renderExplorerImageWithSwap(
  visibleCanvas: HTMLCanvasElement,
  width: number,
  height: number,
  render: (renderTarget: HTMLCanvasElement, effectiveWidth: number, effectiveHeight: number) => void,
): { effectiveWidth: number; effectiveHeight: number } {
  const stagingCanvas = document.createElement("canvas");
  const { effectiveWidth, effectiveHeight } = renderExplorerImageWithFallback(
    stagingCanvas,
    width,
    height,
    (nextWidth, nextHeight) => {
      render(stagingCanvas, nextWidth, nextHeight);
    },
  );
  const webglContext =
    stagingCanvas.getContext("webgl", { preserveDrawingBuffer: true }) ??
    stagingCanvas.getContext("experimental-webgl", { preserveDrawingBuffer: true });
  if (webglContext && "finish" in webglContext && typeof webglContext.finish === "function") {
    webglContext.finish();
  }

  visibleCanvas.width = effectiveWidth;
  visibleCanvas.height = effectiveHeight;
  const context = visibleCanvas.getContext("2d");
  if (!context) {
    throw new Error("2D canvas context unavailable for explorer image presentation.");
  }

  context.clearRect(0, 0, visibleCanvas.width, visibleCanvas.height);
  context.drawImage(stagingCanvas, 0, 0);
  return { effectiveWidth, effectiveHeight };
}
