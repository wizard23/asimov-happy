import {
  THEME_DEFINITIONS,
  type ThemeDefinition,
  type ThemeId,
} from "../app/themes.js";

export type FractalPaletteId = string;
export type PaletteMappingMode =
  | "binary"
  | "linear"
  | "logarithmic"
  | "cyclic"
  | "cyclic-mirrored";

interface RgbColor {
  red: number;
  green: number;
  blue: number;
}

interface PaletteStop {
  position: number;
  color: RgbColor;
}

export interface FractalPaletteDefinition {
  id: FractalPaletteId;
  label: string;
  background: RgbColor;
  interior: RgbColor;
  stops: PaletteStop[];
}

export const PALETTE_MAPPING_OPTIONS: Array<{
  id: PaletteMappingMode;
  label: string;
}> = [
  { id: "binary", label: "Binary" },
  { id: "linear", label: "Linear" },
  { id: "logarithmic", label: "Logarithmic" },
  { id: "cyclic", label: "Cyclic" },
  { id: "cyclic-mirrored", label: "Cyclic Mirrored" },
];

const CUSTOM_PALETTES: FractalPaletteDefinition[] = [
  {
    id: "ember",
    label: "Ember",
    background: { red: 12, green: 18, blue: 31 },
    interior: { red: 9, green: 12, blue: 22 },
    stops: [
      { position: 0, color: { red: 25, green: 38, blue: 65 } },
      { position: 0.35, color: { red: 40, green: 111, blue: 172 } },
      { position: 0.68, color: { red: 248, green: 172, blue: 76 } },
      { position: 1, color: { red: 255, green: 245, blue: 224 } },
    ],
  },
  {
    id: "oceanic",
    label: "Oceanic",
    background: { red: 8, green: 22, blue: 28 },
    interior: { red: 4, green: 12, blue: 17 },
    stops: [
      { position: 0, color: { red: 18, green: 59, blue: 84 } },
      { position: 0.4, color: { red: 37, green: 143, blue: 118 } },
      { position: 0.75, color: { red: 126, green: 209, blue: 167 } },
      { position: 1, color: { red: 234, green: 248, blue: 233 } },
    ],
  },
  {
    id: "graphite",
    label: "Graphite",
    background: { red: 20, green: 21, blue: 26 },
    interior: { red: 8, green: 8, blue: 10 },
    stops: [
      { position: 0, color: { red: 54, green: 56, blue: 69 } },
      { position: 0.45, color: { red: 122, green: 129, blue: 145 } },
      { position: 0.78, color: { red: 197, green: 201, blue: 210 } },
      { position: 1, color: { red: 250, green: 247, blue: 239 } },
    ],
  },
];

const ALTERNATING_BLACK_PALETTE_COLORS: Array<{
  id: string;
  label: string;
  color: RgbColor;
}> = [
  { id: "red-black", label: "Red / Black", color: { red: 255, green: 122, blue: 161 } },
  { id: "orange-black", label: "Orange / Black", color: { red: 255, green: 140, blue: 0 } },
  { id: "yellow-black", label: "Yellow / Black", color: { red: 255, green: 255, blue: 0 } },
  { id: "lime-black", label: "Lime / Black", color: { red: 200, green: 255, blue: 0 } },
  { id: "green-black", label: "Green / Black", color: { red: 122, green: 230, blue: 171 } },
  { id: "cyan-black", label: "Cyan / Black", color: { red: 0, green: 227, blue: 233 } },
  { id: "blue-black", label: "Blue / Black", color: { red: 10, green: 80, blue: 255 } },
  { id: "magenta-black", label: "Magenta / Black", color: { red: 232, green: 0, blue: 255 } },
];

export const DEFAULT_FRACTAL_PALETTE_ID: FractalPaletteId = "ember";
export const DEFAULT_PALETTE_MAPPING_MODE: PaletteMappingMode = "logarithmic";
export const DEFAULT_PALETTE_CYCLES = 6;

