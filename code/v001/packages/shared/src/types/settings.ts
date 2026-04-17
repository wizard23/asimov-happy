export type Topology = "squares" | "hexagons";

export type PerformanceMode = "exact" | "faster" | "custom";

export interface TrainingSettings {
  somWidth: number;
  somHeight: number;
  topology: Topology;
  trainingJuliaIterations: number;
  featureWidth: number;
  featureHeight: number;
  trainingRounds: number;
  randomSeed: string;
  enableSampleCache: boolean;
  enableNeighborhoodPruning: boolean;
  neighborhoodPruningThreshold: number;
}

export interface ViewerSettings {
  viewerJuliaIterations: number;
  showMandelbrotSomGrid: boolean;
}

export interface AppSettings extends TrainingSettings, ViewerSettings {}

export interface AppSettingsValidationResult {
  isValid: boolean;
  errors: string[];
  trainingSampleCount: number;
  featureVectorLength: number;
}

export interface ComplexParameter {
  real: number;
  imaginary: number;
}

export interface ComplexBounds {
  minReal: number;
  maxReal: number;
  minImaginary: number;
  maxImaginary: number;
}

export type JuliaViewport = ComplexBounds;

export interface TrainingSample {
  sampleIndex: number;
  parameter: ComplexParameter;
  featureVector: Float32Array;
}

export interface SomCell {
  index: number;
  x: number;
  y: number;
  prototypeVector: Float32Array;
  representativeSampleIndex: number | null;
  representativeParameter: ComplexParameter | null;
}

export interface SomTrainingProgress {
  totalSteps: number;
  completedSteps: number;
  currentRound: number;
  currentSampleIndex: number;
}

export interface SomTrainingSchedule {
  initialLearningRate: number;
  finalLearningRate: number;
  initialRadius: number;
  finalRadius: number;
}

export interface SomTrainingTimings {
  sampleGenerationMs: number;
  totalTrainingMs: number;
  initializationMs: number;
  bmuSearchMs: number;
  neighborhoodUpdateMs: number;
  representativeAssignmentMs: number;
  usedSampleCache: boolean;
}

export interface SomTrainingMetadata {
  totalSteps: number;
  trainingSampleCount: number;
  featureVectorLength: number;
  schedule: SomTrainingSchedule;
  timings: SomTrainingTimings;
}

export interface ReproducibilityFingerprint {
  appVersion: string;
  algorithmVersion: string;
  topology: Topology;
  randomSeed: string;
  settingsDigest: string;
  serializedSettings: string;
}

export interface SomTrainingResult {
  settings: TrainingSettings;
  cells: SomCell[];
  sampleCount: number;
  metadata: SomTrainingMetadata;
  fingerprint: ReproducibilityFingerprint;
}

export interface ExportedSettingsDocument {
  schemaVersion: string;
  settings: AppSettings;
}

export interface SerializedComplexParameter {
  real: number;
  imaginary: number;
}

export interface SerializedSomCell {
  index: number;
  x: number;
  y: number;
  prototypeVector: number[];
  representativeSampleIndex: number | null;
  representativeParameter: SerializedComplexParameter | null;
}

export interface SerializedSomTrainingResult {
  settings: TrainingSettings;
  cells: SerializedSomCell[];
  sampleCount: number;
  metadata: SomTrainingMetadata;
  fingerprint: ReproducibilityFingerprint;
}

export interface ExportedTrainingResultDocument {
  schemaVersion: string;
  result: SerializedSomTrainingResult;
}
