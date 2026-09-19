import { deterministicFindings } from "./analyze";
import { labelInteractions } from "./interactions";
import { displayName } from "./display";
import { variantClasses, type OTCVariant } from "./otc";
import type { Finding, NormalizedMed } from "./types";

/**
 * "Can I take this?" - the question people actually have, at the moment they
 * have it: standing in the aisle holding a box, already on a list of other
 * things.
 *
 * Runs the same deterministic checks as the main pipeline, but reports only
 * what the CANDIDATE adds. The acetaminophen ceiling matters most here: the
 * classic injury is someone on Norco buying a cold medicine that also contains
 * acetaminophen, and nothing on either box says so.
 */

export type Verdict = "stop" | "caution" | "clear";

export interface AdditionResult {
  verdict: Verdict;
  headline: string;
  candidate: NormalizedMed;
  findings: Finding[];
}

export function variantToMed(v: OTCVariant, classes: NormalizedMed["classes"]): NormalizedMed {
  return {
    id: "candidate",
    input_text: v.brand,
    strength: null,
    sig: "Take as directed on the package",
    confidence: 1,
    rxcui: v.rxcui,
    canonical_name: v.brand,
    tty: "OTC",
    match_score: null,
    ingredients: v.ingredients,
    classes,
    // Per-dose mg is not reliably parseable from an OTC brand name, so the
    // cumulative-dose check will report what it can and say what it cannot.
    per_dose_mg: {},
    unresolved: false,
  };
}

export async function checkAddition(
  current: NormalizedMed[],
  variant: OTCVariant,
  opts: { includeInteractions?: boolean } = {},
): Promise<AdditionResult> {
  const candidate = variantToMed(variant, await variantClasses(variant));
  const all = [...current, candidate];

  const involvesCandidate = (f: Finding) => f.med_ids.includes(candidate.id);

  const computed = deterministicFindings(all).filter(involvesCandidate);
  let retrieved: Finding[] = [];
  if (opts.includeInteractions !== false) {
    retrieved = (await labelInteractions(all)).filter(involvesCandidate);
  }

  // A pair already flagged as sharing an ingredient does not also need "the
  // label mentions it" - same issue, stated twice.
  const covered = new Set(
    computed
      .filter((f) => f.kind === "duplicate_ingredient" || f.kind === "duplicate_class")
      .map((f) => [...f.med_ids].sort().join("|")),
  );
  const findings = [
    ...computed,
    ...retrieved.filter((f) => !covered.has([...f.med_ids].sort().join("|"))),
  ];

  const name = displayName(candidate);
  const hasHigh = findings.some((f) => f.severity === "high");
  const shared = findings.find((f) => f.kind === "duplicate_ingredient");

  let verdict: Verdict = "clear";
  let headline = `Nothing we check flagged ${name}`;

  if (hasHigh) {
    verdict = "stop";
    headline = shared
      ? `${name} contains something you are already taking`
      : `Ask before taking ${name}`;
  } else if (findings.length > 0) {
    verdict = "caution";
    headline = `Worth asking about ${name} first`;
  }

  return { verdict, headline, candidate, findings };
}
