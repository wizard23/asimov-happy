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
  sampleGenerationMs?: number;
  usedSampleCache?: boolean;
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

export function trainSom({
  settings,
  samples,
  onProgress,
  sampleGenerationMs = 0,
  usedSampleCache = false,
}: TrainSomOptions): SomTrainingResult {
  const trainingStartMs = performance.now();
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
  const initializationStartMs = performance.now();
  const cells = initializeSomCells(settings, samples);
  const initializationMs = performance.now() - initializationStartMs;
  const totalSteps = settings.trainingRounds * samples.length;
  let bmuSearchMs = 0;
  let neighborhoodUpdateMs = 0;

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
      const bmuStartMs = performance.now();
      const bestMatchingUnit = findBestMatchingUnit(cells, sample);
      bmuSearchMs += performance.now() - bmuStartMs;

      const updateStartMs = performance.now();
      const pruningThreshold = settings.enableNeighborhoodPruning
        ? settings.neighborhoodPruningThreshold
        : 0;
      const maxNeighborhoodDistance = settings.enableNeighborhoodPruning
        ? radius * Math.sqrt(-2 * Math.log(pruningThreshold))
        : Number.POSITIVE_INFINITY;
      for (const cell of cells) {
        const distance = getTopologyDistance(
          settings.topology,
          bestMatchingUnit.x,
          bestMatchingUnit.y,
          cell.x,
          cell.y,
        );
        if (distance > maxNeighborhoodDistance) {
          continue;
        }
        const influence = getNeighborhoodInfluence(distance, radius);
        if (settings.enableNeighborhoodPruning && influence < pruningThreshold) {
          continue;
        }
        updateCellPrototype(cell, sample, learningRate, influence);
      }
      neighborhoodUpdateMs += performance.now() - updateStartMs;

      completedSteps += 1;
      onProgress?.({
        totalSteps,
        completedSteps,
        currentRound: round,
        currentSampleIndex: sample.sampleIndex,
      });
    }
  }

  const representativeAssignmentStartMs = performance.now();
  assignRepresentativeSamples(cells, samples);
  const representativeAssignmentMs = performance.now() - representativeAssignmentStartMs;
  const totalTrainingMs = performance.now() - trainingStartMs;

  return {
    settings,
    cells,
    sampleCount: samples.length,
    metadata: {
      totalSteps,
      trainingSampleCount: samples.length,
      featureVectorLength: settings.featureWidth * settings.featureHeight,
      schedule,
      timings: {
        sampleGenerationMs,
        totalTrainingMs,
        initializationMs,
        bmuSearchMs,
        neighborhoodUpdateMs,
        representativeAssignmentMs,
        usedSampleCache,
      },
    },
    fingerprint: createReproducibilityFingerprint(settings),
  };
}
