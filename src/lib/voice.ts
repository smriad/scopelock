import { traced } from "./trace";

const API = "https://api.elevenlabs.io/v1";

export function voiceEnabled() {
  return Boolean(process.env.ELEVENLABS_API_KEY);
}

export async function synthesizeReplyMp3(text: string): Promise<Buffer | null> {
  const key = process.env.ELEVENLABS_API_KEY;
  if (!key || !text.trim()) return null;

  const voiceId = process.env.ELEVENLABS_VOICE_ID ?? "21m00Tcm4TlvDq8ikWAM";
  const response = await traced(
    "elevenlabs.text_to_speech",
    { "elevenlabs.characters": text.length },
    () =>
      fetch(`${API}/text-to-speech/${voiceId}`, {
        method: "POST",
        headers: {
          "xi-api-key": key,
          "Content-Type": "application/json",
          Accept: "audio/mpeg",
        },
        body: JSON.stringify({
          text: text.slice(0, 1200),
          model_id: "eleven_multilingual_v2",
        }),
      }),
  );

  if (!response.ok) return null;
  return Buffer.from(await response.arrayBuffer());
}

export async function transcribeAudio(
  audio: Buffer,
  filename = "memo.webm",
): Promise<string | null> {
  const key = process.env.ELEVENLABS_API_KEY;
  if (!key || audio.length === 0) return null;

  const form = new FormData();
  form.set("model_id", "scribe_v1");
  form.set("file", new Blob([new Uint8Array(audio)]), filename);

  const response = await traced(
    "elevenlabs.speech_to_text",
    { "elevenlabs.bytes": audio.length },
    () =>
      fetch(`${API}/speech-to-text`, {
        method: "POST",
        headers: { "xi-api-key": key },
        body: form,
      }),
  );

  if (!response.ok) return null;
  const payload = (await response.json()) as { text?: string };
  return payload.text?.trim() || null;
}
