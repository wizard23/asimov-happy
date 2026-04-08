import { render } from "preact";
import { useEffect, useMemo, useRef, useState } from "preact/hooks";
import {
  createReproducibilityFingerprint,
  createSettingsDocument,
  createTrainingResultDocument,
  getDefaultAppSettings,
  parseSettingsDocument,
  parseTrainingResultDocument,
  splitAppSettings,
  validateAppSettings,
  type AppSettings,
  type ComplexParameter,
  type ReproducibilityFingerprint,
  type SomTrainingProgress,
  type SomTrainingResult,
} from "@asimov/minimal-shared";
import { JuliaViewerCanvas } from "../canvas/julia-viewer-canvas.js";
import { MandelbrotOverviewCanvas } from "../canvas/mandelbrot-overview-canvas.js";
import { SomMapCanvas } from "../canvas/som-map-canvas.js";
import {
  APP_THEME_STORAGE_KEY,
  DEFAULT_THEME_ID,
  THEME_DEFINITIONS,
  getStoredThemeId,
  getThemeDefinition,
  type ThemeDefinition,
  type ThemeId,
} from "./themes.js";
import {
  createTrainingWorker,
  type TrainingWorkerController,
  type TrainingWorkerSuccessPayload,
} from "../workers/training-client.js";
import "../styles/app.css";

type TrainingStatus = "idle" | "training" | "completed" | "error" | "cancelled";
type AppRoute = "/" | "/gui-settings";

interface TrainingSessionState {
  status: TrainingStatus;
  progress: SomTrainingProgress | null;
  result: SomTrainingResult | null;
  errorMessage: string | null;
  isStale: boolean;
  lastCompletedFingerprint: ReproducibilityFingerprint | null;
}

function getAppRoute(pathname: string): AppRoute {
  return pathname === "/gui-settings" ? "/gui-settings" : "/";
}

function navigateToRoute(route: AppRoute): void {
  if (window.location.pathname === route) {
    return;
  }

  window.history.pushState({}, "", route);
}

function getInitialZenView(): boolean {
  if (typeof window === "undefined") {
    return false;
  }

  return new URLSearchParams(window.location.search).get("zen") === "1";
}

function syncZenQuery(isZenView: boolean): void {
  const url = new URL(window.location.href);
  if (isZenView) {
    url.searchParams.set("zen", "1");
  } else {
    url.searchParams.delete("zen");
  }
  window.history.replaceState(window.history.state, "", url);
}

function getThemePreviewStyle(theme: ThemeDefinition): preact.JSX.CSSProperties {
  return theme.variables as unknown as preact.JSX.CSSProperties;
}

function applyTheme(themeId: ThemeId): void {
  const theme = getThemeDefinition(themeId);
  const root = document.documentElement;

  root.dataset.theme = theme.id;
  root.style.colorScheme = theme.colorScheme;

  for (const [name, value] of Object.entries(theme.variables)) {
    root.style.setProperty(name, value);
  }
}

function getInitialThemeId(): ThemeId {
  if (typeof window === "undefined") {
    return DEFAULT_THEME_ID;
  }

  return getStoredThemeId(window.localStorage.getItem(APP_THEME_STORAGE_KEY));
}

function getCellByIndex(result: SomTrainingResult | null, cellIndex: number | null) {
  if (!result || cellIndex === null) {
    return null;
  }

  return result.cells.find((cell) => cell.index === cellIndex) ?? null;
}

function getNearestCellIndexForParameter(
  result: SomTrainingResult | null,
  parameter: ComplexParameter | null,
): number | null {
  if (!result || !parameter) {
    return null;
  }

  let bestCellIndex: number | null = null;
  let bestDistance = Number.POSITIVE_INFINITY;

  for (const cell of result.cells) {
    const representativeParameter = cell.representativeParameter;
    if (!representativeParameter) {
      continue;
    }

    const deltaReal = representativeParameter.real - parameter.real;
    const deltaImaginary = representativeParameter.imaginary - parameter.imaginary;
    const distance = deltaReal * deltaReal + deltaImaginary * deltaImaginary;

    if (
      distance < bestDistance ||
      (distance === bestDistance && bestCellIndex !== null && cell.index < bestCellIndex) ||
      bestCellIndex === null
    ) {
      bestCellIndex = cell.index;
      bestDistance = distance;
    }
  }

  return bestCellIndex;
}

