import { NextResponse } from "next/server";
import { listAnalyses, mongoEnabled, mongoReady } from "@/lib/mongo";

export async function GET() {
  if (!mongoEnabled()) {
    return NextResponse.json(
      { error: "MongoDB is not configured.", items: [] },
      { status: 503 },
    );
  }
  if (!(await mongoReady())) {
    return NextResponse.json(
      { error: "MongoDB is unreachable.", items: [] },
      { status: 503 },
    );
  }

  const items = await listAnalyses(50);
  return NextResponse.json({ items });
}
