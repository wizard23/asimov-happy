import { XorShift128 } from "../rng/xorshift128.js";

export function createDeterministicShuffledIndices(count: number, seed: string): Uint32Array {
  const indices = new Uint32Array(count);
  for (let index = 0; index < count; index += 1) {
    indices[index] = index;
  }

  const rng = new XorShift128(seed);
  for (let index = count - 1; index > 0; index -= 1) {
    const swapIndex = rng.nextInt(index + 1);
    const current = indices[index];
    indices[index] = indices[swapIndex]!;
    indices[swapIndex] = current!;
  }

  return indices;
}
