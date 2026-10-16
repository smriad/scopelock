import { MongoClient, type Db, type ObjectId } from "mongodb";

const globalForMongo = globalThis as unknown as { scopelockMongo?: Promise<Db> };

export function mongoEnabled() {
  return Boolean(process.env.MONGODB_URI);
}

export function mongoDb(): Promise<Db> {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error("MONGODB_URI is not set.");
  globalForMongo.scopelockMongo ??= new MongoClient(uri, {
    appName: "scopelock",
    serverSelectionTimeoutMS: 8_000,
  })
    .connect()
    .then((client) => client.db(process.env.MONGODB_DB ?? "scopelock"));
  return globalForMongo.scopelockMongo;
}

export async function mongoReady(): Promise<boolean> {
  if (!mongoEnabled()) return false;
  try {
    await (await mongoDb()).command({ ping: 1 });
    return true;
  } catch {
    return false;
  }
}

export type StoredAnalysis = {
  _id?: ObjectId;
  createdAt: Date;
  threadPreview: string;
  summary?: string;
  suggestedReply?: string;
  overallRisk: string;
  mode: string;
  hourlyRate: number;
  tabpfnHours?: number;
  estimatedTotalUsd?: number;
  serpSnippet?: string;
  scopeCreepScore?: number;
  paidProbability?: number;
};

export type AnalysisHistoryItem = StoredAnalysis & { id: string };

export async function saveAnalysis(doc: StoredAnalysis) {
  if (!mongoEnabled()) return null;
  const db = await mongoDb();
  const result = await db.collection<StoredAnalysis>("analyses").insertOne(doc);
  return String(result.insertedId);
}

export async function listAnalyses(limit = 50): Promise<AnalysisHistoryItem[]> {
  if (!mongoEnabled()) return [];
  const db = await mongoDb();
  const rows = await db
    .collection<StoredAnalysis>("analyses")
    .find()
    .sort({ createdAt: -1 })
    .limit(limit)
    .toArray();
  return rows.map((row) => ({
    ...row,
    id: String(row._id),
    createdAt: row.createdAt,
  }));
}

export async function getAnalysis(id: string): Promise<AnalysisHistoryItem | null> {
  if (!mongoEnabled()) return null;
  const { ObjectId } = await import("mongodb");
  const db = await mongoDb();
  const row = await db.collection<StoredAnalysis>("analyses").findOne({
    _id: new ObjectId(id),
  });
  if (!row) return null;
  return { ...row, id: String(row._id), createdAt: row.createdAt };
}

export async function storeSowChunksMongo(
  title: string,
  chunks: string[],
): Promise<string> {
  const db = await mongoDb();
  const result = await db.collection("sow_documents").insertOne({
    title,
    chunks,
    createdAt: new Date(),
  });
  return String(result.insertedId);
}

export function retrieveChunksLexical(chunks: string[], query: string, limit = 5) {
  const terms = query
    .toLowerCase()
    .split(/\W+/)
    .filter((t) => t.length > 3);
  const scored = chunks.map((chunk) => {
    const lower = chunk.toLowerCase();
    const score = terms.reduce((s, t) => s + (lower.includes(t) ? 1 : 0), 0);
    return { chunk, score };
  });
  return scored
    .sort((a, b) => b.score - a.score)
    .filter((row) => row.score > 0)
    .slice(0, limit)
    .map((row) => row.chunk);
}
