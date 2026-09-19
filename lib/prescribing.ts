import { cachedGet } from "./cache";
import { fetchLabel, dailyMedUrl, type LabelDoc } from "./openfda";
import { displayName } from "./display";
import type { NormalizedMed } from "./types";

/**
 * The prescriber-facing brief: what you need to know in the ten seconds before
 * you commit to a drug for this particular patient.
 *
 * Same discipline as the patient side. Nothing here is written by a model -
 * every section is lifted verbatim from the FDA label with a link back to it,
 * and the interaction and duplicate checks are the same deterministic engine.
 * A clinician can dismiss a generated summary; they cannot dismiss the label.
 */

export interface LabelSection {
  heading: string;
  text: string;
}

export interface AccessSignal {
  /** Abbreviated New Drug Application - a marketed generic. */
  genericCount: number;
  /** New Drug Application - brand. */
  brandCount: number;
  authorizedGenericCount: number;
  verdict: "widely generic" | "generic available" | "brand only" | "unknown";
  note: string;
}

export interface PrescribingBrief {
  boxedWarning: string | null;
  contraindications: string | null;
  dosing: string | null;
  dosageForms: string | null;
  populations: LabelSection[];
  access: AccessSignal;
  labelUrl: string | null;
  labelFound: boolean;
}

/**
 * "Use in Specific Populations" arrives as one flattened block containing the
 * numbered subsections. Renal and hepatic impairment are the two a prescriber
 * actually stops for, so we split them back out rather than dumping 7 KB.
 */
const POPULATION_HEADINGS = [
  "Renal Impairment",
  "Hepatic Impairment",
  "Geriatric Use",
  "Pediatric Use",
  "Pregnancy",
  "Lactation",
  "Females and Males of Reproductive Potential",
];

export function splitPopulations(raw: string | undefined): LabelSection[] {
  if (!raw) return [];
  const text = raw.replace(/\s+/g, " ").trim();

  const found: { heading: string; index: number }[] = [];
  for (const h of POPULATION_HEADINGS) {
    // Labels open with a summary that names every heading before the numbered
    // sections begin ("Pregnancy: Not recommended (8.1) Lactation: ..."), so
    // matching the first bare occurrence lands in the summary and every
    // subsequent boundary is wrong - Hepatic Impairment ends up showing
    // Pregnancy text. Prefer the NUMBERED occurrence, which is the real section.
    const numbered = text.match(new RegExp(`\\d+\\.\\d+\\s+${h}\\b`, "i"));
    const bare = text.match(new RegExp(`\\b${h}\\b`, "i"));
    const m = numbered ?? bare;
    if (m?.index !== undefined) found.push({ heading: h, index: m.index });
  }
  found.sort((a, b) => a.index - b.index);

  const out: LabelSection[] = [];
  for (let i = 0; i < found.length; i++) {
    const start = found[i].index;
    const end = i + 1 < found.length ? found[i + 1].index : text.length;
    const body = text.slice(start, end).trim();
    // Skip a summary line that only repeats the heading with a cross-reference.
    if (body.length < 60) continue;
    out.push({ heading: found[i].heading, text: trim(body, 700) });
  }
  return out;
}

function trim(s: string, n: number) {
  return s.length > n ? `${s.slice(0, n).trimEnd()}…` : s;
}

function firstText(arr: string[] | undefined, max: number): string | null {
  const t = arr?.join(" ").replace(/\s+/g, " ").trim();
  return t ? trim(t, max) : null;
}

/**
 * Generic availability, counted from the FDA's own NDC directory.
 *
 * This is deliberately NOT presented as formulary or prior-authorisation
 * status: payer coverage is plan-specific and is not in any free dataset, and
 * inventing it would be exactly the kind of confident-but-wrong output this
 * project refuses elsewhere. Marketed-generic count is a real, citable proxy
 * for how hard a drug is to actually get filled.
 */
export async function accessSignal(ingredientName: string): Promise<AccessSignal> {
  const url = `https://api.fda.gov/drug/ndc.json?search=generic_name:%22${encodeURIComponent(
    ingredientName,
  )}%22&count=marketing_category`;
  const data = await cachedGet<{ results?: { term: string; count: number }[] }>(url);

  const counts = new Map<string, number>();
  for (const r of data?.results ?? []) counts.set(r.term.toUpperCase(), r.count);

  const genericCount = counts.get("ANDA") ?? 0;
  const brandCount = counts.get("NDA") ?? 0;
  const authorizedGenericCount = counts.get("NDA AUTHORIZED GENERIC") ?? 0;

  if (genericCount === 0 && brandCount === 0) {
    return {
      genericCount,
      brandCount,
      authorizedGenericCount,
      verdict: "unknown",
      note: "No marketing records found, so availability could not be assessed.",
    };
  }

  const totalGeneric = genericCount + authorizedGenericCount;

  // Deliberately conservative wording. An NDC listing is a REGISTERED product,
  // not proof that it is marketed, stocked or cheap - rivaroxaban shows 33
  // generic listings while still being a costly brand-dominant drug in
  // practice. Claiming "usually inexpensive" off this number is the kind of
  // confidently wrong statement a clinician spots in one second, so the note
  // reports the count and names its own limit instead of inferring price.
  let verdict: AccessSignal["verdict"] = "brand only";
  if (totalGeneric >= 100) verdict = "widely generic";
  else if (totalGeneric > 0) verdict = "generic available";

  const note =
    verdict === "widely generic"
      ? `${totalGeneric} generic products registered against ${brandCount} brand. Long-established generic.`
      : verdict === "generic available"
        ? `${totalGeneric} generic product(s) registered against ${brandCount} brand. Registration does not mean a generic is actually marketed or low cost.`
        : `No generic registered — ${brandCount} brand product(s) only. Prior authorisation is more likely.`;

  return { genericCount, brandCount, authorizedGenericCount, verdict, note };
}

export async function prescribingBrief(med: NormalizedMed): Promise<PrescribingBrief> {
  const label: LabelDoc | null = await fetchLabel(med, { requireInteractions: true });

  const ingredient = med.ingredients[0]?.name ?? displayName(med);
  const access = await accessSignal(ingredient);

  return {
    boxedWarning: firstText(label?.boxed_warning, 1200),
    contraindications: firstText(label?.contraindications, 900),
    dosing: firstText(label?.dosage_and_administration, 1200),
    dosageForms: firstText(
      (label as { dosage_forms_and_strengths?: string[] })?.dosage_forms_and_strengths,
      400,
    ),
    populations: splitPopulations(
      (label as { use_in_specific_populations?: string[] })?.use_in_specific_populations?.join(" "),
    ),
    access,
    labelUrl: dailyMedUrl(label),
    labelFound: !!label,
  };
}
