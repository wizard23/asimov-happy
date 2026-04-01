export type Topology = "squares" | "hexagons";

export interface TrainingSettings {
  somWidth: number;
  somHeight: number;
  topology: Topology;
  trainingJuliaIterations: number;
  featureWidth: number;
  featureHeight: number;
  trainingRounds: number;
  randomSeed: string;
}

export interface ViewerSettings {
  viewerJuliaIterations: number;
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
  fingerprint: ReproducibilityFingerprint;
}

export interface ExportedSettingsDocument {
  schemaVersion: string;
  settings: AppSettings;
}

export interface ExportedTrainingResultDocument {
  schemaVersion: string;
  result: SomTrainingResult;
}
