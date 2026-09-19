import { NextRequest, NextResponse } from "next/server";
import { createHash } from "crypto";
import { promises as fs } from "fs";
import path from "path";

export const runtime = "nodejs";
export const maxDuration = 60;

/**
 * Sarah - "mature, reassuring, confident". A premade voice, which matters: the
 * free tier rejects library voices with a 402, and the previous default
 * (Rachel) had been moved to the library. Multilingual v2 so the same voice
 * reads the Spanish and Vietnamese cards.
 */
const DEFAULT_VOICE = process.env.ELEVENLABS_VOICE_ID ?? "EXAVITQu4vr4xnSDxMaL";
const MODEL = process.env.ELEVENLABS_MODEL ?? "eleven_multilingual_v2";

/** A full patient card is ~400 characters. The free tier is 10,000 total. */
const MAX_CHARS = 1500;

const CACHE_DIR = path.join(process.cwd(), ".cache", "tts");

/**
 * ElevenLabs text-to-speech, cached to disk by text hash.
 *
 * Returns 503 when no key is set and 502 when ElevenLabs refuses, and the
 * client falls back to the browser's own synthesis in both cases - read-aloud
 * is the accessibility feature, so it must never be the thing that breaks.
 *
 * The cache is not an optimisation. The demo replays the same three cards all
 * day against a 10,000-character budget, and every replay from cache costs
 * nothing and works with the wifi down.
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
  text = text.slice(0, MAX_CHARS);

  const hash = createHash("sha256").update(`${DEFAULT_VOICE}|${MODEL}|${text}`).digest("hex").slice(0, 32);
  const file = path.join(CACHE_DIR, `${hash}.mp3`);

  try {
    const cached = await fs.readFile(file);
    return new NextResponse(cached, {
      headers: { "content-type": "audio/mpeg", "cache-control": "no-store", "x-tts-cache": "hit" },
    });
  } catch {
    // Miss - fall through to the API.
  }

  const call = () =>
    fetch(`https://api.elevenlabs.io/v1/text-to-speech/${DEFAULT_VOICE}`, {
      method: "POST",
      headers: { "xi-api-key": key, "content-type": "application/json", accept: "audio/mpeg" },
      body: JSON.stringify({
        text,
        model_id: MODEL,
        voice_settings: { stability: 0.55, similarity_boost: 0.75 },
      }),
    });
  let res = await call();
  // 429 is the free tier's concurrency cap, not a real failure. One retry.
  if (res.status === 429) {
    await new Promise((r) => setTimeout(r, 1200));
    res = await call();
  }

  if (!res.ok) {
    return NextResponse.json(
      { error: `ElevenLabs ${res.status}`, detail: await res.text(), fallback: "browser" },
      { status: 502 },
    );
  }

  const audio = Buffer.from(await res.arrayBuffer());
  try {
    await fs.mkdir(CACHE_DIR, { recursive: true });
    await fs.writeFile(file, audio);
  } catch {
    // Read-only filesystem is fine; we just don't cache.
  }

  return new NextResponse(audio, {
    headers: { "content-type": "audio/mpeg", "cache-control": "no-store", "x-tts-cache": "miss" },
  });
}
