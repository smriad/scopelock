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
  embedding vector(768) NOT NULL,
  chunk_index INT NOT NULL
);

CREATE INDEX IF NOT EXISTS sow_chunks_embedding_idx
  ON sow_chunks USING hnsw (embedding vector_cosine_ops);
