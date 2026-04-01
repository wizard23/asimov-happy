import {
  TRAINING_RESULT_DOCUMENT_SCHEMA_VERSION,
} from "./schema.js";
import type {
  ExportedTrainingResultDocument,
  SerializedSomCell,
  SerializedSomTrainingResult,
  SomCell,
  SomTrainingResult,
} from "../types/settings.js";

function serializeCell(cell: SomCell): SerializedSomCell {
  return {
    index: cell.index,
    x: cell.x,
    y: cell.y,
    prototypeVector: Array.from(cell.prototypeVector),
    representativeSampleIndex: cell.representativeSampleIndex,
    representativeParameter: cell.representativeParameter
      ? {
          real: cell.representativeParameter.real,
          imaginary: cell.representativeParameter.imaginary,
        }
      : null,
  };
}

function deserializeCell(cell: SerializedSomCell): SomCell {
  return {
    index: cell.index,
    x: cell.x,
    y: cell.y,
    prototypeVector: Float32Array.from(cell.prototypeVector),
    representativeSampleIndex: cell.representativeSampleIndex,
    representativeParameter: cell.representativeParameter
      ? {
          real: cell.representativeParameter.real,
          imaginary: cell.representativeParameter.imaginary,
        }
      : null,
  };
}

export function serializeTrainingResult(result: SomTrainingResult): SerializedSomTrainingResult {
  return {
    settings: { ...result.settings },
    cells: result.cells.map(serializeCell),
    sampleCount: result.sampleCount,
    metadata: {
      ...result.metadata,
      schedule: { ...result.metadata.schedule },
    },
    fingerprint: { ...result.fingerprint },
  };
}

export function deserializeTrainingResult(
  serialized: SerializedSomTrainingResult,
): SomTrainingResult {
  return {
    settings: { ...serialized.settings },
    cells: serialized.cells.map(deserializeCell),
    sampleCount: serialized.sampleCount,
    metadata: {
      ...serialized.metadata,
      schedule: { ...serialized.metadata.schedule },
    },
    fingerprint: { ...serialized.fingerprint },
  };
}

export function createTrainingResultDocument(
  result: SomTrainingResult,
): ExportedTrainingResultDocument {
  return {
    schemaVersion: TRAINING_RESULT_DOCUMENT_SCHEMA_VERSION,
    result: serializeTrainingResult(result),
  };
}

export function parseTrainingResultDocument(input: string): SomTrainingResult {
  const document = JSON.parse(input) as Partial<ExportedTrainingResultDocument>;
  if (document.schemaVersion !== TRAINING_RESULT_DOCUMENT_SCHEMA_VERSION || !document.result) {
    throw new Error("Unsupported training result document schema version.");
  }

  return deserializeTrainingResult(document.result);
}
