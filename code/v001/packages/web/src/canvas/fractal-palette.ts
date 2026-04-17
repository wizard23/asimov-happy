export type FractalPaletteId = "ember" | "oceanic" | "graphite";

interface RgbColor {
  red: number;
  green: number;
  blue: number;
}

interface PaletteStop {
  position: number;
  color: RgbColor;
}

interface FractalPaletteDefinition {
  id: FractalPaletteId;
  label: string;
  background: RgbColor;
  interior: RgbColor;
  stops: PaletteStop[];
}

const FRACTAL_PALETTES: FractalPaletteDefinition[] = [
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

export const DEFAULT_FRACTAL_PALETTE_ID: FractalPaletteId = "ember";

export function getFractalPalettes(): FractalPaletteDefinition[] {
  return FRACTAL_PALETTES;
}

export function getFractalPalette(paletteId: FractalPaletteId): FractalPaletteDefinition {
  return FRACTAL_PALETTES.find((palette) => palette.id === paletteId) ?? FRACTAL_PALETTES[0]!;
}

function interpolateChannel(start: number, end: number, ratio: number): number {
  return start + (end - start) * ratio;
}

export function clampByte(value: number): number {
  return Math.max(0, Math.min(255, Math.round(value)));
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
    red: clampByte(interpolateChannel(lowerStop.color.red, upperStop.color.red, localRatio)),
    green: clampByte(
      interpolateChannel(lowerStop.color.green, upperStop.color.green, localRatio),
    ),
    blue: clampByte(interpolateChannel(lowerStop.color.blue, upperStop.color.blue, localRatio)),
  };
}

export function getPaletteCssBackground(paletteId: FractalPaletteId): string {
  const palette = getFractalPalette(paletteId);
  return `rgb(${palette.background.red} ${palette.background.green} ${palette.background.blue})`;
}
