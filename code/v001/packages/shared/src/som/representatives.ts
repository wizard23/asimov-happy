import { getSquaredEuclideanDistance } from "./distance.js";
import type { SomCell, TrainingSample } from "../types/settings.js";

export function assignRepresentativeSamples(
  cells: SomCell[],
  samples: TrainingSample[],
): SomCell[] {
  for (const cell of cells) {
    let representativeSample = samples[0];
    let bestDistance = representativeSample
      ? getSquaredEuclideanDistance(cell.prototypeVector, representativeSample.featureVector)
      : Number.POSITIVE_INFINITY;

    for (let sampleIndex = 1; sampleIndex < samples.length; sampleIndex += 1) {
      const sample = samples[sampleIndex];
      if (!sample) {
        continue;
      }

      const distance = getSquaredEuclideanDistance(cell.prototypeVector, sample.featureVector);
      if (
        distance < bestDistance ||
        (distance === bestDistance &&
          representativeSample !== undefined &&
          sample.sampleIndex < representativeSample.sampleIndex)
      ) {
        representativeSample = sample;
        bestDistance = distance;
      }
    }

    if (!representativeSample) {
      throw new Error("Cannot assign representative sample without training samples.");
    }

    cell.representativeSampleIndex = representativeSample.sampleIndex;
    cell.representativeParameter = representativeSample.parameter;
  }

  return cells;
}