function clampChannel(value: number): number {
  return Math.max(0, Math.min(255, Math.round(value)));
}

function interpolateChannel(start: number, end: number, ratio: number): number {
  return start + (end - start) * ratio;
}

function mixRgb(first: RgbColor, second: RgbColor, ratio: number): RgbColor {
  return {
    red: clampChannel(interpolateChannel(first.red, second.red, ratio)),
    green: clampChannel(interpolateChannel(first.green, second.green, ratio)),
    blue: clampChannel(interpolateChannel(first.blue, second.blue, ratio)),
  };
}

function darken(color: RgbColor, ratio: number): RgbColor {
  return mixRgb(color, { red: 0, green: 0, blue: 0 }, ratio);
}

function parseHslColor(value: string): RgbColor {
  const match = value.match(/hsla?\(\s*([0-9.]+)\s+([0-9.]+)%\s+([0-9.]+)%(?:\s*\/\s*([0-9.]+%?))?\s*\)/i);
  if (!match) {
    throw new Error(`Unsupported theme color format: ${value}`);
  }

  const hue = Number(match[1]);
  const saturation = Number(match[2]) / 100;
  const lightness = Number(match[3]) / 100;

  const chroma = (1 - Math.abs(2 * lightness - 1)) * saturation;
  const huePrime = ((hue % 360) + 360) % 360 / 60;
  const secondary = chroma * (1 - Math.abs((huePrime % 2) - 1));
  let red = 0;
  let green = 0;
  let blue = 0;

  if (huePrime >= 0 && huePrime < 1) {
    red = chroma;
    green = secondary;
  } else if (huePrime < 2) {
    red = secondary;
    green = chroma;
  } else if (huePrime < 3) {
    green = chroma;
    blue = secondary;
  } else if (huePrime < 4) {
    green = secondary;
    blue = chroma;
  } else if (huePrime < 5) {
    red = secondary;
    blue = chroma;
  } else {
    red = chroma;
    blue = secondary;
  }

  const matchLightness = lightness - chroma / 2;
  return {
    red: clampChannel((red + matchLightness) * 255),
    green: clampChannel((green + matchLightness) * 255),
    blue: clampChannel((blue + matchLightness) * 255),
  };
}

function getThemeColor(theme: ThemeDefinition, variableName: string): RgbColor {
  const value = theme.variables[variableName];
  if (!value) {
    throw new Error(`Theme ${theme.id} is missing ${variableName}.`);
  }
  return parseHslColor(value);
}

function createThemePalette(theme: ThemeDefinition): FractalPaletteDefinition {
  const background = getThemeColor(theme, "--canvas-mandelbrot");
  const accent = getThemeColor(theme, "--accent");
  const accentStrong = getThemeColor(theme, "--accent-strong");
  const text = getThemeColor(theme, "--text-color");
  const muted = getThemeColor(theme, "--muted");

  return {
    id: `theme:${theme.id}`,
    label: `Theme: ${theme.label}`,
    background,
    interior: darken(background, theme.colorScheme === "light" ? 0.22 : 0.16),
    stops: [
      { position: 0, color: mixRgb(background, accent, 0.28) },
      { position: 0.4, color: accent },
      { position: 0.75, color: accentStrong },
      { position: 1, color: mixRgb(text, muted, 0.25) },
    ],
  };
}

function createAlternatingBlackPalette(id: string, label: string, color: RgbColor): FractalPaletteDefinition {
  const black = { red: 0, green: 0, blue: 0 };
  return {
    id,
    label,
    background: black,
    interior: black,
    stops: [
      { position: 0, color },
      { position: 0.2, color: black },
      { position: 0.4, color },
      { position: 0.6, color: black },
      { position: 0.8, color },
      { position: 1, color: black },
    ],
  };
}

