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
 * Drug classes. Calling byRxcui with no relaSource returns every class system
 * at once (ATC1-4, EPC, MOA, ...), which is one request instead of three.
 */
export async function classes(rxcui: string): Promise<DrugClass[]> {
  const data = await cachedGet<{
    rxclassDrugInfoList?: {
      rxclassDrugInfo?: {
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
