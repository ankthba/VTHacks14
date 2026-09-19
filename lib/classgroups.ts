import type { DrugClass } from "./types";

/**
 * Why this file exists.
 *
 * The naive plan - "flag a duplicate class when two drugs share an ATC code" -
 * fails in both directions, and the spike test showed both failures:
 *
 * 1. FALSE NEGATIVE. Lisinopril is C09AA ("ACE inhibitors, plain"); losartan is
 *    C09CA ("ARBs, plain"). They share no ATC code at all, yet an ACE inhibitor
 *    stacked on an ARB is exactly the kind of thing worth asking about. They
 *    only meet at the 3-character level, C09. Their EPC and MOA classes differ
 *    too, so no exact-match scheme of any kind catches this pair.
 *
 * 2. FALSE POSITIVE / NOISE. RxClass maps classes at the ingredient level across
 *    every formulation that ingredient has ever had. Ibuprofen therefore carries
 *    C01EB (cardiac), G02CC (vaginal), M02AA (topical) and R02AX (throat)
 *    alongside the one that matters, M01AE. Ibuprofen and naproxen share THREE
 *    codes; intersecting raw sets would emit three findings for one real issue.
 *
 * So: curated groups first (which encode the clinically meaningful groupings at
 * whatever ATC depth they actually live), then exact matches, then a single
 * best-of pick per pair so one issue produces one finding.
 */

export interface ClassGroup {
  id: string;
  label: string;
  /** ATC prefixes that all belong to this group. */
  atcPrefixes: string[];
  /** Shown to the user as the reason this pairing is worth a question. */
  why: string;
}

/**
 * Curated groups. Each one is a case where two drugs with DIFFERENT specific
 * classes still do the same job. Kept deliberately small and auditable.
 */
export const CURATED_GROUPS: ClassGroup[] = [
  {
    id: "ras",
    label: "blood-pressure medicines acting on the same system",
    atcPrefixes: ["C09"],
    why: "ACE inhibitors and ARBs both act on the renin-angiotensin system. Guidelines generally advise against combining them.",
  },
  {
    id: "nsaid",
    label: "anti-inflammatory pain relievers (NSAIDs)",
    atcPrefixes: ["M01A"],
    why: "Two NSAIDs together raise the risk of stomach bleeding and kidney strain without adding much pain relief.",
  },
  {
    id: "benzo",
    label: "benzodiazepines",
    atcPrefixes: ["N05BA", "N05CD"],
    why: "Two benzodiazepines together increase sedation and fall risk.",
  },
  {
    id: "opioid",
    label: "opioid pain medicines",
    atcPrefixes: ["N02A"],
    why: "Two opioids together increase the risk of over-sedation and slowed breathing.",
  },
  {
    id: "ppi",
    label: "stomach-acid reducers (PPIs)",
    atcPrefixes: ["A02BC"],
    why: "Two proton pump inhibitors do the same job; one is normally enough.",
  },
  {
    id: "statin",
    label: "cholesterol medicines (statins)",
    atcPrefixes: ["C10AA"],
    why: "Two statins together raise the risk of muscle problems.",
  },
  {
    id: "ssri",
    label: "SSRI antidepressants",
    atcPrefixes: ["N06AB"],
    why: "Two SSRIs together raise the risk of serotonin-related side effects.",
  },
  {
    id: "anticoagulant",
    label: "blood thinners",
    atcPrefixes: ["B01AA", "B01AE", "B01AF"],
    why: "Two anticoagulants together substantially raise bleeding risk.",
  },
];

/**
 * ATC groups that describe a route or body site rather than a therapeutic role.
 * Two oral tablets sharing one of these have not told us anything useful.
 */
const ROUTE_NOISE_PREFIXES = [
  "M02", // topical antiinflammatory
  "G02C", // vaginal
  "S01", // ophthalmic
  "S02", // otologic
  "S03", // ophth/oto
  "D", // dermatologicals
  "R02", // throat
  "A01", // stomatological
  "R01", // nasal
];

function isRouteNoise(classId: string) {
  return ROUTE_NOISE_PREFIXES.some((p) => classId.startsWith(p));
}

const atcOf = (cs: DrugClass[]) => cs.filter((c) => c.classType.startsWith("ATC"));
const epcOf = (cs: DrugClass[]) => cs.filter((c) => c.classType === "EPC");

export interface ClassMatch {
  label: string;
  why: string | null;
  /** How the match was made, for the "computed, not generated" story. */
  basis: "curated-group" | "shared-epc" | "shared-atc";
  classId: string;
}

/**
 * The single best shared-class explanation for a pair of drugs, or null.
 * Returns at most one match so that one clinical issue yields one finding.
 */
export function bestClassMatch(
  a: DrugClass[],
  b: DrugClass[],
): ClassMatch | null {
  const aAtc = atcOf(a);
  const bAtc = atcOf(b);

  // 1. Curated groups - catches ACE + ARB, which no exact match finds.
  for (const g of CURATED_GROUPS) {
    const aHit = aAtc.find((c) => g.atcPrefixes.some((p) => c.classId.startsWith(p)));
    const bHit = bAtc.find((c) => g.atcPrefixes.some((p) => c.classId.startsWith(p)));
    if (aHit && bHit) {
      return {
        label: g.label,
        why: g.why,
        basis: "curated-group",
        classId: aHit.classId === bHit.classId ? aHit.classId : `${aHit.classId}+${bHit.classId}`,
      };
    }
  }

  // 2. Identical Established Pharmacologic Class - FDA's own grouping.
  const bEpcIds = new Set(epcOf(b).map((c) => c.classId));
  const epcHit = epcOf(a).find((c) => bEpcIds.has(c.classId));
  if (epcHit) {
    return {
      label: epcHit.className,
      why: null,
      basis: "shared-epc",
      classId: epcHit.classId,
    };
  }

  // 3. Identical ATC code, ignoring route-only groups. Most specific wins.
  const bAtcIds = new Set(bAtc.map((c) => c.classId));
  const shared = aAtc
    .filter((c) => bAtcIds.has(c.classId) && !isRouteNoise(c.classId))
    .sort((x, y) => y.classId.length - x.classId.length);
  if (shared.length > 0) {
    return {
      label: shared[0].className,
      why: null,
      basis: "shared-atc",
      classId: shared[0].classId,
    };
  }

  return null;
}
