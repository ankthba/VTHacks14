import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const maxDuration = 60;

/** Rachel - clear, unhurried, good for a read-aloud medication sheet. */
const DEFAULT_VOICE = process.env.ELEVENLABS_VOICE_ID ?? "21m00Tcm4TlvDq8ikWAM";
const MAX_CHARS = 4500;

/**
 * ElevenLabs text-to-speech. Returns 503 when no key is set so the client can
 * fall back to the browser's built-in speech synthesis - read-aloud is the
 * accessibility feature here, so it must never be the thing that breaks.
 */
export async function POST(req: NextRequest) {
  const key = process.env.ELEVENLABS_API_KEY;
  if (!key) {
    return NextResponse.json(
      { error: "ELEVENLABS_API_KEY not set", fallback: "browser" },
      { status: 503 },
    );
  }

  let text: string;
  try {
    ({ text } = await req.json());
  } catch {
    return NextResponse.json({ error: "Expected JSON body." }, { status: 400 });
  }
  if (!text?.trim()) {
    return NextResponse.json({ error: "No text supplied." }, { status: 400 });
  }

  const res = await fetch(
    `https://api.elevenlabs.io/v1/text-to-speech/${DEFAULT_VOICE}`,
    {
      method: "POST",
      headers: {
        "xi-api-key": key,
        "content-type": "application/json",
        accept: "audio/mpeg",
      },
      body: JSON.stringify({
        text: text.slice(0, MAX_CHARS),
        model_id: process.env.ELEVENLABS_MODEL ?? "eleven_multilingual_v2",
        voice_settings: { stability: 0.5, similarity_boost: 0.75 },
      }),
    },
  );

  if (!res.ok) {
    return NextResponse.json(
      { error: `ElevenLabs ${res.status}`, detail: await res.text(), fallback: "browser" },
      { status: 502 },
    );
  }

  return new NextResponse(res.body, {
    headers: { "content-type": "audio/mpeg", "cache-control": "no-store" },
  });
}
