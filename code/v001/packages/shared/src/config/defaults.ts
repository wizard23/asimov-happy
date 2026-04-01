import type { AppSettings, Topology, TrainingSettings, ViewerSettings } from "../types/settings.js";

export const APP_ALGORITHM_VERSION = "julia-som-v001";

export const DEFAULT_TOPOLOGY: Topology = "squares";

export const DEFAULT_TRAINING_SETTINGS: TrainingSettings = {
  somWidth: 32,
  somHeight: 32,
  topology: DEFAULT_TOPOLOGY,
  trainingJuliaIterations: 96,
  featureWidth: 32,
  featureHeight: 32,
  trainingRounds: 12,
  randomSeed: "default-seed-0001",
};

export const DEFAULT_VIEWER_SETTINGS: ViewerSettings = {
  viewerJuliaIterations: 192,
};

export const DEFAULT_APP_SETTINGS: AppSettings = {
  ...DEFAULT_TRAINING_SETTINGS,
  ...DEFAULT_VIEWER_SETTINGS,
};
