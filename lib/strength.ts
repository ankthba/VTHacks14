/**
 * Per-ingredient dose extraction.
 *
 * We deliberately do NOT parse the strength printed on the bottle ("5/325"),
 * because mapping those numbers onto ingredients requires guessing their order.
 * RxNorm's canonical name states it unambiguously:
 *
 *   "acetaminophen 325 MG / hydrocodone bitartrate 5 MG Oral Tablet [Norco]"
 *
 * so each number sits directly after the ingredient it belongs to.
 */
import type { Ingredient } from "./types";

const UNIT_TO_MG: Record<string, number> = {
  MG: 1,
  G: 1000,
  MCG: 0.001,
  UG: 0.001,
};

/** Returns ingredient-rxcui -> mg per single unit (tablet/capsule). */
export function perDoseMg(
  canonicalName: string | null,
  ings: Ingredient[],
): Record<string, number> {
  const out: Record<string, number> = {};
  if (!canonicalName || ings.length === 0) return out;

  // Strip the brand suffix so "[Norco]" can't be mistaken for a segment.
  const name = canonicalName.replace(/\[[^\]]*\]/g, "");

  for (const seg of name.split("/")) {
    const m = seg.match(/([A-Za-z][A-Za-z0-9\s,'-]*?)\s+([\d.]+)\s*(MG|MCG|UG|G)\b/i);
    if (!m) continue;
    const [, rawName, rawQty, rawUnit] = m;
    const qty = Number(rawQty);
    if (!Number.isFinite(qty)) continue;
    const factor = UNIT_TO_MG[rawUnit.toUpperCase()];
    if (factor === undefined) continue;

    const ing = matchIngredient(rawName.trim(), ings);
    if (ing) out[ing.rxcui] = qty * factor;
  }
  return out;
}

/**
 * The name in the canonical string may be a precise ingredient ("hydrocodone
 * bitartrate") while our set holds the base ingredient ("hydrocodone"), so we
 * accept a containment match in either direction.
 */
function matchIngredient(text: string, ings: Ingredient[]): Ingredient | null {
  const t = text.toLowerCase();
  let best: Ingredient | null = null;
  let bestLen = 0;
  for (const ing of ings) {
    const n = ing.name.toLowerCase();
    if (t.includes(n) || n.includes(t)) {
      if (n.length > bestLen) {
        best = ing;
        bestLen = n.length;
      }
    }
  }
  return best;
}

/** How many units per dose, and how many doses per day, from a sig string. */
export function parseSigQuantities(sig: string | null): {
  unitsPerDose: number;
  dosesPerDay: number | null;
  asNeeded: boolean;
} {
  const s = (sig ?? "").toLowerCase();
  const asNeeded = /\bprn\b|as needed/.test(s);

  let unitsPerDose = 1;
  const numWord: Record<string, number> = { one: 1, two: 2, three: 3, four: 4 };
  const takeMatch = s.match(/take\s+(\d+|one|two|three|four)/);
  if (takeMatch) {
    const v = takeMatch[1];
    unitsPerDose = numWord[v] ?? Number(v) ?? 1;
  }
  // "1-2 tablets" -> use the upper bound, which is the ceiling that matters.
  const range = s.match(/(\d+)\s*(?:-|to)\s*(\d+)\s*(?:tab|cap|pill)/);
  if (range) unitsPerDose = Number(range[2]);

  let dosesPerDay: number | null = null;
  if (/every\s*4\s*h|q4h/.test(s)) dosesPerDay = 6;
  else if (/every\s*6\s*h|q6h|four times|qid/.test(s)) dosesPerDay = 4;
  else if (/every\s*8\s*h|q8h|three times|tid/.test(s)) dosesPerDay = 3;
  else if (/every\s*12\s*h|q12h|twice|bid/.test(s)) dosesPerDay = 2;
  else if (/once daily|every\s*24\s*h|daily|qd|bedtime|nightly/.test(s)) dosesPerDay = 1;

  return { unitsPerDose, dosesPerDay, asNeeded };
}