function formatPercentage(progress: SomTrainingProgress | null): string {
  if (!progress || progress.totalSteps === 0) {
    return "0.0";
  }

  return ((progress.completedSteps / progress.totalSteps) * 100).toFixed(1);
}

function formatRepresentativeParameter(result: SomTrainingResult | null): string {
  const firstCell = result?.cells[0];
  const parameter = firstCell?.representativeParameter;
  if (!parameter) {
    return "n/a";
  }

  return `${parameter.real.toFixed(5)} ${parameter.imaginary >= 0 ? "+" : "-"} ${Math.abs(parameter.imaginary).toFixed(5)}i`;
}

function Field(props: {
  label: string;
  hint?: string;
  children: preact.ComponentChildren;
}): preact.JSX.Element {
  return (
    <label className="field">
      <span className="field__label">{props.label}</span>
      {props.children}
      {props.hint ? <span className="field__hint">{props.hint}</span> : null}
    </label>
  );
}

function NumberInput(props: {
  value: number;
  min: number;
  max: number;
  onChange: (value: number) => void;
}): preact.JSX.Element {
  return (
    <input
      className="field__input"
      type="number"
      value={props.value}
      min={props.min}
      max={props.max}
      onInput={(event) => {
        const nextValue = Number((event.currentTarget as HTMLInputElement).value);
        props.onChange(nextValue);
      }}
    />
  );
}

function NavLink(props: {
  href: AppRoute;
  currentRoute: AppRoute;
  children: preact.ComponentChildren;
}): preact.JSX.Element {
  const isCurrent = props.currentRoute === props.href;

  return (
    <a
      className={`nav-link${isCurrent ? " nav-link--current" : ""}`}
      href={props.href}
      aria-current={isCurrent ? "page" : undefined}
      onClick={(event) => {
        event.preventDefault();
        navigateToRoute(props.href);
        window.dispatchEvent(new PopStateEvent("popstate"));
      }}
    >
      {props.children}
    </a>
  );
}

function downloadJsonFile(filename: string, value: unknown): void {
  const blob = new Blob([JSON.stringify(value, null, 2)], { type: "application/json" });
  const objectUrl = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = objectUrl;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(objectUrl);
}

function ThemePreviewCard(props: {
  theme: ThemeDefinition;
  selectedThemeId: ThemeId;
  onSelectTheme: (themeId: ThemeId) => void;
}): preact.JSX.Element {
  const isSelected = props.theme.id === props.selectedThemeId;

  return (
    <button
      type="button"
      className={`theme-card${isSelected ? " theme-card--selected" : ""}`}
      aria-pressed={isSelected}
      onClick={() => props.onSelectTheme(props.theme.id)}
    >
      <div className="theme-card__preview" style={getThemePreviewStyle(props.theme)}>
        <div className="theme-preview">
          <div className="theme-preview__masthead">
            <span className="theme-preview__pill theme-preview__pill--accent" />
            <span className="theme-preview__pill theme-preview__pill--strong" />
          </div>
          <div className="theme-preview__body">
            <aside className="theme-preview__sidebar">
              <span className="theme-preview__line theme-preview__line--short" />
              <span className="theme-preview__line" />
              <span className="theme-preview__line theme-preview__line--short" />
            </aside>
            <div className="theme-preview__content">
              <div className="theme-preview__hero" />
              <div className="theme-preview__row">
                <div className="theme-preview__panel" />
                <div className="theme-preview__panel theme-preview__panel--accent" />
              </div>
              <div className="theme-preview__canvas" />
            </div>
          </div>
        </div>
      </div>
      <div className="theme-card__meta">
        <div>
          <strong>{props.theme.label}</strong>
          <p className="detail">{props.theme.description}</p>
        </div>
        <span className={`theme-card__badge${isSelected ? " theme-card__badge--selected" : ""}`}>
          {isSelected ? "Active" : props.theme.colorScheme}
        </span>
      </div>
    </button>
  );
}

