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
  SETTINGS_DOCUMENT_SCHEMA_VERSION,
  TRAINING_RESULT_DOCUMENT_SCHEMA_VERSION,
} from "./serialization/schema.js";
export {
  createSettingsDocument,
  parseSettingsDocument,
} from "./serialization/settings-document.js";
export {
  createTrainingResultDocument,
  deserializeTrainingResult,
  parseTrainingResultDocument,
  serializeTrainingResult,
} from "./serialization/training-result-document.js";
export { findBestMatchingUnit } from "./som/bmu.js";
export { createSomCellIndex, initializeSomCells } from "./som/cells.js";
export { getSquaredEuclideanDistance } from "./som/distance.js";
export { assignRepresentativeSamples } from "./som/representatives.js";
export {
  createSomTrainingSchedule,
  DEFAULT_SOM_TRAINING_SCHEDULE,
  interpolateSomDecay,
} from "./som/schedule.js";
export { createDeterministicShuffledIndices } from "./som/shuffle.js";
export { trainSom, type TrainSomOptions } from "./som/train.js";
export {
  cloneXorShift128State,
  createXorShift128StateFromSeed,
  type XorShift128State,
} from "./rng/seed.js";
export { XorShift128 } from "./rng/xorshift128.js";
export { getTopologyDistance } from "./topology/distance.js";
export { getHexGridDistance, type AxialCoordinate } from "./topology/hex.js";
export { getSquareGridDistance } from "./topology/square.js";
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
  SerializedComplexParameter,
  SerializedSomCell,
  SerializedSomTrainingResult,
  SomCell,
  SomTrainingMetadata,
  SomTrainingProgress,
  SomTrainingResult,
  SomTrainingSchedule,
  Topology,
  TrainingSample,
  TrainingSettings,
  ViewerSettings,
} from "./types/settings.js";
