import { bestClassMatch } from "./classgroups";
import { displayName } from "./display";
import { RXNAV_UI } from "./rxnorm";
import { parseSigQuantities } from "./strength";
import type { Finding, NormalizedMed, ScheduleSlot, Severity } from "./types";

/** RxCUI of the ingredient "acetaminophen". Stable identifier, not a string match. */
export const ACETAMINOPHEN_IN = "161";

/**
 * The OTC label ceiling is 3,000 mg/day; prescription labeling and the FDA's
 * combination-product limit put the hard ceiling at 4,000 mg/day. We warn at
 * the lower number and escalate at the higher one.
 */
const APAP_OTC_CEILING_MG = 3000;
const APAP_MAX_CEILING_MG = 4000;

const DAILY_MAX_CITATION = {
  label: "FDA: Acetaminophen Information",
  url: "https://www.fda.gov/drugs/information-drug-class/acetaminophen-information",
};

/**
 * Checks (a) and (b) are pure set arithmetic over RxNorm identifiers. No model
 * is involved, so they cannot hallucinate a finding or miss one for stylistic
 * reasons. This is the part of the app we are willing to put on a poster.
 */
export function deterministicFindings(meds: NormalizedMed[]): Finding[] {
  const findings: Finding[] = [];
  const resolved = meds.filter((m) => m.rxcui && m.ingredients.length > 0);

  for (let i = 0; i < resolved.length; i++) {
    for (let j = i + 1; j < resolved.length; j++) {
      const a = resolved[i];
      const b = resolved[j];

      // (a) Duplicate ingredient: intersect ingredient RxCUI sets.
      const bIds = new Set(b.ingredients.map((x) => x.rxcui));
      const shared = a.ingredients.filter((x) => bIds.has(x.rxcui));

      if (shared.length > 0) {
        const names = shared.map((s) => s.name).join(", ");
        findings.push({
          id: `dupe-ing-${a.id}-${b.id}`,
          kind: "duplicate_ingredient",
          severity: "high",
          computed: true,
          med_ids: [a.id, b.id],
          headline: `Both contain ${names}`,
          detail:
            `${displayName(a)} and ${displayName(b)} ` +
            `share the active ingredient ${names}. Taking both means taking ${names} twice, ` +
            `which is easy to miss because the labels use different names.`,
          citations: [
            { label: `RxNorm ${a.rxcui}`, url: RXNAV_UI(a.rxcui!) },
            { label: `RxNorm ${b.rxcui}`, url: RXNAV_UI(b.rxcui!) },
          ],
        });
        // A shared ingredient already says "same drug twice"; adding a
        // same-class finding for the same pair would just be noise.
        continue;
      }

      // (b) Duplicate class.
      const match = bestClassMatch(a.classes, b.classes);
      if (match) {
        findings.push({
          id: `dupe-class-${a.id}-${b.id}`,
          kind: "duplicate_class",
          severity: "moderate",
          computed: true,
          med_ids: [a.id, b.id],
          headline: `Both are ${match.label}`,
          detail:
            `${displayName(a)} and ${displayName(b)} ` +
            `work in the same way. ${match.why ?? ""} Sometimes two are intended - this is ` +
            `worth confirming, not stopping.`.trim(),
          citations: [
            { label: `RxClass ${match.classId}`, url: `https://mor.nlm.nih.gov/RxClass/search?query=${encodeURIComponent(match.classId.split("+")[0])}` },
          ],
        });
      }
    }
  }

  const apap = acetaminophenTotal(meds);
  if (apap) findings.push(apap);

  return findings;
}

/**
 * Sums acetaminophen across every product that contains it and compares the
 * total against the ceiling stated on the labels themselves.
 *
 * This is the demo's strongest moment and it is arithmetic: mg per tablet comes
 * from RxNorm's canonical name, tablets per day from the sig.
 */
