import { loadEnvLocal } from "./loadenv";

loadEnvLocal();

/**
 * Pre-generate the read-aloud audio for the demo cards.
 *
 * The free ElevenLabs tier is 10,000 characters for the whole weekend. Every
 * card the demo will actually read is generated once here, lands in
 * .cache/tts (committed), and every replay on stage is then a disk read -
 * zero characters, and it works with the wifi down. The route checks the
 * cache before the API, so re-running this costs nothing.
 *
 * Requires the dev server on :3000.
 */
import { DEMO_NOTES } from "../lib/demoNotes";

const BASE = process.env.BASE_URL ?? "http://localhost:3000";


async function tts(label: string, text: string) {
  const r = await fetch(`${BASE}/api/tts`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ text }),
  });
  const status = r.headers.get("x-tts-cache") ?? (r.ok ? "?" : `HTTP ${r.status}`);
  console.log(`  ${label.padEnd(34)} ${String(text.length).padStart(4)} chars  ${status}`);
  return r.ok;
}


async function warmStory(label: string, note: string, language: string) {
  const fd = new FormData();
  fd.append("text", note);
  const parsed = await fetch(`${BASE}/api/parse-note`, { method: "POST", body: fd }).then((r) => r.json());
  const { card } = await fetch(`${BASE}/api/explain`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      conditionId: parsed.conditionId,
      medNames: parsed.medications,
      instructions: [...(parsed.instructions ?? []), ...(parsed.followUp ?? [])],
      howtoIds: parsed.howtoIds ?? [],
      language,
    }),
  }).then((r) => r.json());
  console.log(`\n${label} (${language}) - ${card.slides.length} slides`);
  let chars = 0;
  for (const sl of card.slides) {
    await tts(`  ${sl.kind}: ${sl.title.slice(0, 26)}`, sl.spoken);
    chars += sl.spoken.length;
  }
  console.log(`  total ${chars} chars`);
}

(async () => {
  console.log("\n===== pre-generating demo audio, one clip per slide =====");
  for (const lang of ["English", "Spanish"]) {
    for (const d of DEMO_NOTES) await warmStory(d.title, d.note, lang);
  }
  console.log("\nReplays are now free and offline. Commit .cache/tts and .cache/translate.\n");
})();
