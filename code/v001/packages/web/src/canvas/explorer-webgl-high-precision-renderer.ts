import { getFractalPalette } from "./fractal-palette.js";
import type {
  EscapeBandConfiguration,
  ExplorerImageRenderer,
  MandelbrotRenderParams,
} from "./explorer-renderer.js";
import type { RgbColor } from "./fractal-palette.js";

const VERTEX_SHADER_SOURCE = `
attribute vec2 a_position;

void main() {
  gl_Position = vec4(a_position, 0.0, 1.0);
}
`;

const FRAGMENT_SHADER_SOURCE = `
precision highp float;

uniform int u_mode;
uniform int u_iterations;
uniform int u_paletteMappingMode;
uniform vec2 u_resolution;
uniform vec2 u_viewportMinReal;
uniform vec2 u_viewportWidth;
uniform vec2 u_viewportMaxImaginary;
uniform vec2 u_viewportHeight;
uniform vec2 u_parameterReal;
uniform vec2 u_parameterImaginary;
uniform float u_paletteCycles;
uniform vec3 u_interiorColor;
uniform vec3 u_stopColors[4];
uniform float u_stopPositions[4];
uniform int u_escapeBandEntryCount;
uniform vec3 u_escapeBandColors[12];
uniform int u_escapeBandThresholds[11];

const int MAX_ITERATIONS = 4096;
const int MAX_ESCAPE_BAND_ENTRIES = 12;
const float SPLITTER = 4097.0;

vec2 quickTwoSum(float a, float b) {
  float s = a + b;
  float e = b - (s - a);
  return vec2(s, e);
}

vec2 twoSum(float a, float b) {
  float s = a + b;
  float bb = s - a;
  float e = (a - (s - bb)) + (b - bb);
  return vec2(s, e);
}

vec2 splitFloat(float a) {
  float c = SPLITTER * a;
  float abig = c - a;
  float hi = c - abig;
  float lo = a - hi;
  return vec2(hi, lo);
}

vec2 twoProd(float a, float b) {
  float p = a * b;
  vec2 as = splitFloat(a);
  vec2 bs = splitFloat(b);
  float e = ((as.x * bs.x - p) + as.x * bs.y + as.y * bs.x) + as.y * bs.y;
  return vec2(p, e);
}

vec2 dsNormalize(vec2 a) {
  return quickTwoSum(a.x, a.y);
}

vec2 dsAdd(vec2 a, vec2 b) {
  vec2 s = twoSum(a.x, b.x);
  float t = a.y + b.y;
  return dsNormalize(vec2(s.x, s.y + t));
}

vec2 dsNeg(vec2 a) {
  return vec2(-a.x, -a.y);
}

vec2 dsSub(vec2 a, vec2 b) {
  return dsAdd(a, dsNeg(b));
}

vec2 dsMul(vec2 a, vec2 b) {
  vec2 p = twoProd(a.x, b.x);
  float e = p.y + a.x * b.y + a.y * b.x + a.y * b.y;
  return dsNormalize(vec2(p.x, e));
}

float dsToFloat(vec2 a) {
  return a.x + a.y;
}

vec3 getPaletteColor(float value) {
  float normalizedValue = clamp(value, 0.0, 1.0);

  if (normalizedValue <= u_stopPositions[0]) {
    return u_stopColors[0];
  }

  for (int i = 1; i < 4; i += 1) {
    if (normalizedValue <= u_stopPositions[i]) {
      float span = u_stopPositions[i] - u_stopPositions[i - 1];
      float ratio = span <= 0.0 ? 0.0 : (normalizedValue - u_stopPositions[i - 1]) / span;
      return mix(u_stopColors[i - 1], u_stopColors[i], ratio);
    }
  }

  return u_stopColors[3];
}

float applyPaletteMapping(float value) {
  float normalizedValue = clamp(value, 0.0, 1.0);

  if (u_paletteMappingMode == 0) {
    return normalizedValue >= 0.5 ? 1.0 : 0.0;
  }

  if (u_paletteMappingMode == 1) {
    return normalizedValue;
  }

  if (u_paletteMappingMode == 2) {
    return log(1.0 + normalizedValue * 99.0) / log(100.0);
  }

  float cycleCount = max(1.0, u_paletteCycles);
  if (u_paletteMappingMode == 3) {
    return fract(normalizedValue * cycleCount);
  }

  float phase = mod(normalizedValue * cycleCount, 2.0);
  return phase <= 1.0 ? phase : 2.0 - phase;
}

vec3 getMappedColor(float value) {
  if (u_paletteMappingMode == 0) {
    return u_stopColors[3];
  }

  return getPaletteColor(applyPaletteMapping(value));
}

vec3 getEscapeBandFallbackColor() {
  for (int i = 0; i < MAX_ESCAPE_BAND_ENTRIES; i += 1) {
    if (i == u_escapeBandEntryCount - 1) {
      return u_escapeBandColors[i];
    }
  }

  return u_escapeBandColors[MAX_ESCAPE_BAND_ENTRIES - 1];
}

vec3 getEscapeBandColor(int escapeIterationCount) {
  for (int i = 0; i < MAX_ESCAPE_BAND_ENTRIES - 1; i += 1) {
    if (i >= u_escapeBandEntryCount - 1) {
      break;
    }

    if (escapeIterationCount <= u_escapeBandThresholds[i]) {
      return u_escapeBandColors[i];
    }
  }

  return getEscapeBandFallbackColor();
}

void main() {
  vec2 normalizedCoordinate = vec2(
    (gl_FragCoord.x - 0.5) / u_resolution.x,
    1.0 - ((gl_FragCoord.y - 0.5) / u_resolution.y)
  );

  vec2 coordinateReal = dsAdd(u_viewportMinReal, dsMul(u_viewportWidth, vec2(normalizedCoordinate.x, 0.0)));
  vec2 coordinateImaginary = dsSub(u_viewportMaxImaginary, dsMul(u_viewportHeight, vec2(normalizedCoordinate.y, 0.0)));

  vec2 zReal = u_mode == 0 ? vec2(0.0, 0.0) : coordinateReal;
  vec2 zImaginary = u_mode == 0 ? vec2(0.0, 0.0) : coordinateImaginary;
  vec2 cReal = u_mode == 0 ? coordinateReal : u_parameterReal;
  vec2 cImaginary = u_mode == 0 ? coordinateImaginary : u_parameterImaginary;
  bool escaped = false;
  int iteration = 0;

  for (int i = 0; i < MAX_ITERATIONS; i += 1) {
    if (i >= u_iterations) {
      break;
    }

    vec2 nextReal = dsAdd(dsSub(dsMul(zReal, zReal), dsMul(zImaginary, zImaginary)), cReal);
    vec2 nextImaginary = dsAdd(dsMul(dsAdd(zReal, zReal), zImaginary), cImaginary);
    zReal = nextReal;
    zImaginary = nextImaginary;

    float realApproximation = dsToFloat(zReal);
    float imaginaryApproximation = dsToFloat(zImaginary);
    if (realApproximation * realApproximation + imaginaryApproximation * imaginaryApproximation > 4.0) {
      escaped = true;
      iteration = i;
      break;
    }

    iteration = i;
  }

  if (!escaped) {
    if (u_paletteMappingMode == 5) {
      gl_FragColor = vec4(getEscapeBandFallbackColor(), 1.0);
      return;
    }

    gl_FragColor = vec4(u_interiorColor, 1.0);
    return;
  }

  if (u_paletteMappingMode == 5) {
    gl_FragColor = vec4(getEscapeBandColor(iteration + 1), 1.0);
    return;
  }

  float realApproximation = dsToFloat(zReal);
  float imaginaryApproximation = dsToFloat(zImaginary);
  float magnitudeSquared = max(realApproximation * realApproximation + imaginaryApproximation * imaginaryApproximation, 4.0);
  float smoothedIteration = float(iteration) + 1.0 - log2(log2(magnitudeSquared));
  float normalizedEscape = clamp(smoothedIteration / float(u_iterations), 0.0, 1.0);
  gl_FragColor = vec4(getMappedColor(normalizedEscape), 1.0);
}
`;