const FRACTAL_PALETTES: FractalPaletteDefinition[] = [
  ...CUSTOM_PALETTES,
  ...ALTERNATING_BLACK_PALETTE_COLORS.map((palette) =>
    createAlternatingBlackPalette(palette.id, palette.label, palette.color),
  ),
  ...THEME_DEFINITIONS.map((theme) => createThemePalette(theme)),
];

export function getFractalPalettes(): FractalPaletteDefinition[] {
  return FRACTAL_PALETTES;
}

export function getThemeFractalPaletteId(themeId: ThemeId): FractalPaletteId {
  return `theme:${themeId}`;
}

export function getFractalPalette(paletteId: FractalPaletteId): FractalPaletteDefinition {
  return FRACTAL_PALETTES.find((palette) => palette.id === paletteId) ?? FRACTAL_PALETTES[0]!;
}

export function getPaletteMappingLabel(mode: PaletteMappingMode): string {
  return PALETTE_MAPPING_OPTIONS.find((option) => option.id === mode)?.label ?? mode;
}

export function mapPaletteValue(
  value: number,
  mode: PaletteMappingMode,
  cycles = DEFAULT_PALETTE_CYCLES,
): number {
  const normalizedValue = Math.max(0, Math.min(1, value));
  const safeCycles = Math.max(1, cycles);

  switch (mode) {
    case "binary":
      return normalizedValue >= 0.5 ? 1 : 0;
    case "linear":
      return normalizedValue;
    case "logarithmic":
      return Math.log1p(normalizedValue * 99) / Math.log(100);
    case "cyclic":
      return (normalizedValue * safeCycles) % 1;
    case "cyclic-mirrored": {
      const phase = (normalizedValue * safeCycles) % 2;
      return phase <= 1 ? phase : 2 - phase;
    }
  }
}

export function clampByte(value: number): number {
  return clampChannel(value);
}

export function getPaletteColor(
  paletteId: FractalPaletteId,
  value: number,
  options?: {
    isInterior?: boolean;
  },
): RgbColor {
  const palette = getFractalPalette(paletteId);

  if (options?.isInterior) {
    return palette.interior;
  }

  const normalizedValue = Math.max(0, Math.min(1, value));
  const upperStop = palette.stops.find((stop) => normalizedValue <= stop.position) ?? palette.stops.at(-1)!;
  const upperStopIndex = palette.stops.indexOf(upperStop);
  const lowerStop = palette.stops[Math.max(0, upperStopIndex - 1)] ?? upperStop;

  if (lowerStop.position === upperStop.position) {
    return upperStop.color;
  }

  const localRatio =
    (normalizedValue - lowerStop.position) / (upperStop.position - lowerStop.position);

  return {
    red: clampChannel(interpolateChannel(lowerStop.color.red, upperStop.color.red, localRatio)),
    green: clampChannel(
      interpolateChannel(lowerStop.color.green, upperStop.color.green, localRatio),
    ),
    blue: clampChannel(interpolateChannel(lowerStop.color.blue, upperStop.color.blue, localRatio)),
  };
}

export function getMappedPaletteColor(
  paletteId: FractalPaletteId,
  value: number,
  options?: {
    isInterior?: boolean;
    mappingMode?: PaletteMappingMode;
    cycles?: number;
  },
): RgbColor {
  const palette = getFractalPalette(paletteId);

  if (options?.isInterior) {
    return palette.interior;
  }

  if ((options?.mappingMode ?? DEFAULT_PALETTE_MAPPING_MODE) === "binary") {
    return mapPaletteValue(value, "binary", options?.cycles) >= 0.5
      ? palette.stops.at(-1)!.color
      : palette.interior;
  }

  return getPaletteColor(
    paletteId,
    mapPaletteValue(value, options?.mappingMode ?? DEFAULT_PALETTE_MAPPING_MODE, options?.cycles),
  );
}

export function getPaletteCssBackground(paletteId: FractalPaletteId): string {
  const palette = getFractalPalette(paletteId);
  return `rgb(${palette.background.red} ${palette.background.green} ${palette.background.blue})`;
}
