import { normalizeAll, normalizeOne } from "./normalize";
import { deterministicFindings, sortFindings } from "./analyze";
import { labelInteractions } from "./interactions";
import { prescribingBrief } from "./prescribing";
import { displayName } from "./display";
import type { BottleRecord } from "./schemas";

/**
 * The prescriber check, as a function: used by the API route on the server
 * and directly by the page on the published site, where there is no server.
 */
export async function checkPrescription(body: { candidate: string; candidateStrength?: string | null; current: BottleRecord[] }) {
  const candidate = await normalizeOne(
    { drug_text: body.candidate, strength: body.candidateStrength ?? null, sig: null, quantity: null, prescriber: null, fill_date: null, confidence: 1 },
    "candidate",
  );
  if (candidate.unresolved) {
    return {
      status: "unresolved" as const,
      message: `"${body.candidate}" could not be matched to a drug record, so nothing below would be trustworthy. Check the spelling or try the generic name.`,
    };
  }
  const current = await normalizeAll(body.current);
  const all = [...current, candidate];
  const involves = (ids: string[]) => ids.includes(candidate.id);
  const computed = deterministicFindings(all).filter((f) => involves(f.med_ids));
  const retrieved = (await labelInteractions(all, "clinician")).filter((f) => involves(f.med_ids));
  const covered = new Set(
    computed.filter((f) => f.kind === "duplicate_ingredient" || f.kind === "duplicate_class").map((f) => [...f.med_ids].sort().join("|")),
  );
  const findings = sortFindings([...computed, ...retrieved.filter((f) => !covered.has([...f.med_ids].sort().join("|")))]);
  const brief = await prescribingBrief(candidate);
  return {
    status: "ok" as const,
    candidate: { id: candidate.id, name: displayName(candidate), canonical: candidate.canonical_name, rxcui: candidate.rxcui, ingredients: candidate.ingredients },
    current: current.map((m) => ({ id: m.id, name: displayName(m), canonical: m.canonical_name, unresolved: !!m.unresolved })),
    findings,
    brief,
  };
}
