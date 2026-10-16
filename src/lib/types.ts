import { z } from "zod";

export const scopeVerdictSchema = z.enum([
  "in_scope",
  "ambiguous",
  "out_of_scope",
]);

export const analysisResultSchema = z.object({
  summary: z.string(),
  overallRisk: z.enum(["low", "medium", "high"]),
  requests: z.array(
    z.object({
      excerpt: z.string(),
      verdict: scopeVerdictSchema,
      reasoning: z.string(),
      sowEvidence: z.string(),
    }),
  ),
  suggestedReply: z.string(),
  changeOrder: z
    .object({
      title: z.string(),
      lineItems: z.array(
        z.object({
          description: z.string(),
          hours: z.number(),
        }),
      ),
      notes: z.string(),
    })
    .optional(),
});

export type AnalysisResult = z.infer<typeof analysisResultSchema>;
export type ScopeVerdict = z.infer<typeof scopeVerdictSchema>;
