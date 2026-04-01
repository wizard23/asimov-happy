import { cloneXorShift128State, createXorShift128StateFromSeed, type XorShift128State } from "./seed.js";

const UINT32_MAX_PLUS_ONE = 0x1_0000_0000;

export class XorShift128 {
  #state: XorShift128State;

  public constructor(seed: string | number | XorShift128State) {
    this.#state =
      typeof seed === "string" || typeof seed === "number"
        ? createXorShift128StateFromSeed(seed)
        : cloneXorShift128State(seed);
  }

  public nextUint32(): number {
    let t = this.#state.x ^ (this.#state.x << 11);
    this.#state.x = this.#state.y;
    this.#state.y = this.#state.z;
    this.#state.z = this.#state.w;
    t ^= t >>> 8;
    this.#state.w = (this.#state.w ^ (this.#state.w >>> 19) ^ t) >>> 0;
    return this.#state.w;
  }

  public nextFloat(): number {
    return this.nextUint32() / UINT32_MAX_PLUS_ONE;
  }

  public nextInt(maxExclusive: number): number {
    if (!Number.isInteger(maxExclusive) || maxExclusive <= 0) {
      throw new Error("maxExclusive must be a positive integer.");
    }

    return Math.floor(this.nextFloat() * maxExclusive);
  }

  public snapshot(): XorShift128State {
    return cloneXorShift128State(this.#state);
  }
}
