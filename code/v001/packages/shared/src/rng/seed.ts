export interface XorShift128State {
  x: number;
  y: number;
  z: number;
  w: number;
}

const NON_ZERO_FALLBACK_STATE: XorShift128State = {
  x: 0x6d2b79f5,
  y: 0x6a09e667,
  z: 0xbb67ae85,
  w: 0x3c6ef372,
};

function fnv1a32(input: string, offsetBasis: number): number {
  let hash = offsetBasis >>> 0;
  for (let index = 0; index < input.length; index += 1) {
    hash ^= input.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash >>> 0;
}

function mixWord(input: string, salt: string, offsetBasis: number): number {
  const salted = `${salt}:${input}`;
  return fnv1a32(salted, offsetBasis) >>> 0;
}

export function createXorShift128StateFromSeed(seed: string | number): XorShift128State {
  const normalizedSeed = String(seed);
  const state: XorShift128State = {
    x: mixWord(normalizedSeed, "x", 0x811c9dc5),
    y: mixWord(normalizedSeed, "y", 0x85ebca6b),
    z: mixWord(normalizedSeed, "z", 0xc2b2ae35),
    w: mixWord(normalizedSeed, "w", 0x27d4eb2f),
  };

  if ((state.x | state.y | state.z | state.w) === 0) {
    return { ...NON_ZERO_FALLBACK_STATE };
  }

  return state;
}

export function cloneXorShift128State(state: XorShift128State): XorShift128State {
  return { ...state };
}
