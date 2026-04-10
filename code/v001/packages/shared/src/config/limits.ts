export const SETTINGS_LIMITS = {
  somWidth: { min: 2, max: 128 },
  somHeight: { min: 2, max: 128 },
  trainingJuliaIterations: { min: 8, max: 4096 },
  featureWidth: { min: 4, max: 256 },
  featureHeight: { min: 4, max: 256 },
  trainingRounds: { min: 1, max: 512 },
  viewerJuliaIterations: { min: 8, max: 8192 },
  neighborhoodPruningThreshold: { min: 1e-6, max: 1e-2 },
  trainingSampleMultiplier: 4,
  maxFeatureVectorLength: 256 * 256,
} as const;
