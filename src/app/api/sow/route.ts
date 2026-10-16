import { NextResponse } from "next/server";
import { indexSowMongo } from "@/lib/analyze";
import { storeSow, dbReady } from "@/lib/db";
import { mongoEnabled, mongoReady } from "@/lib/mongo";

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as { title?: string; content?: string };
    const title = body.title?.trim() || "Statement of Work";
    const content = body.content?.trim();
    if (!content) {
      return NextResponse.json(
        { error: "SOW content is required." },
        { status: 400 },
      );
    }

    if (await dbReady()) {
      const stored = await storeSow(title, content);
      return NextResponse.json(stored);
    }

    if (mongoEnabled() && (await mongoReady())) {
      const stored = await indexSowMongo(title, content);
      return NextResponse.json(stored);
    }

    return NextResponse.json(
      {
        error:
          "Set TIGER_DATABASE_URL or MONGODB_URI to index SOW chunks in the cloud.",
      },
      { status: 503 },
    );
  } catch (e) {
    const message = e instanceof Error ? e.message : "Failed to store SOW.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
