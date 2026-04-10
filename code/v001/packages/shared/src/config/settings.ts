import { DEFAULT_APP_SETTINGS, DEFAULT_TRAINING_SETTINGS, DEFAULT_VIEWER_SETTINGS } from "./defaults.js";
import { SETTINGS_LIMITS } from "./limits.js";
import type { AppSettings, AppSettingsValidationResult, TrainingSettings, ViewerSettings } from "../types/settings.js";

type BoundedIntegerSettingName =
  | "somWidth"
  | "somHeight"
  | "trainingJuliaIterations"
  | "featureWidth"
  | "featureHeight"
  | "trainingRounds"
  | "viewerJuliaIterations";

function isFiniteInteger(value: number): boolean {
  return Number.isFinite(value) && Number.isInteger(value);
}

function validateBoundedInteger(
  name: BoundedIntegerSettingName,
  value: number,
  errors: string[],
): void {
  const limits = SETTINGS_LIMITS[name];
  if (!isFiniteInteger(value)) {
    errors.push(`${name} must be an integer.`);
    return;
  }
  if (value < limits.min || value > limits.max) {
    errors.push(`${name} must be between ${limits.min} and ${limits.max}.`);
  }
}

export function getDefaultTrainingSettings(): TrainingSettings {
  return { ...DEFAULT_TRAINING_SETTINGS };
}

export function getDefaultViewerSettings(): ViewerSettings {
  return { ...DEFAULT_VIEWER_SETTINGS };
}

export function getDefaultAppSettings(): AppSettings {
  return { ...DEFAULT_APP_SETTINGS };
}

export function deriveTrainingSampleCount(settings: TrainingSettings): number {
  return settings.somWidth * settings.somHeight * SETTINGS_LIMITS.trainingSampleMultiplier;
}

export function getTrainingSampleCacheKey(settings: TrainingSettings): string {
  return JSON.stringify({
    randomSeed: settings.randomSeed,
    trainingJuliaIterations: settings.trainingJuliaIterations,
    featureWidth: settings.featureWidth,
    featureHeight: settings.featureHeight,
    trainingSampleCount: deriveTrainingSampleCount(settings),
  });
}

export function validateAppSettings(settings: AppSettings): AppSettingsValidationResult {
  const errors: string[] = [];

  validateBoundedInteger("somWidth", settings.somWidth, errors);
  validateBoundedInteger("somHeight", settings.somHeight, errors);
  validateBoundedInteger("trainingJuliaIterations", settings.trainingJuliaIterations, errors);
  validateBoundedInteger("featureWidth", settings.featureWidth, errors);
  validateBoundedInteger("featureHeight", settings.featureHeight, errors);
  validateBoundedInteger("trainingRounds", settings.trainingRounds, errors);
  validateBoundedInteger("viewerJuliaIterations", settings.viewerJuliaIterations, errors);

  if (settings.randomSeed.trim().length === 0) {
    errors.push("randomSeed must not be empty.");
  }

  const featureVectorLength = settings.featureWidth * settings.featureHeight;
  if (featureVectorLength > SETTINGS_LIMITS.maxFeatureVectorLength) {
    errors.push(
      `feature vector length must be <= ${SETTINGS_LIMITS.maxFeatureVectorLength} values.`,
    );
  }

  return {
    isValid: errors.length === 0,
    errors,
    trainingSampleCount: deriveTrainingSampleCount(settings),
    featureVectorLength,
  };
}

export function splitAppSettings(settings: AppSettings): {
  training: TrainingSettings;
  viewer: ViewerSettings;
} {
  const {
    somWidth,
    somHeight,
    topology,
    trainingJuliaIterations,
    featureWidth,
    featureHeight,
    trainingRounds,
    randomSeed,
    viewerJuliaIterations,
  } = settings;

  return {
    training: {
      somWidth,
      somHeight,
      topology,
      trainingJuliaIterations,
      featureWidth,
      featureHeight,
      trainingRounds,
      randomSeed,
    },
    viewer: {
      viewerJuliaIterations,
    },
  };
}
