import { getSquaredEuclideanDistance } from "./distance.js";
import type { SomCell, TrainingSample } from "../types/settings.js";

export function findBestMatchingUnit(
  cells: SomCell[],
  sample: TrainingSample,
): SomCell {
  const initialCell = cells[0];
  if (!initialCell) {
    throw new Error("Cannot find BMU without SOM cells.");
  }

  let bestCell = initialCell;
  let bestDistance = getSquaredEuclideanDistance(bestCell.prototypeVector, sample.featureVector);

  for (let index = 1; index < cells.length; index += 1) {
    const cell = cells[index];
    if (!cell) {
      continue;
    }

    const distance = getSquaredEuclideanDistance(cell.prototypeVector, sample.featureVector);
    if (distance < bestDistance || (distance === bestDistance && cell.index < bestCell.index)) {
      bestCell = cell;
      bestDistance = distance;
    }
  }

  return bestCell;
}
