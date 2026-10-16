import { NextResponse } from "next/server";
import { dbReady } from "@/lib/db";
import { chatModel, ollamaReachable } from "@/lib/ollama";
import { mongoReady } from "@/lib/mongo";

export async function GET() {
  const [ollama, database, mongo] = await Promise.all([
    ollamaReachable(),
    dbReady(),
    mongoReady(),
  ]);
  return NextResponse.json({
    ok: true,
    ollama,
    database,
    mongo,
    chatModel: chatModel(),
    demoMode: process.env.DEMO_MODE === "true",
    appUrl: process.env.NEXT_PUBLIC_APP_URL ?? null,
  });
}
