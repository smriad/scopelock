import { rememberScopeCase } from "./backboard";
import { parseModelJson } from "./json";
import { mongoEnabled, retrieveChunksLexical, saveAnalysis, storeSowChunksMongo } from "./mongo";
import { chatJson, ollamaReachable } from "./ollama";
import { retrieveSowContext } from "./db";
import { demoAnalysis } from "./demo";
import { freelanceRateSnippet } from "./serpapi";
import {
  inferFeaturesFromThread,
  tabpfnPredictHours,
} from "./tabpfn-hours";
import { tabpfnPaidProbability } from "./tabpfn-paid";
import {
  buildSideHustleInsights,
  type SideHustleInsights,
} from "./side-hustle";
import { polishBoundaryReply } from "./tinker";
import { traced } from "./trace";
import { analysisResultSchema, type AnalysisResult } from "./types";
import { mastra } from "@/mastra/index";

const SYSTEM = `You are ScopeLock, a freelance contract assistant. You compare client messages to a Statement of Work (SOW).
Output ONLY valid JSON matching this shape:
{
  "summary": string,
  "overallRisk": "low" | "medium" | "high",
  "requests": [{ "excerpt": string, "verdict": "in_scope" | "ambiguous" | "out_of_scope", "reasoning": string, "sowEvidence": string }],
  "suggestedReply": string,
  "changeOrder": { "title": string, "lineItems": [{ "description": string, "hours": number }], "notes": string } | null
}
Rules:
- Quote short excerpts from the client thread (paraphrase if needed).
- Cite SOW context when possible in sowEvidence.
- suggestedReply: professional, firm, collaborative; no legal threats.
- changeOrder: include only if something is out_of_scope or ambiguous with likely extra work.
- Be concise.`;

export type AnalyzeInput = {
  thread: string;
  sowInline?: string;
  documentId?: string;
  mongoDocumentId?: string;
  mongoChunks?: string[];
  hourlyRate: number;
};

export type AnalyzeMeta = {
  mode: "ollama" | "demo" | "mastra";
  ragChunks: string[];
  tabpfnHours?: number;
  serpSnippet?: string;
  tinkerPolished: boolean;
  analysisId?: string;
  sideHustle: SideHustleInsights;
};

