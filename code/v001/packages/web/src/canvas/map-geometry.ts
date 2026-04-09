import type { ComplexParameter, SomCell, SomTrainingResult, Topology } from "@asimov/minimal-shared";

export interface Point2D {
  x: number;
  y: number;
}

export interface WeightedParameter {
  parameter: ComplexParameter;
  weight: number;
}

export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

export function lerp(start: number, end: number, t: number): number {
  return start + (end - start) * t;
}

export function mixComplexParameter(
  first: ComplexParameter,
  second: ComplexParameter,
  t: number,
): ComplexParameter {
  return {
    real: lerp(first.real, second.real, t),
    imaginary: lerp(first.imaginary, second.imaginary, t),
  };
}

export function getCellCenter(
  topology: Topology,
  cell: SomCell,
  cellWidth: number,
  cellHeight: number,
): Point2D {
  if (topology === "squares") {
    return {
      x: (cell.x + 0.5) * cellWidth,
      y: (cell.y + 0.5) * cellHeight,
    };
  }

  const radius = Math.min(cellWidth, cellHeight) / 2;
  const horizontalSpacing = Math.sqrt(3) * radius;
  const verticalSpacing = 1.5 * radius;

  return {
    x: radius + cell.x * horizontalSpacing + (cell.y % 2 === 1 ? horizontalSpacing / 2 : 0),
    y: radius + cell.y * verticalSpacing,
  };
}

export function getHexCanvasSize(
  result: SomTrainingResult,
  cellWidth: number,
  cellHeight: number,
): Point2D {
  const radius = Math.min(cellWidth, cellHeight) / 2;
  const horizontalSpacing = Math.sqrt(3) * radius;
  const verticalSpacing = 1.5 * radius;

  return {
    x: horizontalSpacing * result.settings.somWidth + horizontalSpacing / 2 + radius,
    y: verticalSpacing * Math.max(result.settings.somHeight - 1, 0) + cellHeight,
  };
}

export function getSquareCanvasSize(
  result: SomTrainingResult,
  cellWidth: number,
  cellHeight: number,
): Point2D {
  return {
    x: result.settings.somWidth * cellWidth,
    y: result.settings.somHeight * cellHeight,
  };
}

export function getCanvasSize(
  result: SomTrainingResult,
  topology: Topology,
  cellWidth: number,
  cellHeight: number,
): Point2D {
  return topology === "squares"
    ? getSquareCanvasSize(result, cellWidth, cellHeight)
    : getHexCanvasSize(result, cellWidth, cellHeight);
}

function getCellByCoordinates(
  result: SomTrainingResult,
  x: number,
  y: number,
): SomCell | null {
  const index = y * result.settings.somWidth + x;
  return result.cells[index] ?? null;
}

function getInterpolatedSquareParameter(
  result: SomTrainingResult,
  point: Point2D,
  cellWidth: number,
  cellHeight: number,
): ComplexParameter | null {
  const maxX = result.settings.somWidth - 1;
  const maxY = result.settings.somHeight - 1;

  const gridX = clamp(point.x / cellWidth, 0, maxX);
  const gridY = clamp(point.y / cellHeight, 0, maxY);

  const x0 = Math.floor(gridX);
  const y0 = Math.floor(gridY);
  const x1 = Math.min(x0 + 1, maxX);
  const y1 = Math.min(y0 + 1, maxY);

  const topLeft = getCellByCoordinates(result, x0, y0)?.representativeParameter;
  const topRight = getCellByCoordinates(result, x1, y0)?.representativeParameter;
  const bottomLeft = getCellByCoordinates(result, x0, y1)?.representativeParameter;
  const bottomRight = getCellByCoordinates(result, x1, y1)?.representativeParameter;

  if (!topLeft || !topRight || !bottomLeft || !bottomRight) {
    return null;
  }

  const tx = clamp(gridX - x0, 0, 1);
  const ty = clamp(gridY - y0, 0, 1);

  const top = mixComplexParameter(topLeft, topRight, tx);
  const bottom = mixComplexParameter(bottomLeft, bottomRight, tx);
  return mixComplexParameter(top, bottom, ty);
}

function weightedComplexParameter(parameters: WeightedParameter[]): ComplexParameter | null {
  let weightSum = 0;
  let real = 0;
  let imaginary = 0;

  for (const entry of parameters) {
    weightSum += entry.weight;
    real += entry.parameter.real * entry.weight;
    imaginary += entry.parameter.imaginary * entry.weight;
  }

  if (weightSum <= 0) {
    return null;
  }

  return {
    real: real / weightSum,
    imaginary: imaginary / weightSum,
  };
}

function getInterpolatedHexParameter(
  result: SomTrainingResult,
  point: Point2D,
  cellWidth: number,
  cellHeight: number,
): ComplexParameter | null {
  const withDistances = result.cells
    .map((cell) => {
      const parameter = cell.representativeParameter;
      if (!parameter) {
        return null;
      }

      const center = getCellCenter("hexagons", cell, cellWidth, cellHeight);
      const dx = center.x - point.x;
      const dy = center.y - point.y;
      const distance = Math.sqrt(dx * dx + dy * dy);

      return {
        parameter,
        distance,
      };
    })
    .filter((entry): entry is { parameter: ComplexParameter; distance: number } => entry !== null)
    .sort((left, right) => left.distance - right.distance)
    .slice(0, 3);

  if (withDistances.length === 0) {
    return null;
  }

  if (withDistances[0]?.distance === 0) {
    return withDistances[0].parameter;
  }

  return weightedComplexParameter(
    withDistances.map((entry) => ({
      parameter: entry.parameter,
      weight: 1 / Math.max(entry.distance, 1e-6),
    })),
  );
}

export function getInterpolatedParameterAtPoint(
  result: SomTrainingResult,
  point: Point2D,
  cellWidth: number,
  cellHeight: number,
): ComplexParameter | null {
  return result.settings.topology === "squares"
    ? getInterpolatedSquareParameter(result, point, cellWidth, cellHeight)
    : getInterpolatedHexParameter(result, point, cellWidth, cellHeight);
}

export function getClosestCellAtPoint(
  result: SomTrainingResult,
  point: Point2D,
  cellWidth: number,
  cellHeight: number,
): SomCell | null {
  let bestCell: SomCell | null = null;
  let bestDistance = Number.POSITIVE_INFINITY;

  for (const cell of result.cells) {
    const center = getCellCenter(result.settings.topology, cell, cellWidth, cellHeight);
    const dx = center.x - point.x;
    const dy = center.y - point.y;
    const distance = dx * dx + dy * dy;

    if (distance < bestDistance || (distance === bestDistance && bestCell && cell.index < bestCell.index)) {
      bestCell = cell;
      bestDistance = distance;
    } else if (bestCell === null) {
      bestCell = cell;
      bestDistance = distance;
    }
  }

  return bestCell;
}
