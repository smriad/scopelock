const MAX_CHUNK = 900;
const OVERLAP = 120;

export function chunkText(text: string): string[] {
  const normalized = text.replace(/\r\n/g, "\n").trim();
  if (!normalized) return [];

  const paragraphs = normalized.split(/\n{2,}/).map((p) => p.trim()).filter(Boolean);
  const chunks: string[] = [];
  let buffer = "";

  for (const para of paragraphs) {
    if ((buffer + "\n\n" + para).length <= MAX_CHUNK) {
      buffer = buffer ? `${buffer}\n\n${para}` : para;
      continue;
    }
    if (buffer) chunks.push(buffer);
    if (para.length <= MAX_CHUNK) {
      buffer = para;
      continue;
    }
    let start = 0;
    while (start < para.length) {
      const end = Math.min(start + MAX_CHUNK, para.length);
      chunks.push(para.slice(start, end));
      start = end - OVERLAP;
      if (start < 0) start = 0;
      if (end === para.length) break;
    }
    buffer = "";
  }
  if (buffer) chunks.push(buffer);
  return chunks;
}
