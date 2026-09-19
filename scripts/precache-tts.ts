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
const BASE = process.env.BASE_URL ?? "http://localhost:3000";

const DEMO_NOTE = `DISCHARGE SUMMARY
Discharge Diagnosis: Distal radius fracture, left, nondisplaced
Discharge Medications:
1. Ibuprofen 600 mg PO TID with food x 7 days
2. Acetaminophen 500 mg 1-2 tabs PO q6h PRN pain
Discharge Instructions:
- Keep splint clean and dry
- Elevate arm above heart when possible
Follow-up:
- Orthopedics clinic in 2 weeks for repeat X-ray
- Return to ED for numbness, blue fingers, or uncontrolled pain`;

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

const WISDOM_NOTE = `Post-op instructions after wisdom tooth extraction
Dx: impacted third molars s/p extraction
Rx: ibuprofen 600 mg q6h prn pain
Instructions:
- Starting day 3, irrigate the sockets with the syringe after meals and at bedtime
- Ice 20 min on / 20 off for 48 hours
- Soft foods for one week. No straws, no smoking.
Follow-up: return in 1 week for check; call if fever or severe pain`;

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
    await warmStory("wrist fracture", DEMO_NOTE, lang);
    await warmStory("wisdom teeth", WISDOM_NOTE, lang);
  }
  console.log("\nReplays are now free and offline. Commit .cache/tts and .cache/translate.\n");
})();
