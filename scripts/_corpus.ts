import { parseDeterministic } from "../lib/parseNote";
import { matchCondition } from "../lib/anatomy/conditions";
import { plainSig } from "../lib/plainPurpose";

const NOTES: Record<string,string> = {
"prose H&P": `72 yo F presents after mechanical fall onto outstretched left hand. XR shows nondisplaced distal radius fracture. Placed in volar splint. Started on ibuprofen 600mg TID with food and acetaminophen 500mg q6h prn pain. Continue home lisinopril 10mg daily. Pt to keep splint dry, elevate, ice. RTC ortho 2 wks for repeat films. Return precautions given for numbness/discoloration.`,
"EHR export": `PATIENT SUMMARY
Encounter Date: 09/19/2026
DIAGNOSES
  - S52.502A Unspecified fracture of the lower end of right radius
  - I10 Essential hypertension
MEDICATIONS (ACTIVE)
  Ibuprofen 600 MG tablet | 1 tablet | Oral | 3 times daily | 7 days
  acetaminophen 500 MG tablet | 1-2 tablets | Oral | every 6 hours as needed
  lisinopril 10 MG tablet | 1 tablet | Oral | daily
PATIENT INSTRUCTIONS
  Keep the splint clean and dry.
  Elevate the arm above the level of the heart.
FOLLOW UP
  Orthopedic Surgery in 2 weeks`,
"cardiac": `Discharge Summary

Principal Dx: NSTEMI s/p DES to LAD
Secondary: HTN, HLD, T2DM

Meds at discharge:
• Aspirin 81 mg daily
• Ticagrelor 90 mg BID x 12 months
• Atorvastatin 80 mg nightly
• Metoprolol succinate 25 mg daily

Activity: no heavy lifting > 10 lbs for 1 week. Cardiac rehab referral placed.
F/u: Cardiology 1-2 weeks. Call 911 for chest pain.`,
"terse ED": `Dx: ankle sprain, lateral, grade 2
Rx: naproxen 500 mg bid prn pain
RICE. Weight bear as tolerated in brace. F/u PCP 1 wk if not improving.`,
};

for (const [name, note] of Object.entries(NOTES)) {
  const r = parseDeterministic(note);
  const cond = r.diagnoses.map(matchCondition).find(Boolean);
  console.log(`\n=== ${name} ===`);
  console.log(`  dx:   ${JSON.stringify(r.diagnoses)}  -> ${cond?.id ?? "NO MATCH"}`);
  console.log(`  meds: ${r.medications.length}`);
  for (const m of r.medications) {
    const s = plainSig(m.sig);
    console.log(`     ${m.name.padEnd(28)} sig=${JSON.stringify(m.sig)}  -> "${s.text}"${s.parsed?"":"  <-- UNPARSED"}`);
  }
  console.log(`  instr: ${r.instructions.length}  followUp: ${r.followUp.length}`);
}
