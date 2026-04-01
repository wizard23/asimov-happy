import { useEffect, useMemo, useRef } from "preact/hooks";
import type { ComplexParameter, SomCell, SomTrainingResult } from "@asimov/minimal-shared";
import {
  getCanvasSize,
  getCellCenter,
  getClosestCellAtPoint,
  getInterpolatedParameterAtPoint,
  type Point2D,
} from "./map-geometry.js";

const MAP_CELL_SIZE = 28;

function clampByte(value: number): number {
  return Math.max(0, Math.min(255, Math.round(value)));
}

function drawPrototypeImage(
  context: CanvasRenderingContext2D,
  cell: SomCell,
  x: number,
  y: number,
  width: number,
  height: number,
  clipPath?: Path2D,
): void {
  const vectorLength = cell.prototypeVector.length;
  const side = Math.max(1, Math.round(Math.sqrt(vectorLength)));
  const imageData = context.createImageData(side, side);

  for (let index = 0; index < imageData.data.length; index += 4) {
    const vectorIndex = Math.floor(index / 4);
    const value = cell.prototypeVector[vectorIndex] ?? 0;
    const channel = clampByte(value * 255);
    imageData.data[index] = channel;
    imageData.data[index + 1] = channel;
    imageData.data[index + 2] = channel;
    imageData.data[index + 3] = 255;
  }

  const bitmapCanvas = document.createElement("canvas");
  bitmapCanvas.width = side;
  bitmapCanvas.height = side;
  const bitmapContext = bitmapCanvas.getContext("2d");
  if (!bitmapContext) {
    return;
  }

  bitmapContext.putImageData(imageData, 0, 0);

  context.save();
  if (clipPath) {
    context.clip(clipPath);
  }
  context.imageSmoothingEnabled = true;
  context.drawImage(bitmapCanvas, x, y, width, height);
  context.restore();
}

function createHexPath(center: Point2D, radius: number): Path2D {
  const path = new Path2D();
  for (let pointIndex = 0; pointIndex < 6; pointIndex += 1) {
    const angle = (Math.PI / 180) * (60 * pointIndex - 30);
    const x = center.x + radius * Math.cos(angle);
    const y = center.y + radius * Math.sin(angle);
    if (pointIndex === 0) {
      path.moveTo(x, y);
    } else {
      path.lineTo(x, y);
    }
  }
  path.closePath();
  return path;
}

function getCanvasPoint(
  canvas: HTMLCanvasElement,
  event: MouseEvent,
): Point2D {
  const rect = canvas.getBoundingClientRect();
  return {
    x: ((event.clientX - rect.left) / rect.width) * canvas.width,
    y: ((event.clientY - rect.top) / rect.height) * canvas.height,
  };
}

export function SomMapCanvas(props: {
  result: SomTrainingResult | null;
  selectedCellIndex: number | null;
  onSelectCell: (cellIndex: number | null) => void;
  onHoverParameter: (parameter: ComplexParameter | null) => void;
}): preact.JSX.Element {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const canvasSize = useMemo(() => {
    if (!props.result) {
      return { x: 480, y: 360 };
    }
    return getCanvasSize(props.result, props.result.settings.topology, MAP_CELL_SIZE);
  }, [props.result]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const result = props.result;
    if (!canvas) {
      return;
    }

    const context = canvas.getContext("2d");
    if (!context) {
      return;
    }

    context.clearRect(0, 0, canvas.width, canvas.height);
    context.fillStyle = "#f3ede1";
    context.fillRect(0, 0, canvas.width, canvas.height);

    if (!result) {
      context.fillStyle = "#6c7b89";
      context.font = '16px "IBM Plex Sans", sans-serif';
      context.fillText("Train the SOM to render the map.", 24, 48);
      return;
    }

    const topology = result.settings.topology;
    if (topology === "squares") {
      for (const cell of result.cells) {
        const x = cell.x * MAP_CELL_SIZE;
        const y = cell.y * MAP_CELL_SIZE;
        drawPrototypeImage(context, cell, x, y, MAP_CELL_SIZE, MAP_CELL_SIZE);
        context.strokeStyle =
          cell.index === props.selectedCellIndex ? "#cb5a2e" : "rgba(16, 35, 58, 0.18)";
        context.lineWidth = cell.index === props.selectedCellIndex ? 3 : 1;
        context.strokeRect(x + 0.5, y + 0.5, MAP_CELL_SIZE - 1, MAP_CELL_SIZE - 1);
      }
      return;
    }

    const radius = MAP_CELL_SIZE / 2;
    for (const cell of result.cells) {
      const center = getCellCenter("hexagons", cell, MAP_CELL_SIZE, MAP_CELL_SIZE);
      const path = createHexPath(center, radius - 1);
      drawPrototypeImage(
        context,
        cell,
        center.x - radius,
        center.y - radius,
        MAP_CELL_SIZE,
        MAP_CELL_SIZE,
        path,
      );
      context.strokeStyle =
        cell.index === props.selectedCellIndex ? "#cb5a2e" : "rgba(16, 35, 58, 0.2)";
      context.lineWidth = cell.index === props.selectedCellIndex ? 3 : 1.25;
      context.stroke(path);
    }
  }, [props.result, props.selectedCellIndex, canvasSize.x, canvasSize.y]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const result = props.result;
    if (!canvas || !result) {
      return;
    }
    const activeCanvas = canvas;
    const activeResult = result;

    function handleMove(event: MouseEvent): void {
      const point = getCanvasPoint(activeCanvas, event);
      props.onHoverParameter(getInterpolatedParameterAtPoint(activeResult, point, MAP_CELL_SIZE));
    }

    function handleLeave(): void {
      props.onHoverParameter(null);
    }

    function handleClick(event: MouseEvent): void {
      const point = getCanvasPoint(activeCanvas, event);
      const cell = getClosestCellAtPoint(activeResult, point, MAP_CELL_SIZE);
      props.onSelectCell(cell?.index ?? null);
    }

    activeCanvas.addEventListener("mousemove", handleMove);
    activeCanvas.addEventListener("mouseleave", handleLeave);
    activeCanvas.addEventListener("click", handleClick);

    return () => {
      activeCanvas.removeEventListener("mousemove", handleMove);
      activeCanvas.removeEventListener("mouseleave", handleLeave);
      activeCanvas.removeEventListener("click", handleClick);
    };
  }, [props]);

  return (
    <div className="canvas-frame">
      <canvas
        ref={canvasRef}
        className="canvas canvas--map"
        width={Math.ceil(canvasSize.x)}
        height={Math.ceil(canvasSize.y)}
      />
    </div>
  );
}
