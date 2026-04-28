import type { ComplexBounds, ComplexParameter, JuliaViewport } from "@asimov/minimal-shared";

export const ARBITRARY_PRECISION_RADIX = 65536;
export const DEFAULT_ARBITRARY_PRECISION_LIMB_COUNT = 8;
export const MAX_ARBITRARY_PRECISION_LIMB_COUNT = 16;
const RADIX_BIGINT = BigInt(ARBITRARY_PRECISION_RADIX);

export interface ArbitraryPrecisionLayout {
  limbCount: number;
  fractionalLimbCount: number;
}

export interface EncodedArbitraryPrecisionReal {
  sign: 0 | 1 | -1;
  limbs: number[];
  layout: ArbitraryPrecisionLayout;
}

export interface EncodedArbitraryPrecisionComplex {
  real: EncodedArbitraryPrecisionReal;
  imaginary: EncodedArbitraryPrecisionReal;
}

export interface EncodedMandelbrotViewport {
  minReal: Float32Array;
  maxImaginary: Float32Array;
  realStep: Float32Array;
  imaginaryStep: Float32Array;
  layout: ArbitraryPrecisionLayout;
}

interface DecimalRational {
  sign: 0 | 1 | -1;
  numerator: bigint;
  denominator: bigint;
}

type DecimalLike = number | string;

export function clampArbitraryPrecisionLimbCount(value: number): number {
  if (!Number.isFinite(value)) {
    return DEFAULT_ARBITRARY_PRECISION_LIMB_COUNT;
  }

  return Math.max(2, Math.min(MAX_ARBITRARY_PRECISION_LIMB_COUNT, Math.round(value)));
}

export function createArbitraryPrecisionLayout(
  limbCount: number,
  fractionalLimbCount = clampArbitraryPrecisionLimbCount(limbCount) - 1,
): ArbitraryPrecisionLayout {
  const normalizedLimbCount = clampArbitraryPrecisionLimbCount(limbCount);
  return {
    limbCount: normalizedLimbCount,
    fractionalLimbCount: Math.max(1, Math.min(normalizedLimbCount - 1, Math.round(fractionalLimbCount))),
  };
}

export function encodeArbitraryPrecisionReal(
  value: DecimalLike,
  layout: ArbitraryPrecisionLayout,
): EncodedArbitraryPrecisionReal {
  const rational = parseDecimalLike(value);
  if (rational.sign === 0) {
    return {
      sign: 0,
      limbs: Array.from({ length: layout.limbCount }, () => 0),
      layout,
    };
  }

  const scaleFactor = RADIX_BIGINT ** BigInt(layout.fractionalLimbCount);
  const scaledMagnitude = (rational.numerator * scaleFactor) / rational.denominator;
  const limbs = new Array<number>(layout.limbCount).fill(0);

  let remaining = scaledMagnitude;
  for (let index = layout.limbCount - 1; index >= 0; index -= 1) {
    limbs[index] = Number(remaining % RADIX_BIGINT);
    remaining /= RADIX_BIGINT;
  }

  if (remaining > 0n) {
    throw new Error(
      `Value ${String(value)} exceeds the configured arbitrary-precision fixed-point range.`,
    );
  }

  return {
    sign: rational.sign,
    limbs,
    layout,
  };
}

export function encodeArbitraryPrecisionComplex(
  parameter: ComplexParameter,
  layout: ArbitraryPrecisionLayout,
): EncodedArbitraryPrecisionComplex {
  return {
    real: encodeArbitraryPrecisionReal(parameter.real, layout),
    imaginary: encodeArbitraryPrecisionReal(parameter.imaginary, layout),
  };
}

export function flattenEncodedRealToFloat32(value: EncodedArbitraryPrecisionReal): Float32Array {
  return Float32Array.from([value.sign, ...value.limbs]);
}

function encodeShaderSign(sign: EncodedArbitraryPrecisionReal["sign"]): number {
  return sign === 0 ? 0 : sign > 0 ? 1 : 2;
}

export function flattenEncodedRealToUint32LittleEndian(
  value: EncodedArbitraryPrecisionReal,
): Uint32Array {
  return Uint32Array.from([encodeShaderSign(value.sign), ...[...value.limbs].reverse()]);
}

export function flattenEncodedComplexToFloat32(value: EncodedArbitraryPrecisionComplex): {
  real: Float32Array;
  imaginary: Float32Array;
} {
  return {
    real: flattenEncodedRealToFloat32(value.real),
    imaginary: flattenEncodedRealToFloat32(value.imaginary),
  };
}

export function flattenEncodedComplexToUint32LittleEndian(
  value: EncodedArbitraryPrecisionComplex,
): {
  real: Uint32Array;
  imaginary: Uint32Array;
} {
  return {
    real: flattenEncodedRealToUint32LittleEndian(value.real),
    imaginary: flattenEncodedRealToUint32LittleEndian(value.imaginary),
  };
}

