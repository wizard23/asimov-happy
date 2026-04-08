export type ThemeId =
  | "dark"
  | "light"
  | "ocean"
  | "forest"
  | "volcano"
  | "purple"
  | "navy"
  | "army"
  | "air-force";

export interface ThemeDefinition {
  id: ThemeId;
  label: string;
  description: string;
  colorScheme: "light" | "dark";
  variables: Record<string, string>;
}

export const APP_THEME_STORAGE_KEY = "asimov-happy.theme";
export const DEFAULT_THEME_ID: ThemeId = "dark";

function createThemeDefinition(
  id: ThemeId,
  label: string,
  description: string,
  colorScheme: "light" | "dark",
  variables: Record<string, string>,
): ThemeDefinition {
  return {
    id,
    label,
    description,
    colorScheme,
    variables,
  };
}

// These palettes intentionally stay in moderate lightness/saturation bands so the resulting
// contrast feels balanced and predictable across themes, which is broadly aligned with HSLuv-style
// perceptual tuning even though the runtime uses standard CSS color values.
export const THEME_DEFINITIONS: ThemeDefinition[] = [
  createThemeDefinition("dark", "Dark", "Charcoal glass with ember accents.", "dark", {
    "--page-background": "hsl(225 24% 10%)",
    "--page-background-image":
      "radial-gradient(circle at top left, hsl(18 82% 55% / 0.20), transparent 30%), radial-gradient(circle at right, hsl(208 88% 56% / 0.16), transparent 28%), linear-gradient(180deg, hsl(225 25% 12%) 0%, hsl(228 23% 8%) 100%)",
    "--text-color": "hsl(40 25% 92%)",
    "--surface": "hsl(225 18% 18% / 0.84)",
    "--surface-strong": "hsl(226 18% 22% / 0.96)",
    "--surface-muted": "hsl(226 18% 16% / 0.74)",
    "--border": "hsl(215 35% 75% / 0.12)",
    "--accent": "hsl(206 86% 61%)",
    "--accent-strong": "hsl(19 88% 60%)",
    "--muted": "hsl(220 14% 72%)",
    "--ok": "hsl(151 55% 56%)",
    "--error": "hsl(8 80% 66%)",
    "--canvas-surface": "hsl(225 15% 20%)",
    "--canvas-mandelbrot": "hsl(224 44% 10%)",
    "--shadow-color": "hsl(225 60% 4% / 0.35)",
    "--crosshair-filter":
      "invert(57%) sepia(92%) saturate(514%) hue-rotate(348deg) brightness(100%) contrast(96%)",
  }),
  createThemeDefinition("light", "Light", "Paper-toned workspace with cobalt actions.", "light", {
    "--page-background": "hsl(42 33% 95%)",
    "--page-background-image":
      "radial-gradient(circle at top left, hsl(40 86% 62% / 0.22), transparent 28%), radial-gradient(circle at right, hsl(207 78% 50% / 0.14), transparent 28%), linear-gradient(180deg, hsl(44 45% 96%) 0%, hsl(37 36% 90%) 100%)",
    "--text-color": "hsl(217 42% 16%)",
    "--surface": "hsl(44 48% 98% / 0.82)",
    "--surface-strong": "hsl(0 0% 100% / 0.96)",
    "--surface-muted": "hsl(42 35% 92% / 0.82)",
    "--border": "hsl(217 28% 22% / 0.12)",
    "--accent": "hsl(211 76% 41%)",
    "--accent-strong": "hsl(18 66% 48%)",
    "--muted": "hsl(214 17% 40%)",
    "--ok": "hsl(147 61% 34%)",
    "--error": "hsl(8 63% 43%)",
    "--canvas-surface": "hsl(40 36% 88%)",
    "--canvas-mandelbrot": "hsl(217 45% 16%)",
    "--shadow-color": "hsl(215 45% 18% / 0.10)",
    "--crosshair-filter":
      "invert(38%) sepia(73%) saturate(1916%) hue-rotate(350deg) brightness(94%) contrast(92%)",
  }),
  createThemeDefinition("ocean", "Ocean", "Deep teal currents with foam highlights.", "dark", {
    "--page-background": "hsl(196 52% 12%)",
    "--page-background-image":
      "radial-gradient(circle at top left, hsl(184 88% 58% / 0.22), transparent 26%), radial-gradient(circle at right, hsl(210 72% 56% / 0.18), transparent 30%), linear-gradient(180deg, hsl(191 58% 16%) 0%, hsl(205 58% 10%) 100%)",
    "--text-color": "hsl(190 28% 92%)",
    "--surface": "hsl(193 40% 18% / 0.84)",
    "--surface-strong": "hsl(194 42% 22% / 0.96)",
    "--surface-muted": "hsl(196 34% 16% / 0.76)",
    "--border": "hsl(190 50% 80% / 0.14)",
    "--accent": "hsl(183 73% 52%)",
    "--accent-strong": "hsl(204 86% 63%)",
    "--muted": "hsl(191 18% 74%)",
    "--ok": "hsl(154 62% 55%)",
    "--error": "hsl(9 78% 66%)",
    "--canvas-surface": "hsl(195 35% 20%)",
    "--canvas-mandelbrot": "hsl(208 57% 13%)",
    "--shadow-color": "hsl(202 62% 5% / 0.34)",
    "--crosshair-filter":
      "invert(74%) sepia(39%) saturate(5210%) hue-rotate(138deg) brightness(102%) contrast(92%)",
  }),
  createThemeDefinition("forest", "Forest", "Mossy depth with warm resin contrast.", "dark", {
    "--page-background": "hsl(142 26% 12%)",
    "--page-background-image":
      "radial-gradient(circle at top left, hsl(132 54% 44% / 0.24), transparent 28%), radial-gradient(circle at right, hsl(38 80% 52% / 0.15), transparent 26%), linear-gradient(180deg, hsl(140 28% 16%) 0%, hsl(135 24% 10%) 100%)",
    "--text-color": "hsl(88 22% 92%)",
    "--surface": "hsl(138 21% 18% / 0.84)",
    "--surface-strong": "hsl(138 22% 22% / 0.96)",
    "--surface-muted": "hsl(140 19% 15% / 0.76)",
    "--border": "hsl(92 32% 80% / 0.14)",
    "--accent": "hsl(124 48% 54%)",
    "--accent-strong": "hsl(36 77% 58%)",
    "--muted": "hsl(104 16% 73%)",
    "--ok": "hsl(144 53% 57%)",
    "--error": "hsl(8 82% 67%)",
    "--canvas-surface": "hsl(136 18% 21%)",
    "--canvas-mandelbrot": "hsl(141 28% 12%)",
    "--shadow-color": "hsl(134 44% 4% / 0.34)",
    "--crosshair-filter":
      "invert(72%) sepia(45%) saturate(1515%) hue-rotate(356deg) brightness(100%) contrast(95%)",
  }),
  createThemeDefinition("volcano", "Volcano", "Basalt surfaces lit by lava reds.", "dark", {
    "--page-background": "hsl(12 18% 10%)",
    "--page-background-image":
      "radial-gradient(circle at top left, hsl(10 92% 58% / 0.30), transparent 28%), radial-gradient(circle at right, hsl(33 92% 54% / 0.16), transparent 24%), linear-gradient(180deg, hsl(10 18% 16%) 0%, hsl(14 22% 8%) 100%)",
    "--text-color": "hsl(34 38% 94%)",
    "--surface": "hsl(16 16% 18% / 0.84)",
    "--surface-strong": "hsl(15 15% 22% / 0.96)",
    "--surface-muted": "hsl(14 14% 14% / 0.74)",
    "--border": "hsl(26 45% 82% / 0.14)",
    "--accent": "hsl(12 86% 58%)",
    "--accent-strong": "hsl(34 88% 58%)",
    "--muted": "hsl(26 18% 74%)",
    "--ok": "hsl(148 52% 55%)",
    "--error": "hsl(4 91% 68%)",
    "--canvas-surface": "hsl(16 14% 20%)",
    "--canvas-mandelbrot": "hsl(12 28% 10%)",
    "--shadow-color": "hsl(10 44% 3% / 0.36)",
    "--crosshair-filter":
      "invert(54%) sepia(94%) saturate(1885%) hue-rotate(347deg) brightness(101%) contrast(98%)",
  }),
  createThemeDefinition("purple", "Purple", "Ink violet with luminous orchid accents.", "dark", {
    "--page-background": "hsl(270 26% 11%)",
    "--page-background-image":
      "radial-gradient(circle at top left, hsl(286 83% 67% / 0.24), transparent 27%), radial-gradient(circle at right, hsl(244 92% 66% / 0.18), transparent 30%), linear-gradient(180deg, hsl(272 32% 16%) 0%, hsl(266 30% 9%) 100%)",
    "--text-color": "hsl(282 24% 94%)",
    "--surface": "hsl(272 22% 18% / 0.84)",
    "--surface-strong": "hsl(272 24% 23% / 0.96)",
    "--surface-muted": "hsl(269 21% 15% / 0.76)",
    "--border": "hsl(285 44% 82% / 0.14)",
    "--accent": "hsl(286 70% 62%)",
    "--accent-strong": "hsl(247 90% 70%)",
    "--muted": "hsl(277 18% 76%)",
    "--ok": "hsl(154 54% 58%)",
    "--error": "hsl(346 80% 68%)",
    "--canvas-surface": "hsl(270 20% 20%)",
    "--canvas-mandelbrot": "hsl(255 34% 14%)",
    "--shadow-color": "hsl(274 62% 4% / 0.34)",
    "--crosshair-filter":
      "invert(66%) sepia(48%) saturate(1718%) hue-rotate(231deg) brightness(102%) contrast(95%)",
  }),
  createThemeDefinition("navy", "Navy", "Disciplined blue-black control room.", "dark", {
    "--page-background": "hsl(222 46% 10%)",
    "--page-background-image":
      "radial-gradient(circle at top left, hsl(213 89% 61% / 0.20), transparent 28%), radial-gradient(circle at right, hsl(194 72% 57% / 0.14), transparent 24%), linear-gradient(180deg, hsl(221 52% 14%) 0%, hsl(225 49% 8%) 100%)",
    "--text-color": "hsl(210 30% 94%)",
    "--surface": "hsl(221 31% 18% / 0.84)",
    "--surface-strong": "hsl(220 32% 22% / 0.96)",
    "--surface-muted": "hsl(223 28% 15% / 0.76)",
    "--border": "hsl(209 42% 82% / 0.14)",
    "--accent": "hsl(208 80% 61%)",
    "--accent-strong": "hsl(193 72% 56%)",
    "--muted": "hsl(212 18% 75%)",
    "--ok": "hsl(154 51% 57%)",
    "--error": "hsl(4 82% 68%)",
    "--canvas-surface": "hsl(221 25% 20%)",
    "--canvas-mandelbrot": "hsl(222 52% 11%)",
    "--shadow-color": "hsl(224 65% 3% / 0.36)",
    "--crosshair-filter":
      "invert(70%) sepia(42%) saturate(1654%) hue-rotate(163deg) brightness(103%) contrast(95%)",
  }),
  createThemeDefinition("army", "Army", "Olive field kit with brass highlights.", "dark", {
    "--page-background": "hsl(78 20% 12%)",
    "--page-background-image":
      "radial-gradient(circle at top left, hsl(68 48% 48% / 0.22), transparent 26%), radial-gradient(circle at right, hsl(34 72% 58% / 0.14), transparent 22%), linear-gradient(180deg, hsl(80 22% 17%) 0%, hsl(76 20% 10%) 100%)",
    "--text-color": "hsl(62 24% 92%)",
    "--surface": "hsl(76 16% 19% / 0.84)",
    "--surface-strong": "hsl(78 17% 23% / 0.96)",
    "--surface-muted": "hsl(78 15% 15% / 0.76)",
    "--border": "hsl(58 32% 82% / 0.13)",
    "--accent": "hsl(70 47% 54%)",
    "--accent-strong": "hsl(33 69% 58%)",
    "--muted": "hsl(62 14% 74%)",
    "--ok": "hsl(132 42% 54%)",
    "--error": "hsl(7 82% 68%)",
    "--canvas-surface": "hsl(76 14% 21%)",
    "--canvas-mandelbrot": "hsl(82 22% 11%)",
    "--shadow-color": "hsl(80 42% 3% / 0.34)",
    "--crosshair-filter":
      "invert(74%) sepia(42%) saturate(868%) hue-rotate(8deg) brightness(99%) contrast(95%)",
  }),
  createThemeDefinition("air-force", "Air Force", "Steel-blue mission deck with pale signal tones.", "dark", {
    "--page-background": "hsl(210 22% 14%)",
    "--page-background-image":
      "radial-gradient(circle at top left, hsl(197 62% 61% / 0.20), transparent 28%), radial-gradient(circle at right, hsl(218 56% 66% / 0.16), transparent 24%), linear-gradient(180deg, hsl(208 24% 20%) 0%, hsl(215 24% 11%) 100%)",
    "--text-color": "hsl(206 24% 94%)",
    "--surface": "hsl(208 18% 21% / 0.84)",
    "--surface-strong": "hsl(209 18% 26% / 0.96)",
    "--surface-muted": "hsl(210 16% 18% / 0.76)",
    "--border": "hsl(205 28% 84% / 0.14)",
    "--accent": "hsl(200 64% 64%)",
    "--accent-strong": "hsl(219 68% 72%)",
    "--muted": "hsl(207 15% 78%)",
    "--ok": "hsl(153 46% 58%)",
    "--error": "hsl(5 83% 69%)",
    "--canvas-surface": "hsl(210 15% 24%)",
    "--canvas-mandelbrot": "hsl(214 28% 13%)",
    "--shadow-color": "hsl(214 40% 4% / 0.34)",
    "--crosshair-filter":
      "invert(84%) sepia(20%) saturate(1406%) hue-rotate(169deg) brightness(102%) contrast(94%)",
  }),
];

export function isThemeId(value: string): value is ThemeId {
  return THEME_DEFINITIONS.some((theme) => theme.id === value);
}

export function getThemeDefinition(themeId: ThemeId): ThemeDefinition {
  return THEME_DEFINITIONS.find((theme) => theme.id === themeId) ?? THEME_DEFINITIONS[0]!;
}

export function getStoredThemeId(value: string | null): ThemeId {
  return value && isThemeId(value) ? value : DEFAULT_THEME_ID;
}
