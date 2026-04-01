import type { SomTrainingSchedule, TrainingSettings } from "../types/settings.js";

export const DEFAULT_SOM_TRAINING_SCHEDULE: Pick<
  SomTrainingSchedule,
  "initialLearningRate" | "finalLearningRate" | "finalRadius"
> = {
  initialLearningRate: 0.45,
  finalLearningRate: 0.05,
  finalRadius: 1,
};

export function createSomTrainingSchedule(settings: TrainingSettings): SomTrainingSchedule {
  return {
    initialLearningRate: DEFAULT_SOM_TRAINING_SCHEDULE.initialLearningRate,
    finalLearningRate: DEFAULT_SOM_TRAINING_SCHEDULE.finalLearningRate,
    initialRadius: Math.max(settings.somWidth, settings.somHeight) / 2,
    finalRadius: DEFAULT_SOM_TRAINING_SCHEDULE.finalRadius,
  };
}

export function interpolateSomDecay(
  initialValue: number,
  finalValue: number,
  step: number,
  totalSteps: number,
): number {
  if (totalSteps <= 1) {
    return finalValue;
  }

  const progress = step / (totalSteps - 1);
  return initialValue * Math.pow(finalValue / initialValue, progress);
}