export function encodeMandelbrotViewportForWebGl(
  viewport: ComplexBounds,
  width: number,
  height: number,
  layout: ArbitraryPrecisionLayout,
): EncodedMandelbrotViewport {
  const safeWidth = Math.max(1, Math.round(width));
  const safeHeight = Math.max(1, Math.round(height));
  const realSpan = viewport.maxReal - viewport.minReal;
  const imaginarySpan = viewport.maxImaginary - viewport.minImaginary;

  return {
    minReal: flattenEncodedRealToFloat32(encodeArbitraryPrecisionReal(viewport.minReal, layout)),
    maxImaginary: flattenEncodedRealToFloat32(encodeArbitraryPrecisionReal(viewport.maxImaginary, layout)),
    realStep: flattenEncodedRealToFloat32(encodeArbitraryPrecisionReal(realSpan / safeWidth, layout)),
    imaginaryStep: flattenEncodedRealToFloat32(
      encodeArbitraryPrecisionReal(imaginarySpan / safeHeight, layout),
    ),
    layout,
  };
}

export function encodeJuliaViewportForWebGl(
  viewport: JuliaViewport,
  width: number,
  height: number,
  layout: ArbitraryPrecisionLayout,
): EncodedMandelbrotViewport {
  return encodeMandelbrotViewportForWebGl(viewport, width, height, layout);
}

export function encodeMandelbrotViewportForWebGlUint(
  viewport: ComplexBounds,
  width: number,
  height: number,
  layout: ArbitraryPrecisionLayout,
): {
  minReal: Uint32Array;
  maxImaginary: Uint32Array;
  realStep: Uint32Array;
  imaginaryStep: Uint32Array;
  layout: ArbitraryPrecisionLayout;
} {
  const safeWidth = Math.max(1, Math.round(width));
  const safeHeight = Math.max(1, Math.round(height));
  const realSpan = viewport.maxReal - viewport.minReal;
  const imaginarySpan = viewport.maxImaginary - viewport.minImaginary;
  return {
    minReal: flattenEncodedRealToUint32LittleEndian(
      encodeArbitraryPrecisionReal(viewport.minReal, layout),
    ),
    maxImaginary: flattenEncodedRealToUint32LittleEndian(
      encodeArbitraryPrecisionReal(viewport.maxImaginary, layout),
    ),
    realStep: flattenEncodedRealToUint32LittleEndian(
      encodeArbitraryPrecisionReal(realSpan / safeWidth, layout),
    ),
    imaginaryStep: flattenEncodedRealToUint32LittleEndian(
      encodeArbitraryPrecisionReal(imaginarySpan / safeHeight, layout),
    ),
    layout,
  };
}

export function encodeJuliaViewportForWebGlUint(
  viewport: JuliaViewport,
  width: number,
  height: number,
  layout: ArbitraryPrecisionLayout,
): {
  minReal: Uint32Array;
  maxImaginary: Uint32Array;
  realStep: Uint32Array;
  imaginaryStep: Uint32Array;
  layout: ArbitraryPrecisionLayout;
} {
  return encodeMandelbrotViewportForWebGlUint(viewport, width, height, layout);
}

export function buildArbitraryPrecisionShaderDefines(layout: ArbitraryPrecisionLayout): string {
  return `
#define AP_RADIX 65536.0
#define AP_LIMB_COUNT ${layout.limbCount}
#define AP_FRACTIONAL_LIMBS ${layout.fractionalLimbCount}
#define AP_INTEGER_LIMBS ${layout.limbCount - layout.fractionalLimbCount}
`;
}

function parseDecimalLike(value: DecimalLike): DecimalRational {
  if (typeof value === "number") {
    if (!Number.isFinite(value)) {
      throw new Error(`Cannot encode non-finite numeric value: ${value}`);
    }
  }

  const raw = typeof value === "number" ? value.toString() : value.trim();
  const match = /^([+-]?)(\d*)(?:\.(\d*))?(?:[eE]([+-]?\d+))?$/.exec(raw);
  if (!match) {
    throw new Error(`Unsupported decimal value for arbitrary-precision encoding: ${raw}`);
  }

  const signToken = match[1] ?? "";
  const integerPart = match[2] ?? "";
  const fractionalPart = match[3] ?? "";
  const exponentPart = Number(match[4] ?? "0");
  const digits = `${integerPart}${fractionalPart}`.replace(/^0+/, "");

  if (!digits) {
    return {
      sign: 0,
      numerator: 0n,
      denominator: 1n,
    };
  }

  const sign: 1 | -1 = signToken === "-" ? -1 : 1;
  const decimalPlaces = fractionalPart.length - exponentPart;

  if (decimalPlaces <= 0) {
    return {
      sign,
      numerator: BigInt(digits) * 10n ** BigInt(-decimalPlaces),
      denominator: 1n,
    };
  }

  return {
    sign,
    numerator: BigInt(digits),
    denominator: 10n ** BigInt(decimalPlaces),
  };
}
