import { normalizeAll } from "./normalize";
import { plainPurpose, plainSig } from "./plainPurpose";
import { displayName } from "./display";
import { byId } from "./anatomy/conditions";
import { translateStrings, LANGUAGES } from "./translate";
import { howToById, type HowToArt } from "./howto";
import { fetchLabel, firstSentence } from "./openfda";
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
  /** Index into the medications the clinician entered, so edits line up. */
  sourceIndex: number;
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
  /** Small label above the title so the screen explains itself: "Your medicine, 1 of 3". */
  kicker: string;
  title: string;
  lines: string[];
  /** What the voice says for this slide. */
  spoken: string;
  /** For a how-to: the picture, and the numbered steps shown on the one slide. */
  art?: HowToArt;
  steps?: string[];
  /** Static builds: a prebuilt clip for this slide, relative to the site root. */
  audio?: string;
}

export interface ExplainCard {
  headline: string;
  /** Lines from the note that were NOT turned into anything. For the clinician. */
  skipped: string[];
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
  whatHappened: "What happened",
  yourMedicine: "Your medicine",
  whatToDo: "What to do next",
  howTo: "How to do it",
  thatsAll: "That is everything.",
  askUs: "If anything is unclear, ask us before you leave.",
};

export interface HowToSlideInput {
  title: string;
  why: string;
  steps: string[];
  art: HowToArt;
}

/**
 * A story is short on purpose: one picture, one screen per medicine, one
 * screen of what to do, one screen per how-to WITH its steps listed, and an
 * end. A typical visit is six to nine screens. Splitting every step onto its
 * own screen produced 48 for one note, which nobody will sit through.
 */
export function buildSlides(
  headline: string,
  meds: MedExplain[],
  instructions: string[],
  howtos: HowToSlideInput[],
  phrases: typeof PHRASES,
): Slide[] {
  const slides: Slide[] = [
    { kind: "picture", kicker: phrases.whatHappened, title: headline, lines: [], spoken: headline },
  ];
  meds.forEach((m, k) => {
    slides.push({
      kind: "medicine",
      kicker: `${phrases.yourMedicine}${meds.length > 1 ? ` ${k + 1} / ${meds.length}` : ""}`,
      title: m.name,
      lines: [m.purpose, m.howToTake],
      spoken: `${m.name}. ${m.purpose} ${m.howToTake}`,
    });
  });
  if (instructions.length) {
    slides.push({
      kind: "todo",
      kicker: phrases.whatToDo,
      title: phrases.whatToDo,
      lines: instructions,
      spoken: `${phrases.whatToDo}. ${instructions.join(" ")}`,
    });
  }
  for (const h of howtos) {
    slides.push({
      kind: "howto",
      kicker: phrases.howTo,
      title: h.title,
      lines: [h.why],
      steps: h.steps,
      art: h.art,
      spoken: `${h.title}. ${h.why} ${h.steps.map((st, i) => `${i + 1}. ${st}`).join(" ")}`,
    });
  }
  slides.push({
    kind: "end",
    kicker: "",
    title: phrases.thatsAll,
    lines: [phrases.askUs],
    spoken: `${phrases.thatsAll} ${phrases.askUs}`,
  });
  return slides;
}

/**
 * Is this "medication" plausibly a drug at all?
 *
 * RxNorm's fuzzy matcher will resolve almost any text to SOMETHING - "Headache
 * (QOD)" became an aspirin/caffeine headache powder. A resolution is trusted
 * only if the printed name shares a word with the canonical name (ibuprofen ->
 * "ibuprofen 600 MG") or the line carried an explicit dose. Otherwise the line
 * is handed back to the clinician rather than read to the patient.
 */
function plausibleMed(inputName: string, strength: string | null, canonical: string | null): boolean {
  if (strength) return true;
  if (!canonical) return false;
  const words = (t: string) =>
    t.toLowerCase().replace(/[^a-z]+/g, " ").split(" ").filter((w) => w.length >= 4);
  const a = new Set(words(inputName));
  return words(canonical).some((w) => a.has(w) || [...a].some((x) => w.startsWith(x) || x.startsWith(w)));
}

export async function buildExplainCard(input: {
  conditionId?: string | null;
  customHeadline?: string | null;
  meds: BottleRecord[];
  /** Clinician edits to the generated sentences, by medication index. */
  medOverrides?: Record<number, { purpose?: string | null; howToTake?: string | null }>;
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
  const skipped: string[] = [];
  const meds: MedExplain[] = [];
  for (let k = 0; k < normalized.length; k++) {
    const m = normalized[k];
    const rec = input.meds[k];
    if (m.unresolved || !plausibleMed(rec.drug_text ?? "", rec.strength, m.canonical_name)) {
      skipped.push([rec.drug_text, rec.strength, rec.sig].filter(Boolean).join(" "));
      continue;
    }
    // Only fetch the label when the class map has no sentence - it is a
    // network call, and the curated sentence is better anyway.
    let labelText: string | null = null;
    if (!plainPurpose(m, null, input.conditionId).curated) {
      const label = await fetchLabel(m);
      labelText = firstSentence(label?.indications_and_usage, 300);
    }
    const p = plainPurpose(m, labelText, input.conditionId);
    const sg = plainSig(m.sig);
    const ov = input.medOverrides?.[k];
    meds.push({
      sourceIndex: k,
      name: displayName(m),
      shortLabel: p.shortLabel,
      purpose: ov?.purpose?.trim() || p.sentence,
      howToTake: ov?.howToTake?.trim() || sg.text,
      curated: p.curated || !!ov?.purpose?.trim(),
    });
  }

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
      skipped,
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
