/**
 * Ground-truth evaluation set for the deterministic checks.
 *
 * HONESTY NOTE, and it belongs in the demo as much as in this file: these
 * labels are our own annotation of what the checks SHOULD say. They are not a
 * clinical gold standard, they were not adjudicated by a pharmacist, and they
 * encode a deliberately narrow question - "do these two products share an
 * active ingredient, or do they do the same job?" - not "is this combination
 * safe?" Plenty of `none` cases below are pairs no one should take together
 * for reasons this app is not designed to detect.
 *
 * The set exists to make our accuracy claim falsifiable rather than rhetorical,
 * and in particular to pin down the HARD NEGATIVES: drugs that are commonly and
 * intentionally co-prescribed, which a naive class checker would flag and annoy
 * a patient with.
 */

export type Expect = "ingredient" | "class" | "none";

export interface EvalCase {
  id: string;
  a: { text: string; strength?: string; sig?: string };
  b: { text: string; strength?: string; sig?: string };
  expect: Expect;
  why: string;
}

const c = (
  id: string,
  aText: string,
  aStr: string | undefined,
  bText: string,
  bStr: string | undefined,
  expect: Expect,
  why: string,
): EvalCase => ({
  id,
  a: { text: aText, strength: aStr, sig: "Take 1 tablet by mouth twice daily" },
  b: { text: bText, strength: bStr, sig: "Take 1 tablet by mouth twice daily" },
  expect,
  why,
});

export const CASES: EvalCase[] = [
  // ---- Duplicate active ingredient -----------------------------------------
  c("dup-01", "Norco", "5-325 mg", "Tylenol Extra Strength", "500 mg", "ingredient",
    "Hidden acetaminophen in a combination opioid - the canonical post-discharge error."),
  c("dup-02", "Percocet", "5-325 mg", "Tylenol", "325 mg", "ingredient",
    "Same hidden acetaminophen, different opioid."),
  c("dup-03", "Advil", "200 mg", "Motrin", "200 mg", "ingredient",
    "Two brand names for ibuprofen."),
  c("dup-04", "Lisinopril", "10 mg", "Zestril", "10 mg", "ingredient",
    "Generic and brand of the same drug."),
  c("dup-05", "Aleve", "220 mg", "Naproxen sodium", "275 mg", "ingredient",
    "Brand and generic naproxen."),
  c("dup-06", "Xanax", "0.5 mg", "Alprazolam", "0.5 mg", "ingredient",
    "Brand and generic alprazolam."),
  c("dup-07", "Glucophage", "500 mg", "Metformin hydrochloride", "500 mg", "ingredient",
    "Brand and generic metformin."),
  c("dup-08", "Vicodin", "5-300 mg", "Acetaminophen", "500 mg", "ingredient",
    "Combination opioid plus plain acetaminophen."),
  c("dup-09", "Prinivil", "20 mg", "Lisinopril", "20 mg", "ingredient",
    "A second brand of lisinopril."),
  c("dup-10", "Zocor", "20 mg", "Simvastatin", "20 mg", "ingredient",
    "Brand and generic simvastatin."),

  // ---- Duplicate therapeutic class -----------------------------------------
  c("cls-01", "Lisinopril", "10 mg", "Losartan potassium", "50 mg", "class",
    "ACE inhibitor plus ARB. Shares no ATC code below C09 - the case naive intersection misses."),
  c("cls-02", "Ibuprofen", "600 mg", "Naproxen", "500 mg", "class",
    "Two NSAIDs. Also the case where raw ATC intersection over-fires on route-only codes."),
  c("cls-03", "Lorazepam", "1 mg", "Alprazolam", "0.5 mg", "class",
    "Two benzodiazepines."),
  c("cls-04", "Omeprazole", "20 mg", "Pantoprazole", "40 mg", "class",
    "Two proton pump inhibitors."),
  c("cls-05", "Atorvastatin", "20 mg", "Simvastatin", "20 mg", "class",
    "Two statins."),
  c("cls-06", "Sertraline", "50 mg", "Fluoxetine", "20 mg", "class",
    "Two SSRIs."),
  c("cls-07", "Enalapril", "10 mg", "Valsartan", "80 mg", "class",
    "A second ACE-plus-ARB pair, to check the group is not overfitted to lisinopril."),
  c("cls-08", "Oxycodone", "5 mg", "Hydrocodone bitartrate", "5 mg", "class",
    "Two opioids."),
  c("cls-09", "Celecoxib", "200 mg", "Meloxicam", "15 mg", "class",
    "Two NSAIDs from different ATC subgroups."),
  c("cls-10", "Citalopram", "20 mg", "Escitalopram", "10 mg", "class",
    "Two SSRIs, one the active enantiomer of the other."),

  // ---- Hard negatives: commonly and intentionally combined ------------------
  // These are the ones that matter. A checker that flags these is worse than
  // useless - it trains the patient to ignore it.
  c("neg-01", "Lisinopril", "10 mg", "Amlodipine", "5 mg", "none",
    "ACE inhibitor plus calcium channel blocker. Both lower blood pressure by different mechanisms; combined on purpose."),
  c("neg-02", "Lisinopril", "10 mg", "Metoprolol succinate", "25 mg", "none",
    "ACE inhibitor plus beta blocker. Standard combination after a heart attack."),
  c("neg-03", "Lisinopril", "10 mg", "Hydrochlorothiazide", "12.5 mg", "none",
    "ACE inhibitor plus thiazide diuretic. Sold as a single combination pill precisely because it is intended."),
  c("neg-04", "Acetaminophen", "500 mg", "Ibuprofen", "200 mg", "none",
    "Different drugs, different mechanisms, routinely alternated on purpose."),
  c("neg-05", "Metformin hydrochloride", "500 mg", "Lisinopril", "10 mg", "none",
    "Unrelated. Extremely common pairing in diabetic patients."),
  c("neg-06", "Levothyroxine", "50 mcg", "Atorvastatin", "20 mg", "none",
    "Unrelated."),
  c("neg-07", "Albuterol", "90 mcg", "Lisinopril", "10 mg", "none",
    "Unrelated."),
  c("neg-08", "Amoxicillin", "500 mg", "Ibuprofen", "400 mg", "none",
    "Unrelated. Antibiotic plus analgesic."),
  c("neg-09", "Sertraline", "50 mg", "Metformin hydrochloride", "500 mg", "none",
    "Unrelated."),
  c("neg-10", "Warfarin sodium", "5 mg", "Levothyroxine", "50 mcg", "none",
    "Not a duplicate of any kind. Any real concern here is an interaction, not a duplication."),
  c("neg-11", "Omeprazole", "20 mg", "Amoxicillin", "500 mg", "none",
    "Co-prescribed deliberately as part of H. pylori therapy."),
  c("neg-12", "Furosemide", "20 mg", "Potassium chloride", "10 mEq", "none",
    "Co-prescribed deliberately - the potassium replaces what the diuretic removes."),
];

export const EXPECTED_COUNTS = CASES.reduce(
  (acc, x) => ({ ...acc, [x.expect]: (acc[x.expect] ?? 0) + 1 }),
  {} as Record<Expect, number>,
);
