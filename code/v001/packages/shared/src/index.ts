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
  ComplexParameter,
  ExportedSettingsDocument,
  ExportedTrainingResultDocument,
  ReproducibilityFingerprint,
  SomCell,
  SomTrainingProgress,
  SomTrainingResult,
  Topology,
  TrainingSample,
  TrainingSettings,
  ViewerSettings,
} from "./types/settings.js";
