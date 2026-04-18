import type { ComplexBounds, ComplexParameter, JuliaViewport, SomTrainingResult } from "@asimov/minimal-shared";

export function getComplexBoundsWidth(viewport: ComplexBounds): number {
  return viewport.maxReal - viewport.minReal;
}

export function getComplexBoundsHeight(viewport: ComplexBounds): number {
  return viewport.maxImaginary - viewport.minImaginary;
}

export function mapComplexToPixelPosition(
  parameter: ComplexParameter,
  viewport: ComplexBounds,
  width: number,
  height: number,
): { left: number; top: number } {
  const normalizedX = (parameter.real - viewport.minReal) / getComplexBoundsWidth(viewport);
  const normalizedY = (viewport.maxImaginary - parameter.imaginary) / getComplexBoundsHeight(viewport);

  return {
    left: normalizedX * width,
    top: normalizedY * height,
  };
}

export function drawMandelbrotAxesOverlay(
  context: CanvasRenderingContext2D,
  viewport: ComplexBounds,
  width: number,
  height: number,
): void {
  context.save();
  context.strokeStyle = "rgba(255, 255, 255, 0.45)";
  context.lineWidth = 1;
  context.setLineDash([5, 4]);

  if (viewport.minReal <= 0 && viewport.maxReal >= 0) {
    const x = mapComplexToPixelPosition({ real: 0, imaginary: viewport.minImaginary }, viewport, width, height).left;
    context.beginPath();
    context.moveTo(x, 0);
    context.lineTo(x, height);
    context.stroke();
  }

  if (viewport.minImaginary <= 0 && viewport.maxImaginary >= 0) {
    const y = mapComplexToPixelPosition({ real: viewport.minReal, imaginary: 0 }, viewport, width, height).top;
    context.beginPath();
    context.moveTo(0, y);
    context.lineTo(width, y);
    context.stroke();
  }

  context.restore();
}

export function drawJuliaAxesOverlay(
  context: CanvasRenderingContext2D,
  viewport: JuliaViewport,
  width: number,
  height: number,
): void {
  context.save();
  context.strokeStyle = "rgba(255, 255, 255, 0.45)";
  context.lineWidth = 1;
  context.setLineDash([5, 4]);

  if (viewport.minReal <= 0 && viewport.maxReal >= 0) {
    const x = ((0 - viewport.minReal) / (viewport.maxReal - viewport.minReal)) * width;
    context.beginPath();
    context.moveTo(x, 0);
    context.lineTo(x, height);
    context.stroke();
  }

  if (viewport.minImaginary <= 0 && viewport.maxImaginary >= 0) {
    const y = ((viewport.maxImaginary - 0) / (viewport.maxImaginary - viewport.minImaginary)) * height;
    context.beginPath();
    context.moveTo(0, y);
    context.lineTo(width, y);
    context.stroke();
  }

  context.restore();
}

export function drawSomGridOverlay(
  context: CanvasRenderingContext2D,
  result: SomTrainingResult,
  viewport: ComplexBounds,
  width: number,
  height: number,
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

    const currentPoint = mapComplexToPixelPosition(current, viewport, width, height);
    const right = cellsByCoordinates.get(`${cell.x + 1},${cell.y}`);
    if (right) {
      const rightPoint = mapComplexToPixelPosition(right, viewport, width, height);
      context.beginPath();
      context.moveTo(currentPoint.left, currentPoint.top);
      context.lineTo(rightPoint.left, rightPoint.top);
      context.stroke();
    }

    const below = cellsByCoordinates.get(`${cell.x},${cell.y + 1}`);
    if (below) {
      const belowPoint = mapComplexToPixelPosition(below, viewport, width, height);
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

    const point = mapComplexToPixelPosition(cell.representativeParameter, viewport, width, height);
    context.beginPath();
    context.arc(point.left, point.top, 2.5, 0, Math.PI * 2);
    context.fill();
  }

  context.restore();
}

export function drawOrbitOverlay(
  context: CanvasRenderingContext2D,
  parameter: ComplexParameter,
  viewport: ComplexBounds,
  width: number,
  height: number,
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
    const position = mapComplexToPixelPosition(point, viewport, width, height);
    if (index === 0) {
      context.moveTo(position.left, position.top);
      return;
    }
    context.lineTo(position.left, position.top);
  });
  context.stroke();

  orbitPoints.forEach((point, index) => {
    const position = mapComplexToPixelPosition(point, viewport, width, height);
    context.beginPath();
    context.arc(position.left, position.top, index === 0 ? 3 : 2.25, 0, Math.PI * 2);
    context.fill();
  });

  context.restore();
}