function GuiSettingsRoute(props: {
  selectedThemeId: ThemeId;
  onSelectTheme: (themeId: ThemeId) => void;
}): preact.JSX.Element {
  const activeTheme = getThemeDefinition(props.selectedThemeId);

  return (
    <div className="route-shell route-shell--settings">
      <section className="panel panel--settings-intro">
        <div className="panel__header">
          <p className="eyebrow">GUI Settings</p>
          <h1>Theme Studio</h1>
          <p className="panel__lede">
            Choose one of the app-wide UI themes. Previews are live miniatures of the same surface,
            accent, border, and canvas values applied to the workspace.
          </p>
        </div>

        <div className="settings-summary">
          <article className="card">
            <p className="eyebrow">Current Theme</p>
            <h3>{activeTheme.label}</h3>
            <p className="detail">{activeTheme.description}</p>
            <p className="metric">{activeTheme.colorScheme === "dark" ? "Dark-leaning" : "Light-leaning"}</p>
          </article>
          <article className="card">
            <p className="eyebrow">Palette Intent</p>
            <h3>Balanced Contrast</h3>
            <p className="detail">
              Each theme keeps surface contrast and accent intensity within a restrained range so
              the UI remains readable while still feeling distinct.
            </p>
          </article>
        </div>
      </section>

      <section className="theme-grid" aria-label="Theme choices">
        {THEME_DEFINITIONS.map((theme) => (
          <ThemePreviewCard
            key={theme.id}
            theme={theme}
            selectedThemeId={props.selectedThemeId}
            onSelectTheme={props.onSelectTheme}
          />
        ))}
      </section>
    </div>
  );
}

