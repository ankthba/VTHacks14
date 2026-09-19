import { displayName } from "./display";
import { RXNAV_UI } from "./rxnorm";
import type { Finding, NormalizedMed, ReconcileRow } from "./types";

/**
 * Medication reconciliation proper: comparing two lists.
 *
 * Everything else in this app analyses ONE list - the bottles on the table.
 * That is useful, but it is not what "reconciliation" means clinically.
 * Reconciliation is comparing what a patient was discharged on against what
 * they actually have, and the dominant error class in that comparison is not
 * duplication at all. It is OMISSION: a drug on the discharge list that never
 * made it into the patient's hands, so nobody notices it is missing.
 *
 * Matching is deterministic - two products are the same medicine when their
 * RxNorm ingredient sets are equal. That is what lets us tell "the discharge
 * summary says Norco, the bottle says hydrocodone/APAP" (same drug, matched)
 * apart from "the discharge summary says metoprolol and there is no bottle"
 * (omission).
 */

/** Ingredient-set identity. Two products with equal sets are the same medicine. */
function ingredientKey(m: NormalizedMed): string | null {
  if (m.ingredients.length === 0) return null;
  return m.ingredients
    .map((i) => i.rxcui)
    .sort()
    .join("+");
}

/** Fallback for anything RxNorm could not resolve. */
function textKey(m: NormalizedMed): string {
  return (m.input_text ?? "")
    .toLowerCase()
    .replace(/[^a-z0-9 ]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .split(" ")[0];
}

function keyOf(m: NormalizedMed): string {
  return ingredientKey(m) ?? `text:${textKey(m)}`;
}

/** Total mg per dose across all ingredients, for comparing strengths. */
function doseSignature(m: NormalizedMed): string | null {
  const entries = Object.entries(m.per_dose_mg);
  if (entries.length === 0) return null;
  return entries
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => `${k}:${v}`)
    .join(",");
}

export interface Reconciliation {
  rows: ReconcileRow[];
  findings: Finding[];
}

export function reconcile(
  discharge: NormalizedMed[],
  bottles: NormalizedMed[],
): Reconciliation {
  const rows: ReconcileRow[] = [];
  const findings: Finding[] = [];

  const bottleByKey = new Map<string, NormalizedMed>();
  for (const b of bottles) {
    const k = keyOf(b);
    if (!bottleByKey.has(k)) bottleByKey.set(k, b);
  }
  const usedBottles = new Set<string>();

  for (const d of discharge) {
    const k = keyOf(d);
    const match = bottleByKey.get(k);

    if (!match) {
      rows.push({
        status: "omission",
        discharge: d,
        bottle: null,
        note: "On the discharge list, but no bottle for it.",
      });
      findings.push({
        id: `omission-${d.id}`,
        kind: "omission",
        severity: "high",
        computed: true,
        med_ids: [d.id],
        headline: `No bottle for ${displayName(d)}`,
        detail:
          `${displayName(d)} is on the discharge paperwork, but there is no ` +
          `matching bottle in the photos. A medicine that never made it home is ` +
          `the most common problem found when hospital lists are checked against ` +
          `what patients actually have. Ask whether this was stopped on purpose, ` +
          `or whether the prescription still needs to be filled.`,
        citations: d.rxcui ? [{ label: `RxNorm ${d.rxcui}`, url: RXNAV_UI(d.rxcui) }] : [],
      });
      continue;
    }

    usedBottles.add(k);

    const dSig = doseSignature(d);
    const bSig = doseSignature(match);
    if (dSig && bSig && dSig !== bSig) {
      rows.push({
        status: "dose_mismatch",
        discharge: d,
        bottle: match,
        note: "Same medicine, different strength.",
      });
      findings.push({
        id: `dose-mismatch-${d.id}-${match.id}`,
        kind: "dose_mismatch",
        severity: "high",
        computed: true,
        med_ids: [d.id, match.id],
        headline: `${displayName(d)}: the paperwork and the bottle do not agree`,
        detail:
          `The discharge list says ${d.canonical_name ?? displayName(d)}. ` +
          `The bottle says ${match.canonical_name ?? displayName(match)}. ` +
          `These are the same medicine at different strengths. Ask which one is ` +
          `current before taking either.`,
        citations: match.rxcui
          ? [{ label: `RxNorm ${match.rxcui}`, url: RXNAV_UI(match.rxcui) }]
          : [],
      });
      continue;
    }

    rows.push({
      status: "matched",
      discharge: d,
      bottle: match,
      note: "On the list and in the pile.",
    });
  }

  for (const b of bottles) {
    const k = keyOf(b);
    if (usedBottles.has(k)) continue;
    rows.push({
      status: "extra",
      discharge: null,
      bottle: b,
      note: "In the pile, but not on the discharge list.",
    });
    findings.push({
      id: `unreconciled-${b.id}`,
      kind: "unreconciled",
      severity: "moderate",
      computed: true,
      med_ids: [b.id],
      headline: `${displayName(b)} is not on the discharge list`,
      detail:
        `There is a bottle of ${displayName(b)}, but it does not appear on the ` +
        `discharge paperwork. It may be something taken long-term that the list ` +
        `left out, or it may be left over from before and no longer meant to be ` +
        `taken. Ask which.`,
      citations: b.rxcui ? [{ label: `RxNorm ${b.rxcui}`, url: RXNAV_UI(b.rxcui) }] : [],
    });
  }

  const order = { omission: 0, dose_mismatch: 1, extra: 2, matched: 3 } as const;
  rows.sort((a, b) => order[a.status] - order[b.status]);

  return { rows, findings };
}
