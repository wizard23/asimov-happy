import { getHexGridDistance } from "./hex.js";
import { getSquareGridDistance } from "./square.js";
import type { Topology } from "../types/settings.js";

export function getTopologyDistance(
  topology: Topology,
  fromX: number,
  fromY: number,
  toX: number,
  toY: number,
): number {
  switch (topology) {
    case "squares":
      return getSquareGridDistance(fromX, fromY, toX, toY);
    case "hexagons":
      return getHexGridDistance(fromX, fromY, toX, toY);
  }
}
