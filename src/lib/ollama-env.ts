export function inferenceBaseUrl(): string {
  const raw = process.env.OLLAMA_BASE_URL ?? "http://127.0.0.1:11434";
  return raw.replace(/\/$/, "");
}

export function chatModelId(): string {
  return (
    process.env.OLLAMA_CHAT_MODEL ??
    process.env.OLLAMA_MODEL ??
    process.env.GEMMA_MODEL ??
    "gemma3:4b"
  );
}

export function embedModelId(): string {
  return process.env.OLLAMA_EMBED_MODEL ?? process.env.EMBED_MODEL ?? "nomic-embed-text";
}

export function inferenceApiKey(): string | undefined {
  const key =
    process.env.OLLAMA_API_KEY?.trim() ||
    process.env.GEMMA_API_KEY?.trim() ||
    undefined;
  return key || undefined;
}

export function inferenceRemote(): boolean {
  try {
    const host = new URL(
      inferenceBaseUrl().includes("/v1")
        ? inferenceBaseUrl()
        : `${inferenceBaseUrl()}/`,
    ).hostname;
    return !["127.0.0.1", "localhost", "::1"].includes(host);
  } catch {
    return false;
  }
}

/** OpenAI-compatible base (OpenRouter, local Ollama /v1). */
export function openAiBaseUrl(): string {
  const base = inferenceBaseUrl();
  if (base.endsWith("/v1")) return base;
  if (inferenceRemote()) return base.endsWith("/api") ? `${base}/v1` : `${base}/v1`;
  return `${base}/v1`;
}

export function gemmaInferenceReady(): boolean {
  return inferenceRemote() ? Boolean(inferenceApiKey()) : true;
}

export function localOllamaNative(): boolean {
  return !inferenceRemote() && !inferenceBaseUrl().includes("/v1");
}
