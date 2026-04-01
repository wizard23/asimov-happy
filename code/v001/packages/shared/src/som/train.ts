import { createReproducibilityFingerprint } from "../reproducibility/fingerprint.js";
import { getTopologyDistance } from "../topology/distance.js";
import { deriveTrainingSampleCount } from "../config/settings.js";
import { findBestMatchingUnit } from "./bmu.js";
import { initializeSomCells } from "./cells.js";
import { assignRepresentativeSamples } from "./representatives.js";
import { createSomTrainingSchedule, interpolateSomDecay } from "./schedule.js";
import { createDeterministicShuffledIndices } from "./shuffle.js";
import type {
  SomCell,
  SomTrainingProgress,
  SomTrainingResult,
  TrainingSample,
  TrainingSettings,
} from "../types/settings.js";

export interface TrainSomOptions {
  settings: TrainingSettings;
  samples: TrainingSample[];
  onProgress?: (progress: SomTrainingProgress) => void;
}

function getNeighborhoodInfluence(distance: number, radius: number): number {
  const safeRadius = Math.max(radius, 1e-6);
  return Math.exp(-(distance * distance) / (2 * safeRadius * safeRadius));
}

function updateCellPrototype(
  cell: SomCell,
  sample: TrainingSample,
  learningRate: number,
  influence: number,
): void {
  const adjustmentScale = learningRate * influence;
  for (let index = 0; index < cell.prototypeVector.length; index += 1) {
    const prototypeValue = cell.prototypeVector[index];
    const sampleValue = sample.featureVector[index];
    if (prototypeValue === undefined || sampleValue === undefined) {
      throw new Error(`Missing feature value at index ${index}.`);
    }
    cell.prototypeVector[index] = prototypeValue + adjustmentScale * (sampleValue - prototypeValue);
  }
}

export function trainSom({ settings, samples, onProgress }: TrainSomOptions): SomTrainingResult {
  if (samples.length === 0) {
    throw new Error("SOM training requires at least one training sample.");
  }

  const expectedSampleCount = deriveTrainingSampleCount(settings);
  if (samples.length !== expectedSampleCount) {
    throw new Error(
      `Training sample count mismatch. Expected ${expectedSampleCount}, got ${samples.length}.`,
    );
  }

  const schedule = createSomTrainingSchedule(settings);
  const cells = initializeSomCells(settings, samples);
  const totalSteps = settings.trainingRounds * samples.length;

  let completedSteps = 0;
  for (let round = 0; round < settings.trainingRounds; round += 1) {
    const sampleOrder = createDeterministicShuffledIndices(
      samples.length,
      `${settings.randomSeed}:round:${round}`,
    );

    for (let sampleOrderIndex = 0; sampleOrderIndex < sampleOrder.length; sampleOrderIndex += 1) {
      const sampleIndex = sampleOrder[sampleOrderIndex];
      if (sampleIndex === undefined) {
        throw new Error(`Missing shuffled sample index at position ${sampleOrderIndex}.`);
      }
      const sample = samples[sampleIndex];
      if (!sample) {
        throw new Error(`Missing training sample at index ${sampleIndex}.`);
      }

      const learningRate = interpolateSomDecay(
        schedule.initialLearningRate,
        schedule.finalLearningRate,
        completedSteps,
        totalSteps,
      );
      const radius = interpolateSomDecay(
        schedule.initialRadius,
        schedule.finalRadius,
        completedSteps,
        totalSteps,
      );
      const bestMatchingUnit = findBestMatchingUnit(cells, sample);

      for (const cell of cells) {
        const distance = getTopologyDistance(
          settings.topology,
          bestMatchingUnit.x,
          bestMatchingUnit.y,
          cell.x,
          cell.y,
        );
        const influence = getNeighborhoodInfluence(distance, radius);
        updateCellPrototype(cell, sample, learningRate, influence);
      }

      completedSteps += 1;
      onProgress?.({
        totalSteps,
        completedSteps,
        currentRound: round,
        currentSampleIndex: sample.sampleIndex,
      });
    }
  }

  assignRepresentativeSamples(cells, samples);

  return {
    settings,
    cells,
    sampleCount: samples.length,
    metadata: {
      totalSteps,
      trainingSampleCount: samples.length,
      featureVectorLength: settings.featureWidth * settings.featureHeight,
      schedule,
    },
    fingerprint: createReproducibilityFingerprint(settings),
  };
}
