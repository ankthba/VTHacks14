import { SCENARIOS } from "@/lib/fixtures";
import type { BottleRecord } from "@/lib/schemas";

import { APP_NAME } from "@/lib/brand";

export const metadata = {
  title: `${APP_NAME} - printable demo labels`,
};

/**
 * Print-ready synthetic pharmacy labels for the demo bottles.
 *
 * Two jobs at once: physical props for the demo table, and real input for
 * testing the vision pipeline (print, stick on an empty bottle, photograph).
 *
 * Every label is deliberately and visibly marked synthetic. These are demo
 * props, not dispensing records - nothing here should ever be mistaken for a
 * real prescription label, and no real patient data is used anywhere.
 */
const PHARMACY = "DEMO PHARMACY #000 - NOT A REAL PHARMACY";
const PATIENT = "SAMPLE PATIENT (SYNTHETIC)";

function Label({ rec, rx }: { rec: BottleRecord; rx: number }) {
  return (
    <div
      className="label break-inside-avoid border-2 border-black p-3 bg-white"
      style={{ width: "3.5in", minHeight: "2.1in", fontFamily: "monospace" }}
    >
      <div className="flex justify-between text-[8px] font-bold border-b border-black pb-1">
        <span>{PHARMACY}</span>
        <span>Rx {1000000 + rx}</span>
      </div>

      <div className="text-[9px] mt-1">{PATIENT}</div>

      <div className="text-[15px] font-bold leading-tight mt-1 uppercase">
        {rec.drug_text}
        {rec.strength ? ` ${rec.strength}` : ""}
      </div>

      <div className="text-[11px] leading-snug mt-1 font-bold">{rec.sig}</div>

      <div className="flex justify-between text-[8px] mt-2 pt-1 border-t border-black">
        <span>Qty: {rec.quantity ?? "30"}</span>
        <span>{rec.prescriber ?? "Dr. Sample"}</span>
        <span>Filled: {rec.fill_date ?? "09/18/2026"}</span>
      </div>

      <div className="text-[7px] mt-1 leading-tight">
        SYNTHETIC DEMO LABEL - NOT A DISPENSING RECORD - NOT FOR CLINICAL USE
      </div>
    </div>
  );
}

export default function LabelsPage() {
  // Deduplicate across scenarios so each distinct bottle is printed once.
  const seen = new Set<string>();
  const bottles: BottleRecord[] = [];
  for (const s of SCENARIOS) {
    for (const b of [...s.bottles, ...(s.discharge ?? [])]) {
      const key = `${b.drug_text}|${b.strength}`;
      if (seen.has(key)) continue;
      seen.add(key);
      bottles.push(b);
    }
  }

  return (
    <main className="flex-1 w-full max-w-5xl mx-auto px-4 py-8">
      <div className="no-print mb-6">
        <h1 className="text-3xl font-black">Printable demo labels</h1>
        <p className="text-[color:var(--muted)] mt-2 max-w-2xl">
          Print these, cut them out and tape them to empty bottles. They are the
          physical props for the demo, and photographing them is how the vision
          pipeline gets tested on real input.
        </p>
        <p className="text-[15px] mt-3 max-w-2xl rounded-lg border p-3" style={{ background: "var(--moderate-bg)", borderColor: "var(--moderate)" }}>
          Every label here is synthetic and marked as such. Never photograph a
          real person&rsquo;s prescriptions for this demo.
        </p>
        <p className="mt-4 text-[15px] font-semibold">
          To print: Cmd/Ctrl + P. Choose &ldquo;Actual size&rdquo; so the labels
          stay 3.5 inches wide.
        </p>
      </div>

      <div className="flex flex-wrap gap-4">
        {bottles.map((b, i) => (
          <Label key={i} rec={b} rx={i} />
        ))}
      </div>
    </main>
  );
}
