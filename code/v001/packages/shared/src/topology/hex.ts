export interface AxialCoordinate {
  q: number;
  r: number;
}

function offsetToAxial(column: number, row: number): AxialCoordinate {
  return {
    q: column - Math.floor((row - (row & 1)) / 2),
    r: row,
  };
}

export function getHexGridDistance(
  fromX: number,
  fromY: number,
  toX: number,
  toY: number,
): number {
  const from = offsetToAxial(fromX, fromY);
  const to = offsetToAxial(toX, toY);

  const dq = from.q - to.q;
  const dr = from.r - to.r;
  const ds = -from.q - from.r - (-to.q - to.r);

  return (Math.abs(dq) + Math.abs(dr) + Math.abs(ds)) / 2;
}