interface WebGlHighPrecisionRendererState {
  context: WebGLRenderingContext;
  program: WebGLProgram;
  positionBuffer: WebGLBuffer;
  positionLocation: number;
  modeLocation: WebGLUniformLocation;
  iterationsLocation: WebGLUniformLocation;
  paletteMappingModeLocation: WebGLUniformLocation;
  resolutionLocation: WebGLUniformLocation;
  viewportMinRealLocation: WebGLUniformLocation;
  viewportWidthLocation: WebGLUniformLocation;
  viewportMaxImaginaryLocation: WebGLUniformLocation;
  viewportHeightLocation: WebGLUniformLocation;
  parameterRealLocation: WebGLUniformLocation;
  parameterImaginaryLocation: WebGLUniformLocation;
  paletteCyclesLocation: WebGLUniformLocation;
  interiorColorLocation: WebGLUniformLocation;
  stopColorsLocation: WebGLUniformLocation;
  stopPositionsLocation: WebGLUniformLocation;
  escapeBandEntryCountLocation: WebGLUniformLocation;
  escapeBandColorsLocation: WebGLUniformLocation;
  escapeBandThresholdsLocation: WebGLUniformLocation;
}

const WEBGL_STATE_CACHE = new WeakMap<HTMLCanvasElement, WebGlHighPrecisionRendererState>();

