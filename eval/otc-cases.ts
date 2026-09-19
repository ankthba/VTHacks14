/**
 * Ground truth for over-the-counter product resolution.
 *
 * This is the highest-stakes path in the app. A wrong answer here is not a
 * missed finding, it is an active green light: someone already taking Norco is
 * told a cold medicine is fine when it contains another 650 mg of
 * acetaminophen.
 *
 * The specific hazard these cases guard against is SILENT MIS-RESOLUTION.
 * Going through RxNorm's fuzzy matcher, "DayQuil" resolved to "DayQuil Cough"
 * (dextromethorphan only) and "Advil PM" resolved to plain "Advil" - both
 * dropping an active ingredient without any signal that it had happened.
 */

export interface OTCCase {
  id: string;
  query: string;
  /** At least one marketed formulation must contain acetaminophen. */
  expectAcetaminophenVariant: boolean;
  /** Brand covers formulations that differ in content, so we must ask. */
  expectMultipleVariants: boolean;
  why: string;
}

export const OTC_CASES: OTCCase[] = [
  {
    id: "otc-01",
    query: "NyQuil",
    expectAcetaminophenVariant: true,
    expectMultipleVariants: true,
    why: "NyQuil Severe, Diabetes and -D contain acetaminophen; NyQuil Kids Allergy does not. Picking one silently is the whole hazard.",
  },
  {
    id: "otc-02",
    query: "Excedrin",
    expectAcetaminophenVariant: true,
    expectMultipleVariants: true,
    why: "Excedrin is aspirin + acetaminophen + caffeine. Widely taken alongside a prescription opioid.",
  },
  {
    id: "otc-03",
    query: "Midol",
    expectAcetaminophenVariant: true,
    expectMultipleVariants: true,
    why: "Midol Complete contains acetaminophen. RxNorm's fuzzy match could not resolve it at all.",
  },
  {
    id: "otc-04",
    query: "Benadryl",
    expectAcetaminophenVariant: false,
    expectMultipleVariants: true,
    why: "Diphenhydramine only. A true negative - the check must not cry wolf.",
  },
  {
    id: "otc-05",
    query: "Aleve",
    expectAcetaminophenVariant: false,
    expectMultipleVariants: true,
    why: "Naproxen only. Should flag as an NSAID against ibuprofen, but never as acetaminophen.",
  },
];
