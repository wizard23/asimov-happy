import type { SomCell, TrainingSample, TrainingSettings } from "../types/settings.js";
import { XorShift128 } from "../rng/xorshift128.js";

export function createSomCellIndex(x: number, y: number, width: number): number {
  return y * width + x;
}

export function initializeSomCells(
  settings: TrainingSettings,
  samples: TrainingSample[],
): SomCell[] {
  const rng = new XorShift128(`${settings.randomSeed}:som-init`);
  const cells: SomCell[] = [];

  for (let y = 0; y < settings.somHeight; y += 1) {
    for (let x = 0; x < settings.somWidth; x += 1) {
      const sample = samples[rng.nextInt(samples.length)];
      if (!sample) {
        throw new Error("Cannot initialize SOM without training samples.");
      }

      cells.push({
        index: createSomCellIndex(x, y, settings.somWidth),
        x,
        y,
        prototypeVector: new Float32Array(sample.featureVector),
        representativeSampleIndex: null,
        representativeParameter: null,
      });
    }
  }

  return cells;
}