function MainWorkspace(props: {
  isZenView: boolean;
  onToggleZenView: () => void;
}): preact.JSX.Element {
  const [settings, setSettings] = useState<AppSettings>(() => getDefaultAppSettings());
  const [selectedCellIndex, setSelectedCellIndex] = useState<number | null>(null);
  const [hoveredParameter, setHoveredParameter] = useState<ComplexParameter | null>(null);
  const [mandelbrotHoverParameter, setMandelbrotHoverParameter] = useState<ComplexParameter | null>(
    null,
  );
  const [session, setSession] = useState<TrainingSessionState>({
    status: "idle",
    progress: null,
    result: null,
    errorMessage: null,
    isStale: false,
    lastCompletedFingerprint: null,
  });
  const workerRef = useRef<TrainingWorkerController | null>(null);
  const settingsFileInputRef = useRef<HTMLInputElement | null>(null);
  const resultFileInputRef = useRef<HTMLInputElement | null>(null);

  const validation = useMemo(() => validateAppSettings(settings), [settings]);
  const trainingSettings = useMemo(() => splitAppSettings(settings).training, [settings]);
  const currentFingerprint = useMemo(
    () => createReproducibilityFingerprint(trainingSettings),
    [trainingSettings],
  );
  const selectedCell = useMemo(
    () => getCellByIndex(session.result, selectedCellIndex),
    [session.result, selectedCellIndex],
  );
  const viewerParameter = hoveredParameter ?? selectedCell?.representativeParameter ?? null;
  const mandelbrotParameter = mandelbrotHoverParameter ?? viewerParameter;
  const highlightedCellIndex = useMemo(
    () => getNearestCellIndexForParameter(session.result, mandelbrotHoverParameter),
    [session.result, mandelbrotHoverParameter],
  );

  useEffect(() => {
    return () => {
      workerRef.current?.dispose();
      workerRef.current = null;
    };
  }, []);

  useEffect(() => {
    setSession((current) => {
      const completedFingerprint = current.lastCompletedFingerprint?.settingsDigest;
      const nextIsStale =
        current.result !== null && completedFingerprint !== currentFingerprint.settingsDigest;

      if (current.isStale === nextIsStale) {
        return current;
      }

      return {
        ...current,
        isStale: nextIsStale,
      };
    });
  }, [currentFingerprint]);

  useEffect(() => {
    if (!session.result) {
      setSelectedCellIndex(null);
      setHoveredParameter(null);
      setMandelbrotHoverParameter(null);
      return;
    }

    const nextSelectedCell = session.result.cells[0] ?? null;
    setSelectedCellIndex(nextSelectedCell?.index ?? null);
    setHoveredParameter(null);
    setMandelbrotHoverParameter(null);
  }, [session.result]);

  function updateSettings(patch: Partial<AppSettings>): void {
    setSettings((current) => ({ ...current, ...patch }));
  }

  async function handleTrain(): Promise<void> {
    if (!validation.isValid) {
      setSession((current) => ({
        ...current,
        status: "error",
        errorMessage: "Cannot start training while validation errors are present.",
      }));
      return;
    }

    workerRef.current?.dispose();

    const worker = createTrainingWorker();
    workerRef.current = worker;

    setSession((current) => ({
      ...current,
      status: "training",
      progress: {
        totalSteps: trainingSettings.trainingRounds * validation.trainingSampleCount,
        completedSteps: 0,
        currentRound: 0,
        currentSampleIndex: 0,
      },
      errorMessage: null,
    }));

    try {
      const result: TrainingWorkerSuccessPayload = await worker.train(trainingSettings, {
        onProgress(progress) {
          setSession((current) => ({
            ...current,
            status: "training",
            progress,
            errorMessage: null,
          }));
        },
      });

      setSession({
        status: "completed",
        progress: result.result.metadata.totalSteps
          ? {
              totalSteps: result.result.metadata.totalSteps,
              completedSteps: result.result.metadata.totalSteps,
              currentRound: trainingSettings.trainingRounds - 1,
              currentSampleIndex: result.result.sampleCount - 1,
            }
          : null,
        result: result.result,
        errorMessage: null,
        isStale: false,
        lastCompletedFingerprint: result.result.fingerprint,
      });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unknown worker error during training.";
      setSession((current) => ({
        ...current,
        status: current.status === "cancelled" ? "cancelled" : "error",
        errorMessage: message,
      }));
    }
  }

  function handleCancel(): void {
    workerRef.current?.cancel();
    workerRef.current?.dispose();
    workerRef.current = null;

    setSession((current) => ({
      ...current,
      status: "cancelled",
      progress: current.progress,
      errorMessage: "Training cancelled.",
    }));
  }

  function handleReset(): void {
    workerRef.current?.dispose();
    workerRef.current = null;

    const nextSettings = getDefaultAppSettings();
    setSettings(nextSettings);
    setSelectedCellIndex(null);
    setHoveredParameter(null);
    setMandelbrotHoverParameter(null);
    setSession({
      status: "idle",
      progress: null,
      result: null,
      errorMessage: null,
      isStale: false,
      lastCompletedFingerprint: null,
    });
  }

  function handleExportSettings(): void {
    downloadJsonFile("julia-som-settings.json", createSettingsDocument(settings));
  }

  function handleExportTrainingResult(): void {
    if (!session.result) {
      setSession((current) => ({
        ...current,
        status: "error",
        errorMessage: "No trained SOM is available to export.",
      }));
      return;
    }

    downloadJsonFile("julia-som-training-result.json", createTrainingResultDocument(session.result));
  }

  async function readSelectedFile(input: HTMLInputElement | null): Promise<string | null> {
    const file = input?.files?.[0];
    if (!file) {
      return null;
    }

    return file.text();
  }

  async function handleImportSettings(): Promise<void> {
    try {
      const content = await readSelectedFile(settingsFileInputRef.current);
      if (!content) {
        return;
      }

      const importedSettings = parseSettingsDocument(content);
      setSettings(importedSettings);
      setSession((current) => ({
        ...current,
        errorMessage: null,
      }));
    } catch (error) {
      setSession((current) => ({
        ...current,
        status: "error",
        errorMessage: error instanceof Error ? error.message : "Failed to import settings.",
      }));
    } finally {
      if (settingsFileInputRef.current) {
        settingsFileInputRef.current.value = "";
      }
    }
  }

  async function handleImportTrainingResult(): Promise<void> {
    try {
      const content = await readSelectedFile(resultFileInputRef.current);
      if (!content) {
        return;
      }

      const importedResult = parseTrainingResultDocument(content);
      const importedSettings: AppSettings = {
        ...importedResult.settings,
        viewerJuliaIterations: settings.viewerJuliaIterations,
      };

      setSettings(importedSettings);
      setSelectedCellIndex(importedResult.cells[0]?.index ?? null);
      setHoveredParameter(null);
      setMandelbrotHoverParameter(null);
      setSession({
        status: "completed",
        progress: importedResult.metadata.totalSteps
          ? {
              totalSteps: importedResult.metadata.totalSteps,
              completedSteps: importedResult.metadata.totalSteps,
              currentRound: importedResult.settings.trainingRounds - 1,
              currentSampleIndex: importedResult.sampleCount - 1,
            }
          : null,
        result: importedResult,
        errorMessage: null,
        isStale: false,
        lastCompletedFingerprint: importedResult.fingerprint,
      });
    } catch (error) {
      setSession((current) => ({
        ...current,
        status: "error",
        errorMessage: error instanceof Error ? error.message : "Failed to import trained SOM.",
      }));
    } finally {
      if (resultFileInputRef.current) {
        resultFileInputRef.current.value = "";
      }
    }
  }

  return (
    <div className={props.isZenView ? "app-shell app-shell--zen" : "app-shell"}>
      <aside className={`panel panel--controls${props.isZenView ? " panel--hidden" : ""}`}>
        <div className="panel__header">
          <p className="eyebrow">Controls</p>
          <h1>Julia Set Kohonen Map</h1>
          <p className="panel__lede">
            Deterministic browser training for Julia-set feature vectors with square or hex SOM
            topology.
          </p>
        </div>

        <section className="group">
          <h2>SOM Settings</h2>
          <Field label="Map Width">
            <NumberInput
              value={settings.somWidth}
              min={2}
              max={128}
              onChange={(value) => updateSettings({ somWidth: value })}
            />
          </Field>
          <Field label="Map Height">
            <NumberInput
              value={settings.somHeight}
              min={2}
              max={128}
              onChange={(value) => updateSettings({ somHeight: value })}
            />
          </Field>
          <Field label="Topology">
            <select
              className="field__input"
              value={settings.topology}
              onInput={(event) =>
                updateSettings({
                  topology: (event.currentTarget as HTMLSelectElement).value as AppSettings["topology"],
                })
              }
            >
              <option value="squares">Squares</option>
              <option value="hexagons">Hexagons</option>
            </select>
          </Field>
          <Field label="Training Rounds">
            <NumberInput
              value={settings.trainingRounds}
              min={1}
              max={512}
              onChange={(value) => updateSettings({ trainingRounds: value })}
            />
          </Field>
          <Field label="Random Seed" hint="Changing this invalidates trained results.">
            <input
              className="field__input"
              type="text"
              value={settings.randomSeed}
              onInput={(event) =>
                updateSettings({ randomSeed: (event.currentTarget as HTMLInputElement).value })
              }
            />
          </Field>
        </section>

        <section className="group">
          <h2>Training Features</h2>
          <Field label="Julia Iterations">
            <NumberInput
              value={settings.trainingJuliaIterations}
              min={8}
              max={4096}
              onChange={(value) => updateSettings({ trainingJuliaIterations: value })}
            />
          </Field>
          <Field label="Feature Width">
            <NumberInput
              value={settings.featureWidth}
              min={4}
              max={256}
              onChange={(value) => updateSettings({ featureWidth: value })}
            />
          </Field>
          <Field label="Feature Height">
            <NumberInput
              value={settings.featureHeight}
              min={4}
              max={256}
              onChange={(value) => updateSettings({ featureHeight: value })}
            />
          </Field>
        </section>

        <section className="group">
          <h2>Viewer</h2>
          <Field label="Viewer Iterations" hint="Viewer-only changes must not trigger retraining.">
            <NumberInput
              value={settings.viewerJuliaIterations}
              min={8}
              max={8192}
              onChange={(value) => updateSettings({ viewerJuliaIterations: value })}
            />
          </Field>
        </section>

        <section className="group">
          <h2>Actions</h2>
          <div className="actions">
            <button
              className="button button--primary"
              type="button"
              onClick={() => void handleTrain()}
              disabled={session.status === "training" || !validation.isValid}
            >
              Train
            </button>
            <button
              className="button"
              type="button"
              onClick={handleCancel}
              disabled={session.status !== "training"}
            >
              Cancel
            </button>
            <button className="button" type="button" onClick={handleReset}>
              Reset
            </button>
            <button className="button" type="button" onClick={handleExportSettings}>
              Export Settings
            </button>
            <button
              className="button"
              type="button"
              onClick={() => settingsFileInputRef.current?.click()}
            >
              Import Settings
            </button>
            <button className="button" type="button" onClick={handleExportTrainingResult}>
              Export Map
            </button>
            <button
              className="button"
              type="button"
              onClick={() => resultFileInputRef.current?.click()}
            >
              Import Map
            </button>
          </div>
          <input
            ref={settingsFileInputRef}
            className="file-input"
            type="file"
            accept="application/json"
            onChange={() => void handleImportSettings()}
          />
          <input
            ref={resultFileInputRef}
            className="file-input"
            type="file"
            accept="application/json"
            onChange={() => void handleImportTrainingResult()}
          />
        </section>

        <section className="group">
          <h2>Validation</h2>
          <p className="metric">Sample count: {validation.trainingSampleCount}</p>
          <p className="metric">Feature vector length: {validation.featureVectorLength}</p>
          {validation.errors.length > 0 ? (
            <ul className="errors">
              {validation.errors.map((error) => (
                <li key={error}>{error}</li>
              ))}
            </ul>
          ) : (
            <p className="ok">All current settings are valid.</p>
          )}
        </section>
      </aside>

      <main className={`panel panel--summary${props.isZenView ? " panel--summary-zen" : ""}`}>
        <div className="panel__header">
          <div className={`panel__header-row${props.isZenView ? " panel__header-row--zen" : ""}`}>
            <div>
              <p className="eyebrow">Training</p>
              <h2>{props.isZenView ? "Zen View" : "Status"}</h2>
            </div>
            {props.isZenView ? null : (
              <button
                className="button button--subtle"
                type="button"
                onClick={props.onToggleZenView}
              >
                Zen View
              </button>
            )}
          </div>
        </div>

        <section className={`status-card${props.isZenView ? " status-card--hidden" : ""}`}>
          <div className="status-card__row">
            <span>State</span>
            <strong>{session.status}</strong>
          </div>
          <div className="status-card__row">
            <span>Progress</span>
            <strong>{formatPercentage(session.progress)}%</strong>
          </div>
          <div className="progress-bar" aria-hidden="true">
            <div
              className="progress-bar__fill"
              style={{ width: `${formatPercentage(session.progress)}%` }}
            />
          </div>
          <div className="status-card__row">
            <span>Current round</span>
            <strong>{session.progress?.currentRound ?? 0}</strong>
          </div>
          <div className="status-card__row">
            <span>Current sample</span>
            <strong>{session.progress?.currentSampleIndex ?? 0}</strong>
          </div>
          <div className="status-card__row">
            <span>Result stale</span>
            <strong>{session.isStale ? "yes" : "no"}</strong>
          </div>
          {session.errorMessage ? <p className="error-banner">{session.errorMessage}</p> : null}
        </section>

        <section className={`result-grid${props.isZenView ? " result-grid--hidden" : ""}`}>
          <article className="card">
            <p className="eyebrow">Fingerprint</p>
            <h3>Determinism</h3>
            <p className="metric metric--large">{currentFingerprint.settingsDigest}</p>
            <p className="detail">Algorithm: {currentFingerprint.algorithmVersion}</p>
            <p className="detail">Topology: {currentFingerprint.topology}</p>
          </article>

          <article className="card">
            <p className="eyebrow">Training Result</p>
            <h3>Map Summary</h3>
            <p className="metric metric--large">{session.result?.cells.length ?? 0} cells</p>
            <p className="detail">Samples: {session.result?.sampleCount ?? 0}</p>
            <p className="detail">
              Feature length: {session.result?.metadata.featureVectorLength ?? validation.featureVectorLength}
            </p>
          </article>

          <article className="card">
            <p className="eyebrow">Representative</p>
            <h3>Selected Cell</h3>
            <p className="metric metric--large">
              {viewerParameter
                ? `${viewerParameter.real.toFixed(5)} ${viewerParameter.imaginary >= 0 ? "+" : "-"} ${Math.abs(viewerParameter.imaginary).toFixed(5)}i`
                : formatRepresentativeParameter(session.result)}
            </p>
            <p className="detail">
              Representative sample: {selectedCell?.representativeSampleIndex ?? "n/a"}
            </p>
          </article>
        </section>

        <section className={props.isZenView ? "viewer-layout viewer-layout--zen" : "viewer-layout"}>
          <article className="card card--map">
            <p className="eyebrow">Map</p>
            <h3>SOM Grid</h3>
            <SomMapCanvas
              result={session.result}
              selectedCellIndex={selectedCellIndex}
              highlightedCellIndex={highlightedCellIndex}
              onSelectCell={setSelectedCellIndex}
              onHoverParameter={setHoveredParameter}
            />
            <p className="detail">
              {selectedCell
                ? `Selected cell: (${selectedCell.x}, ${selectedCell.y})`
                : "No cell selected."}
            </p>
            <p className="detail">
              {highlightedCellIndex !== null
                ? `Nearest Mandelbrot hover match: cell #${highlightedCellIndex}`
                : "Hover the Mandelbrot panel to highlight the nearest cell."}
            </p>
          </article>

          <div className={props.isZenView ? "viewer-stack viewer-stack--zen" : "viewer-stack"}>
            <article className="card card--viewer">
              <p className="eyebrow">Parameter Plane</p>
              <h3>Mandelbrot Position</h3>
              <MandelbrotOverviewCanvas
                parameter={mandelbrotParameter}
                onHoverParameter={setMandelbrotHoverParameter}
              />
              <p className="detail">
                The crosshair marks the current Julia parameter `c` on the Mandelbrot set.
              </p>
              <p className="detail">
                Hover this panel to preview a parameter and highlight the nearest Kohonen cell.
              </p>
            </article>

            <article className="card card--viewer">
              <p className="eyebrow">Viewer</p>
              <h3>Julia Set</h3>
              <JuliaViewerCanvas
                parameter={viewerParameter}
                iterations={settings.viewerJuliaIterations}
              />
              <p className="detail">
                {hoveredParameter
                  ? "Showing interpolated hover parameter."
                  : selectedCell
                    ? "Showing the selected cell representative."
                    : "Train and select a cell to inspect it."}
              </p>
            </article>
          </div>
        </section>
      </main>

      <section className={`panel panel--inspector${props.isZenView ? " panel--hidden" : ""}`}>
        <div className="panel__header">
          <p className="eyebrow">Inspector</p>
          <h2>Implementation Status</h2>
          <p className="panel__lede">
            The app now renders the trained SOM and a live Julia viewer. Hover interpolation updates
            the viewer continuously, while clicks lock selection.
          </p>
        </div>

        <ul className="notes">
          <li>Training runs in a dedicated Web Worker and reports deterministic progress.</li>
          <li>Viewer-only settings remain separate from training settings.</li>
          <li>Changing training-relevant settings marks the current result stale.</li>
          <li>Square topology uses bilinear interpolation across cell quads.</li>
          <li>Hex topology uses inverse-distance interpolation across nearby cell centers.</li>
        </ul>
      </section>
    </div>
  );
}

