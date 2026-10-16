import { Agent } from "@mastra/core/agent";
import {
  chatModelId,
  gemmaInferenceReady,
  inferenceApiKey,
  openAiBaseUrl,
} from "@/lib/ollama-env";

const instructions = `You are ScopeLock's contract analyst. Compare client messages to SOW text.
Be precise, cite contract language, and protect the freelancer's time without being rude.`;

export const scopeAgent = new Agent({
  id: "scopelock",
  name: "ScopeLock",
  instructions,
  model: {
    providerId: "scopelock-gemma",
    modelId: chatModelId(),
    url: openAiBaseUrl(),
    apiKey: gemmaInferenceReady() ? inferenceApiKey() ?? "ollama" : "ollama",
  },
});
