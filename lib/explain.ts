import { normalizeAll } from "./normalize";
import { plainPurpose, plainSig } from "./plainPurpose";
import { displayName } from "./display";
import { byId } from "./anatomy/conditions";
import type { BottleRecord } from "./schemas";

/**
 * The explain card: what a clinician says in the room, turned into something
 * the patient can still understand at home.
 *
 * Patients forget most of what they are told in a visit, and misremember a good
 * part of the rest. The evidence-based fix is teach-back, which a fifteen-minute
 * slot does not allow. So this makes the explanation into an artifact instead -
 * built in the seconds the clinician already spends explaining.
 *
 * Every medication sentence comes from the same curated deterministic mapping
 * the rest of this project uses. The clinician can edit any of it before the
 * screen is turned around: they are the author, this is a drafting tool.
 */

export interface MedExplain {
  name: string;
  shortLabel: string;
  purpose: string;
  howToTake: string;
  /** True when the sentence came from our curated mapping rather than a label. */
  curated: boolean;
}

export interface ExplainCard {
  headline: string;
  diagram: string | null;
  marks: string[];
  meds: MedExplain[];
  instructions: string[];
  /** The whole card as one paragraph, for read-aloud. */
  spoken: string;
}

export async function buildExplainCard(input: {
  conditionId?: string | null;
  customHeadline?: string | null;
  meds: BottleRecord[];
  instructions: string[];
}): Promise<ExplainCard> {
  const condition = input.conditionId ? byId(input.conditionId) : null;
  const headline =
    input.customHeadline?.trim() ||
    condition?.plain ||
    "Here is what we found and what happens next.";

  const normalized = await normalizeAll(input.meds);
  const meds: MedExplain[] = normalized.map((m) => {
    const p = plainPurpose(m);
    const s = plainSig(m.sig);
    return {
      name: displayName(m),
      shortLabel: p.shortLabel,
      purpose: m.unresolved
        ? "Ask the pharmacist what this one is for."
        : p.sentence,
      howToTake: s.text,
      curated: p.curated,
    };
  });

  const instructions = input.instructions.map((i) => i.trim()).filter(Boolean);

  const spoken = [
    headline,
    meds.length ? "Here are your medicines." : "",
    ...meds.map((m) => `${m.name}. ${m.purpose} ${m.howToTake}`),
    instructions.length ? "Here is what to do next." : "",
    ...instructions,
  ]
    .filter(Boolean)
    .join(" ");

  return {
    headline,
    diagram: condition?.diagram ?? null,
    marks: condition?.marks ?? [],
    meds,
    instructions,
    spoken,
  };
}

/**
 * Translation prompt.
 *
 * The model translates; it does not decide anything clinical. Drug names are
 * held back deliberately - the patient has to match them against a printed
 * bottle, so translating them would break the one thing the card is for.
 */
export function explainTranslationPrompt(card: ExplainCard, language: string) {
  const payload = {
    headline: card.headline,
    meds: card.meds.map((m) => ({
      shortLabel: m.shortLabel,
      purpose: m.purpose,
      howToTake: m.howToTake,
    })),
    instructions: card.instructions,
  };

  return `Translate this patient explanation into ${language}.

RULES
- 6th-grade reading level. Short sentences, common words.
- Translate ONLY. Do not add, remove, soften or reinterpret any medical statement.
- Do NOT translate medication names - they are not included below for that reason.
- Keep the same JSON shape and the same array lengths.

Return ONLY the JSON:
${JSON.stringify(payload, null, 1)}`;
}