function acetaminophenTotal(meds: NormalizedMed[]): Finding | null {
  const carriers = meds.filter(
    (m) => m.per_dose_mg[ACETAMINOPHEN_IN] !== undefined,
  );
  if (carriers.length < 2) return null;

  let total = 0;
  let allKnown = true;
  const lines: string[] = [];

  for (const m of carriers) {
    const mgPerUnit = m.per_dose_mg[ACETAMINOPHEN_IN];
    const { unitsPerDose, dosesPerDay, asNeeded } = parseSigQuantities(m.sig);
    if (dosesPerDay === null) {
      allKnown = false;
      lines.push(
        `${displayName(m)}: ${mgPerUnit} mg per tablet (how often it is taken was not readable)`,
      );
      continue;
    }
    const perDay = mgPerUnit * unitsPerDose * dosesPerDay;
    total += perDay;
    lines.push(
      `${displayName(m)}: ${mgPerUnit} mg x ${unitsPerDose} tablet(s) x ${dosesPerDay}/day = ${perDay} mg/day` +
        (asNeeded ? " (if taken at the maximum)" : ""),
    );
  }

  let severity: Severity = "moderate";
  let headline = `Acetaminophen adds up across ${carriers.length} medicines`;
  if (total >= APAP_MAX_CEILING_MG) {
    severity = "high";
    headline = `Acetaminophen could reach ${total} mg a day - at or above the ${APAP_MAX_CEILING_MG} mg limit`;
  } else if (total >= APAP_OTC_CEILING_MG) {
    severity = "high";
    headline = `Acetaminophen could reach ${total} mg a day - above the ${APAP_OTC_CEILING_MG} mg over-the-counter limit`;
  }

  return {
    id: "apap-total",
    kind: "cumulative_dose",
    severity,
    computed: true,
    med_ids: carriers.map((m) => m.id),
    headline,
    detail:
      `More than one of these medicines contains acetaminophen (also written as APAP).\n` +
      lines.map((l) => `  - ${l}`).join("\n") +
      `\n  Total if all are taken as written: ${total} mg per day` +
      (allKnown ? "" : " (plus the medicines above whose schedule could not be read)") +
      `.\nToo much acetaminophen can injure the liver.`,
    citations: [DAILY_MAX_CITATION],
  };
}

const SLOT_ORDER: ScheduleSlot["slot"][] = [
  "morning",
  "midday",
  "evening",
  "bedtime",
  "as needed",
];

/** Turns sigs into a morning/midday/evening/bedtime grid. */
export function buildSchedule(meds: NormalizedMed[]): ScheduleSlot[] {
  const out: ScheduleSlot[] = [];
  for (const m of meds) {
    const name = displayName(m);
    const sig = m.sig ?? "";
    const { dosesPerDay, asNeeded } = parseSigQuantities(sig);
    const s = sig.toLowerCase();

    const slots = new Set<ScheduleSlot["slot"]>();
    if (asNeeded) slots.add("as needed");
    if (/bedtime|nightly|at night|qhs/.test(s)) slots.add("bedtime");

    if (slots.size === 0 && dosesPerDay !== null) {
      if (dosesPerDay >= 4) {
        slots.add("morning");
        slots.add("midday");
        slots.add("evening");
        slots.add("bedtime");
      } else if (dosesPerDay === 3) {
        slots.add("morning");
        slots.add("midday");
        slots.add("evening");
      } else if (dosesPerDay === 2) {
        slots.add("morning");
        slots.add("evening");
      } else {
        slots.add("morning");
      }
    }
    if (slots.size === 0) slots.add("as needed");

    for (const slot of slots) {
      out.push({ slot, med_id: m.id, med_name: name, instruction: sig || "Schedule not readable" });
    }
  }
  return out.sort(
    (a, b) => SLOT_ORDER.indexOf(a.slot) - SLOT_ORDER.indexOf(b.slot),
  );
}

export const SEVERITY_RANK: Record<Severity, number> = {
  high: 0,
  moderate: 1,
  low: 2,
};

export function sortFindings(f: Finding[]): Finding[] {
  return [...f].sort((a, b) => SEVERITY_RANK[a.severity] - SEVERITY_RANK[b.severity]);
}
