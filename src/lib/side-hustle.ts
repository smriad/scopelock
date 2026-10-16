import type { AnalysisResult } from "./types";
import type { SideHustleInsights } from "./side-hustle-types";
import { inferFeaturesFromThread } from "./tabpfn-hours";

export type { SideHustleInsights } from "./side-hustle-types";

export function detectRush(thread: string): boolean {
  return /friday|asap|rush|tomorrow|eod|end of day|by monday/i.test(thread);
}

export function computeScopeCreepScore(
  thread: string,
  result: AnalysisResult,
): number {
  const features = inferFeaturesFromThread(thread);
  let score = 0;
  for (const req of result.requests) {
    if (req.verdict === "out_of_scope") score += 28;
    if (req.verdict === "ambiguous") score += 14;
  }
  score += features.scopeCreepMessages * 8;
  if (features.oauthProvider) score += 12;
  if (features.rushDeadlineDays <= 3) score += 15;
  return Math.min(100, Math.max(0, score));
}

export function buildSideHustleInsights(
  thread: string,
  result: AnalysisResult,
  paidProbability?: number,
): SideHustleInsights {
  const scopeCreepScore = computeScopeCreepScore(thread, result);
  const rushDetected = detectRush(thread);
  const rushFeePercent = rushDetected ? 25 : 0;

  let recommendedAction: SideHustleInsights["recommendedAction"] =
    "negotiate";
  let actionLabel =
    "Send a written change order before writing code — protect your rate.";

  if (scopeCreepScore >= 70 || result.overallRisk === "high") {
    recommendedAction = "send_change_order";
    actionLabel =
      "High scope-creep signal: invoice-first. Similar freelancers lose weekends when they ship before sign-off.";
  } else if (scopeCreepScore < 35 && result.overallRisk === "low") {
    recommendedAction = "decline_or_defer";
    actionLabel =
      "Mostly in scope — a quick clarifying reply may be enough; skip the heavy CO paperwork.";
  }

  if (paidProbability != null && paidProbability < 0.35) {
    recommendedAction = "negotiate";
    actionLabel =
      "TabPFN says similar asks rarely get paid without a firm boundary — lead with scope, not apologies.";
  }

  return {
    scopeCreepScore,
    rushDetected,
    rushFeePercent,
    paidProbability,
    recommendedAction,
    actionLabel,
    whyOpenSourceMatters:
      "Open Gemma + TabPFN on your stack means client threads stay off closed APIs while you still get structured verdicts and payment odds — the margin a $19/mo side tool needs.",
  };
}
