import { getFractalPalette } from "./fractal-palette.js";
import type {
  ExplorerImageRenderer,
  MandelbrotRenderParams,
} from "./explorer-renderer.js";

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
uniform vec2 u_resolution;
uniform vec2 u_viewportMin;
uniform vec2 u_viewportMax;
uniform vec2 u_parameter;
uniform vec3 u_interiorColor;
uniform vec3 u_stopColors[4];
uniform float u_stopPositions[4];

const int MAX_ITERATIONS = 4096;

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

void main() {
  vec2 normalizedCoordinate = vec2(
    (gl_FragCoord.x - 0.5) / u_resolution.x,
    1.0 - ((gl_FragCoord.y - 0.5) / u_resolution.y)
  );
  vec2 coordinate = vec2(
    mix(u_viewportMin.x, u_viewportMax.x, normalizedCoordinate.x),
    mix(u_viewportMax.y, u_viewportMin.y, normalizedCoordinate.y)
  );

  vec2 z = u_mode == 0 ? vec2(0.0, 0.0) : coordinate;
  vec2 c = u_mode == 0 ? coordinate : u_parameter;
  bool escaped = false;
  int iteration = 0;

  for (int i = 0; i < MAX_ITERATIONS; i += 1) {
    if (i >= u_iterations) {
      break;
    }

    float nextReal = z.x * z.x - z.y * z.y + c.x;
    float nextImaginary = 2.0 * z.x * z.y + c.y;
    z = vec2(nextReal, nextImaginary);

    if (dot(z, z) > 4.0) {
      escaped = true;
      iteration = i;
      break;
    }

    iteration = i;
  }

  if (!escaped) {
    gl_FragColor = vec4(u_interiorColor, 1.0);
    return;
  }

  float magnitudeSquared = max(dot(z, z), 4.0);
  float smoothedIteration = float(iteration) + 1.0 - log2(log2(magnitudeSquared));
  float normalizedEscape = clamp(smoothedIteration / float(u_iterations), 0.0, 1.0);
  gl_FragColor = vec4(getPaletteColor(normalizedEscape), 1.0);
}
`;

interface WebGlRendererState {
  context: WebGLRenderingContext;
  program: WebGLProgram;
  positionBuffer: WebGLBuffer;
  positionLocation: number;
  modeLocation: WebGLUniformLocation;
  iterationsLocation: WebGLUniformLocation;
  resolutionLocation: WebGLUniformLocation;
  viewportMinLocation: WebGLUniformLocation;
  viewportMaxLocation: WebGLUniformLocation;
  parameterLocation: WebGLUniformLocation;
  interiorColorLocation: WebGLUniformLocation;
  stopColorsLocation: WebGLUniformLocation;
  stopPositionsLocation: WebGLUniformLocation;
}

const WEBGL_STATE_CACHE = new WeakMap<HTMLCanvasElement, WebGlRendererState>();

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

function getRendererState(canvas: HTMLCanvasElement): WebGlRendererState {
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

  const state: WebGlRendererState = {
    context,
    program,
    positionBuffer,
    positionLocation,
    modeLocation: getUniformLocation(context, program, "u_mode"),
    iterationsLocation: getUniformLocation(context, program, "u_iterations"),
    resolutionLocation: getUniformLocation(context, program, "u_resolution"),
    viewportMinLocation: getUniformLocation(context, program, "u_viewportMin"),
    viewportMaxLocation: getUniformLocation(context, program, "u_viewportMax"),
    parameterLocation: getUniformLocation(context, program, "u_parameter"),
    interiorColorLocation: getUniformLocation(context, program, "u_interiorColor"),
    stopColorsLocation: getUniformLocation(context, program, "u_stopColors"),
    stopPositionsLocation: getUniformLocation(context, program, "u_stopPositions"),
  };

  WEBGL_STATE_CACHE.set(canvas, state);
  return state;
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
  },
): void {
  const state = getRendererState(canvas);
  const { context } = state;
  const palette = getFractalPalette(options.paletteId);
  const stopColors = palette.stops.flatMap((stop) => [
    stop.color.red / 255,
    stop.color.green / 255,
    stop.color.blue / 255,
  ]);
  const stopPositions = palette.stops.map((stop) => stop.position);

  context.viewport(0, 0, canvas.width, canvas.height);
  context.clearColor(0, 0, 0, 1);
  context.clear(context.COLOR_BUFFER_BIT);
  context.useProgram(state.program);
  context.bindBuffer(context.ARRAY_BUFFER, state.positionBuffer);
  context.enableVertexAttribArray(state.positionLocation);
  context.vertexAttribPointer(state.positionLocation, 2, context.FLOAT, false, 0, 0);

  context.uniform1i(state.modeLocation, options.mode);
  context.uniform1i(state.iterationsLocation, options.iterations);
  context.uniform2f(state.resolutionLocation, canvas.width, canvas.height);
  context.uniform2f(state.viewportMinLocation, options.viewportMinReal, options.viewportMinImaginary);
  context.uniform2f(state.viewportMaxLocation, options.viewportMaxReal, options.viewportMaxImaginary);
  context.uniform2f(state.parameterLocation, options.parameterReal, options.parameterImaginary);
  context.uniform3f(
    state.interiorColorLocation,
    palette.interior.red / 255,
    palette.interior.green / 255,
    palette.interior.blue / 255,
  );
  context.uniform3fv(state.stopColorsLocation, new Float32Array(stopColors));
  context.uniform1fv(state.stopPositionsLocation, new Float32Array(stopPositions));

  context.drawArrays(context.TRIANGLES, 0, 6);
}

export const WEBGL_EXPLORER_IMAGE_RENDERER: ExplorerImageRenderer = {
  id: "webgl",
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
    });
  },
};
