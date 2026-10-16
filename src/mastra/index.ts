import { Mastra } from "@mastra/core";
import { scopeAgent } from "./agents/scope-agent";
import { analyzeScopeWorkflow } from "./workflows/analyze-scope";

export const mastra = new Mastra({
  agents: { scopelock: scopeAgent },
  workflows: { analyzeScopeWorkflow },
});
