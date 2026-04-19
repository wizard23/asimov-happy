export function renderExplorerImageWithFallback(
  canvas: HTMLCanvasElement,
  width: number,
  height: number,
  render: (effectiveWidth: number, effectiveHeight: number) => void,
): void {
  let effectiveWidth = Math.max(1, width);
  let effectiveHeight = Math.max(1, height);
  let lastError: unknown = null;

  while (true) {
    canvas.width = effectiveWidth;
    canvas.height = effectiveHeight;

    try {
      render(effectiveWidth, effectiveHeight);
      return;
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
