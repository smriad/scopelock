import { NextResponse } from "next/server";
import { analyzeScope } from "@/lib/analyze";

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as {
      thread?: string;
      sowInline?: string;
      documentId?: string;
      mongoDocumentId?: string;
      hourlyRate?: number;
    };

    const thread = body.thread?.trim();
    if (!thread) {
      return NextResponse.json(
        { error: "Client thread is required." },
        { status: 400 },
      );
    }

    const hourlyRate =
      typeof body.hourlyRate === "number" && body.hourlyRate > 0
        ? body.hourlyRate
        : 125;

    let mongoChunks: string[] | undefined;
    if (body.mongoDocumentId) {
      const { ObjectId } = await import("mongodb");
      const { mongoDb, mongoEnabled } = await import("@/lib/mongo");
      if (mongoEnabled()) {
        const doc = await (
          await mongoDb()
        )
          .collection("sow_documents")
          .findOne({ _id: new ObjectId(body.mongoDocumentId) });
        if (doc && Array.isArray(doc.chunks)) {
          mongoChunks = doc.chunks as string[];
        }
      }
    }

    const { result, meta } = await analyzeScope({
      thread,
      sowInline: body.sowInline,
      documentId: body.documentId,
      mongoDocumentId: body.mongoDocumentId,
      mongoChunks,
      hourlyRate,
    });

    return NextResponse.json({ result, ...meta });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Analysis failed.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
