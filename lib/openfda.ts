import { cachedGet } from "./cache";
import type { NormalizedMed } from "./types";

const BASE = "https://api.fda.gov/drug/label.json";

function withKey(url: string) {
  const key = process.env.OPENFDA_API_KEY;
  return key ? `${url}&api_key=${key}` : url;
}

export interface LabelDoc {
  drug_interactions?: string[];
  warnings?: string[];
  boxed_warning?: string[];
  contraindications?: string[];
  indications_and_usage?: string[];
  dosage_and_administration?: string[];
  dosage_forms_and_strengths?: string[];
  use_in_specific_populations?: string[];
  warnings_and_cautions?: string[];
  openfda?: {
    rxcui?: string[];
    generic_name?: string[];
    brand_name?: string[];
    pharm_class_epc?: string[];
    spl_set_id?: string[];
  };
}

/**
 * Label lookup with a fallback chain and result scoring.
 *
 * Taking the first hit (`limit=1`) is wrong in two ways we measured:
 *  - Searching "ibuprofen" returns an OTC monograph label with NO
 *    drug_interactions section at all, while the prescription label has 3.7 KB
 *    of it. `_exists_:drug_interactions` forces the useful one.
 *  - Searching "lisinopril" returns LISINOPRIL AND HYDROCHLOROTHIAZIDE, a
 *    different product, because the combination's generic_name contains ours.
 *    So we score candidates and prefer a label whose ingredient list matches.
 */
export async function fetchLabel(
  med: NormalizedMed,
  opts: { requireInteractions?: boolean } = {},
): Promise<LabelDoc | null> {
  const terms: string[] = [];
  if (med.rxcui) terms.push(`openfda.rxcui:"${med.rxcui}"`);
  for (const ing of med.ingredients) {
    terms.push(`openfda.generic_name:"${ing.name}"`);
  }
  for (const ing of med.ingredients) {
    terms.push(`openfda.generic_name:${ing.name.split(" ")[0]}`);
  }
  if (med.ingredients[0]) {
    terms.push(`openfda.substance_name:"${med.ingredients[0].name}"`);
  }

  const suffix = opts.requireInteractions ? "+AND+_exists_:drug_interactions" : "";

  for (const t of terms) {
    const url = withKey(
      `${BASE}?search=${encodeURIComponent(t)}${suffix}&limit=5`,
    );
    const data = await cachedGet<{ results?: LabelDoc[] }>(url);
    const results = data?.results ?? [];
    if (results.length === 0) continue;
    const best = pickBest(results, med, opts.requireInteractions ?? false);
    if (best) return best;
  }

  // Nothing matched with the interactions requirement - fall back to any label
  // so the one-pager can still show what the drug is for.
  if (opts.requireInteractions) return fetchLabel(med, {});
  return null;
}

const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9 ]/g, " ").replace(/\s+/g, " ").trim();

function pickBest(
  results: LabelDoc[],
  med: NormalizedMed,
  requireInteractions: boolean,
): LabelDoc | null {
  const mine = med.ingredients.map((i) => norm(i.name.split(" ")[0]));

  let best: LabelDoc | null = null;
  let bestScore = -Infinity;

  for (const r of results) {
    const di = r.drug_interactions?.join(" ") ?? "";
    if (requireInteractions && !di) continue;

    let score = 0;
    const generic = norm((r.openfda?.generic_name ?? []).join(" "));
    // Count ingredients named on the label that are not in our product; a
    // combination label scores worse than the single-ingredient one.
    const labelParts = generic.split(/\s+and\s+|\s*,\s*/).filter(Boolean);
    const extras = labelParts.filter(
      (part) => !mine.some((m) => part.includes(m)),
    ).length;
    score -= extras * 3;
    if (mine.every((m) => generic.includes(m))) score += 2;
    if (di) score += Math.min(di.length / 2000, 3);

    if (score > bestScore) {
      bestScore = score;
      best = r;
    }
  }
  return best;
}

/** The interactions section, trimmed to something a model can read reliably. */
export function interactionsText(label: LabelDoc | null, max = 14_000): string | null {
  const t = label?.drug_interactions?.join("\n\n").trim();
  if (!t) return null;
  return t.length > max ? t.slice(0, max) : t;
}

export function labelUrl(label: LabelDoc | null): string | null {
  const id = label?.openfda?.spl_set_id?.[0];
  return id ? `https://labels.fda.gov/getSPLxml.cfm?setid=${id}` : null;
}

export function dailyMedUrl(label: LabelDoc | null): string | null {
  const id = label?.openfda?.spl_set_id?.[0];
  return id
    ? `https://dailymed.nlm.nih.gov/dailymed/drugInfo.cfm?setid=${id}`
    : null;
}

export function firstSentence(arr: string[] | undefined, max = 240): string | null {
  const t = arr?.join(" ").replace(/\s+/g, " ").trim();
  if (!t) return null;
  const cut = t.slice(0, max);
  const stop = cut.lastIndexOf(". ");
  return stop > 60 ? cut.slice(0, stop + 1) : cut;
}
