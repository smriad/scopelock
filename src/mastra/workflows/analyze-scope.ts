import { createStep, createWorkflow } from "@mastra/core/workflows";
import { z } from "zod";
import { parseModelJson } from "@/lib/json";
import { analysisResultSchema } from "@/lib/types";

const inputSchema = z.object({
  system: z.string(),
  user: z.string(),
});

const outputSchema = analysisResultSchema;

const gemmaStep = createStep({
  id: "gemma-json",
  inputSchema,
  outputSchema,
  execute: async ({ inputData, mastra }) => {
    const agent = mastra.getAgent("scopelock");
    const response = await agent.generate(
      `${inputData.system}\n\n---\n\n${inputData.user}`,
      { structuredOutput: { schema: outputSchema } },
    );
    if (response.object) return response.object;
    const raw = response.text ?? "";
    return analysisResultSchema.parse(parseModelJson(raw));
  },
});

export const analyzeScopeWorkflow = createWorkflow({
  id: "analyze-scope",
  inputSchema,
  outputSchema,
})
  .then(gemmaStep)
  .commit();