function App(): preact.JSX.Element {
  const [route, setRoute] = useState<AppRoute>(() =>
    typeof window === "undefined" ? "/" : getAppRoute(window.location.pathname),
  );
  const [themeId, setThemeId] = useState<ThemeId>(getInitialThemeId);
  const [isZenView, setIsZenView] = useState(getInitialZenView);

  useEffect(() => {
    function handleLocationChange(): void {
      setRoute(getAppRoute(window.location.pathname));
    }

    window.addEventListener("popstate", handleLocationChange);
    return () => window.removeEventListener("popstate", handleLocationChange);
  }, []);

  useEffect(() => {
    applyTheme(themeId);
    window.localStorage.setItem(APP_THEME_STORAGE_KEY, themeId);
  }, [themeId]);

  useEffect(() => {
    syncZenQuery(isZenView);
  }, [isZenView]);

  useEffect(() => {
    if (!isZenView) {
      return;
    }

    function handleKeydown(event: KeyboardEvent): void {
      if (event.key === "Escape") {
        setIsZenView(false);
      }
    }

    window.addEventListener("keydown", handleKeydown);
    return () => window.removeEventListener("keydown", handleKeydown);
  }, [isZenView]);

  const activeTheme = useMemo(() => getThemeDefinition(themeId), [themeId]);

  return (
    <div className={isZenView ? "app-page app-page--zen" : "app-page"}>
      {!isZenView ? (
        <header className="topbar">
          <div className="topbar__title">
            <p className="eyebrow">Asimov Happy</p>
            <h2>Julia Set Kohonen Map</h2>
            <p className="detail">Theme: {activeTheme.label}</p>
          </div>
          <nav className="topbar__nav" aria-label="Primary">
            <NavLink href="/" currentRoute={route}>
              Workspace
            </NavLink>
            <NavLink href="/gui-settings" currentRoute={route}>
              GUI Settings
            </NavLink>
          </nav>
        </header>
      ) : null}
      {route === "/gui-settings" ? (
        <GuiSettingsRoute selectedThemeId={themeId} onSelectTheme={setThemeId} />
      ) : (
        <MainWorkspace isZenView={isZenView} onToggleZenView={() => setIsZenView((current) => !current)} />
      )}
    </div>
  );
}

const rootElement = document.getElementById("app");
if (!rootElement) {
  throw new Error("#app not found");
}

render(<App />, rootElement);
