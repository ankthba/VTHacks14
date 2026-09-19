import { loadEnvLocal } from "./loadenv";
import "../lib/cache.node";

loadEnvLocal();

import { parseDeterministic } from "../lib/parseNote";
import { chooseCondition } from "../lib/anatomy/conditions";
import { plainSig } from "../lib/plainPurpose";
import { detectHowTos } from "../lib/howto";
import { DEMO_NOTES } from "../lib/demoNotes";

/**
 * Pass/fail regression for the explain pipeline, no server needed for the
 * parsing half. Each case says what a real note of that shape must yield -
 * the condition, the medicines with readable directions, and which lines must
 * NOT become medicines. That last list is the point: a symptom line turned
 * into a drug is the failure this tool must never ship.
 */
interface Case {
  name: string;
  note: string;
  condition: string;
  meds: string[];
  notMeds?: string[];
  howtos?: string[];
  minInstructions?: number;
}

const CASES: Case[] = [
  {
    name: "prose H&P",
    note: `72 yo F presents after mechanical fall onto outstretched left hand. XR shows nondisplaced distal radius fracture. Placed in volar splint. Started on ibuprofen 600mg TID with food and acetaminophen 500mg q6h prn pain. Continue home lisinopril 10mg daily. Pt to keep splint dry, elevate, ice. RTC ortho 2 wks for repeat films. Return precautions given for numbness/discoloration.`,
    condition: "distal-radius-fracture",
    meds: ["ibuprofen", "acetaminophen", "lisinopril"],
    howtos: ["splint-care", "ice-and-elevate"],
    minInstructions: 2,
  },
  {
    name: "EHR export with ICD-10",
    note: `PATIENT SUMMARY
DIAGNOSES
  - S52.502A Unspecified fracture of the lower end of right radius
  - I10 Essential hypertension
MEDICATIONS (ACTIVE)
  Ibuprofen 600 MG tablet | 1 tablet | Oral | 3 times daily | 7 days
  acetaminophen 500 MG tablet | 1-2 tablets | Oral | every 6 hours as needed
  lisinopril 10 MG tablet | 1 tablet | Oral | daily
PATIENT INSTRUCTIONS
  Keep the splint clean and dry.
FOLLOW UP
  Orthopedic Surgery in 2 weeks`,
    condition: "distal-radius-fracture",
    meds: ["Ibuprofen", "acetaminophen", "lisinopril"],
    minInstructions: 1,
  },
  {
    name: "cardiac discharge",
    note: `Discharge Summary
Principal Dx: NSTEMI s/p DES to LAD
Secondary: HTN, HLD, T2DM
Meds at discharge:
• Aspirin 81 mg daily
• Ticagrelor 90 mg BID x 12 months
• Atorvastatin 80 mg nightly
• Metoprolol succinate 25 mg daily
Activity: no heavy lifting > 10 lbs for 1 week.
F/u: Cardiology 1-2 weeks. Call 911 for chest pain.`,
    condition: "myocardial-infarction",
    meds: ["Aspirin", "Ticagrelor", "Atorvastatin", "Metoprolol succinate"],
    minInstructions: 1,
  },
  {
    name: "terse ED",
    note: `Dx: ankle sprain, lateral, grade 2
Rx: naproxen 500 mg bid prn pain
RICE. Weight bear as tolerated in brace. F/u PCP 1 wk if not improving.`,
    condition: "ankle-sprain",
    meds: ["naproxen"],
    notMeds: ["RICE"],
    howtos: ["ice-and-elevate"],
  },
  {
    name: "junk under Medications",
    note: `Clinic note
Dx: migraine without aura
Medications:
Headache (QOD)
Sumatriptan 50 mg at onset, may repeat once after 2 hours
Caffeine - limit
Instructions: keep a headache diary
F/u: neurology 6 weeks`,
    condition: "migraine",
    meds: ["Sumatriptan"],
    notMeds: ["Headache (QOD)", "Caffeine - limit"],
  },
  ...DEMO_NOTES.map((d) => ({
    name: `demo: ${d.title}`,
    note: d.note,
    condition: d.id === "wrist" ? "distal-radius-fracture" : "wisdom-tooth-extraction",
    meds: d.id === "wrist" ? ["Ibuprofen", "Acetaminophen"] : ["ibuprofen"],
    howtos: d.id === "wrist" ? ["splint-care", "ice-and-elevate"] : ["socket-irrigation", "ice-and-elevate"],
    minInstructions: 2,
  })),
];

let failures = 0;
for (const c of CASES) {
  const r = parseDeterministic(c.note);
  const cond = chooseCondition(r.diagnoses)?.condition.id ?? null;
  const names = r.medications.map((m) => m.name.toLowerCase());
  const problems: string[] = [];

  if (cond !== c.condition) problems.push(`condition ${cond} (wanted ${c.condition})`);
  for (const m of c.meds) if (!names.includes(m.toLowerCase())) problems.push(`missing med ${m}`);
  for (const n of c.notMeds ?? []) {
    if (names.some((x) => x.includes(n.toLowerCase()))) problems.push(`"${n}" became a medication`);
  }
  for (const m of r.medications) {
    const sig = plainSig(m.sig);
    if (/not readable|pharmacist/i.test(sig.text)) problems.push(`${m.name}: "${sig.text}"`);
  }
  const howtos = detectHowTos([...r.instructions, ...r.followUp, c.note]);
  for (const h of c.howtos ?? []) if (!howtos.includes(h)) problems.push(`how-to ${h} not attached`);
  const instr = r.instructions.length + r.followUp.length;
  if (c.minInstructions && instr < c.minInstructions) problems.push(`only ${instr} instruction(s)`);

  if (problems.length) {
    failures++;
    console.log(`  FAIL  ${c.name}`);
    for (const p of problems) console.log(`          - ${p}`);
  } else {
    console.log(`  ok    ${c.name.padEnd(34)} ${cond}  meds=${r.medications.length}  instr=${instr}  howtos=${howtos.length}`);
  }
}
console.log(`\n  ${CASES.length - failures}/${CASES.length} note formats parse correctly${failures ? "" : "  - no failures"}\n`);
process.exitCode = failures ? 1 : 0;
