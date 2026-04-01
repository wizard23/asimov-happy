import { deriveTrainingSampleCount } from "../config/settings.js";
import { generateJuliaParameters } from "./sampling.js";
import { renderJuliaFeatureVectorForTraining } from "./features.js";
import type { TrainingSample, TrainingSettings } from "../types/settings.js";

export function generateTrainingSamples(settings: TrainingSettings): TrainingSample[] {
  const sampleCount = deriveTrainingSampleCount(settings);
  const parameters = generateJuliaParameters(settings.randomSeed, sampleCount);
  const samples: TrainingSample[] = [];

  for (let sampleIndex = 0; sampleIndex < sampleCount; sampleIndex += 1) {
    const parameter = parameters[sampleIndex];
    if (!parameter) {
      throw new Error(`Missing Julia parameter for sample index ${sampleIndex}.`);
    }

    samples.push({
      sampleIndex,
      parameter,
      featureVector: renderJuliaFeatureVectorForTraining(parameter, settings),
    });
  }

  return samples;
}
