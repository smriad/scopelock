import pg from "pg";
import { chunkText } from "./chunk";
import { embedText, ollamaReachable } from "./ollama";
import { localOllamaNative } from "./ollama-env";

let pool: pg.Pool | null = null;
let lastUrl: string | undefined;

export function databaseUrl(): string | undefined {
  return process.env.TIGER_DATABASE_URL ?? process.env.DATABASE_URL;
}

function getPool(): pg.Pool | null {
  const url = databaseUrl();
  if (!url) return null;
  if (pool && lastUrl !== url) {
    pool.end().catch(() => {});
    pool = null;
  }
  if (!pool) {
    lastUrl = url;
    // Tiger / Timescale Cloud uses a chain Node may not trust; URL sslmode=verify-full overrides `ssl`.
    const connectionString = url
      .replace(/([?&])sslmode=[^&]+&?/g, "$1")
      .replace(/\?&/, "?")
      .replace(/\?$/, "");
    pool = new pg.Pool({
      connectionString,
      max: 5,
      ssl: { rejectUnauthorized: false },
    });
  }
  return pool;
}

const SCHEMA = `
CREATE EXTENSION IF NOT EXISTS vector;
CREATE TABLE IF NOT EXISTS sow_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL DEFAULT 'Statement of Work',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS sow_chunks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID NOT NULL REFERENCES sow_documents(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  embedding vector(768),
  chunk_index INT NOT NULL
);
`;

export async function ensureSchema(): Promise<void> {
  const p = getPool();
  if (!p) return;
  await p.query(SCHEMA);
}

export async function dbReady(): Promise<boolean> {
  const p = getPool();
  if (!p) return false;
  try {
    await ensureSchema();
    await p.query("SELECT 1");
    return true;
  } catch {
    return false;
  }
}

export async function storeSow(
  title: string,
  body: string,
): Promise<{ documentId: string; chunkCount: number; backend: "tiger" }> {
  const p = getPool();
  if (!p) throw new Error("Tiger/Postgres URL is not configured.");

  await ensureSchema();
  const chunks = chunkText(body);
  if (chunks.length === 0) throw new Error("SOW text is empty.");

  const canEmbed = localOllamaNative() && (await ollamaReachable());

  const client = await p.connect();
  try {
    await client.query("BEGIN");
    const doc = await client.query<{ id: string }>(
      `INSERT INTO sow_documents (title) VALUES ($1) RETURNING id`,
      [title],
    );
    const documentId = doc.rows[0].id;

    for (let i = 0; i < chunks.length; i++) {
      if (canEmbed) {
        const embedding = await embedText(chunks[i]);
        const vector = `[${embedding.join(",")}]`;
        await client.query(
          `INSERT INTO sow_chunks (document_id, content, embedding, chunk_index)
           VALUES ($1, $2, $3::vector, $4)`,
          [documentId, chunks[i], vector, i],
        );
      } else {
        await client.query(
          `INSERT INTO sow_chunks (document_id, content, chunk_index)
           VALUES ($1, $2, $3)`,
          [documentId, chunks[i], i],
        );
      }
    }
    await client.query("COMMIT");
    return { documentId, chunkCount: chunks.length, backend: "tiger" };
  } catch (e) {
    await client.query("ROLLBACK");
    throw e;
  } finally {
    client.release();
  }
}

export async function retrieveSowContext(
  documentId: string,
  query: string,
  limit = 5,
): Promise<string[]> {
  const p = getPool();
  if (!p) return [];

  await ensureSchema();

  const canEmbed = localOllamaNative() && (await ollamaReachable());
  if (canEmbed) {
    try {
      const embedding = await embedText(query);
      const vector = `[${embedding.join(",")}]`;
      const res = await p.query<{ content: string }>(
        `SELECT content FROM sow_chunks
         WHERE document_id = $1 AND embedding IS NOT NULL
         ORDER BY embedding <=> $2::vector
         LIMIT $3`,
        [documentId, vector, limit],
      );
      if (res.rows.length) return res.rows.map((r) => r.content);
    } catch {
      /* fall through to hybrid FTS */
    }
  }

  const res = await p.query<{ content: string }>(
    `SELECT content FROM sow_chunks
     WHERE document_id = $1
     ORDER BY ts_rank(to_tsvector('english', content), plainto_tsquery('english', $2)) DESC
     LIMIT $3`,
    [documentId, query.slice(0, 500), limit],
  );
  return res.rows.map((r) => r.content);
}