function createShader(
  context: WebGLRenderingContext,
  type: number,
  source: string,
): WebGLShader {
  const shader = context.createShader(type);
  if (!shader) {
    throw new Error("Failed to create WebGL shader.");
  }

  context.shaderSource(shader, source);
  context.compileShader(shader);

  if (!context.getShaderParameter(shader, context.COMPILE_STATUS)) {
    const infoLog = context.getShaderInfoLog(shader) ?? "Unknown shader compilation failure.";
    context.deleteShader(shader);
    throw new Error(infoLog);
  }

  return shader;
}

function createProgram(context: WebGLRenderingContext): WebGLProgram {
  const vertexShader = createShader(context, context.VERTEX_SHADER, VERTEX_SHADER_SOURCE);
  const fragmentShader = createShader(context, context.FRAGMENT_SHADER, FRAGMENT_SHADER_SOURCE);
  const program = context.createProgram();

  if (!program) {
    throw new Error("Failed to create WebGL program.");
  }

  context.attachShader(program, vertexShader);
  context.attachShader(program, fragmentShader);
  context.linkProgram(program);

  context.deleteShader(vertexShader);
  context.deleteShader(fragmentShader);

  if (!context.getProgramParameter(program, context.LINK_STATUS)) {
    const infoLog = context.getProgramInfoLog(program) ?? "Unknown program link failure.";
    context.deleteProgram(program);
    throw new Error(infoLog);
  }

  return program;
}

function getUniformLocation(
  context: WebGLRenderingContext,
  program: WebGLProgram,
  uniformName: string,
): WebGLUniformLocation {
  const location = context.getUniformLocation(program, uniformName);
  if (!location) {
    throw new Error(`Missing WebGL uniform: ${uniformName}`);
  }
  return location;
}

function getRendererState(canvas: HTMLCanvasElement): WebGlHighPrecisionRendererState {
  const existingState = WEBGL_STATE_CACHE.get(canvas);
  if (existingState) {
    return existingState;
  }

  const context =
    canvas.getContext("webgl", { preserveDrawingBuffer: true }) ??
    canvas.getContext("experimental-webgl", { preserveDrawingBuffer: true });
  if (!context || !(context instanceof WebGLRenderingContext)) {
    throw new Error("WebGL context unavailable.");
  }

  const program = createProgram(context);
  const positionBuffer = context.createBuffer();
  if (!positionBuffer) {
    throw new Error("Failed to create WebGL vertex buffer.");
  }

  context.bindBuffer(context.ARRAY_BUFFER, positionBuffer);
  context.bufferData(
    context.ARRAY_BUFFER,
    new Float32Array([
      -1, -1,
      1, -1,
      -1, 1,
      -1, 1,
      1, -1,
      1, 1,
    ]),
    context.STATIC_DRAW,
  );

  const positionLocation = context.getAttribLocation(program, "a_position");
  if (positionLocation < 0) {
    throw new Error("Missing WebGL attribute: a_position");
  }

  const state: WebGlHighPrecisionRendererState = {
    context,
    program,
    positionBuffer,
    positionLocation,
    modeLocation: getUniformLocation(context, program, "u_mode"),
    iterationsLocation: getUniformLocation(context, program, "u_iterations"),
    paletteMappingModeLocation: getUniformLocation(context, program, "u_paletteMappingMode"),
    resolutionLocation: getUniformLocation(context, program, "u_resolution"),
    viewportMinRealLocation: getUniformLocation(context, program, "u_viewportMinReal"),
    viewportWidthLocation: getUniformLocation(context, program, "u_viewportWidth"),
    viewportMaxImaginaryLocation: getUniformLocation(context, program, "u_viewportMaxImaginary"),
    viewportHeightLocation: getUniformLocation(context, program, "u_viewportHeight"),
    parameterRealLocation: getUniformLocation(context, program, "u_parameterReal"),
    parameterImaginaryLocation: getUniformLocation(context, program, "u_parameterImaginary"),
    paletteCyclesLocation: getUniformLocation(context, program, "u_paletteCycles"),
    interiorColorLocation: getUniformLocation(context, program, "u_interiorColor"),
    stopColorsLocation: getUniformLocation(context, program, "u_stopColors"),
    stopPositionsLocation: getUniformLocation(context, program, "u_stopPositions"),
    escapeBandEntryCountLocation: getUniformLocation(context, program, "u_escapeBandEntryCount"),
    escapeBandColorsLocation: getUniformLocation(context, program, "u_escapeBandColors"),
    escapeBandThresholdsLocation: getUniformLocation(context, program, "u_escapeBandThresholds"),
  };

  WEBGL_STATE_CACHE.set(canvas, state);
  return state;
}