export async function analyzeScope(
  input: AnalyzeInput,
): Promise<{ result: AnalysisResult; meta: AnalyzeMeta }> {
  const demoForced =
    process.env.DEMO_MODE === "true" || process.env.DEMO_MODE === "1";

  if (demoForced) {
    const result = demoAnalysis(input.hourlyRate);
    return finishAnalyze(input, result, {
      mode: "demo",
      ragChunks: [],
      tinkerPolished: false,
    });
  }

  const reachable = await ollamaReachable();
  if (!reachable) {
    const result = demoAnalysis(input.hourlyRate);
    return finishAnalyze(input, result, {
      mode: "demo",
      ragChunks: [],
      tinkerPolished: false,
    });
  }

  let ragChunks: string[] = [];
  if (input.documentId) {
    ragChunks = await retrieveSowContext(input.documentId, input.thread);
  } else if (input.mongoChunks?.length) {
    ragChunks = retrieveChunksLexical(input.mongoChunks, input.thread);
  }

  const sowBlock =
    ragChunks.length > 0
      ? ragChunks.join("\n---\n")
      : (input.sowInline?.trim() ?? "");

  const user = `Hourly rate: $${input.hourlyRate}

SOW CONTEXT:
${sowBlock || "(none provided — flag ambiguous items)"}

CLIENT THREAD:
${input.thread}

Analyze each distinct client ask. JSON only.`;

  let result: AnalysisResult;
  let mode: AnalyzeMeta["mode"] = "ollama";

  try {
    const agent = mastra.getAgent("scopelock");
    const response = await traced("mastra.scope-agent", { engine: "mastra" }, () =>
      agent.generate(`${SYSTEM}\n\n---\n\n${user}`, {
        structuredOutput: { schema: analysisResultSchema },
      }),
    );
    if (response.object) {
      result = analysisResultSchema.parse(response.object);
      mode = "mastra";
    } else {
      throw new Error("Mastra agent returned no structured output");
    }
  } catch {
    const raw = await traced("gemma.chat-json", { engine: "gemma" }, () =>
      chatJson(SYSTEM, user),
    );
    result = analysisResultSchema.parse(parseModelJson<AnalysisResult>(raw));
    mode = "ollama";
  }

  let tabpfnHours: number | undefined;
  let paidProbability: number | undefined;
  const tabpfnKey = process.env.PRIORLABS_API_KEY?.trim();
  const features = inferFeaturesFromThread(input.thread);
  if (tabpfnKey) {
    try {
      tabpfnHours = await traced("tabpfn.regression", {}, () =>
        tabpfnPredictHours(tabpfnKey, features),
      );
      if (result.changeOrder) {
        const primary = result.changeOrder.lineItems[0];
        if (primary) primary.hours = tabpfnHours;
        result.changeOrder.notes = `TabPFN-3.5 regressed hours from past freelance change orders. ${result.changeOrder.notes}`;
      }
    } catch {
      /* optional */
    }
    try {
      paidProbability = await traced("tabpfn.paid-probability", {}, () =>
        tabpfnPaidProbability(tabpfnKey, features),
      );
    } catch {
      /* optional */
    }
  }

  const serpSnippet = await traced("serpapi.rates", {}, () =>
    freelanceRateSnippet("oauth integration developer"),
  );

  const polished = await traced("tinker.polish", {}, () =>
    polishBoundaryReply(result.suggestedReply),
  );
  const tinkerPolished = polished !== result.suggestedReply;
  result.suggestedReply = polished;

  if (result.changeOrder && input.hourlyRate > 0) {
    const totalHours =
      tabpfnHours ??
      result.changeOrder.lineItems.reduce((s, li) => s + li.hours, 0);
    result.changeOrder.notes = `${result.changeOrder.notes} Total ~${totalHours}h at $${input.hourlyRate}/hr ≈ $${Math.round(totalHours * input.hourlyRate)}.${serpSnippet ? ` Market context: ${serpSnippet}` : ""}`;
  }

  await rememberScopeCase(result.summary, result.overallRisk);

  const sideHustle = buildSideHustleInsights(
    input.thread,
    result,
    paidProbability,
  );

  let analysisId: string | undefined;
  if (mongoEnabled()) {
    const totalHours =
      tabpfnHours ??
      result.changeOrder?.lineItems.reduce((s, li) => s + li.hours, 0);
    const id = await saveAnalysis({
      createdAt: new Date(),
      threadPreview: input.thread.slice(0, 160),
      summary: result.summary,
      suggestedReply: result.suggestedReply,
      overallRisk: result.overallRisk,
      mode,
      hourlyRate: input.hourlyRate,
      tabpfnHours,
      estimatedTotalUsd:
        totalHours && input.hourlyRate
          ? Math.round(totalHours * input.hourlyRate)
          : undefined,
      serpSnippet: serpSnippet ?? undefined,
      scopeCreepScore: sideHustle.scopeCreepScore,
      paidProbability: sideHustle.paidProbability,
    });
    analysisId = id ?? undefined;
  }

  return {
    result,
    meta: {
      mode,
      ragChunks,
      tabpfnHours,
      serpSnippet: serpSnippet ?? undefined,
      tinkerPolished,
      analysisId,
      sideHustle,
    },
  };
}

async function finishAnalyze(
  input: AnalyzeInput,
  result: AnalysisResult,
  partial: Omit<AnalyzeMeta, "sideHustle" | "tabpfnHours" | "serpSnippet"> & {
    tabpfnHours?: number;
    serpSnippet?: string;
  },
) {
  const sideHustle = buildSideHustleInsights(input.thread, result, 0.38);
  return {
    result,
    meta: { ...partial, sideHustle },
  };
}

export async function indexSowMongo(title: string, body: string) {
  const { chunkText } = await import("./chunk");
  const chunks = chunkText(body);
  const documentId = await storeSowChunksMongo(title, chunks);
  return { documentId, chunkCount: chunks.length, backend: "mongodb" as const };
}
