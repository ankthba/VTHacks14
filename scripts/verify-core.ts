import { loadEnvLocal } from "./loadenv";

loadEnvLocal();

import { normalizeAll } from "../lib/normalize";
import { deterministicFindings, buildSchedule, sortFindings } from "../lib/analyze";
import type { BottleRecord } from "../lib/schemas";

const r = (drug_text: string, strength: string | null, sig: string): BottleRecord => ({
  drug_text, strength, sig, quantity: null, prescriber: null, fill_date: null, confidence: 0.9,
});

const scenarios: Record<string, BottleRecord[]> = {
  "1. HIDDEN DUPLICATE (Norco + Tylenol)": [
    r("Norco", "5-325 mg", "Take 1 tablet by mouth every 6 hours as needed for pain"),
    r("Tylenol Extra Strength", "500 mg", "Take 2 tablets by mouth every 6 hours as needed"),
  ],
  "2. SAME-CLASS STACKING (Lisinopril + Losartan)": [
    r("Lisinopril", "10 mg", "Take 1 tablet by mouth once daily"),
    r("Losartan potassium", "50 mg", "Take 1 tablet by mouth once daily"),
  ],
  "3. NSAID NOISE TEST (Ibuprofen + Naproxen)": [
    r("Ibuprofen", "600 mg", "Take 1 tablet by mouth three times daily"),
    r("Naproxen", "500 mg", "Take 1 tablet by mouth twice daily"),
  ],
  "4. NEGATIVE CONTROL (Lisinopril + Metformin)": [
    r("Lisinopril", "10 mg", "Take 1 tablet by mouth once daily"),
    r("Metformin", "500 mg", "Take 1 tablet by mouth twice daily"),
  ],
};

(async () => {
  for (const [name, recs] of Object.entries(scenarios)) {
    console.log("\n=== " + name + " ===");
    const meds = await normalizeAll(recs);
    for (const m of meds) {
      console.log(`  ${m.input_text} -> ${m.canonical_name ?? "UNRESOLVED"}`);
      console.log(`     ingredients: [${m.ingredients.map((i) => `${i.name}#${i.rxcui}`).join(", ")}]  perDose: ${JSON.stringify(m.per_dose_mg)}`);
    }
    const findings = sortFindings(deterministicFindings(meds));
    if (!findings.length) console.log("  FINDINGS: (none)");
    for (const f of findings) {
      console.log(`  [${f.severity.toUpperCase()}] ${f.kind}: ${f.headline}`);
      if (f.kind === "cumulative_dose") console.log(f.detail.split("\n").map(l=>"        "+l).join("\n"));
    }
    console.log("  schedule slots:", buildSchedule(meds).map(s=>`${s.slot}:${s.med_name.split(" ")[0]}`).join(" | "));
  }
})();
