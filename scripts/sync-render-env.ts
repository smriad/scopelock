/**
 * Push integration env vars from .env.local to the Render "scopelock" web service.
 *
 *   export RENDER_API_KEY=rnd_...   # https://dashboard.render.com/u/settings#api-keys
 *   npm run sync:render
 */
import { readFile } from "node:fs/promises";
import path from "node:path";

const API = "https://api.render.com/v1";
const SERVICE_NAME = "scopelock";

const KEYS = [
  "OLLAMA_BASE_URL",
  "OLLAMA_API_KEY",
  "OLLAMA_CHAT_MODEL",
  "OLLAMA_MODEL",
  "PRIORLABS_API_KEY",
  "ELEVENLABS_API_KEY",
  "ELEVENLABS_VOICE_ID",
  "MONGODB_URI",
  "MONGODB_DB",
  "TIGER_DATABASE_URL",
  "SENTRY_DSN",
  "SERPAPI_API_KEY",
  "TINKER_API_KEY",
  "TINKER_BRIEF_MODEL",
  "BACKBOARD_API_KEY",
  "BACKBOARD_ASSISTANT_ID",
  "NEXT_PUBLIC_APP_URL",
  "DEMO_MODE",
] as const;

function parseEnvFile(raw: string) {
  const out: Record<string, string> = {};
  for (const line of raw.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq < 1) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    out[key] = value;
  }
  return out;
}

async function renderFetch(apiKey: string, route: string, init?: RequestInit) {
  const response = await fetch(`${API}${route}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  });
  if (!response.ok) {
    throw new Error(`Render ${route} → ${response.status}: ${await response.text()}`);
  }
  return response.json();
}

async function resolveServiceId(apiKey: string) {
  if (process.env.RENDER_SERVICE_ID) return process.env.RENDER_SERVICE_ID;
  let cursor: string | undefined;
  for (;;) {
    const query = new URLSearchParams({ limit: "100", ...(cursor ? { cursor } : {}) });
    const page = (await renderFetch(apiKey, `/services?${query}`)) as {
      cursor?: string;
      next?: string;
      items?: { service?: { id: string; name: string; type: string } }[];
    };
    const items = page.items ?? [];
    const hit = items.find(
      (row) =>
        row.service?.name === SERVICE_NAME &&
        row.service?.type === "web_service",
    );
    if (hit?.service?.id) return hit.service.id;
    cursor = page.cursor ?? page.next;
    if (!cursor) break;
  }
  throw new Error(
    `No web service named "${SERVICE_NAME}" found. Create it from render.yaml first.`,
  );
}

async function main() {
  const apiKey = process.env.RENDER_API_KEY?.trim();
  if (!apiKey) {
    console.error("Set RENDER_API_KEY (Render Dashboard → Account Settings → API Keys)");
    process.exit(1);
  }

  const envPath = path.join(process.cwd(), ".env.local");
  const local = parseEnvFile(await readFile(envPath, "utf8"));
  const serviceId = await resolveServiceId(apiKey);

  const payload = KEYS.filter((key) => local[key]?.trim()).map((key) => ({
    key,
    value: local[key].trim(),
  }));

  if (!payload.length) {
    console.error("No keys found in .env.local");
    process.exit(1);
  }

  await renderFetch(apiKey, `/services/${serviceId}/env-vars`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });

  console.log(
    `Updated ${payload.length} env vars on ${SERVICE_NAME} (${serviceId}). Redeploy if needed.`,
  );
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
