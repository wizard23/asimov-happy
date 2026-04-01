export function getSquareGridDistance(
  fromX: number,
  fromY: number,
  toX: number,
  toY: number,
): number {
  const dx = fromX - toX;
  const dy = fromY - toY;
  return Math.sqrt(dx * dx + dy * dy);
}
