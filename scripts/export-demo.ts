import { loadEnvLocal } from "./loadenv";
import "../lib/cache.node";

loadEnvLocal();

import { createHash } from "crypto";
import { existsSync, mkdirSync, copyFileSync, writeFileSync, rmSync } from "fs";
import path from "path";
import { DEMO_NOTES } from "../lib/demoNotes";

/**
 * Prebuild the demo for the static site: run each demo note through the real
 * pipeline on the dev server, save the parse and the card per language, and
 * copy each slide's cached ElevenLabs clip next to it. Slides with no clip get
 * the browser voice on the static site, exactly as in the full app.
 *
 * Requires the dev server on :3000.
 */
const BASE = process.env.BASE_URL ?? "http://localhost:3000";
const LANGS = ["English", "Spanish"];
const VOICE = process.env.ELEVENLABS_VOICE_ID ?? "EXAVITQu4vr4xnSDxMaL";
const MODEL = process.env.ELEVENLABS_MODEL ?? "eleven_multilingual_v2";
const OUT = path.join(process.cwd(), "public", "demo");
const AUDIO = path.join(OUT, "audio");

const clipHash = (text: string) =>
  createHash("sha256").update(`${VOICE}|${MODEL}|${text.slice(0, 1500)}`).digest("hex").slice(0, 32);

(async () => {
  rmSync(OUT, { recursive: true, force: true });
  mkdirSync(AUDIO, { recursive: true });

  const notes = [];
  let clips = 0, missing = 0;
  for (const d of DEMO_NOTES) {
    const fd = new FormData();
    fd.append("text", d.note);
    const parse = await fetch(`${BASE}/api/parse-note`, { method: "POST", body: fd }).then((r) => r.json());

    const cards: Record<string, unknown> = {};
    for (const language of LANGS) {
      const { card } = await fetch(`${BASE}/api/explain`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          conditionId: parse.conditionId,
          medNames: parse.medications,
          instructions: [...(parse.instructions ?? []), ...(parse.followUp ?? [])],
          howtoIds: parse.howtoIds ?? [],
          language,
        }),
      }).then((r) => r.json());

      for (const slide of card.slides) {
        const h = clipHash(slide.spoken);
        const src = path.join(process.cwd(), ".cache", "tts", `${h}.mp3`);
        if (existsSync(src)) {
          copyFileSync(src, path.join(AUDIO, `${h}.mp3`));
          slide.audio = `demo/audio/${h}.mp3`;
          clips++;
        } else {
          missing++;
        }
      }
      cards[language] = card;
    }
    notes.push({ id: d.id, title: d.title, note: d.note, parse, cards });
    console.log(`  ${d.title}: ${Object.values(cards).map((c) => (c as { slides: unknown[] }).slides.length).join("/")} slides`);
  }

  writeFileSync(path.join(OUT, "index.json"), JSON.stringify({ notes, languages: LANGS }));
  console.log(`\n  public/demo: ${notes.length} notes, ${clips} clips copied, ${missing} slides without audio\n`);
})();
