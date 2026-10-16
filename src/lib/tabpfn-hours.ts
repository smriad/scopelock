import { createHash } from "node:crypto";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import path from "node:path";
import { readFileSync } from "node:fs";
import { featuresToRow } from "./tabpfn-hours-shared";

const API = "https://api.priorlabs.ai";
const cachePath = path.join(process.cwd(), "data", "tabpfn-hours.json");

type UploadInfo = {
  signed_urls: string[];
  required_headers?: Record<string, string>;
};

type TrainCache = {
  trainHash: string;
  fittedTrainSetId: string;
};

export type ChangeOrderFeatures = {
  oauthProvider: boolean;
  rushDeadlineDays: number;
  integrationCount: number;
  scopeCreepMessages: number;
};

function loadTrainingCsv() {
  return readFileSync(
    path.join(process.cwd(), "samples", "projects_history.csv"),
    "utf8",
  );
}

export function inferFeaturesFromThread(thread: string): ChangeOrderFeatures {
  const lower = thread.toLowerCase();
  const oauth =
    /apple|google|oauth|sso|sign in with|social login/.test(lower);
  const friday = /friday|asap|rush|tomorrow|eod|end of day/.test(lower);
  const rushDeadlineDays = friday ? 3 : 14;
  const integrationCount = Math.min(
    6,
    (lower.match(/\balso\b|\band\b|\bplus\b/g) ?? []).length + 1,
  );
  const scopeCreepMessages = Math.min(
    5,
    (lower.match(/quick|just|shouldn't take|small|easy/g) ?? []).length + 1,
  );
  return {
    oauthProvider: oauth,
    rushDeadlineDays,
    integrationCount,
    scopeCreepMessages,
  };
}

async function postJson(apiKey: string, route: string, body: unknown) {
  const response = await fetch(`${API}${route}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  const text = await response.text();
  const start = ["{", "["]
    .map((mark) => text.indexOf(mark))
    .filter((index) => index >= 0)
    .sort((a, b) => a - b)[0];
  const json =
    start === undefined ? {} : (JSON.parse(text.slice(start)) as Record<string, unknown>);
  if (!response.ok) {
    throw new Error(`TabPFN ${route} failed (${response.status}).`);
  }
  return json;
}

async function putCsv(info: UploadInfo, csv: string) {
  const headers = new Headers(info.required_headers ?? {});
  if (!headers.has("Content-Type")) headers.set("Content-Type", "text/csv");
  const response = await fetch(info.signed_urls[0], {
    method: "PUT",
    headers,
    body: csv,
  });
  if (!response.ok) throw new Error(`TabPFN upload failed (${response.status}).`);
}

function readRegressionMean(prediction: unknown): number {
  if (typeof prediction === "number") return prediction;
  if (Array.isArray(prediction)) {
    const first = prediction[0];
    if (typeof first === "number") return first;
    if (Array.isArray(first) && typeof first[0] === "number") return first[0];
  }
  if (prediction && typeof prediction === "object") {
    const record = prediction as Record<string, unknown>;
    const mean = record.mean ?? record.prediction;
    if (typeof mean === "number") return mean;
    if (Array.isArray(mean) && typeof mean[0] === "number") return mean[0];
  }
  throw new Error("Unexpected TabPFN regression shape.");
}

async function readCache(trainHash: string) {
  try {
    const cache = JSON.parse(await readFile(cachePath, "utf8")) as TrainCache;
    return cache.trainHash === trainHash ? cache.fittedTrainSetId : null;
  } catch {
    return null;
  }
}

async function writeCache(cache: TrainCache) {
  await mkdir(path.dirname(cachePath), { recursive: true });
  await writeFile(cachePath, JSON.stringify(cache));
}

export async function tabpfnPredictHours(
  apiKey: string,
  features: ChangeOrderFeatures,
): Promise<number> {
  const rawTrain = loadTrainingCsv();
  const lines = rawTrain.trim().split("\n");
  const header = lines[0];
  const xTrain = [header.split(",").slice(0, -1).join(","), ...lines.slice(1).map((l) => l.split(",").slice(0, -1).join(","))].join("\n");
  const yTrain = ["actual_hours", ...lines.slice(1).map((l) => l.split(",").pop()!)].join("\n");
  const xTest = [header.split(",").slice(0, -1).join(","), featuresToRow(features)].join("\n");
  const trainHash = createHash("sha256").update(rawTrain).digest("hex");

  let fittedTrainSetId = await readCache(trainHash);

  if (!fittedTrainSetId) {
    const prepared = await postJson(apiKey, "/tabpfn/prepare_train_set_upload", {
      x_train_info: { format: "csv" },
      y_train_info: { format: "csv" },
    });
    await putCsv(prepared.x_train_info as UploadInfo, xTrain);
    await putCsv(prepared.y_train_info as UploadInfo, yTrain);
    const fitted = await postJson(apiKey, "/tabpfn/fit", {
      train_set_upload_id: prepared.train_set_upload_id,
      task_config: {
        task: "regression",
        tabpfn_config: { model_path: "v3.5_default" },
      },
    });
    fittedTrainSetId = String(fitted.fitted_train_set_id);
    await writeCache({ trainHash, fittedTrainSetId });
  }

  const preparedTest = await postJson(apiKey, "/tabpfn/prepare_test_set_upload", {
    fitted_train_set_id: fittedTrainSetId,
    x_test_info: { format: "csv" },
  });
  await putCsv(preparedTest.x_test_info as UploadInfo, xTest);
  const result = await postJson(apiKey, "/tabpfn/predict", {
    test_set_upload_id: preparedTest.test_set_upload_id,
    fitted_train_set_id: fittedTrainSetId,
    task_config: {
      task: "regression",
      predict_params: { output_type: "mean" },
    },
  });

  const hours = readRegressionMean(result.prediction);
  return Math.max(2, Math.round(hours * 10) / 10);
}
