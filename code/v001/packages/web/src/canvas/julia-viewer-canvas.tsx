import { useEffect, useMemo, useRef } from "preact/hooks";
import {
  renderJuliaFeatureVector,
  type ComplexParameter,
} from "@asimov/minimal-shared";

const VIEWER_SIZE = 360;

function clampByte(value: number): number {
  return Math.max(0, Math.min(255, Math.round(value)));
}

export function JuliaViewerCanvas(props: {
  parameter: ComplexParameter | null;
  iterations: number;
}): preact.JSX.Element {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const featureVector = useMemo(() => {
    if (!props.parameter) {
      return null;
    }
    return renderJuliaFeatureVector(props.parameter, VIEWER_SIZE, VIEWER_SIZE, props.iterations);
  }, [props.parameter, props.iterations]);

  useEffect(() => {
    const canvas = canvasRef.current;
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

    if (!featureVector) {
      context.fillStyle = "#6c7b89";
      context.font = '16px "IBM Plex Sans", sans-serif';
      context.fillText("Select or hover a cell to render the Julia set.", 20, 40);
      return;
    }

    const imageData = context.createImageData(VIEWER_SIZE, VIEWER_SIZE);
    for (let index = 0; index < featureVector.length; index += 1) {
      const pixelIndex = index * 4;
      const value = featureVector[index] ?? 0;
      const channel = clampByte(value * 255);
      imageData.data[pixelIndex] = channel;
      imageData.data[pixelIndex + 1] = channel;
      imageData.data[pixelIndex + 2] = channel;
      imageData.data[pixelIndex + 3] = 255;
    }

    context.putImageData(imageData, 0, 0);
  }, [featureVector]);

  return (
    <div className="canvas-frame">
      <canvas
        ref={canvasRef}
        className="canvas canvas--viewer"
        width={VIEWER_SIZE}
        height={VIEWER_SIZE}
      />
    </div>
  );
}
