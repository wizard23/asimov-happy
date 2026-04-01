export function getSquaredEuclideanDistance(
  left: Float32Array,
  right: Float32Array,
): number {
  if (left.length !== right.length) {
    throw new Error("Feature vectors must have the same length.");
  }

  let distance = 0;
  for (let index = 0; index < left.length; index += 1) {
    const leftValue = left[index];
    const rightValue = right[index];
    if (leftValue === undefined || rightValue === undefined) {
      throw new Error(`Missing vector value at index ${index}.`);
    }
    const delta = leftValue - rightValue;
    distance += delta * delta;
  }
  return distance;
}
