import { approximateCandidates, classes, ingredients, properties } from "./rxnorm";
import { perDoseMg } from "./strength";
import type { NormalizedMed } from "./types";
import type { BottleRecord } from "./schemas";

/**
 * Bottle text -> RxNorm identity. Entirely deterministic: no model runs here.
 */
export async function normalizeOne(
  rec: BottleRecord,
  id: string,
): Promise<NormalizedMed> {
  // The strength printed on the bottle disambiguates combination products
  // ("Norco" alone is ambiguous; "Norco 5-325" is not).
  const query = [rec.drug_text, rec.strength].filter(Boolean).join(" ").trim();

  const base: NormalizedMed = {
    id,
    input_text: rec.drug_text ?? "(unreadable)",
    strength: rec.strength,
    sig: rec.sig,
    confidence: rec.confidence,
    rxcui: null,
    canonical_name: null,
    tty: null,
    match_score: null,
    ingredients: [],
    classes: [],
    per_dose_mg: {},
    unresolved: true,
  };
  if (!query) return base;

  const candidates = await approximateCandidates(query);

  // Walk candidates until one resolves to real ingredients. approximateTerm
  // ranks retired concepts highly (see approximateCandidates), and a concept
  // with no ingredient set is useless to every downstream check.
  for (const cand of candidates) {
    const [props, ings] = await Promise.all([
      properties(cand.rxcui),
      ingredients(cand.rxcui),
    ]);
    if (!props || ings.length === 0) continue;

    const cls = await classes(cand.rxcui);
    return {
      ...base,
      rxcui: cand.rxcui,
      canonical_name: props.name,
      tty: props.tty,
      match_score: cand.score,
      ingredients: ings,
      classes: cls,
      per_dose_mg: perDoseMg(props.name, ings),
      unresolved: false,
    };
  }

  return base;
}

export async function normalizeAll(recs: BottleRecord[]): Promise<NormalizedMed[]> {
  return Promise.all(recs.map((r, i) => normalizeOne(r, `med-${i}`)));
}
