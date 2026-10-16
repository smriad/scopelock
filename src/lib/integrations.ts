import { backboardEnabled } from "./backboard";
import { dbReady } from "./db";
import { gemmaInferenceReady, inferenceRemote, chatModelId } from "./ollama-env";
import { ollamaReachable } from "./ollama";
import { mongoReady } from "./mongo";
import { serpEnabled } from "./serpapi";
import { tinkerEnabled } from "./tinker";
import { voiceEnabled } from "./voice";

export type Integration = {
  partner: string;
  category: string;
  ok: boolean;
  detail: string;
};

export async function listIntegrations(): Promise<Integration[]> {
  const gemmaOk = gemmaInferenceReady() && (await ollamaReachable());
  const host = inferenceRemote() ? "OpenRouter" : "local Ollama";

  return [
    {
      partner: "Render",
      category: "Host",
      ok: Boolean(process.env.RENDER),
      detail: process.env.RENDER
        ? `Service ${process.env.RENDER_SERVICE_NAME ?? "scopelock"}`
        : "Run on Render for production",
    },
    {
      partner: "Gemma",
      category: "Featured",
      ok: gemmaOk,
      detail: gemmaOk ? `${chatModelId()} via ${host}` : "Inference offline",
    },
    {
      partner: "Tiger Data",
      category: "Partner",
      ok: await dbReady(),
      detail: "pgvector + hybrid FTS on SOW chunks",
    },
    {
      partner: "MongoDB Atlas",
      category: "Partner",
      ok: await mongoReady(),
      detail: "Analysis history + lexical SOW fallback",
    },
    {
      partner: "TabPFN",
      category: "Featured",
      ok: Boolean(process.env.PRIORLABS_API_KEY),
      detail: "Regresses change-order hours from CSV history",
    },
    {
      partner: "Tinker",
      category: "Featured",
      ok: tinkerEnabled(),
      detail: "Polishes boundary-reply tone",
    },
    {
      partner: "ElevenLabs",
      category: "Partner",
      ok: voiceEnabled(),
      detail: "Narrates suggested client reply",
    },
    {
      partner: "SerpApi",
      category: "Partner",
      ok: serpEnabled(),
      detail: "Grounds pricing with live rate snippets",
    },
    {
      partner: "Backboard",
      category: "Partner",
      ok: backboardEnabled(),
      detail: "Long-term memory of scope patterns",
    },
    {
      partner: "Sentry",
      category: "Partner",
      ok: Boolean(process.env.SENTRY_DSN),
      detail: "Agent span tracing on analyze path",
    },
    {
      partner: "Mastra",
      category: "Partner",
      ok: gemmaOk,
      detail: "Orchestrates Gemma JSON workflow",
    },
    {
      partner: ".tech",
      category: "Partner",
      ok: Boolean(process.env.NEXT_PUBLIC_APP_URL?.includes(".tech")),
      detail: process.env.NEXT_PUBLIC_APP_URL ?? "Set scopelock.smriad.tech",
    },
  ];
}
