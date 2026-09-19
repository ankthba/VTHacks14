/**
 * Scores the deterministic checks against eval/cases.ts.
 *
 * Only the model-free checks are scored, because they are the ones making a
 * falsifiable claim. Interaction findings are counted but not scored - their
 * correctness depends on what a given FDA label happens to say, which is not
 * something we can hold a fixed ground truth over.
 */
import { CASES, type Expect } from "../eval/cases";
import { normalizeAll } from "../lib/normalize";
import { deterministicFindings } from "../lib/analyze";
import type { Finding } from "../lib/types";

function observed(findings: Finding[]): Expect {
  if (findings.some((f) => f.kind === "duplicate_ingredient")) return "ingredient";
  if (findings.some((f) => f.kind === "duplicate_class")) return "class";
  return "none";
}

interface Row {
  id: string;
  expect: Expect;
  got: Expect;
  ok: boolean;
  headline: string;
  why: string;
  unresolved: string[];
}

(async () => {
  const rows: Row[] = [];

  for (const cse of CASES) {
    const meds = await normalizeAll([
      { drug_text: cse.a.text, strength: cse.a.strength ?? null, sig: cse.a.sig ?? null, quantity: null, prescriber: null, fill_date: null, confidence: 1 },
      { drug_text: cse.b.text, strength: cse.b.strength ?? null, sig: cse.b.sig ?? null, quantity: null, prescriber: null, fill_date: null, confidence: 1 },
    ]);
    const findings = deterministicFindings(meds);
    const got = observed(findings);
    rows.push({
      id: cse.id,
      expect: cse.expect,
      got,
      ok: got === cse.expect,
      headline: findings.find((f) => f.kind !== "cumulative_dose")?.headline ?? "(nothing)",
      why: cse.why,
      unresolved: meds.filter((m) => m.unresolved).map((m) => m.input_text),
    });
  }

  // Per-class precision and recall, treating each label as a one-vs-rest task.
  const labels: Expect[] = ["ingredient", "class", "none"];
  console.log("\n================ PillPile deterministic check evaluation ================\n");

  const failures = rows.filter((r) => !r.ok);
  for (const label of labels) {
    const tp = rows.filter((r) => r.expect === label && r.got === label).length;
    const fp = rows.filter((r) => r.expect !== label && r.got === label).length;
    const fn = rows.filter((r) => r.expect === label && r.got !== label).length;
    const prec = tp + fp === 0 ? 1 : tp / (tp + fp);
    const rec = tp + fn === 0 ? 1 : tp / (tp + fn);
    const f1 = prec + rec === 0 ? 0 : (2 * prec * rec) / (prec + rec);
    console.log(
      `  ${label.padEnd(11)} n=${String(rows.filter((r) => r.expect === label).length).padStart(2)}  ` +
        `precision ${(prec * 100).toFixed(1).padStart(5)}%  recall ${(rec * 100).toFixed(1).padStart(5)}%  F1 ${(f1 * 100).toFixed(1).padStart(5)}%`,
    );
  }

  const acc = ((rows.length - failures.length) / rows.length) * 100;
  console.log(`\n  overall  ${rows.length - failures.length}/${rows.length} correct  (${acc.toFixed(1)}%)`);

  const unresolved = rows.flatMap((r) => r.unresolved);
  if (unresolved.length) {
    console.log(`\n  UNRESOLVED DRUGS (excluded from every check): ${[...new Set(unresolved)].join(", ")}`);
  }

  if (failures.length) {
    console.log(`\n---- ${failures.length} failure(s) ----\n`);
    for (const f of failures) {
      console.log(`  ${f.id}  expected ${f.expect}, got ${f.got}`);
      console.log(`     ${f.why}`);
      console.log(`     system said: ${f.headline}\n`);
    }
  } else {
    console.log("\n  No failures.\n");
  }

  process.exitCode = failures.length > 0 ? 1 : 0;
})();
