import { normalizeAll } from "./normalize";
import { plainPurpose, plainSig } from "./plainPurpose";
import { displayName } from "./display";
import { byId } from "./anatomy/conditions";
import { translateStrings, LANGUAGES } from "./translate";
import { howToById, type HowToArt } from "./howto";
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

/**
 * One screen of the patient story. The turned screen shows exactly one of
 * these at a time, reads it aloud, and moves on when the audio ends.
 */
export interface Slide {
  kind: "picture" | "medicine" | "todo" | "howto" | "end";
  title: string;
  lines: string[];
  /** What the voice says for this slide. */
  spoken: string;
  /** For how-to steps: which picture, and "step 2 of 6". */
  art?: HowToArt;
  step?: { n: number; of: number };
}

export interface ExplainCard {
  headline: string;
  diagram: string | null;
  marks: string[];
  meds: MedExplain[];
  instructions: string[];
  /** The whole card as one paragraph, for read-aloud. */
  spoken: string;
  /** Language the text is in, and its BCP-47 tag for speech. */
  language: string;
  langTag: string;
  rtl: boolean;
  slides: Slide[];
}

/** Fixed phrases the story needs, translated with everything else. */
const PHRASES = {
  yourMedicines: "Your medicines",
  whatToDo: "What to do next",
  thatsAll: "That is everything.",
  askUs: "If anything is unclear, ask us before you leave.",
};

export interface HowToSlideInput {
  title: string;
  why: string;
  steps: string[];
  art: HowToArt;
}

export function buildSlides(
  headline: string,
  meds: MedExplain[],
  instructions: string[],
  howtos: HowToSlideInput[],
  phrases: typeof PHRASES,
): Slide[] {
  const slides: Slide[] = [
    { kind: "picture", title: headline, lines: [], spoken: headline },
  ];
  for (const m of meds) {
    slides.push({
      kind: "medicine",
      title: m.name,
      lines: [m.purpose, m.howToTake],
      spoken: `${m.name}. ${m.purpose} ${m.howToTake}`,
    });
  }
  if (instructions.length) {
    slides.push({
      kind: "todo",
      title: phrases.whatToDo,
      lines: instructions,
      spoken: `${phrases.whatToDo}. ${instructions.join(" ")}`,
    });
  }
  for (const h of howtos) {
    slides.push({
      kind: "howto",
      title: h.title,
      lines: [h.why],
      spoken: `${h.title}. ${h.why}`,
      art: h.art,
    });
    h.steps.forEach((step, k) => {
      slides.push({
        kind: "howto",
        title: step,
        lines: [],
        spoken: step,
        art: h.art,
        step: { n: k + 1, of: h.steps.length },
      });
    });
  }
  slides.push({
    kind: "end",
    title: phrases.thatsAll,
    lines: [phrases.askUs],
    spoken: `${phrases.thatsAll} ${phrases.askUs}`,
  });
  return slides;
}

export async function buildExplainCard(input: {
  conditionId?: string | null;
  customHeadline?: string | null;
  meds: BottleRecord[];
  instructions: string[];
  howtoIds?: string[];
  language?: string;
}): Promise<{ card: ExplainCard; translation: { provider: string; untranslated: number } }> {
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

  let instructions = input.instructions.map((i) => i.trim()).filter(Boolean);
  let howtos: HowToSlideInput[] = (input.howtoIds ?? [])
    .map(howToById)
    .filter((h): h is NonNullable<typeof h> => h !== null)
    .map((h) => ({ title: h.title, why: h.why, steps: [...h.steps], art: h.art }));

  // Translate everything the patient reads, in one batch, except drug names -
  // those must match the printed bottle. The library decided what each line
  // says; the translator only changes the language it says it in.
  const language = input.language && LANGUAGES[input.language] ? input.language : "English";
  const lang = LANGUAGES[language];
  let phrases = { ...PHRASES };
  let translation = { provider: "none", untranslated: 0 };
  let finalHeadline = headline;

  if (language !== "English") {
    const batch = [
      headline,
      ...meds.flatMap((m) => [m.shortLabel, m.purpose, m.howToTake]),
      ...instructions,
      ...howtos.flatMap((h) => [h.title, h.why, ...h.steps]),
      ...Object.values(PHRASES),
    ];
    const t = await translateStrings(batch, language);
    translation = { provider: t.provider, untranslated: t.untranslated };
    let i = 0;
    finalHeadline = t.out[i++];
    for (const m of meds) {
      m.shortLabel = t.out[i++];
      m.purpose = t.out[i++];
      m.howToTake = t.out[i++];
    }
    instructions = instructions.map(() => t.out[i++]);
    howtos = howtos.map((h) => ({
      ...h,
      title: t.out[i++],
      why: t.out[i++],
      steps: h.steps.map(() => t.out[i++]),
    }));
    const keys = Object.keys(PHRASES) as (keyof typeof PHRASES)[];
    for (const k of keys) phrases[k] = t.out[i++];
  }

  const slides = buildSlides(finalHeadline, meds, instructions, howtos, phrases);
  const spoken = slides.map((sl) => sl.spoken).join(" ");

  return {
    card: {
      headline: finalHeadline,
      diagram: condition?.diagram ?? null,
      marks: condition?.marks ?? [],
      meds,
      instructions,
      spoken,
      language,
      langTag: lang.tag,
      rtl: lang.mymemory === "ar",
      slides,
    },
    translation,
  };
}
