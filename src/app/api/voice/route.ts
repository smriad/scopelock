import { NextResponse } from "next/server";
import { synthesizeReplyMp3, voiceEnabled } from "@/lib/voice";

export async function POST(req: Request) {
  if (!voiceEnabled()) {
    return NextResponse.json(
      { error: "ElevenLabs is not configured." },
      { status: 503 },
    );
  }

  const body = (await req.json()) as { text?: string };
  const text = body.text?.trim();
  if (!text) {
    return NextResponse.json({ error: "Text is required." }, { status: 400 });
  }

  const audio = await synthesizeReplyMp3(text);
  if (!audio) {
    return NextResponse.json(
      { error: "Could not synthesize audio." },
      { status: 502 },
    );
  }

  return new NextResponse(new Uint8Array(audio), {
    headers: {
      "Content-Type": "audio/mpeg",
      "Cache-Control": "private, max-age=3600",
    },
  });
}
