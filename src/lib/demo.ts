import type { AnalysisResult } from "./types";

/** Deterministic demo output when Ollama is unavailable (e.g. cloud preview). */
export function demoAnalysis(hourlyRate: number): AnalysisResult {
  const hours = 6;
  return {
    summary:
      "The client is asking for Apple Sign-In and a Friday deadline—features that were not in the original MVP scope and sit outside the agreed revision window.",
    overallRisk: "high",
    requests: [
      {
        excerpt:
          "Can you also add Sign in with Apple? Marketing wants it live by Friday.",
        verdict: "out_of_scope",
        reasoning:
          "Authentication providers beyond email/password were explicitly deferred. A new IdP plus QA is new scope, not a tweak.",
        sowEvidence:
          "Phase 1 includes email login only; OAuth/social providers are Phase 2 optional items.",
      },
      {
        excerpt: "It's just a quick add, shouldn't take long.",
        verdict: "ambiguous",
        reasoning:
          "Effort depends on App Store config, redirect URLs, and regression testing. Treat as a change order until scoped.",
        sowEvidence:
          "Additional features require written approval and may affect timeline and fees.",
      },
    ],
    suggestedReply: `Thanks for the note on Apple Sign-In. That wasn't included in our Phase 1 SOW (email login only), so I'd handle it as a small change order: implement Sign in with Apple, test on staging, and document for your team. I can turn around a written estimate today; Friday would need us to confirm scope and deposit first so I can block the time.`,
    changeOrder: {
      title: "Change Order — Sign in with Apple",
      lineItems: [
        {
          description: "Apple OAuth integration + env configuration",
          hours: 4,
        },
        { description: "Regression pass on auth flows", hours: 2 },
      ],
      notes: `At $${hourlyRate}/hr, estimated ${hours} hours ($${hours * hourlyRate}). Demo mode — connect Ollama locally for analysis grounded in your real SOW.`,
    },
  };
}
