import type { DrugClass, NormalizedMed } from "./types";
import { parseSigQuantities } from "./strength";

/**
 * Plain-language answers to "what is this?" and "how do I take it?".
 *
 * The FDA label says a drug is "an angiotensin converting enzyme inhibitor
 * indicated for the treatment of hypertension". Someone who cannot read the
 * bottle cannot read that either, so quoting it is not accessibility - it just
 * moves the same wall.
 *
 * These mappings are CURATED and DETERMINISTIC, keyed on ATC and EPC class
 * identifiers rather than drug names. That matters for three reasons: it works
 * with no API key, it gives the same answer every time, and it produces short
 * source strings that survive translation intact. A model rewriting label prose
 * on the fly would do none of those.
 *
 * Anything not covered here falls back to the label text, clearly marked as
 * such, rather than being guessed at.
 */

export interface PlainPurpose {
  /** One short sentence: "This lowers your blood pressure." */
  sentence: string;
  /** Two or three words for the card header: "Blood pressure". */
  shortLabel: string;
  /** Deterministic mapping, or fallback to raw label text. */
  curated: boolean;
}

interface Rule {
  atc?: string[];
  epc?: RegExp;
  shortLabel: string;
  sentence: string;
}

const RULES: Rule[] = [
  { atc: ["C09A", "C09C", "C09X"], shortLabel: "Blood pressure", sentence: "This lowers your blood pressure." },
  { atc: ["C07"], shortLabel: "Heart and blood pressure", sentence: "This slows your heart down and lowers your blood pressure." },
  { atc: ["C08"], shortLabel: "Blood pressure", sentence: "This relaxes your blood vessels to lower your blood pressure." },
  { atc: ["C03"], shortLabel: "Water pill", sentence: "This helps your body get rid of extra water and salt." },
  { atc: ["C10A"], shortLabel: "Cholesterol", sentence: "This lowers your cholesterol." },
  { atc: ["B01A"], shortLabel: "Blood thinner", sentence: "This thins your blood so it does not form clots." },
  { atc: ["A10"], shortLabel: "Blood sugar", sentence: "This lowers your blood sugar." },
  { atc: ["N02A"], shortLabel: "Strong pain", sentence: "This is a strong pain medicine." },
  { atc: ["M01A"], shortLabel: "Pain and swelling", sentence: "This helps with pain and swelling." },
  { atc: ["N02B"], shortLabel: "Pain and fever", sentence: "This helps with pain and fever." },
  { atc: ["A02B"], shortLabel: "Stomach acid", sentence: "This lowers the amount of acid in your stomach." },
  { atc: ["N06A"], shortLabel: "Mood", sentence: "This helps with depression and mood." },
  { atc: ["N05A"], shortLabel: "Mental health", sentence: "This helps with serious mental health symptoms." },
  { atc: ["N05B", "N05C"], shortLabel: "Calm and sleep", sentence: "This helps you feel calm or helps you sleep." },
  { atc: ["N03A"], shortLabel: "Seizures", sentence: "This helps prevent seizures." },
  { atc: ["R03"], shortLabel: "Breathing", sentence: "This helps you breathe more easily." },
  { atc: ["R06"], shortLabel: "Allergies", sentence: "This helps with allergies." },
  { atc: ["H03A"], shortLabel: "Thyroid", sentence: "This replaces a hormone your thyroid is not making enough of." },
  { atc: ["H02"], shortLabel: "Swelling and immune", sentence: "This is a steroid. It calms swelling and the immune system." },
  { atc: ["J01"], shortLabel: "Infection", sentence: "This is an antibiotic. It treats an infection." },
  { atc: ["M04"], shortLabel: "Gout", sentence: "This helps prevent gout attacks." },
  { atc: ["G04C"], shortLabel: "Prostate", sentence: "This helps with prostate and urination problems." },
  { atc: ["A12"], shortLabel: "Supplement", sentence: "This is a mineral supplement." },
  { atc: ["A11"], shortLabel: "Vitamin", sentence: "This is a vitamin." },
];

function classIds(classes: DrugClass[]) {
  return classes.filter((c) => c.classType.startsWith("ATC")).map((c) => c.classId);
}

export function plainPurpose(
  med: NormalizedMed,
  labelFallback?: string | null,
): PlainPurpose {
  const ids = classIds(med.classes);
  const epcText = med.classes
    .filter((c) => c.classType === "EPC")
    .map((c) => c.className)
    .join(" ");

  for (const rule of RULES) {
    const atcHit = rule.atc?.some((prefix) => ids.some((id) => id.startsWith(prefix)));
    const epcHit = rule.epc?.test(epcText);
    if (atcHit || epcHit) {
      return { sentence: rule.sentence, shortLabel: rule.shortLabel, curated: true };
    }
  }

  // Combination products: describe the part we do recognise rather than nothing.
  if (med.ingredients.length > 1) {
    return {
      sentence: `This is a combination medicine. It contains ${med.ingredients
        .map((i) => i.name)
        .join(" and ")}.`,
      shortLabel: "Combination",
      curated: true,
    };
  }

  return {
    sentence: labelFallback?.trim()
      ? labelFallback.trim()
      : "We could not find a simple description for this one. Ask your pharmacist what it is for.",
    shortLabel: "Medicine",
    curated: false,
  };
}

/**
 * "Take 1 tablet by mouth every 6 hours as needed for pain"
 *   -> "One pill, up to 4 times a day. Only when you need it."
 *
 * Pharmacy sig language is abbreviated and assumes training. This rewrites the
 * common patterns into short sentences; anything it cannot parse is shown
 * unchanged rather than guessed at.
 */
export function plainSig(sig: string | null): { text: string; parsed: boolean } {
  if (!sig?.trim()) {
    return { text: "The directions were not readable. Ask your pharmacist.", parsed: false };
  }

  const { unitsPerDose, dosesPerDay, asNeeded } = parseSigQuantities(sig);
  if (dosesPerDay === null && !asNeeded) return { text: sig, parsed: false };

  const words = ["", "One", "Two", "Three", "Four"];
  const count = words[unitsPerDose] ?? String(unitsPerDose);
  const pill = unitsPerDose === 1 ? "pill" : "pills";

  const s = sig.toLowerCase();
  let when = "";
  if (/bedtime|nightly|at night|qhs/.test(s)) when = "at bedtime";
  else if (dosesPerDay === 1) when = "once a day";
  else if (dosesPerDay === 2) when = "twice a day";
  else if (dosesPerDay === 3) when = "three times a day";
  else if (dosesPerDay && dosesPerDay >= 4) when = `up to ${dosesPerDay} times a day`;

  let text = `${count} ${pill}${when ? `, ${when}` : ""}.`;
  if (asNeeded) text += " Only when you need it.";

  // Keep a genuinely important qualifier that the summary would otherwise lose.
  if (/with food|with a meal/.test(s)) text += " Take it with food.";
  if (/empty stomach/.test(s)) text += " Take it on an empty stomach.";

  return { text, parsed: true };
}
