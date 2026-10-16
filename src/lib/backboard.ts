const BASE = "https://app.backboard.io/api";

export function backboardEnabled() {
  return Boolean(
    process.env.BACKBOARD_API_KEY && process.env.BACKBOARD_ASSISTANT_ID,
  );
}

async function postMessage(content: string, system_prompt?: string) {
  const response = await fetch(`${BASE}/threads/messages`, {
    method: "POST",
    headers: {
      "X-API-Key": process.env.BACKBOARD_API_KEY!,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      assistant_id: process.env.BACKBOARD_ASSISTANT_ID,
      content,
      memory: "Auto",
      system_prompt,
    }),
    cache: "no-store",
  });
  if (!response.ok) throw new Error(`Backboard answered ${response.status}`);
}

export async function rememberScopeCase(summary: string, risk: string) {
  if (!backboardEnabled() || !summary.trim()) return;
  try {
    await postMessage(
      `ScopeLock case (${risk}): ${summary.trim().slice(0, 400)}`,
      "Remember recurring scope-creep patterns for freelance dev contracts. Ignore unrelated topics.",
    );
  } catch {
    /* non-blocking */
  }
}
