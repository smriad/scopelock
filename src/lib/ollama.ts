import {
  chatModelId,
  embedModelId,
  gemmaInferenceReady,
  inferenceApiKey,
  inferenceBaseUrl,
  inferenceRemote,
  localOllamaNative,
  openAiBaseUrl,
} from "./ollama-env";

export async function ollamaReachable(): Promise<boolean> {
  if (process.env.DEMO_MODE === "true") return false;
  if (!gemmaInferenceReady()) return false;
  try {
    if (inferenceRemote() || inferenceBaseUrl().includes("/v1")) {
      const res = await fetch(`${openAiBaseUrl()}/models`, {
        headers: {
          Authorization: `Bearer ${inferenceApiKey() ?? "ollama"}`,
        },
        signal: AbortSignal.timeout(4000),
      });
      return res.ok;
    }
    const res = await fetch(`${inferenceBaseUrl()}/api/tags`, {
      signal: AbortSignal.timeout(2000),
    });
    return res.ok;
  } catch {
    return false;
  }
}

export async function embedText(text: string): Promise<number[]> {
  if (!localOllamaNative()) {
    throw new Error("Embeddings require local Ollama; use Tiger/Mongo RAG on cloud.");
  }
  const res = await fetch(`${inferenceBaseUrl()}/api/embeddings`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ model: embedModelId(), prompt: text }),
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Ollama embeddings failed: ${res.status} ${body}`);
  }
  const data = (await res.json()) as { embedding: number[] };
  return data.embedding;
}

export async function chatJson(system: string, user: string): Promise<string> {
  if (localOllamaNative()) {
    const res = await fetch(`${inferenceBaseUrl()}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: chatModelId(),
        stream: false,
        format: "json",
        messages: [
          { role: "system", content: system },
          { role: "user", content: user },
        ],
        options: { temperature: 0.2 },
      }),
    });
    if (!res.ok) {
      const body = await res.text();
      throw new Error(`Ollama chat failed: ${res.status} ${body}`);
    }
    const data = (await res.json()) as { message?: { content?: string } };
    const content = data.message?.content;
    if (!content) throw new Error("Empty response from Ollama.");
    return content;
  }

  const res = await fetch(`${openAiBaseUrl()}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${inferenceApiKey() ?? "ollama"}`,
    },
    body: JSON.stringify({
      model: chatModelId(),
      temperature: 0.2,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
    }),
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Gemma chat failed: ${res.status} ${body}`);
  }
  const data = (await res.json()) as {
    choices?: { message?: { content?: string } }[];
  };
  const content = data.choices?.[0]?.message?.content;
  if (!content) throw new Error("Empty response from inference host.");
  return content;
}

export { chatModelId as chatModel };
