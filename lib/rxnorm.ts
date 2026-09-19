import { cachedGet, isNotFound } from "./cache";
import type { DrugClass, Ingredient } from "./types";

const BASE = "https://rxnav.nlm.nih.gov/REST";

/**
 * NOTE: https://rxnav.nlm.nih.gov/REST/interaction/* was retired 2024-01-02 and
 * now returns HTTP 404. There is deliberately no interaction call in this file;
 * interactions come from retrieved FDA label text instead. See lib/openfda.ts.
 */

interface ApproxCandidate {
  rxcui?: string;
  score?: string;
  rank?: string;
  name?: string;
  source?: string;
}

/**
 * Fuzzy label text -> RxCUI.
 *
 * Candidates sourced from GS/MMSL vocabularies come back with no `name` field,
 * so we never read `.name` here - we resolve the canonical name separately via
 * /properties. Candidates without an rxcui are skipped entirely.
 */
/**
 * Fuzzy label text -> ordered list of candidate RxCUIs.
 *
 * Returns a LIST rather than a single best hit because approximateTerm indexes
 * retired concepts. "Metformin 500 mg" scores rxcui 316256 highest, but that
 * concept is obsolete: /properties returns {} and /related returns empty
 * groups for it. Callers walk the list until one candidate actually resolves.
 */
export async function approximateCandidates(
  term: string,
  minScore = 5,
): Promise<{ rxcui: string; score: number }[]> {
  const clean = term.trim();
  if (!clean) return [];
  const url = `${BASE}/approximateTerm.json?term=${encodeURIComponent(clean)}&maxEntries=8`;
  const data = await cachedGet<{
    approximateGroup?: { candidate?: ApproxCandidate[] };
  }>(url);
  if (!data || isNotFound(data)) return [];

  const out: { rxcui: string; score: number }[] = [];
  const seen = new Set<string>();
  for (const c of data.approximateGroup?.candidate ?? []) {
    // Candidates from GS/MMSL carry no `name` field at all, so we never read
    // it here - the canonical name comes from /properties instead.
    if (!c.rxcui || seen.has(c.rxcui)) continue;
    const score = Number(c.score ?? 0);
    if (!Number.isFinite(score) || score < minScore) continue;
    seen.add(c.rxcui);
    out.push({ rxcui: c.rxcui, score });
  }
  return out;
}

export async function properties(
  rxcui: string,
): Promise<{ name: string; tty: string } | null> {
  const data = await cachedGet<{
    properties?: { name?: string; tty?: string };
  }>(`${BASE}/rxcui/${rxcui}/properties.json`);
  const p = data && !isNotFound(data) ? data.properties : null;
  if (!p?.name) return null;
  return { name: p.name, tty: p.tty ?? "" };
}

/**
 * The key object of the whole app: the set of active ingredients.
 * Duplicate-ingredient detection is an intersection over these RxCUIs.
 *
 * We request IN (ingredient), PIN (precise ingredient, e.g. a salt form) and
 * MIN (multi-ingredient). Only IN is used for set comparison - PIN would make
 * "hydrocodone" and "hydrocodone bitartrate" look like different drugs, and MIN
 * is a composite that would double-count.
 */
export async function ingredients(rxcui: string): Promise<Ingredient[]> {
  const data = await cachedGet<{
    relatedGroup?: {
      conceptGroup?: {
        tty?: string;
        conceptProperties?: { rxcui: string; name: string }[];
      }[];
    };
  }>(`${BASE}/rxcui/${rxcui}/related.json?tty=IN+PIN+MIN`);
  if (!data || isNotFound(data)) return [];

  const out: Ingredient[] = [];
  for (const g of data.relatedGroup?.conceptGroup ?? []) {
    if (g.tty !== "IN") continue;
    for (const p of g.conceptProperties ?? []) {
      out.push({ rxcui: p.rxcui, name: p.name });
    }
  }
  return dedupeBy(out, (i) => i.rxcui);
}

/**
 * The ingredient-level concepts this drug actually is: its own RxCUI plus its
 * IN and PIN ingredients.
 *
 * Deliberately EXCLUDES MIN. `related.json?tty=MIN` returns every
 * multi-ingredient concept that *contains* this ingredient, so amlodipine's MIN
 * list includes "aliskiren / amlodipine" - which would re-admit exactly the
 * inherited class mappings we are trying to reject.
 */
export async function ownConceptRxcuis(rxcui: string): Promise<Set<string>> {
  const data = await cachedGet<{
    relatedGroup?: {
      conceptGroup?: { tty?: string; conceptProperties?: { rxcui: string }[] }[];
    };
  }>(`${BASE}/rxcui/${rxcui}/related.json?tty=IN+PIN+MIN`);

  const out = new Set<string>([rxcui]);
  for (const g of data && !isNotFound(data) ? (data.relatedGroup?.conceptGroup ?? []) : []) {
    if (g.tty !== "IN" && g.tty !== "PIN") continue;
    for (const p of g.conceptProperties ?? []) out.add(p.rxcui);
  }
  return out;
}

