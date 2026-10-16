export function serpEnabled() {
  return Boolean(process.env.SERPAPI_API_KEY?.trim());
}

/** Lightweight market context for change-order pricing (not legal advice). */
export async function freelanceRateSnippet(skill: string): Promise<string | null> {
  const key = process.env.SERPAPI_API_KEY?.trim();
  if (!key) return null;

  const q = `freelance ${skill} hourly rate USD 2026`;
  const url = new URL("https://serpapi.com/search.json");
  url.searchParams.set("engine", "google");
  url.searchParams.set("q", q);
  url.searchParams.set("num", "3");
  url.searchParams.set("api_key", key);

  const res = await fetch(url, { next: { revalidate: 3600 } });
  if (!res.ok) return null;

  const data = (await res.json()) as {
    organic_results?: { title?: string; snippet?: string }[];
    answer_box?: { snippet?: string };
  };
  const box = data.answer_box?.snippet;
  if (box) return box.slice(0, 280);
  const first = data.organic_results?.[0];
  if (!first) return null;
  return `${first.title ?? ""}: ${first.snippet ?? ""}`.trim().slice(0, 280);
}
