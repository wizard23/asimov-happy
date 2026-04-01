import test from "node:test";
import assert from "node:assert/strict";
import {
  createSettingsDocument,
  createTrainingResultDocument,
  deserializeTrainingResult,
  generateTrainingSamples,
  getDefaultAppSettings,
  parseSettingsDocument,
  parseTrainingResultDocument,
  serializeTrainingResult,
  trainSom,
} from "../index.js";

test("settings documents round-trip deterministically", () => {
  const settings = getDefaultAppSettings();
  const document = createSettingsDocument(settings);
  const parsed = parseSettingsDocument(JSON.stringify(document));
  assert.deepEqual(parsed, settings);
});

test("training result documents round-trip typed arrays and metadata", () => {
  const settings = {
    somWidth: 4,
    somHeight: 3,
    topology: "squares" as const,
    trainingJuliaIterations: 24,
    featureWidth: 8,
    featureHeight: 8,
    trainingRounds: 2,
    randomSeed: "serialization-seed",
  };
  const result = trainSom({
    settings,
    samples: generateTrainingSamples(settings),
  });

  const serialized = serializeTrainingResult(result);
  const hydrated = deserializeTrainingResult(serialized);
  const parsed = parseTrainingResultDocument(JSON.stringify(createTrainingResultDocument(result)));

  assert.equal(hydrated.cells.length, result.cells.length);
  assert.deepEqual(Array.from(hydrated.cells[0]?.prototypeVector ?? []), Array.from(result.cells[0]?.prototypeVector ?? []));
  assert.equal(parsed.fingerprint.settingsDigest, result.fingerprint.settingsDigest);
});