/**
 * Drug classes, filtered by provenance.
 *
 * Calling byRxcui with no relaSource returns every class system at once
 * (ATC1-4, EPC, MOA...), which is one request instead of three. Each record
 * also carries a `minConcept` saying WHICH concept the mapping came from, and
 * that field is what makes the result trustworthy:
 *
 *   amlodipine -> C08CA  from minConcept 17767   "amlodipine"            <- real
 *   amlodipine -> C09XA  from minConcept 1009219 "aliskiren / amlodipine" <- inherited
 *
 * Without this filter amlodipine looks like a renin inhibitor and gets flagged
 * as duplicate therapy against lisinopril, which is a combination millions of
 * people take on purpose. Our eval set caught exactly that (eval/cases.ts,
 * neg-01 and neg-03).
 *
 * A genuine combination product still gets the classes of each of its own
 * ingredients, which is what the duplicate-class check needs.
 */
export async function classes(
  rxcui: string,
  allowed?: Set<string>,
): Promise<DrugClass[]> {
  const data = await cachedGet<{
    rxclassDrugInfoList?: {
      rxclassDrugInfo?: {
        minConcept?: { rxcui?: string };
        rxclassMinConceptItem?: {
          classId?: string;
          className?: string;
          classType?: string;
        };
      }[];
    };
  }>(`${BASE}/rxclass/class/byRxcui.json?rxcui=${rxcui}`);
  if (!data || isNotFound(data)) return [];

  const out: DrugClass[] = [];
  for (const info of data.rxclassDrugInfoList?.rxclassDrugInfo ?? []) {
    const m = info.rxclassMinConceptItem;
    if (!m?.classId || !m.className || !m.classType) continue;
    const from = info.minConcept?.rxcui;
    if (allowed && from && !allowed.has(from)) continue;
    out.push({
      classId: m.classId,
      className: m.className,
      classType: m.classType,
    });
  }
  return dedupeBy(out, (c) => `${c.classType}:${c.classId}`);
}

function dedupeBy<T>(arr: T[], key: (t: T) => string): T[] {
  const seen = new Set<string>();
  return arr.filter((x) => {
    const k = key(x);
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
}

export const RXNAV_UI = (rxcui: string) =>
  `https://mor.nlm.nih.gov/RxNav/search?searchBy=RXCUI&searchTerm=${rxcui}`;

/**
 * Resolution fallback for withdrawn products.
 *
 * A brand that has been discontinued is retired from RxNorm: `approximateTerm`
 * still ranks its RxCUI first (it indexes historical names), but /properties
 * and /related both come back empty, so the drug silently vanished from every
 * check. Vicodin is the case that exposed this - every candidate for "Vicodin
 * 5-300 mg" is obsolete, so the app said nothing at all about a bottle of
 * hydrocodone/acetaminophen.
 *
 * That is precisely the user this project is for: the old bottle at the back of
 * the medicine cabinet. `historystatus` keeps the full definition of a retired
 * concept - name, ingredient RxCUIs, per-ingredient strengths, and a pointer to
 * the current generic equivalent - so nothing is actually lost.
 */
export interface HistoricalConcept {
  name: string;
  tty: string;
  status: string;
  ingredients: Ingredient[];
  perDoseMg: Record<string, number>;
  /** Current generic equivalent, used for class lookup. */
  scdRxcui: string | null;
}

export async function historyStatus(
  rxcui: string,
): Promise<HistoricalConcept | null> {
  const data = await cachedGet<{
    rxcuiStatusHistory?: {
      metaData?: { status?: string };
      attributes?: { name?: string; tty?: string };
      definitionalFeatures?: {
        ingredientAndStrength?: {
          moietyRxcui?: string;
          moietyName?: string;
          baseRxcui?: string;
          baseName?: string;
          numeratorValue?: string;
          numeratorUnit?: string;
        }[];
      };
      derivedConcepts?: {
        ingredientConcept?: { ingredientRxcui?: string; ingredientName?: string }[];
        scdConcept?: { scdConceptRxcui?: string };
      };
    };
  }>(`${BASE}/rxcui/${rxcui}/historystatus.json`);

  const h = data && !isNotFound(data) ? data.rxcuiStatusHistory : null;
  const name = h?.attributes?.name;
  if (!h || !name) return null;

  const ingredients: Ingredient[] = [];
  for (const i of h.derivedConcepts?.ingredientConcept ?? []) {
    if (i.ingredientRxcui && i.ingredientName) {
      ingredients.push({ rxcui: i.ingredientRxcui, name: i.ingredientName });
    }
  }
  if (ingredients.length === 0) return null;

  // Strengths come straight from the record, so there is no name parsing here.
  const perDoseMg: Record<string, number> = {};
  for (const s of h.definitionalFeatures?.ingredientAndStrength ?? []) {
    const id = s.moietyRxcui ?? s.baseRxcui;
    const qty = Number(s.numeratorValue);
    if (!id || !Number.isFinite(qty)) continue;
    const unit = (s.numeratorUnit ?? "").toUpperCase();
    const factor = unit === "MG" ? 1 : unit === "G" ? 1000 : unit === "MCG" ? 0.001 : null;
    if (factor === null) continue;
    perDoseMg[id] = qty * factor;
  }

  return {
    name,
    tty: h.attributes?.tty ?? "",
    status: h.metaData?.status ?? "unknown",
    ingredients: dedupeBy(ingredients, (i) => i.rxcui),
    perDoseMg,
    scdRxcui: h.derivedConcepts?.scdConcept?.scdConceptRxcui ?? null,
  };
}
