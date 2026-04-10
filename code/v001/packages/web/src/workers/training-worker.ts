import {
  generateTrainingSamples,
  getTrainingSampleCacheKey,
  trainSom,
  type SomTrainingProgress,
  type TrainingSample,
  type TrainingSettings,
} from "@asimov/minimal-shared";

type TrainingWorkerRequest =
  | {
      type: "train";
      requestId: number;
      settings: TrainingSettings;
    }
  | {
      type: "cancel";
      requestId: number;
    };

type TrainingWorkerResponse =
  | {
      type: "progress";
      requestId: number;
      progress: SomTrainingProgress;
    }
  | {
      type: "success";
      requestId: number;
      result: ReturnType<typeof trainSom>;
    }
  | {
      type: "error";
      requestId: number;
      message: string;
    }
  | {
      type: "cancelled";
      requestId: number;
    };

let activeRequestId: number | null = null;
let cachedTrainingSampleKey: string | null = null;
let cachedTrainingSamples: TrainingSample[] | null = null;

function postMessageToMainThread(message: TrainingWorkerResponse): void {
  self.postMessage(message);
}

self.onmessage = (event: MessageEvent<TrainingWorkerRequest>) => {
  const message = event.data;

  if (message.type === "cancel") {
    if (activeRequestId === message.requestId) {
      activeRequestId = null;
    }
    postMessageToMainThread({
      type: "cancelled",
      requestId: message.requestId,
    });
    return;
  }

  activeRequestId = message.requestId;

  try {
    const sampleCacheKey = getTrainingSampleCacheKey(message.settings);
    const canReuseSamples =
      message.settings.enableSampleCache &&
      cachedTrainingSampleKey === sampleCacheKey &&
      cachedTrainingSamples !== null;
    const sampleGenerationStartMs = performance.now();
    const samples = canReuseSamples && cachedTrainingSamples
      ? cachedTrainingSamples
      : generateTrainingSamples(message.settings);
    const sampleGenerationMs = performance.now() - sampleGenerationStartMs;

    if (!canReuseSamples) {
      cachedTrainingSampleKey = sampleCacheKey;
      cachedTrainingSamples = samples;
    }

    const result = trainSom({
      settings: message.settings,
      samples,
      sampleGenerationMs,
      usedSampleCache: canReuseSamples,
      onProgress(progress) {
        if (activeRequestId !== message.requestId) {
          return;
        }
        postMessageToMainThread({
          type: "progress",
          requestId: message.requestId,
          progress,
        });
      },
    });

    if (activeRequestId !== message.requestId) {
      postMessageToMainThread({
        type: "cancelled",
        requestId: message.requestId,
      });
      return;
    }

    activeRequestId = null;
    postMessageToMainThread({
      type: "success",
      requestId: message.requestId,
      result,
    });
  } catch (error) {
    activeRequestId = null;
    postMessageToMainThread({
      type: "error",
      requestId: message.requestId,
      message: error instanceof Error ? error.message : "Unknown training worker error.",
    });
  }
};

export type { TrainingWorkerRequest, TrainingWorkerResponse };
