import type { BottleRecord } from "./schemas";

export interface Scenario {
  id: string;
  title: string;
  blurb: string;
  bottles: BottleRecord[];
  /** Optional discharge-paperwork list, for the reconciliation demo. */
  discharge?: BottleRecord[];
}

const b = (
  drug_text: string,
  strength: string | null,
  sig: string,
  confidence = 0.94,
  extra: Partial<BottleRecord> = {},
): BottleRecord => ({
  drug_text,
  strength,
  sig,
  quantity: null,
  prescriber: null,
  fill_date: null,
  confidence,
  ...extra,
});

/**
 * Demo fixtures. These stand in for the vision step only - normalization and
 * every check still run for real against the (committed) response cache, so
 * ?demo=1 exercises the same code path the live photo flow does.
 */
export const SCENARIOS: Scenario[] = [
  {
    id: "duplicate",
    title: "Hidden duplicate",
    blurb: "Norco + Extra Strength Tylenol - the same ingredient under two names.",
    bottles: [
      b("Norco", "5-325 mg", "Take 1 tablet by mouth every 6 hours as needed for pain", 0.96, {
        quantity: "60 tablets",
        prescriber: "Dr. A. Ramirez",
        fill_date: "2026-09-02",
      }),
      b("Tylenol Extra Strength", "500 mg", "Take 2 tablets by mouth every 6 hours as needed", 0.91, {
        quantity: "100 tablets",
      }),
    ],
  },
  {
    id: "sameclass",
    title: "Same-class stacking",
    blurb: "Lisinopril + Losartan - two blood-pressure medicines that act the same way.",
    bottles: [
      b("Lisinopril", "10 mg", "Take 1 tablet by mouth once daily", 0.95, {
        quantity: "90 tablets",
        prescriber: "Dr. M. Chen",
      }),
      b("Losartan potassium", "50 mg", "Take 1 tablet by mouth once daily", 0.88, {
        quantity: "30 tablets",
      }),
    ],
  },
  {
    id: "interaction",
    title: "Label-cited interaction",
    blurb: "Warfarin + Ibuprofen - bleeding risk, quoted from the FDA label.",
    bottles: [
      b("Warfarin sodium", "5 mg", "Take 1 tablet by mouth once daily", 0.93, {
        prescriber: "Dr. S. Patel",
      }),
      b("Ibuprofen", "600 mg", "Take 1 tablet by mouth three times daily as needed", 0.9),
    ],
  },
  {
    id: "all",
    title: "All six bottles",
    blurb: "Everything at once - the kitchen-table pile.",
    bottles: [
      b("Norco", "5-325 mg", "Take 1 tablet by mouth every 6 hours as needed for pain", 0.96),
      b("Tylenol Extra Strength", "500 mg", "Take 2 tablets by mouth every 6 hours as needed", 0.91),
      b("Lisinopril", "10 mg", "Take 1 tablet by mouth once daily", 0.95),
      b("Losartan potassium", "50 mg", "Take 1 tablet by mouth once daily", 0.88),
      b("Warfarin sodium", "5 mg", "Take 1 tablet by mouth once daily", 0.93),
      b("Ibuprofen", "600 mg", "Take 1 tablet by mouth three times daily as needed", 0.62),
    ],
  },
];


/**
 * The reconciliation scenario. The discharge list and the pile disagree in
 * three different ways at once, which is the realistic case:
 *   - metoprolol was prescribed but never filled        -> omission
 *   - lisinopril strength was changed on discharge      -> dose mismatch
 *   - an old Vicodin bottle is still in the cabinet     -> unreconciled, and
 *     it collides with the Tylenol for a hidden acetaminophen total
 */
SCENARIOS.push({
  id: "reconcile",
  title: "Discharge list vs the pile",
  blurb:
    "What the hospital sent you home on, against what is actually on the table.",
  discharge: [
    b("Lisinopril", "20 mg", "Take 1 tablet by mouth once daily", 0.97),
    b("Metoprolol succinate ER", "25 mg", "Take 1 tablet by mouth once daily", 0.95),
    b("Atorvastatin", "40 mg", "Take 1 tablet by mouth at bedtime", 0.96),
    b("Tylenol", "500 mg", "Take 2 tablets by mouth every 6 hours as needed", 0.9),
  ],
  bottles: [
    b("Lisinopril", "10 mg", "Take 1 tablet by mouth once daily", 0.94),
    b("Atorvastatin", "40 mg", "Take 1 tablet by mouth at bedtime", 0.95),
    b("Tylenol Extra Strength", "500 mg", "Take 2 tablets by mouth every 6 hours as needed", 0.91),
    b("Vicodin", "5-300 mg", "Take 1 tablet by mouth every 6 hours as needed for pain", 0.86),
  ],
});

export const getScenario = (id: string | null) =>
  SCENARIOS.find((s) => s.id === id) ?? SCENARIOS[0];
