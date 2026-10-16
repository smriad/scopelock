import { NextResponse } from "next/server";
import { getAnalysis, mongoEnabled, mongoReady } from "@/lib/mongo";

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const { id } = await ctx.params;
  if (!mongoEnabled() || !(await mongoReady())) {
    return NextResponse.json({ error: "MongoDB unavailable." }, { status: 503 });
  }

  const item = await getAnalysis(id);
  if (!item) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }
  return NextResponse.json({ item });
}
