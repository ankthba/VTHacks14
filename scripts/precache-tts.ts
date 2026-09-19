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

(async () => {
  console.log("\n===== pre-generating demo audio =====\n");

  // The explain tool's demo: the note goes in, the card comes out, it is read.
  const parsed = await fetch(`${BASE}/api/parse-note`, {
    method: "POST",
    body: (() => { const f = new FormData(); f.append("text", DEMO_NOTE); return f; })(),
  }).then((r) => r.json());

  const card = await fetch(`${BASE}/api/explain`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      conditionId: parsed.conditionId,
      medNames: parsed.medications,
      instructions: [...(parsed.instructions ?? []), ...(parsed.followUp ?? [])],
      language: "English",
    }),
  }).then((r) => r.json());
  await tts("explain: wrist fracture card", card.card.spoken);

  // The original medication checker, in case it is shown too.
  const dup = await fetch(`${BASE}/api/analyze`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ demo: "duplicate" }),
  }).then((r) => r.json());
  for (const c of dup.cards ?? []) await tts(`pillpile: ${c.name}`, c.spoken);

  console.log("\nReplays of these are now free and offline. Commit .cache/tts.\n");
})();
