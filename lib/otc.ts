import { cachedGet } from "./cache";
import { ingredients as rxIngredients, classes, ownConceptRxcuis } from "./rxnorm";
import type { Ingredient } from "./types";

/**
 * Resolving an over-the-counter product you are about to buy.
 *
 * This needs a different approach from a prescription bottle, because an OTC
 * BRAND NAME IS NOT A PRODUCT. Measured: "NyQuil" matches at least four
 * different formulations - NyQuil Severe, NyQuil for People with Diabetes and
 * NyQuil-D all contain acetaminophen, while NyQuil Kids Allergy does not.
 *
 * Going through RxNorm's fuzzy match picks one silently, and it picks wrong in
 * the dangerous direction: "DayQuil" resolves to "DayQuil Cough"
 * (dextromethorphan only), hiding the acetaminophen in actual DayQuil, and
 * "Advil PM" resolves to plain "Advil", dropping the diphenhydramine.
 *
 * So we enumerate the distinct formulations from openFDA and make the user say
 * which box they are holding. Being asked one question is a far better outcome
 * than being told "you're fine" about a product we guessed at.
 */

const BASE = "https://api.fda.gov/drug/label.json";

function withKey(url: string) {
  const key = process.env.OPENFDA_API_KEY;
  return key ? `${url}&api_key=${key}` : url;
}

export interface OTCVariant {
  /** Stable id for the client to send back. */
  id: string;
  brand: string;
  rxcui: string | null;
  ingredients: Ingredient[];
  /** Active ingredients as printed by the manufacturer, for display. */
  substanceNames: string[];
  purpose: string | null;
}

interface LabelHit {
  purpose?: string[];
  openfda?: {
    brand_name?: string[];
    substance_name?: string[];
    rxcui?: string[];
  };
}

/**
 * Distinct formulations sold under a brand name, newest-first as openFDA
 * returns them, de-duplicated by active-ingredient set.
 */
export async function findOTCVariants(query: string): Promise<OTCVariant[]> {
  const clean = query.trim();
  if (!clean) return [];

  const attempts = [
    `openfda.brand_name:"${clean}"`,
    `openfda.brand_name:${clean.split(/\s+/).join("+AND+")}`,
    `openfda.generic_name:"${clean}"`,
  ];

  let hits: LabelHit[] = [];
  for (const q of attempts) {
    const data = await cachedGet<{ results?: LabelHit[] }>(
      withKey(`${BASE}?search=${encodeURIComponent(q)}&limit=25`),
    );
    if (data?.results?.length) {
      hits = data.results;
      break;
    }
  }
  if (hits.length === 0) return [];

  // One entry per distinct active-ingredient set.
  const byIngredients = new Map<string, LabelHit>();
  for (const h of hits) {
    const subs = (h.openfda?.substance_name ?? [])
      .map((s) => s.toUpperCase().trim())
      .filter(Boolean)
      .sort();
    if (subs.length === 0) continue;
    const key = subs.join("|");
    if (!byIngredients.has(key)) byIngredients.set(key, h);
  }

  const variants: OTCVariant[] = [];
  for (const [key, hit] of byIngredients) {
    const rxcuis = hit.openfda?.rxcui ?? [];

    // Resolve ingredient RxCUIs so the checks compare identifiers, not strings.
    let resolved: Ingredient[] = [];
    let usedRxcui: string | null = null;
    for (const rx of rxcuis.slice(0, 4)) {
      const ings = await rxIngredients(rx);
      if (ings.length > 0) {
        resolved = ings;
        usedRxcui = rx;
        break;
      }
    }

    variants.push({
      id: key,
      brand: hit.openfda?.brand_name?.[0] ?? clean,
      rxcui: usedRxcui,
      ingredients: resolved,
      substanceNames: key.split("|"),
      purpose: hit.purpose?.[0]?.slice(0, 120) ?? null,
    });
  }

  // Formulations we could not map to ingredient identifiers are useless to the
  // checks, and showing them would imply they were checked.
  return variants.filter((v) => v.ingredients.length > 0).slice(0, 8);
}

/** Classes for a resolved variant, using the same provenance filter as elsewhere. */
export async function variantClasses(v: OTCVariant) {
  if (!v.rxcui) return [];
  return classes(v.rxcui, await ownConceptRxcuis(v.rxcui));
}
