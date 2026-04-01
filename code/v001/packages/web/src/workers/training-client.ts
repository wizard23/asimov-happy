import type { SomTrainingProgress, SomTrainingResult, TrainingSettings } from "@asimov/minimal-shared";

export interface TrainingWorkerSuccessPayload {
  result: SomTrainingResult;
}

interface TrainRequestOptions {
  onProgress?: (progress: SomTrainingProgress) => void;
}

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
      result: SomTrainingResult;
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

interface PendingRequest {
  resolve: (value: TrainingWorkerSuccessPayload) => void;
  reject: (reason?: unknown) => void;
  onProgress: ((progress: SomTrainingProgress) => void) | undefined;
}

export interface TrainingWorkerController {
  train: (
    settings: TrainingSettings,
    options?: TrainRequestOptions,
  ) => Promise<TrainingWorkerSuccessPayload>;
  cancel: () => void;
  dispose: () => void;
}

export function createTrainingWorker(): TrainingWorkerController {
  const worker = new Worker(new URL("./training-worker.ts", import.meta.url), {
    type: "module",
  });

  let nextRequestId = 1;
  let activeRequestId: number | null = null;
  let pendingRequest: PendingRequest | null = null;

  worker.onmessage = (event: MessageEvent<TrainingWorkerResponse>) => {
    const message = event.data;

    if (message.requestId !== activeRequestId || !pendingRequest) {
      return;
    }

    switch (message.type) {
      case "progress":
        pendingRequest.onProgress?.(message.progress);
        break;
      case "success":
        pendingRequest.resolve({ result: message.result });
        pendingRequest = null;
        activeRequestId = null;
        break;
      case "cancelled":
        pendingRequest.reject(new Error("Training cancelled."));
        pendingRequest = null;
        activeRequestId = null;
        break;
      case "error":
        pendingRequest.reject(new Error(message.message));
        pendingRequest = null;
        activeRequestId = null;
        break;
    }
  };

  function postMessage(message: TrainingWorkerRequest): void {
    worker.postMessage(message);
  }

  return {
    train(settings, options) {
      if (pendingRequest) {
        pendingRequest.reject(new Error("A training request is already active."));
        pendingRequest = null;
        activeRequestId = null;
      }

      const requestId = nextRequestId;
      nextRequestId += 1;
      activeRequestId = requestId;

      return new Promise<TrainingWorkerSuccessPayload>((resolve, reject) => {
        pendingRequest = {
          resolve,
          reject,
          onProgress: options?.onProgress,
        };

        postMessage({
          type: "train",
          requestId,
          settings,
        });
      });
    },

    cancel() {
      if (activeRequestId === null) {
        return;
      }

      postMessage({
        type: "cancel",
        requestId: activeRequestId,
      });
    },

    dispose() {
      if (pendingRequest) {
        pendingRequest.reject(new Error("Training worker disposed."));
        pendingRequest = null;
      }
      activeRequestId = null;
      worker.terminate();
    },
  };
}