function splitNumberToFloatPair(value: number): [number, number] {
  const high = Math.fround(value);
  const low = Math.fround(value - high);
  return [high, low];
}

function renderToCanvas(
  canvas: HTMLCanvasElement,
  options: {
    mode: 0 | 1;
    viewportMinReal: number;
    viewportWidth: number;
    viewportMaxImaginary: number;
    viewportHeight: number;
    parameterReal: number;
    parameterImaginary: number;
    iterations: number;
    paletteId: MandelbrotRenderParams["palette"];
    paletteMappingMode: MandelbrotRenderParams["paletteMappingMode"];
    paletteCycles: MandelbrotRenderParams["paletteCycles"];
    binaryInteriorColor?: RgbColor;
    binaryExteriorColor?: RgbColor;
    escapeBands?: EscapeBandConfiguration;
  },
): void {
  const state = getRendererState(canvas);
  const { context } = state;
  const palette = getFractalPalette(options.paletteId);
  const interiorColor = options.paletteMappingMode === "binary"
    ? (options.binaryInteriorColor ?? palette.interior)
    : palette.interior;
  const finalStopColor = options.paletteMappingMode === "binary"
    ? (options.binaryExteriorColor ?? palette.stops.at(-1)!.color)
    : palette.stops.at(-1)!.color;
  const paletteStops = palette.stops.map((stop, index, allStops) =>
    index === allStops.length - 1 ? { ...stop, color: finalStopColor } : stop,
  );
  const stopColors = paletteStops.flatMap((stop) => [
    stop.color.red / 255,
    stop.color.green / 255,
    stop.color.blue / 255,
  ]);
  const stopPositions = paletteStops.map((stop) => stop.position);
  const escapeBandEntryCount = Math.max(
    2,
    Math.min(options.escapeBands?.entryCount ?? 3, 12),
  );
  const escapeBandColors = Array.from({ length: 12 }, (_, index) => {
    const fallbackColor = options.binaryExteriorColor ?? finalStopColor;
    return options.escapeBands?.colors[index] ?? fallbackColor;
  }).flatMap((color) => [color.red / 255, color.green / 255, color.blue / 255]);
  const escapeBandThresholds = Array.from(
    { length: 11 },
    (_, index) => options.escapeBands?.thresholds[index] ?? 2147483647,
  );
  const viewportMinReal = splitNumberToFloatPair(options.viewportMinReal);
  const viewportWidth = splitNumberToFloatPair(options.viewportWidth);
  const viewportMaxImaginary = splitNumberToFloatPair(options.viewportMaxImaginary);
  const viewportHeight = splitNumberToFloatPair(options.viewportHeight);
  const parameterReal = splitNumberToFloatPair(options.parameterReal);
  const parameterImaginary = splitNumberToFloatPair(options.parameterImaginary);

  context.viewport(0, 0, canvas.width, canvas.height);
  context.clearColor(0, 0, 0, 1);
  context.clear(context.COLOR_BUFFER_BIT);
  context.useProgram(state.program);
  context.bindBuffer(context.ARRAY_BUFFER, state.positionBuffer);
  context.enableVertexAttribArray(state.positionLocation);
  context.vertexAttribPointer(state.positionLocation, 2, context.FLOAT, false, 0, 0);

  context.uniform1i(state.modeLocation, options.mode);
  context.uniform1i(state.iterationsLocation, options.iterations);
  context.uniform1i(state.paletteMappingModeLocation, getPaletteMappingModeIndex(options.paletteMappingMode));
  context.uniform2f(state.resolutionLocation, canvas.width, canvas.height);
  context.uniform2f(state.viewportMinRealLocation, viewportMinReal[0], viewportMinReal[1]);
  context.uniform2f(state.viewportWidthLocation, viewportWidth[0], viewportWidth[1]);
  context.uniform2f(state.viewportMaxImaginaryLocation, viewportMaxImaginary[0], viewportMaxImaginary[1]);
  context.uniform2f(state.viewportHeightLocation, viewportHeight[0], viewportHeight[1]);
  context.uniform2f(state.parameterRealLocation, parameterReal[0], parameterReal[1]);
  context.uniform2f(state.parameterImaginaryLocation, parameterImaginary[0], parameterImaginary[1]);
  context.uniform1f(state.paletteCyclesLocation, options.paletteCycles);
  context.uniform3f(
    state.interiorColorLocation,
    interiorColor.red / 255,
    interiorColor.green / 255,
    interiorColor.blue / 255,
  );
  context.uniform3fv(state.stopColorsLocation, new Float32Array(stopColors));
  context.uniform1fv(state.stopPositionsLocation, new Float32Array(stopPositions));
  context.uniform1i(state.escapeBandEntryCountLocation, escapeBandEntryCount);
  context.uniform3fv(state.escapeBandColorsLocation, new Float32Array(escapeBandColors));
  context.uniform1iv(state.escapeBandThresholdsLocation, new Int32Array(escapeBandThresholds));

  context.drawArrays(context.TRIANGLES, 0, 6);
}

