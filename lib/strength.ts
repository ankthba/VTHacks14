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

/**
 * How many units per dose, and how many doses per day, from a sig string.
 *
 * Handles the forms that actually appear: pharmacy shorthand (TID, q6h, PRN,
 * qhs), spelled-out ("three times daily"), numeric ("3 times a day", "2x
 * daily"), ranges ("q4-6h", "1-2 tablets"), and EHR pipe-delimited fields
 * ("1 tablet | Oral | 3 times daily | 7 days"). Ranges resolve to the maximum,
 * which is the ceiling that matters for dose totals.
 */
export function parseSigQuantities(sig: string | null): {
  unitsPerDose: number;
  dosesPerDay: number | null;
  asNeeded: boolean;
} {
  const s = (sig ?? "").toLowerCase().replace(/\|/g, " ").replace(/\s+/g, " ");
  const asNeeded = /\bprn\b|as needed|when needed|if needed|as required/.test(s);

  const numWord: Record<string, number> = {
    one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, half: 0.5,
  };
  const num = (v: string) => numWord[v] ?? Number(v);

  let unitsPerDose = 1;
  const range = s.match(/(\d+(?:\.\d+)?)\s*(?:-|–|to)\s*(\d+(?:\.\d+)?)\s*(?:tab|cap|pill|puff|drop|unit)/);
  const single = s.match(/(?:take|use|give|apply|inhale|instill)?\s*(\d+(?:\.\d+)?|one|two|three|four|half)\s*(?:tab|cap|pill|puff|drop|unit)/);
  if (range) unitsPerDose = Number(range[2]);
  else if (single) unitsPerDose = num(single[1]);

  let dosesPerDay: number | null = null;

  // "every 4-6 hours" / "q4-6h" -> use the shortest interval (maximum doses).
  const qh = s.match(/(?:every|q)\s*(\d+)(?:\s*(?:-|–|to)\s*(\d+))?\s*(?:h\b|hr|hrs|hours?)/);
  // "3 times daily", "3x/day", "three times a day", "2 x daily"
  const nTimes = s.match(/(\d+|one|two|three|four|five|six)\s*(?:x|times)\s*(?:\/|per|a|each)?\s*(?:day|daily|d\b)/);

  if (qh) dosesPerDay = Math.max(1, Math.round(24 / Number(qh[1])));
  else if (nTimes) dosesPerDay = num(nTimes[1]);
  else if (/\bqid\b|four times/.test(s)) dosesPerDay = 4;
  else if (/\btid\b|three times/.test(s)) dosesPerDay = 3;
  else if (/\bbid\b|twice|two times/.test(s)) dosesPerDay = 2;
  else if (/\b(?:qd|qday|od)\b|once daily|once a day|every day|daily|nightly|bedtime|\bqhs\b|\bqam\b|\bqpm\b|every (?:morning|evening|night)|at night|in the morning/.test(s)) {
    dosesPerDay = 1;
  } else if (/every other day|\bqod\b/.test(s)) dosesPerDay = 0.5;
  else if (/weekly|once a week|every week/.test(s)) dosesPerDay = 1 / 7;

  return { unitsPerDose, dosesPerDay, asNeeded };
}
