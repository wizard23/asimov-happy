import {
  SETTINGS_DOCUMENT_SCHEMA_VERSION,
} from "./schema.js";
import { getDefaultAppSettings, validateAppSettings } from "../config/settings.js";
import type { AppSettings, ExportedSettingsDocument } from "../types/settings.js";

export function createSettingsDocument(settings: AppSettings): ExportedSettingsDocument {
  return {
    schemaVersion: SETTINGS_DOCUMENT_SCHEMA_VERSION,
    settings: { ...settings },
  };
}

export function parseSettingsDocument(input: string): AppSettings {
  const document = JSON.parse(input) as Partial<ExportedSettingsDocument>;
  if (document.schemaVersion !== SETTINGS_DOCUMENT_SCHEMA_VERSION) {
    throw new Error("Unsupported settings document schema version.");
  }

  const mergedSettings: AppSettings = {
    ...getDefaultAppSettings(),
    ...document.settings,
  };
  const validation = validateAppSettings(mergedSettings);
  if (!validation.isValid) {
    throw new Error(`Invalid settings document: ${validation.errors.join(" ")}`);
  }

  return mergedSettings;
}
