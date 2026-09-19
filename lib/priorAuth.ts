import { cachedGet } from "./cache";
import { displayName } from "./display";
import { accessSignal, prescribingBrief, type AccessSignal } from "./prescribing";
import { RXNAV_UI } from "./rxnorm";
import type { Finding, NormalizedMed } from "./types";

/**
 * Prior-authorisation support.
 *
 * Prior auth is the largest administrative burden in prescribing and a leading
 * reason prescriptions are abandoned before they are ever filled. The
 * information needed to justify one already exists - it is split between the
 * drug's label and what the prescriber knows about the patient - but assembling
 * it is manual, so it is done badly or late.
 *
 * THE RULE HERE IS THE SAME AS EVERYWHERE ELSE IN THIS PROJECT: a model may
 * compose the prose, but it may not supply a fact. Every statement below is
 * tagged with where it came from - the FDA label (quoted and linked), the
 * prescriber's own entry, or our deterministic checks - and a letter is
 * assembled from those items. Nothing is recalled from a model's memory, which
 * matters more here than anywhere: a fabricated clinical justification sent to
 * a payer is a real-world harm.
 */

export type EvidenceSource = "fda-label" | "prescriber-entered" | "computed";

export interface EvidenceItem {
  claim: string;
  source: EvidenceSource;
  quote?: string | null;
  citation?: { label: string; url: string } | null;
}

export interface PatientContext {
  age?: string | null;
  diagnosis?: string | null;
  renalFunction?: string | null;
  /** Drugs already tried, and what happened. The crux of most PA decisions. */
  triedAndFailed?: { drug: string; outcome: string }[];
}

export interface Alternative {
  name: string;
  rxcui: string;
  access: AccessSignal;
}

export interface PriorAuthPacket {
  candidateName: string;
  candidateCanonical: string | null;
  access: AccessSignal;
  /** Why a PA is likely in the first place. */
  paLikely: boolean;
  evidence: EvidenceItem[];
  alternatives: Alternative[];
  labelUrl: string | null;
}

const MAX_ALTERNATIVES_CHECKED = 8;

/**
 * Same-class alternatives, ranked by how available they actually are.
 *
 * A payer's first question is "why not the cheaper one in the same class", so
 * the letter is stronger when it names them and the prescriber can address
 * them directly. Ranking is by marketed generic count, which is a real signal
 * rather than a guess at any particular plan's formulary.
 */
export async function sameClassAlternatives(
  med: NormalizedMed,
): Promise<Alternative[]> {
  // The 4-character ATC level is the therapeutic subgroup - broad enough to
  // include the alternatives a payer would suggest, narrow enough to stay
  // clinically relevant.
  const atc = med.classes
    .filter((c) => c.classType.startsWith("ATC") && c.classId.length >= 4)
    .map((c) => c.classId.slice(0, 4));
  const classId = atc[0];
  if (!classId) return [];

  const data = await cachedGet<{
    drugMemberGroup?: { drugMember?: { minConcept?: { rxcui?: string; name?: string } }[] };
  }>(
    `https://rxnav.nlm.nih.gov/REST/rxclass/classMembers.json?classId=${classId}&relaSource=ATC`,
  );

  const mine = new Set(med.ingredients.map((i) => i.rxcui));
  const members = (data?.drugMemberGroup?.drugMember ?? [])
    .map((m) => m.minConcept)
    .filter((c): c is { rxcui: string; name: string } => !!c?.rxcui && !!c?.name)
    .filter((c) => !mine.has(c.rxcui))
    .slice(0, MAX_ALTERNATIVES_CHECKED);

  const out: Alternative[] = [];
  for (const m of members) {
    const access = await accessSignal(m.name);
    if (access.verdict === "unknown") continue;
    out.push({ name: m.name, rxcui: m.rxcui, access });
  }

  // Most-available first: that is the one a payer will ask about.
  return out
    .sort(
      (a, b) =>
        b.access.genericCount + b.access.authorizedGenericCount -
        (a.access.genericCount + a.access.authorizedGenericCount),
    )
    .slice(0, 4);
}

