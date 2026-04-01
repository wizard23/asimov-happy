import test from "node:test";
import assert from "node:assert/strict";
import {
  generateTrainingSamples,
  trainSom,
  XorShift128,
} from "../index.js";

test("xorshift128 produces a stable sequence for a fixed seed", () => {
  const rng = new XorShift128("rng-seed-0001");
  const sequence = [
    rng.nextUint32(),
    rng.nextUint32(),
    rng.nextUint32(),
    rng.nextUint32(),
  ];

  assert.deepEqual(sequence, [1880187002, 2934644307, 2470174382, 2704101339]);
});

test("training sample generation is deterministic", () => {
  const settings = {
    somWidth: 3,
    somHeight: 2,
    topology: "squares" as const,
    trainingJuliaIterations: 20,
    featureWidth: 6,
    featureHeight: 6,
    trainingRounds: 2,
    randomSeed: "sample-seed-0001",
  };

  const first = generateTrainingSamples(settings);
  const second = generateTrainingSamples(settings);

  assert.deepEqual(
    first.map((sample) => ({
      parameter: sample.parameter,
      values: Array.from(sample.featureVector.slice(0, 8)),
    })),
    second.map((sample) => ({
      parameter: sample.parameter,
      values: Array.from(sample.featureVector.slice(0, 8)),
    })),
  );
});

test("som training is deterministic for identical settings and seed", () => {
  const settings = {
    somWidth: 4,
    somHeight: 4,
    topology: "hexagons" as const,
    trainingJuliaIterations: 28,
    featureWidth: 8,
    featureHeight: 8,
    trainingRounds: 3,
    randomSeed: "som-seed-0001",
  };

  const first = trainSom({
    settings,
    samples: generateTrainingSamples(settings),
  });
  const second = trainSom({
    settings,
    samples: generateTrainingSamples(settings),
  });

  assert.equal(first.fingerprint.settingsDigest, second.fingerprint.settingsDigest);
  assert.deepEqual(
    first.cells.map((cell) => ({
      index: cell.index,
      representativeSampleIndex: cell.representativeSampleIndex,
      parameter: cell.representativeParameter,
      prototypeHead: Array.from(cell.prototypeVector.slice(0, 6)),
    })),
    second.cells.map((cell) => ({
      index: cell.index,
      representativeSampleIndex: cell.representativeSampleIndex,
      parameter: cell.representativeParameter,
      prototypeHead: Array.from(cell.prototypeVector.slice(0, 6)),
    })),
  );
});
