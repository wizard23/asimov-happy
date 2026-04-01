import { APP_ALGORITHM_VERSION } from "../config/defaults.js";
import type { ReproducibilityFingerprint, TrainingSettings } from "../types/settings.js";

function stableJsonValue(value: unknown): string {
  if (value === null) {
    return "null";
  }

  switch (typeof value) {
    case "number":
      if (!Number.isFinite(value)) {
        throw new Error("Non-finite numbers are not supported in fingerprint input.");
      }
      return JSON.stringify(value);
    case "boolean":
      return value ? "true" : "false";
    case "string":
      return JSON.stringify(value);
    case "object":
      if (Array.isArray(value)) {
        return `[${value.map((entry) => stableJsonValue(entry)).join(",")}]`;
      }

      return `{${Object.keys(value)
        .sort()
        .map((key) => `${JSON.stringify(key)}:${stableJsonValue((value as Record<string, unknown>)[key])}`)
        .join(",")}}`;
    default:
      throw new Error(`Unsupported fingerprint input type: ${typeof value}`);
  }
}

function fnv1a32(input: string): string {
  let hash = 0x811c9dc5;
  for (let index = 0; index < input.length; index += 1) {
    hash ^= input.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash.toString(16).padStart(8, "0");
}

export function createReproducibilityFingerprint(
  settings: TrainingSettings,
): ReproducibilityFingerprint {
  const serializedSettings = stableJsonValue(settings);
  const digest = fnv1a32(`${APP_ALGORITHM_VERSION}:${serializedSettings}`);

  return {
    appVersion: APP_ALGORITHM_VERSION,
    algorithmVersion: APP_ALGORITHM_VERSION,
    topology: settings.topology,
    randomSeed: settings.randomSeed,
    settingsDigest: digest,
    serializedSettings,
  };
}
