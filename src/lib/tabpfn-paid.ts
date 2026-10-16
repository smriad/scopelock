import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import type { ChangeOrderFeatures } from "./tabpfn-hours";
import { featuresToRow } from "./tabpfn-hours-shared";

const API = "https://api.priorlabs.ai";
const cachePath = path.join(process.cwd(), "data", "tabpfn-paid.json");

type UploadInfo = {
  signed_urls: string[];
  required_headers?: Record<string, string>;
};

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
  if (!response.ok) throw new Error(`TabPFN ${route} failed (${response.status}).`);
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

function paidProbability(prediction: unknown): number {
  if (typeof prediction === "number") return prediction;
  if (Array.isArray(prediction)) {
    if (prediction.every((v) => typeof v === "number")) {
      if (prediction.length === 2) return prediction[1] as number;
      return prediction[0] as number;
    }
    if (prediction.length === 1 && Array.isArray(prediction[0])) {
      return paidProbability(prediction[0]);
    }
  }
  if (prediction && typeof prediction === "object") {
    const record = prediction as Record<string, unknown>;
    const one = record["1"] ?? record.true ?? record.paid;
    if (typeof one === "number") return one;
    if (Array.isArray(one) && typeof one[0] === "number") return one[0];
  }
  return 0.5;
}

export async function tabpfnPaidProbability(
  apiKey: string,
  features: ChangeOrderFeatures,
): Promise<number> {
  const rawTrain = readFileSync(
    path.join(process.cwd(), "samples", "projects_payment.csv"),
    "utf8",
  );
  const lines = rawTrain.trim().split("\n");
  const header = lines[0];
  const xTrain = [
    header.split(",").slice(0, -1).join(","),
    ...lines.slice(1).map((l) => l.split(",").slice(0, -1).join(",")),
  ].join("\n");
  const yTrain = ["client_paid", ...lines.slice(1).map((l) => l.split(",").pop()!)].join(
    "\n",
  );
  const xTest = [header.split(",").slice(0, -1).join(","), featuresToRow(features)].join(
    "\n",
  );
  const trainHash = createHash("sha256").update(rawTrain).digest("hex");

  let fittedTrainSetId: string | null = null;
  try {
    const cache = JSON.parse(await readFile(cachePath, "utf8")) as {
      trainHash: string;
      fittedTrainSetId: string;
    };
    if (cache.trainHash === trainHash) fittedTrainSetId = cache.fittedTrainSetId;
  } catch {
    /* no cache */
  }

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
        task: "classification",
        tabpfn_config: { model_path: "v3.5_default" },
      },
    });
    fittedTrainSetId = String(fitted.fitted_train_set_id);
    await mkdir(path.dirname(cachePath), { recursive: true });
    await writeFile(
      cachePath,
      JSON.stringify({ trainHash, fittedTrainSetId }),
    );
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
      task: "classification",
      predict_params: { output_type: "probas" },
    },
  });

  const p = paidProbability(result.prediction);
  return Math.round(p * 100) / 100;
}
