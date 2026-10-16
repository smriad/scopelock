import { NextResponse } from "next/server";
import { transcribeAudio, voiceEnabled } from "@/lib/voice";

export async function POST(req: Request) {
  if (!voiceEnabled()) {
    return NextResponse.json(
      { error: "ElevenLabs is not configured." },
      { status: 503 },
    );
  }

  const form = await req.formData();
  const file = form.get("file");
  if (!(file instanceof Blob)) {
    return NextResponse.json({ error: "Audio file required." }, { status: 400 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const text = await transcribeAudio(
    buffer,
    file instanceof File ? file.name : "memo.webm",
  );
  if (!text) {
    return NextResponse.json(
      { error: "Could not transcribe audio." },
      { status: 502 },
    );
  }

  return NextResponse.json({ text });
}
