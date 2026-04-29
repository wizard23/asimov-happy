import { getFractalPalette } from "./fractal-palette.js";
import {
  buildArbitraryPrecisionShaderDefines,
  clampArbitraryPrecisionLimbCount,
  createArbitraryPrecisionLayout,
  DEFAULT_ARBITRARY_PRECISION_LIMB_COUNT,
  encodeArbitraryPrecisionComplex,
  encodeMandelbrotViewportForWebGlUint,
  flattenEncodedComplexToUint32LittleEndian,
  type ArbitraryPrecisionLayout,
} from "./webgl-arbitrary-precision.js";
import {
  MAX_ESCAPE_BAND_ENTRIES,
  type EscapeBandConfiguration,
  type ExplorerImageRenderer,
  type MandelbrotRenderParams,
} from "./explorer-renderer.js";
import type { RgbColor } from "./fractal-palette.js";

const VERTEX_SHADER_SOURCE = `#version 300 es
in vec2 a_position;

void main() {
  gl_Position = vec4(a_position, 0.0, 1.0);
}
`;

interface WebGlArbitraryPrecisionRendererState {
  context: WebGL2RenderingContext;
  program: WebGLProgram;
  vertexArray: WebGLVertexArrayObject;
  positionBuffer: WebGLBuffer;
  positionLocation: number;
  modeLocation: WebGLUniformLocation;
  iterationsLocation: WebGLUniformLocation;
  paletteMappingModeLocation: WebGLUniformLocation;
  resolutionLocation: WebGLUniformLocation;
  viewportMinRealLocation: WebGLUniformLocation;
  viewportMaxImaginaryLocation: WebGLUniformLocation;
  viewportRealStepLocation: WebGLUniformLocation;
  viewportImaginaryStepLocation: WebGLUniformLocation;
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

const WEBGL2_STATE_CACHE = new WeakMap<
  HTMLCanvasElement,
  Map<number, WebGlArbitraryPrecisionRendererState>
>();

function createFragmentShaderSource(layout: ArbitraryPrecisionLayout): string {
  const defineBlock = buildArbitraryPrecisionShaderDefines(layout).trim();
  const componentCount = layout.limbCount + 1;
  const productLimbCount = layout.limbCount * 2 + 1;

  return `#version 300 es
precision highp float;
precision highp int;

${defineBlock}
#define AP_COMPONENT_COUNT ${componentCount}
#define AP_PRODUCT_LIMB_COUNT ${productLimbCount}

uniform int u_mode;
uniform int u_iterations;
uniform int u_paletteMappingMode;
uniform vec2 u_resolution;
uniform uint u_viewportMinReal[AP_COMPONENT_COUNT];
uniform uint u_viewportMaxImaginary[AP_COMPONENT_COUNT];
uniform uint u_viewportRealStep[AP_COMPONENT_COUNT];
uniform uint u_viewportImaginaryStep[AP_COMPONENT_COUNT];
uniform uint u_parameterReal[AP_COMPONENT_COUNT];
uniform uint u_parameterImaginary[AP_COMPONENT_COUNT];
uniform float u_paletteCycles;
uniform vec3 u_interiorColor;
uniform vec3 u_stopColors[4];
uniform float u_stopPositions[4];
uniform int u_escapeBandEntryCount;
uniform vec3 u_escapeBandColors[${MAX_ESCAPE_BAND_ENTRIES}];
uniform int u_escapeBandThresholds[${MAX_ESCAPE_BAND_ENTRIES - 1}];

out vec4 outColor;

const int MAX_ITERATIONS = 4096;
const int MAX_ESCAPE_BAND_ENTRIES = ${MAX_ESCAPE_BAND_ENTRIES};
const uint AP_RADIX_UINT = 65536u;
const uint AP_SIGN_ZERO = 0u;
const uint AP_SIGN_POSITIVE = 1u;
const uint AP_SIGN_NEGATIVE = 2u;

void apSetZero(out uint value[AP_COMPONENT_COUNT]) {
  for (int index = 0; index < AP_COMPONENT_COUNT; index += 1) {
    value[index] = 0u;
  }
}

void apCopy(const in uint source[AP_COMPONENT_COUNT], out uint target[AP_COMPONENT_COUNT]) {
  for (int index = 0; index < AP_COMPONENT_COUNT; index += 1) {
    target[index] = source[index];
  }
}

bool apMagnitudeIsZero(const in uint value[AP_COMPONENT_COUNT]) {
  for (int index = 1; index < AP_COMPONENT_COUNT; index += 1) {
    if (value[index] != 0u) {
      return false;
    }
  }

  return true;
}

void apNormalizeZeroSign(inout uint value[AP_COMPONENT_COUNT]) {
  if (apMagnitudeIsZero(value)) {
    value[0] = AP_SIGN_ZERO;
  }
}

void apSetUnsignedInt(uint rawValue, out uint value[AP_COMPONENT_COUNT]) {
  apSetZero(value);
  if (rawValue == 0u) {
    return;
  }

  value[0] = AP_SIGN_POSITIVE;
  uint remaining = rawValue;
  for (int index = AP_FRACTIONAL_LIMBS + 1; index < AP_COMPONENT_COUNT; index += 1) {
    value[index] = remaining % AP_RADIX_UINT;
    remaining /= AP_RADIX_UINT;
    if (remaining == 0u) {
      break;
    }
  }
}

int apCompareMagnitude(const in uint left[AP_COMPONENT_COUNT], const in uint right[AP_COMPONENT_COUNT]) {
  for (int index = AP_COMPONENT_COUNT - 1; index >= 1; index -= 1) {
    if (left[index] > right[index]) {
      return 1;
    }
    if (left[index] < right[index]) {
      return -1;
    }
  }

  return 0;
}

void apMagnitudeAdd(
  const in uint left[AP_COMPONENT_COUNT],
  const in uint right[AP_COMPONENT_COUNT],
  out uint result[AP_COMPONENT_COUNT]
) {
  result[0] = AP_SIGN_POSITIVE;
  uint carry = 0u;
  for (int index = 1; index < AP_COMPONENT_COUNT; index += 1) {
    uint sum = left[index] + right[index] + carry;
    result[index] = sum % AP_RADIX_UINT;
    carry = sum / AP_RADIX_UINT;
  }
}

void apMagnitudeSubtractBigSmall(
  const in uint bigValue[AP_COMPONENT_COUNT],
  const in uint smallValue[AP_COMPONENT_COUNT],
  out uint result[AP_COMPONENT_COUNT]
) {
  result[0] = AP_SIGN_POSITIVE;
  uint borrow = 0u;
  for (int index = 1; index < AP_COMPONENT_COUNT; index += 1) {
    uint minuend = bigValue[index];
    uint subtrahend = smallValue[index] + borrow;
    if (minuend >= subtrahend) {
      result[index] = minuend - subtrahend;
      borrow = 0u;
    } else {
      result[index] = minuend + AP_RADIX_UINT - subtrahend;
      borrow = 1u;
    }
  }
}

void apNegate(const in uint value[AP_COMPONENT_COUNT], out uint result[AP_COMPONENT_COUNT]) {
  apCopy(value, result);
  if (result[0] == AP_SIGN_POSITIVE) {
    result[0] = AP_SIGN_NEGATIVE;
  } else if (result[0] == AP_SIGN_NEGATIVE) {
    result[0] = AP_SIGN_POSITIVE;
  }
}

void apAdd(
  const in uint left[AP_COMPONENT_COUNT],
  const in uint right[AP_COMPONENT_COUNT],
  out uint result[AP_COMPONENT_COUNT]
) {
  if (left[0] == AP_SIGN_ZERO) {
    apCopy(right, result);
    return;
  }
  if (right[0] == AP_SIGN_ZERO) {
    apCopy(left, result);
    return;
  }

  if (left[0] == right[0]) {
    apMagnitudeAdd(left, right, result);
    result[0] = left[0];
    apNormalizeZeroSign(result);
    return;
  }

  int comparison = apCompareMagnitude(left, right);
  if (comparison == 0) {
    apSetZero(result);
    return;
  }

  if (comparison > 0) {
    apMagnitudeSubtractBigSmall(left, right, result);
    result[0] = left[0];
  } else {
    apMagnitudeSubtractBigSmall(right, left, result);
    result[0] = right[0];
  }

  apNormalizeZeroSign(result);
}

void apSub(
  const in uint left[AP_COMPONENT_COUNT],
  const in uint right[AP_COMPONENT_COUNT],
  out uint result[AP_COMPONENT_COUNT]
) {
  uint negatedRight[AP_COMPONENT_COUNT];
  apNegate(right, negatedRight);
  apAdd(left, negatedRight, result);
}

uvec2 apMultiplyLimb(uint left, uint right) {
  uint leftLow = left & 255u;
  uint leftHigh = left >> 8u;
  uint rightLow = right & 255u;
  uint rightHigh = right >> 8u;

  uint p0 = leftLow * rightLow;
  uint p1 = leftLow * rightHigh;
  uint p2 = leftHigh * rightLow;
  uint p3 = leftHigh * rightHigh;

  uint mid = p1 + p2;
  uint lowTotal = p0 + ((mid & 255u) << 8u);
  uint low = lowTotal & 65535u;
  uint carry = lowTotal >> 16u;
  uint high = p3 + (mid >> 8u) + carry;

  return uvec2(low, high);
}

void apMultiplyMagnitudeBySmall(
  const in uint value[AP_COMPONENT_COUNT],
  uint factor,
  out uint result[AP_COMPONENT_COUNT]
) {
  result[0] = value[0];
  uint carry = 0u;
  for (int index = 1; index < AP_COMPONENT_COUNT; index += 1) {
    uvec2 product = apMultiplyLimb(value[index], factor);
    uint sum = product.x + carry;
    result[index] = sum % AP_RADIX_UINT;
    carry = product.y + (sum / AP_RADIX_UINT);
  }
  apNormalizeZeroSign(result);
}

void apMul(
  const in uint left[AP_COMPONENT_COUNT],
  const in uint right[AP_COMPONENT_COUNT],
  out uint result[AP_COMPONENT_COUNT]
) {
  apSetZero(result);
  if (left[0] == AP_SIGN_ZERO || right[0] == AP_SIGN_ZERO) {
    return;
  }

  uint temp[AP_PRODUCT_LIMB_COUNT];
  for (int index = 0; index < AP_PRODUCT_LIMB_COUNT; index += 1) {
    temp[index] = 0u;
  }

  for (int leftIndex = 1; leftIndex < AP_COMPONENT_COUNT; leftIndex += 1) {
    uint carry = 0u;
    for (int rightIndex = 1; rightIndex < AP_COMPONENT_COUNT; rightIndex += 1) {
      int productIndex = (leftIndex - 1) + (rightIndex - 1);
      uvec2 product = apMultiplyLimb(left[leftIndex], right[rightIndex]);
      uint sum = temp[productIndex] + product.x + carry;
      temp[productIndex] = sum % AP_RADIX_UINT;
      carry = product.y + (sum / AP_RADIX_UINT);
    }

    int carryIndex = (leftIndex - 1) + (AP_COMPONENT_COUNT - 1);
    while (carry > 0u && carryIndex < AP_PRODUCT_LIMB_COUNT) {
      uint sum = temp[carryIndex] + carry;
      temp[carryIndex] = sum % AP_RADIX_UINT;
      carry = sum / AP_RADIX_UINT;
      carryIndex += 1;
    }
  }

  result[0] = left[0] == right[0] ? AP_SIGN_POSITIVE : AP_SIGN_NEGATIVE;
  for (int index = 1; index < AP_COMPONENT_COUNT; index += 1) {
    int sourceIndex = (index - 1) + AP_FRACTIONAL_LIMBS;
    result[index] = sourceIndex < AP_PRODUCT_LIMB_COUNT ? temp[sourceIndex] : 0u;
  }

  apNormalizeZeroSign(result);
}

bool apGreaterThanSmallInt(const in uint value[AP_COMPONENT_COUNT], uint threshold) {
  uint encoded[AP_COMPONENT_COUNT];
  apSetUnsignedInt(threshold, encoded);
  return apCompareMagnitude(value, encoded) > 0;
}

float apToApproxFloat(const in uint value[AP_COMPONENT_COUNT]) {
  float approximation = 0.0;
  float radix = float(AP_RADIX_UINT);
  for (int index = AP_COMPONENT_COUNT - 1; index >= 1; index -= 1) {
    approximation = approximation * radix + float(value[index]);
  }
  approximation /= pow(radix, float(AP_FRACTIONAL_LIMBS));
  return value[0] == AP_SIGN_NEGATIVE ? -approximation : approximation;
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
  uint xIndex = uint(gl_FragCoord.x - 0.5);
  uint yIndex = uint(u_resolution.y - gl_FragCoord.y - 0.5);

  uint coordinateReal[AP_COMPONENT_COUNT];
  uint coordinateImaginary[AP_COMPONENT_COUNT];
  uint pixelOffset[AP_COMPONENT_COUNT];

  apMultiplyMagnitudeBySmall(u_viewportRealStep, xIndex, pixelOffset);
  apAdd(u_viewportMinReal, pixelOffset, coordinateReal);

  apMultiplyMagnitudeBySmall(u_viewportImaginaryStep, yIndex, pixelOffset);
  apSub(u_viewportMaxImaginary, pixelOffset, coordinateImaginary);

  uint zReal[AP_COMPONENT_COUNT];
  uint zImaginary[AP_COMPONENT_COUNT];
  uint cReal[AP_COMPONENT_COUNT];
  uint cImaginary[AP_COMPONENT_COUNT];

  if (u_mode == 0) {
    apSetZero(zReal);
    apSetZero(zImaginary);
    apCopy(coordinateReal, cReal);
    apCopy(coordinateImaginary, cImaginary);
  } else {
    apCopy(coordinateReal, zReal);
    apCopy(coordinateImaginary, zImaginary);
    apCopy(u_parameterReal, cReal);
    apCopy(u_parameterImaginary, cImaginary);
  }

  bool escaped = false;
  int iteration = 0;
  uint zRealSquared[AP_COMPONENT_COUNT];
  uint zImaginarySquared[AP_COMPONENT_COUNT];
  uint zRealImaginary[AP_COMPONENT_COUNT];
  uint doubledRealImaginary[AP_COMPONENT_COUNT];
  uint nextReal[AP_COMPONENT_COUNT];
  uint nextImaginary[AP_COMPONENT_COUNT];
  uint magnitudeSquared[AP_COMPONENT_COUNT];
  uint twoValue[AP_COMPONENT_COUNT];

  apSetUnsignedInt(2u, twoValue);

  for (int index = 0; index < MAX_ITERATIONS; index += 1) {
    if (index >= u_iterations) {
      break;
    }

    apMul(zReal, zReal, zRealSquared);
    apMul(zImaginary, zImaginary, zImaginarySquared);
    apMul(zReal, zImaginary, zRealImaginary);
    apMul(zRealImaginary, twoValue, doubledRealImaginary);
    apSub(zRealSquared, zImaginarySquared, nextReal);
    apAdd(nextReal, cReal, nextReal);
    apAdd(doubledRealImaginary, cImaginary, nextImaginary);

    apCopy(nextReal, zReal);
    apCopy(nextImaginary, zImaginary);

    apMul(zReal, zReal, zRealSquared);
    apMul(zImaginary, zImaginary, zImaginarySquared);
    apAdd(zRealSquared, zImaginarySquared, magnitudeSquared);
    if (apGreaterThanSmallInt(magnitudeSquared, 4u)) {
      escaped = true;
      iteration = index;
      break;
    }

    iteration = index;
  }

  if (!escaped) {
    if (u_paletteMappingMode == 5) {
      outColor = vec4(getEscapeBandFallbackColor(), 1.0);
      return;
    }

    outColor = vec4(u_interiorColor, 1.0);
    return;
  }

  if (u_paletteMappingMode == 5) {
    outColor = vec4(getEscapeBandColor(iteration + 1), 1.0);
    return;
  }

  float realApproximation = apToApproxFloat(zReal);
  float imaginaryApproximation = apToApproxFloat(zImaginary);
  float magnitudeSquaredApproximation = max(
    realApproximation * realApproximation + imaginaryApproximation * imaginaryApproximation,
    4.0
  );
  float smoothedIteration = float(iteration) + 1.0 - log2(log2(magnitudeSquaredApproximation));
  float normalizedEscape = clamp(smoothedIteration / float(u_iterations), 0.0, 1.0);
  outColor = vec4(getMappedColor(normalizedEscape), 1.0);
}
`;
}

function createShader(
  context: WebGL2RenderingContext,
  type: number,
  source: string,
): WebGLShader {
  const shader = context.createShader(type);
  if (!shader) {
    throw new Error("Failed to create WebGL2 shader.");
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

function createProgram(context: WebGL2RenderingContext, fragmentSource: string): WebGLProgram {
  const vertexShader = createShader(context, context.VERTEX_SHADER, VERTEX_SHADER_SOURCE);
  const fragmentShader = createShader(context, context.FRAGMENT_SHADER, fragmentSource);
  const program = context.createProgram();

  if (!program) {
    throw new Error("Failed to create WebGL2 program.");
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
  context: WebGL2RenderingContext,
  program: WebGLProgram,
  uniformName: string,
): WebGLUniformLocation {
  const location = context.getUniformLocation(program, uniformName);
  if (!location) {
    throw new Error(`Missing WebGL2 uniform: ${uniformName}`);
  }
  return location;
}

function getRendererState(
  canvas: HTMLCanvasElement,
  layout: ArbitraryPrecisionLayout,
): WebGlArbitraryPrecisionRendererState {
  let stateByLimbCount = WEBGL2_STATE_CACHE.get(canvas);
  if (!stateByLimbCount) {
    stateByLimbCount = new Map();
    WEBGL2_STATE_CACHE.set(canvas, stateByLimbCount);
  }

  const cachedState = stateByLimbCount.get(layout.limbCount);
  if (cachedState) {
    return cachedState;
  }

  const context = canvas.getContext("webgl2", { preserveDrawingBuffer: true });
  if (!context || !(context instanceof WebGL2RenderingContext)) {
    throw new Error("WebGL2 context unavailable.");
  }

  const program = createProgram(context, createFragmentShaderSource(layout));
  const vertexArray = context.createVertexArray();
  if (!vertexArray) {
    throw new Error("Failed to create WebGL2 vertex array.");
  }
  const positionBuffer = context.createBuffer();
  if (!positionBuffer) {
    throw new Error("Failed to create WebGL2 vertex buffer.");
  }

  context.bindVertexArray(vertexArray);
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
    throw new Error("Missing WebGL2 attribute: a_position");
  }
  context.enableVertexAttribArray(positionLocation);
  context.vertexAttribPointer(positionLocation, 2, context.FLOAT, false, 0, 0);
  context.bindVertexArray(null);

  const state: WebGlArbitraryPrecisionRendererState = {
    context,
    program,
    vertexArray,
    positionBuffer,
    positionLocation,
    modeLocation: getUniformLocation(context, program, "u_mode"),
    iterationsLocation: getUniformLocation(context, program, "u_iterations"),
    paletteMappingModeLocation: getUniformLocation(context, program, "u_paletteMappingMode"),
    resolutionLocation: getUniformLocation(context, program, "u_resolution"),
    viewportMinRealLocation: getUniformLocation(context, program, "u_viewportMinReal"),
    viewportMaxImaginaryLocation: getUniformLocation(context, program, "u_viewportMaxImaginary"),
    viewportRealStepLocation: getUniformLocation(context, program, "u_viewportRealStep"),
    viewportImaginaryStepLocation: getUniformLocation(context, program, "u_viewportImaginaryStep"),
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

  stateByLimbCount.set(layout.limbCount, state);
  return state;
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

function renderToCanvas(
  canvas: HTMLCanvasElement,
  options: {
    mode: 0 | 1;
    viewportMinReal: number;
    viewportMaxReal: number;
    viewportMinImaginary: number;
    viewportMaxImaginary: number;
    parameterReal: number;
    parameterImaginary: number;
    iterations: number;
    paletteId: MandelbrotRenderParams["palette"];
    paletteMappingMode: MandelbrotRenderParams["paletteMappingMode"];
    paletteCycles: MandelbrotRenderParams["paletteCycles"];
    binaryInteriorColor?: RgbColor;
    binaryExteriorColor?: RgbColor;
    escapeBands?: EscapeBandConfiguration;
    precisionLimbCount?: number;
  },
): void {
  const layout = createArbitraryPrecisionLayout(
    clampArbitraryPrecisionLimbCount(
      options.precisionLimbCount ?? DEFAULT_ARBITRARY_PRECISION_LIMB_COUNT,
    ),
  );
  const state = getRendererState(canvas, layout);
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
    Math.min(options.escapeBands?.entryCount ?? 3, MAX_ESCAPE_BAND_ENTRIES),
  );
  const escapeBandColors = Array.from({ length: MAX_ESCAPE_BAND_ENTRIES }, (_, index) => {
    const fallbackColor = options.binaryExteriorColor ?? finalStopColor;
    return options.escapeBands?.colors[index] ?? fallbackColor;
  }).flatMap((color) => [color.red / 255, color.green / 255, color.blue / 255]);
  const escapeBandThresholds = Array.from(
    { length: MAX_ESCAPE_BAND_ENTRIES - 1 },
    (_, index) => options.escapeBands?.thresholds[index] ?? 2147483647,
  );
  const viewportEncoding = encodeMandelbrotViewportForWebGlUint(
    {
      minReal: options.viewportMinReal,
      maxReal: options.viewportMaxReal,
      minImaginary: options.viewportMinImaginary,
      maxImaginary: options.viewportMaxImaginary,
    },
    canvas.width,
    canvas.height,
    layout,
  );
  const parameterEncoding = flattenEncodedComplexToUint32LittleEndian(
    encodeArbitraryPrecisionComplex(
      { real: options.parameterReal, imaginary: options.parameterImaginary },
      layout,
    ),
  );

  context.viewport(0, 0, canvas.width, canvas.height);
  context.clearColor(0, 0, 0, 1);
  context.clear(context.COLOR_BUFFER_BIT);
  context.useProgram(state.program);
  context.bindVertexArray(state.vertexArray);

  context.uniform1i(state.modeLocation, options.mode);
  context.uniform1i(state.iterationsLocation, options.iterations);
  context.uniform1i(state.paletteMappingModeLocation, getPaletteMappingModeIndex(options.paletteMappingMode));
  context.uniform2f(state.resolutionLocation, canvas.width, canvas.height);
  context.uniform1uiv(state.viewportMinRealLocation, viewportEncoding.minReal);
  context.uniform1uiv(state.viewportMaxImaginaryLocation, viewportEncoding.maxImaginary);
  context.uniform1uiv(state.viewportRealStepLocation, viewportEncoding.realStep);
  context.uniform1uiv(state.viewportImaginaryStepLocation, viewportEncoding.imaginaryStep);
  context.uniform1uiv(state.parameterRealLocation, parameterEncoding.real);
  context.uniform1uiv(state.parameterImaginaryLocation, parameterEncoding.imaginary);
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
  context.bindVertexArray(null);
}

export const WEBGL_ARBITRARY_PRECISION_EXPLORER_IMAGE_RENDERER: ExplorerImageRenderer = {
  id: "webgl-arbitrary-precision",
  renderMandelbrot(canvas, params) {
    renderToCanvas(canvas, {
      mode: 0,
      viewportMinReal: params.viewport.minReal,
      viewportMaxReal: params.viewport.maxReal,
      viewportMinImaginary: params.viewport.minImaginary,
      viewportMaxImaginary: params.viewport.maxImaginary,
      parameterReal: 0,
      parameterImaginary: 0,
      iterations: params.iterations,
      paletteId: params.palette,
      paletteMappingMode: params.paletteMappingMode,
      paletteCycles: params.paletteCycles,
      ...(params.binaryInteriorColor ? { binaryInteriorColor: params.binaryInteriorColor } : {}),
      ...(params.binaryExteriorColor ? { binaryExteriorColor: params.binaryExteriorColor } : {}),
      ...(params.escapeBands ? { escapeBands: params.escapeBands } : {}),
      ...(params.precisionLimbCount ? { precisionLimbCount: params.precisionLimbCount } : {}),
    });
  },
  renderJulia(canvas, params) {
    renderToCanvas(canvas, {
      mode: 1,
      viewportMinReal: params.viewport.minReal,
      viewportMaxReal: params.viewport.maxReal,
      viewportMinImaginary: params.viewport.minImaginary,
      viewportMaxImaginary: params.viewport.maxImaginary,
      parameterReal: params.parameter.real,
      parameterImaginary: params.parameter.imaginary,
      iterations: params.iterations,
      paletteId: params.palette,
      paletteMappingMode: params.paletteMappingMode,
      paletteCycles: params.paletteCycles,
      ...(params.binaryInteriorColor ? { binaryInteriorColor: params.binaryInteriorColor } : {}),
      ...(params.binaryExteriorColor ? { binaryExteriorColor: params.binaryExteriorColor } : {}),
      ...(params.escapeBands ? { escapeBands: params.escapeBands } : {}),
      ...(params.precisionLimbCount ? { precisionLimbCount: params.precisionLimbCount } : {}),
    });
  },
};