function getPaletteMappingModeIndex(mode: MandelbrotRenderParams["paletteMappingMode"]): number {
  switch (mode) {
    case "binary":
      return 0;
    case "linear":
      return 1;
    case "logarithmic":
      return 2;
    case "cyclic":
      return 3;
    case "cyclic-mirrored":
      return 4;
    case "escape-bands":
      return 5;
  }
}

export const WEBGL_HIGH_PRECISION_EXPLORER_IMAGE_RENDERER: ExplorerImageRenderer = {
  id: "webgl-high-precision",
  renderMandelbrot(canvas, params) {
    renderToCanvas(canvas, {
      mode: 0,
      viewportMinReal: params.viewport.minReal,
      viewportWidth: params.viewport.maxReal - params.viewport.minReal,
      viewportMaxImaginary: params.viewport.maxImaginary,
      viewportHeight: params.viewport.maxImaginary - params.viewport.minImaginary,
      parameterReal: 0,
      parameterImaginary: 0,
      iterations: params.iterations,
      paletteId: params.palette,
      paletteMappingMode: params.paletteMappingMode,
      paletteCycles: params.paletteCycles,
      ...(params.binaryInteriorColor ? { binaryInteriorColor: params.binaryInteriorColor } : {}),
      ...(params.binaryExteriorColor ? { binaryExteriorColor: params.binaryExteriorColor } : {}),
      ...(params.escapeBands ? { escapeBands: params.escapeBands } : {}),
    });
  },
  renderJulia(canvas, params) {
    renderToCanvas(canvas, {
      mode: 1,
      viewportMinReal: params.viewport.minReal,
      viewportWidth: params.viewport.maxReal - params.viewport.minReal,
      viewportMaxImaginary: params.viewport.maxImaginary,
      viewportHeight: params.viewport.maxImaginary - params.viewport.minImaginary,
      parameterReal: params.parameter.real,
      parameterImaginary: params.parameter.imaginary,
      iterations: params.iterations,
      paletteId: params.palette,
      paletteMappingMode: params.paletteMappingMode,
      paletteCycles: params.paletteCycles,
      ...(params.binaryInteriorColor ? { binaryInteriorColor: params.binaryInteriorColor } : {}),
      ...(params.binaryExteriorColor ? { binaryExteriorColor: params.binaryExteriorColor } : {}),
      ...(params.escapeBands ? { escapeBands: params.escapeBands } : {}),
    });
  },
};
