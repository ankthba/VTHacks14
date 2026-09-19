/**
 * Ground truth for the discharge-list vs bottles comparison.
 *
 * Same honesty caveat as cases.ts: these are our own annotations, not a
 * clinical gold standard. The interesting cases are the ones where the two
 * lists name the SAME medicine differently - brand on one side, generic on the
 * other - because a naive string comparison reports those as a missing drug
 * plus an extra drug, which is two false alarms for zero real problems.
 */
import type { ReconcileStatus } from "../lib/types";

export interface ReconcileCase {
  id: string;
  discharge: { text: string; strength?: string }[];
  bottles: { text: string; strength?: string }[];
  /** Expected status counts. Anything not listed must be zero. */
  expect: Partial<Record<ReconcileStatus, number>>;
  why: string;
}

export const RECONCILE_CASES: ReconcileCase[] = [
  {
    id: "rec-01",
    discharge: [{ text: "Metoprolol succinate ER", strength: "25 mg" }],
    bottles: [],
    expect: { omission: 1 },
    why: "Prescribed but never filled. The most common real-world discrepancy.",
  },
  {
    id: "rec-02",
    discharge: [{ text: "Lisinopril", strength: "20 mg" }],
    bottles: [{ text: "Lisinopril", strength: "10 mg" }],
    expect: { dose_mismatch: 1 },
    why: "Dose changed on discharge, old bottle still in the cabinet.",
  },
  {
    id: "rec-03",
    discharge: [],
    bottles: [{ text: "Vicodin", strength: "5-300 mg" }],
    expect: { extra: 1 },
    why: "Leftover from an earlier prescription, and a discontinued brand at that.",
  },
  {
    id: "rec-04",
    discharge: [{ text: "Atorvastatin", strength: "40 mg" }],
    bottles: [{ text: "Atorvastatin", strength: "40 mg" }],
    expect: { matched: 1 },
    why: "Straightforward agreement.",
  },
  {
    id: "rec-05",
    discharge: [{ text: "Hydrocodone bitartrate and acetaminophen", strength: "5-325 mg" }],
    bottles: [{ text: "Norco", strength: "5-325 mg" }],
    expect: { matched: 1 },
    why: "Generic name on the paperwork, brand on the bottle. Ingredient-set matching must see through this - string comparison would report omission + extra.",
  },
  {
    id: "rec-06",
    discharge: [{ text: "Zestril", strength: "10 mg" }],
    bottles: [{ text: "Lisinopril", strength: "10 mg" }],
    expect: { matched: 1 },
    why: "Brand on the paperwork, generic on the bottle - the reverse of rec-05.",
  },
  {
    id: "rec-07",
    discharge: [{ text: "Tylenol", strength: "500 mg" }],
    bottles: [{ text: "Acetaminophen", strength: "500 mg" }],
    expect: { matched: 1 },
    why: "Brand/generic pair for an over-the-counter drug.",
  },
  {
    id: "rec-08",
    discharge: [
      { text: "Lisinopril", strength: "20 mg" },
      { text: "Metoprolol succinate ER", strength: "25 mg" },
      { text: "Atorvastatin", strength: "40 mg" },
    ],
    bottles: [
      { text: "Lisinopril", strength: "10 mg" },
      { text: "Atorvastatin", strength: "40 mg" },
      { text: "Vicodin", strength: "5-300 mg" },
    ],
    expect: { omission: 1, dose_mismatch: 1, extra: 1, matched: 1 },
    why: "All four outcomes at once, which is what a real kitchen table looks like.",
  },
];
