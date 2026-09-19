import { displayName } from "./display";
import { plainPurpose, plainSig } from "./plainPurpose";
import type { Finding, NormalizedMed } from "./types";

/**
 * One card per bottle: what it is, what it does, how to take it, and whether
 * there is something to ask about. Built for someone holding the bottle who
 * cannot read the label - large type, one idea per line, meant to be heard as
 * much as read.
 */
export interface MedCard {
  med_id: string;
  /** What is printed on the bottle, so it can be matched by eye. */
  name: string;
  /** Two or three words: "Blood pressure". */
  shortLabel: string;
  /** "This lowers your blood pressure." */
  purpose: string;
  /** "One pill, once a day." */
  howToTake: string;
  /** Set when a high-severity finding involves this medicine. */
  warning: string | null;
  /** True when the purpose came from our curated mapping, not raw label text. */
  curated: boolean;
  unresolved: boolean;
  /** Everything above as one paragraph, for read-aloud. */
  spoken: string;
}

export function buildCards(
  meds: NormalizedMed[],
  findings: Finding[],
  labelFallbacks: Record<string, string | null> = {},
): MedCard[] {
  return meds.map((m) => {
    const name = displayName(m);

    if (m.unresolved) {
      const purpose =
        "We could not work out what this one is. Take the bottle to any pharmacy and ask - they will tell you for free, and you do not need an appointment.";
      return {
        med_id: m.id,
        name,
        shortLabel: "Not identified",
        purpose,
        howToTake: m.sig ?? "Directions were not readable.",
        warning: null,
        curated: false,
        unresolved: true,
        spoken: `${name}. ${purpose}`,
      };
    }

    const p = plainPurpose(m, labelFallbacks[m.id]);
    const s = plainSig(m.sig);

    // Only the serious findings belong on a card. The full list lives in the
    // detailed view; here it would bury the one thing that matters.
    const relevant = findings.filter(
      (f) => f.severity === "high" && f.med_ids.includes(m.id),
    );
    const warning = relevant.length ? relevant[0].headline : null;

    const spoken = [
      name + ".",
      p.sentence,
      s.text,
      warning ? `Important: ${warning}. Ask your pharmacist about this.` : "",
    ]
      .filter(Boolean)
      .join(" ");

    return {
      med_id: m.id,
      name,
      shortLabel: p.shortLabel,
      purpose: p.sentence,
      howToTake: s.text,
      warning,
      curated: p.curated,
      unresolved: false,
      spoken,
    };
  });
}

/**
 * Translation prompt for the cards.
 *
 * The strings are short, curated and already at a low reading level, so the
 * model is only translating - it is not deciding what a drug is for. That keeps
 * the same guarantee the rest of the app makes: the model never originates a
 * clinical claim.
 */
export function cardTranslationPrompt(cards: MedCard[], language: string): string {
  const payload = cards.map((c) => ({
    med_id: c.med_id,
    shortLabel: c.shortLabel,
    purpose: c.purpose,
    howToTake: c.howToTake,
    warning: c.warning,
  }));

  return `Translate these medication cards into ${language}.

RULES
- Keep a 6th-grade reading level. Short sentences, common words.
- Translate ONLY. Do not add, remove or soften any medical information.
- Do NOT translate the medication name - a patient has to match it to the
  printed bottle. It is not included below for that reason.
- Keep "shortLabel" to two or three words.
- If a value is null, keep it null.

Return ONLY a JSON array with the same objects and the same med_id values:
${JSON.stringify(payload, null, 1)}`;
}
