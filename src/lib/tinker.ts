const TINKER_OAI =
  "https://tinker.thinkingmachines.dev/services/tinker-prod/oai/api/v1";

export function tinkerEnabled() {
  return Boolean(
    process.env.TINKER_API_KEY?.trim() && process.env.TINKER_BRIEF_MODEL?.trim(),
  );
}

/** Polish boundary tone using a Tinker fine-tuned sampler (optional). */
export async function polishBoundaryReply(draft: string): Promise<string> {
  const apiKey = process.env.TINKER_API_KEY?.trim();
  const model = process.env.TINKER_BRIEF_MODEL?.trim();
  if (!apiKey || !model || !draft.trim()) return draft;

  const res = await fetch(`${TINKER_OAI}/chat/completions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      messages: [
        {
          role: "system",
          content:
            "Rewrite the freelancer reply to be warm, firm, and under 120 words. Keep facts. Output only the email body.",
        },
        { role: "user", content: draft },
      ],
      max_tokens: 200,
      temperature: 0.5,
      reasoning_effort: false,
      separate_reasoning: true,
    }),
  });

  if (!res.ok) return draft;
  const payload = (await res.json()) as {
    choices?: { message?: { content?: string | null } }[];
  };
  const polished = payload.choices?.[0]?.message?.content?.trim();
  return polished || draft;
}
