export {
  APP_ALGORITHM_VERSION,
  DEFAULT_APP_SETTINGS,
  DEFAULT_TRAINING_SETTINGS,
  DEFAULT_TOPOLOGY,
  DEFAULT_VIEWER_SETTINGS,
} from "./config/defaults.js";
export { SETTINGS_LIMITS } from "./config/limits.js";
export {
  deriveTrainingSampleCount,
  getDefaultAppSettings,
  getDefaultTrainingSettings,
  getDefaultViewerSettings,
  splitAppSettings,
  validateAppSettings,
} from "./config/settings.js";
export {
  JULIA_BAILOUT_RADIUS,
  JULIA_PARAMETER_BOUNDS,
  JULIA_VIEWPORT,
} from "./julia/constants.js";
export { getSmoothEscapeValue } from "./julia/escape-time.js";
export {
  getPixelCenterComplexCoordinate,
  renderJuliaFeatureVector,
  renderJuliaFeatureVectorForTraining,
} from "./julia/features.js";
export { generateJuliaParameters, sampleJuliaParameter } from "./julia/sampling.js";
export { generateTrainingSamples } from "./julia/training-samples.js";
export { createReproducibilityFingerprint } from "./reproducibility/fingerprint.js";
export {
  cloneXorShift128State,
  createXorShift128StateFromSeed,
  type XorShift128State,
} from "./rng/seed.js";
export { XorShift128 } from "./rng/xorshift128.js";
export function hello(name: string): string {
  return `Hello, ${name}!`;
}
export type {
  AppSettings,
  AppSettingsValidationResult,
  ComplexBounds,
  ComplexParameter,
  ExportedSettingsDocument,
  ExportedTrainingResultDocument,
  JuliaViewport,
  ReproducibilityFingerprint,
  SomCell,
  SomTrainingProgress,
  SomTrainingResult,
  Topology,
  TrainingSample,
  TrainingSettings,
  ViewerSettings,
} from "./types/settings.js";
