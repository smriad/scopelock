/** Turn a Slack export snippet or copy-paste into plain thread text. */
export function slackToThreadText(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) return "";

  if (trimmed.startsWith("[")) {
    try {
      const messages = JSON.parse(trimmed) as unknown;
      if (Array.isArray(messages)) {
        return messages
          .map((m) => formatSlackMessage(m))
          .filter(Boolean)
          .join("\n\n");
      }
    } catch {
      /* fall through */
    }
  }

  if (trimmed.startsWith("{")) {
    try {
      const obj = JSON.parse(trimmed) as { messages?: unknown[] };
      if (Array.isArray(obj.messages)) {
        return obj.messages.map((m) => formatSlackMessage(m)).filter(Boolean).join("\n\n");
      }
    } catch {
      /* fall through */
    }
  }

  return trimmed;
}

function formatSlackMessage(m: unknown): string {
  if (!m || typeof m !== "object") return "";
  const record = m as Record<string, unknown>;
  const user =
    record.user_profile && typeof record.user_profile === "object"
      ? (record.user_profile as { real_name?: string }).real_name
      : undefined;
  const name =
    user ??
    (typeof record.user === "string" ? record.user : undefined) ??
    (typeof record.username === "string" ? record.username : "Someone");
  const text =
    typeof record.text === "string"
      ? record.text
      : typeof record.message === "string"
        ? record.message
        : "";
  if (!text.trim()) return "";
  return `${name}: ${text.replace(/<[^>]+>/g, "").trim()}`;
}