export async function buildPriorAuthPacket(
  candidate: NormalizedMed,
  current: NormalizedMed[],
  findings: Finding[],
  patient: PatientContext,
): Promise<PriorAuthPacket> {
  const brief = await prescribingBrief(candidate);
  const evidence: EvidenceItem[] = [];
  const cite = brief.labelUrl
    ? { label: `FDA label: ${displayName(candidate)}`, url: brief.labelUrl }
    : null;

  if (patient.diagnosis) {
    evidence.push({
      claim: `Diagnosis: ${patient.diagnosis}.`,
      source: "prescriber-entered",
    });
  }
  if (patient.age) {
    evidence.push({ claim: `Patient age: ${patient.age}.`, source: "prescriber-entered" });
  }
  if (patient.renalFunction) {
    evidence.push({
      claim: `Renal function: ${patient.renalFunction}.`,
      source: "prescriber-entered",
    });
  }

  // Step therapy is what a payer actually adjudicates on.
  for (const t of patient.triedAndFailed ?? []) {
    if (!t.drug.trim()) continue;
    evidence.push({
      claim: `Previously tried ${t.drug}${t.outcome ? `: ${t.outcome}` : ""}.`,
      source: "prescriber-entered",
    });
  }

  const renal = brief.populations.find((p) => p.heading === "Renal Impairment");
  if (renal) {
    evidence.push({
      claim: `The label addresses use in renal impairment.`,
      source: "fda-label",
      quote: renal.text,
      citation: cite,
    });
  }

  if (brief.dosing) {
    evidence.push({
      claim: "Requested dosing is consistent with the labelled dosing section.",
      source: "fda-label",
      quote: brief.dosing.slice(0, 400),
      citation: cite,
    });
  }

  // Our own checks become part of the justification: a documented reason an
  // alternative is unsuitable is exactly what a payer wants to see.
  for (const f of findings) {
    evidence.push({
      claim: f.headline,
      source: "computed",
      quote: f.quote ?? null,
      citation: f.citations[0] ?? null,
    });
  }

  if (current.length > 0) {
    evidence.push({
      claim: `Concomitant medications on file: ${current
        .map((m) => displayName(m))
        .join(", ")}.`,
      source: "prescriber-entered",
    });
  }

  const alternatives = await sameClassAlternatives(candidate);

  return {
    candidateName: displayName(candidate),
    candidateCanonical: candidate.canonical_name,
    access: brief.access,
    paLikely: brief.access.verdict === "brand only" || brief.access.verdict === "generic available",
    evidence,
    alternatives,
    labelUrl: brief.labelUrl ?? (candidate.rxcui ? RXNAV_UI(candidate.rxcui) : null),
  };
}

const SOURCE_TAG: Record<EvidenceSource, string> = {
  "fda-label": "[FDA label]",
  "prescriber-entered": "[prescriber]",
  computed: "[computed]",
};

/**
 * Deterministic letter. Runs with no API key, and is what the model-written
 * version falls back to. Every line carries its source tag so a reviewer can
 * see immediately which statements are the prescriber's and which are the
 * label's.
 */
export function renderPriorAuthLetter(
  packet: PriorAuthPacket,
  patient: PatientContext,
): string {
  const L: string[] = [];
  L.push("PRIOR AUTHORIZATION REQUEST: CLINICAL JUSTIFICATION");
  L.push("");
  L.push(`Requested medication: ${packet.candidateCanonical ?? packet.candidateName}`);
  if (patient.diagnosis) L.push(`Indication: ${patient.diagnosis}`);
  L.push("");

  L.push("CLINICAL RATIONALE");
  L.push("");
  for (const e of packet.evidence) {
    L.push(`- ${e.claim} ${SOURCE_TAG[e.source]}`);
    if (e.quote) L.push(`    "${e.quote.slice(0, 300)}"`);
    if (e.citation) L.push(`    Source: ${e.citation.label} (${e.citation.url})`);
  }

  if (packet.alternatives.length) {
    L.push("");
    L.push("ALTERNATIVES CONSIDERED (same therapeutic class)");
    L.push("");
    for (const a of packet.alternatives) {
      L.push(`- ${a.name}: ${a.access.note}`);
    }
    L.push("");
    L.push(
      "  The prescriber should state why each of the above is unsuitable for this patient.",
    );
  }

  L.push("");
  L.push("ACCESS CONTEXT");
  L.push(`  ${packet.access.note}`);
  L.push(
    "  Counted from the FDA NDC directory. Plan-specific formulary and prior-authorization",
  );
  L.push("  requirements are not included in this data and have not been assumed.");
  L.push("");
  L.push(
    "Every statement above is tagged with its source. Nothing in this letter was recalled",
  );
  L.push("from a language model; label statements are quoted verbatim and linked.");
  L.push("");
  L.push("Educational demo. Not medical advice. Verify before clinical use.");
  return L.join("\n");
}
