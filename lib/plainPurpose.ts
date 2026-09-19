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

/**
 * Wide on purpose. Every class a community prescriber writes in a week should
 * land here, because the alternative - a screen that says "ask someone" - is
 * the one thing this tool exists to prevent. Order matters: more specific
 * prefixes first, so a triptan (N02CC) is "migraine", not "pain".
 */
const RULES: Rule[] = [
  // Pain, fever, inflammation
  { atc: ["N02CC"], shortLabel: "Migraine", sentence: "This stops a migraine once it has started." },
  { atc: ["N02A"], shortLabel: "Strong pain", sentence: "This is a strong pain medicine." },
  { atc: ["M01A"], shortLabel: "Pain and swelling", sentence: "This helps with pain and swelling." },
  { atc: ["N02B"], shortLabel: "Pain and fever", sentence: "This helps with pain and fever." },
  { atc: ["M03B"], shortLabel: "Muscle spasm", sentence: "This relaxes tight, painful muscles." },
  { atc: ["N01B", "D04AB"], shortLabel: "Numbing", sentence: "This numbs the area so it does not hurt." },
  { atc: ["M04"], shortLabel: "Gout", sentence: "This helps prevent gout attacks." },
  { atc: ["M05B"], shortLabel: "Bone strength", sentence: "This makes your bones stronger and less likely to break." },

  // Heart and blood pressure
  { atc: ["C09A", "C09B"], shortLabel: "Blood pressure", sentence: "This lowers your blood pressure." },
  { atc: ["C09C", "C09D", "C09X"], shortLabel: "Blood pressure", sentence: "This lowers your blood pressure." },
  { atc: ["C07"], shortLabel: "Heart and blood pressure", sentence: "This slows your heart down and lowers your blood pressure." },
  { atc: ["C08"], shortLabel: "Blood pressure", sentence: "This relaxes your blood vessels to lower your blood pressure." },
  { atc: ["C02"], shortLabel: "Blood pressure", sentence: "This lowers your blood pressure." },
  { atc: ["C03"], shortLabel: "Water pill", sentence: "This helps your body get rid of extra water and salt." },
  { atc: ["C10A", "C10B"], shortLabel: "Cholesterol", sentence: "This lowers your cholesterol." },
  { atc: ["C01DA"], shortLabel: "Chest pain", sentence: "This opens up the blood vessels to your heart to stop chest pain." },
  { atc: ["C01B"], shortLabel: "Heart rhythm", sentence: "This keeps your heart beating in a steady rhythm." },
  { atc: ["C01A"], shortLabel: "Heart strength", sentence: "This helps your heart pump more strongly." },
  { atc: ["C01"], shortLabel: "Heart", sentence: "This is a heart medicine." },
  { atc: ["B01AC"], shortLabel: "Blood thinner", sentence: "This stops the small cells in your blood from clumping into clots." },
  { atc: ["B01A"], shortLabel: "Blood thinner", sentence: "This thins your blood so it does not form clots." },
  { atc: ["B03A"], shortLabel: "Iron", sentence: "This is iron. It helps your blood carry oxygen." },
  { atc: ["B03B"], shortLabel: "Vitamin B12 / folate", sentence: "This is a vitamin your blood needs." },

  // Blood sugar and hormones
  { atc: ["A10A"], shortLabel: "Insulin", sentence: "This is insulin. It lowers your blood sugar." },
  { atc: ["A10BJ"], shortLabel: "Blood sugar and weight", sentence: "This lowers your blood sugar and helps with weight." },
  { atc: ["A10BK"], shortLabel: "Blood sugar", sentence: "This lowers your blood sugar by passing extra sugar out in your urine." },
  { atc: ["A10"], shortLabel: "Blood sugar", sentence: "This lowers your blood sugar." },
  { atc: ["H03A"], shortLabel: "Thyroid", sentence: "This replaces a hormone your thyroid is not making enough of." },
  { atc: ["H03B"], shortLabel: "Thyroid", sentence: "This slows down an overactive thyroid." },
  { atc: ["H02"], shortLabel: "Swelling and immune", sentence: "This is a steroid. It calms swelling and the immune system." },
  { atc: ["G03A"], shortLabel: "Birth control", sentence: "This is birth control." },
  { atc: ["G03C", "G03F"], shortLabel: "Hormone", sentence: "This replaces hormones your body is making less of." },
  { atc: ["G04C"], shortLabel: "Prostate", sentence: "This helps with prostate and urination problems." },
  { atc: ["G04BD"], shortLabel: "Bladder", sentence: "This calms an overactive bladder." },
  { atc: ["G04BE"], shortLabel: "Erection", sentence: "This helps with erections." },

  // Stomach and gut
  { atc: ["A02BC", "A02BA", "A02B"], shortLabel: "Stomach acid", sentence: "This lowers the amount of acid in your stomach." },
  { atc: ["A02A"], shortLabel: "Heartburn", sentence: "This neutralises stomach acid to ease heartburn." },
  { atc: ["A04", "A03FA"], shortLabel: "Nausea", sentence: "This stops nausea and vomiting." },
  { atc: ["A03"], shortLabel: "Stomach cramps", sentence: "This eases cramping in your stomach and gut." },
  { atc: ["A06"], shortLabel: "Constipation", sentence: "This helps you have a bowel movement." },
  { atc: ["A07D"], shortLabel: "Diarrhoea", sentence: "This slows down diarrhoea." },
  { atc: ["A07E"], shortLabel: "Gut inflammation", sentence: "This calms inflammation in your gut." },

  // Breathing and allergy
  { atc: ["R03AC", "R03CC"], shortLabel: "Breathing", sentence: "This opens up your airways quickly when breathing is hard." },
  { atc: ["R03BA"], shortLabel: "Breathing", sentence: "This is an inhaled steroid. It keeps the airways calm so attacks happen less." },
  { atc: ["R03AK", "R03AL"], shortLabel: "Breathing", sentence: "This inhaler keeps your airways open through the day." },
  { atc: ["R03"], shortLabel: "Breathing", sentence: "This helps you breathe more easily." },
  { atc: ["R06"], shortLabel: "Allergies", sentence: "This helps with allergies." },
  { atc: ["R01AD"], shortLabel: "Nose", sentence: "This nose spray calms swelling inside your nose." },
  { atc: ["R01"], shortLabel: "Nose", sentence: "This clears a blocked nose." },
  { atc: ["R05"], shortLabel: "Cough", sentence: "This helps with cough." },

  // Infection
  { atc: ["J01"], shortLabel: "Infection", sentence: "This is an antibiotic. It treats an infection." },
  { atc: ["J02", "D01"], shortLabel: "Fungal infection", sentence: "This treats a fungal infection." },
  { atc: ["J05"], shortLabel: "Virus", sentence: "This fights a virus." },
  { atc: ["P01", "P02"], shortLabel: "Infection", sentence: "This treats an infection caused by a parasite." },

  // Brain, mood, sleep
  { atc: ["N06AB", "N06AX", "N06AA", "N06A"], shortLabel: "Mood", sentence: "This helps with depression and mood." },
  { atc: ["N05A"], shortLabel: "Mental health", sentence: "This helps with serious mental health symptoms." },
  { atc: ["N05BA", "N05CD", "N05CF", "N05B", "N05C"], shortLabel: "Calm and sleep", sentence: "This helps you feel calm or helps you sleep." },
  { atc: ["N03A"], shortLabel: "Seizures", sentence: "This helps prevent seizures." },
  { atc: ["N06BA"], shortLabel: "Focus", sentence: "This helps with focus and attention." },
  { atc: ["N04"], shortLabel: "Parkinson's", sentence: "This helps with the shaking and stiffness of Parkinson's." },
  { atc: ["N06D"], shortLabel: "Memory", sentence: "This helps with memory." },
  { atc: ["N07BC"], shortLabel: "Opioid dependence", sentence: "This helps you stay off opioids safely." },

  // Skin, eyes, ears
  { atc: ["D07"], shortLabel: "Skin", sentence: "This cream calms red, itchy, swollen skin." },
  { atc: ["D06"], shortLabel: "Skin infection", sentence: "This treats an infection on your skin." },
  { atc: ["D"], shortLabel: "Skin", sentence: "This is for your skin." },
  { atc: ["S01A"], shortLabel: "Eye infection", sentence: "These eye drops treat an infection in your eye." },
  { atc: ["S01E"], shortLabel: "Eye pressure", sentence: "These eye drops lower the pressure inside your eye." },
  { atc: ["S01"], shortLabel: "Eyes", sentence: "These drops are for your eyes." },
  { atc: ["S02"], shortLabel: "Ears", sentence: "These drops are for your ears." },

  // Vitamins, minerals
  { atc: ["A11CC"], shortLabel: "Vitamin D", sentence: "This is vitamin D. It helps your body use calcium for your bones." },
  { atc: ["A12A"], shortLabel: "Calcium", sentence: "This is calcium, for your bones." },
  { atc: ["A12B"], shortLabel: "Potassium", sentence: "This is potassium. Your body needs it for your heart and muscles." },
  { atc: ["A12"], shortLabel: "Supplement", sentence: "This is a mineral supplement." },
  { atc: ["A11"], shortLabel: "Vitamin", sentence: "This is a vitamin." },

  // Cancer / immune
  { atc: ["L04"], shortLabel: "Immune system", sentence: "This calms down your immune system." },
  { atc: ["L01"], shortLabel: "Cancer", sentence: "This is a cancer medicine." },
];

/** A short plain sentence from an FDA label's indications, when the class map has nothing. */
function fromLabel(text: string | null | undefined): string | null {
  if (!text) return null;
  let t = text
    .replace(/^\s*\d*\s*INDICATIONS? (AND|&) USAGE:?\s*/i, "")
    .replace(/\(\s*\d+(\.\d+)?\s*\)/g, "")
    .replace(/\s+/g, " ")
    .trim();
  // "X is indicated for the treatment of Y in adults" -> "This is used for Y."
  const m = t.match(/indicated (?:for|to|in)\s+(?:the\s+)?(?:treatment of\s+|management of\s+|relief of\s+|prevention of\s+|reduce\s+|reduction of\s+)?([^.;:]{8,110})/i);
  if (m) {
    let what = m[1].trim().replace(/\s+in (adults?|adult patients|patients)\b.*$/i, "");
    return `This is used for ${what.charAt(0).toLowerCase()}${what.slice(1)}.`;
  }
  const first = t.split(/(?<=[.])\s/)[0];
  return first.length < 140 ? first : null;
}

function classIds(classes: DrugClass[]) {
  return classes.filter((c) => c.classType.startsWith("ATC")).map((c) => c.classId);
}

/**
 * A class describes what a drug IS; the visit describes why it was given.
 * Topiramate is an anti-seizure drug, but for a migraine patient it is
 * "prevents migraines", and that is the sentence they need. Keyed by the
 * visit's condition, then an ATC prefix.
 */
const CONTEXT: Record<string, { atc: string[]; shortLabel: string; sentence: string }[]> = {
  migraine: [
    { atc: ["N03A", "C07", "N06AA", "C08"], shortLabel: "Migraine prevention", sentence: "This is taken every day to make migraines happen less often." },
    { atc: ["A04", "A03FA"], shortLabel: "Nausea", sentence: "This stops the sickness that comes with a migraine." },
  ],
  "atrial-fibrillation": [
    { atc: ["C07", "C08D", "C01B"], shortLabel: "Heart rhythm", sentence: "This keeps your heart from racing." },
    { atc: ["B01A"], shortLabel: "Blood thinner", sentence: "This thins your blood so the irregular beat cannot form a clot that causes a stroke." },
  ],
  "myocardial-infarction": [
    { atc: ["B01AC"], shortLabel: "Protecting your heart", sentence: "This stops clots forming in the artery that was blocked." },
    { atc: ["C10A"], shortLabel: "Protecting your heart", sentence: "This lowers cholesterol to protect the arteries around your heart." },
    { atc: ["C07"], shortLabel: "Protecting your heart", sentence: "This takes strain off your heart while it recovers." },
  ],
  "heart-failure": [
    { atc: ["C03"], shortLabel: "Fluid", sentence: "This gets rid of the extra fluid that makes you breathless and swollen." },
  ],
  "lumbar-disc-herniation": [
    { atc: ["N03A", "N06AA"], shortLabel: "Nerve pain", sentence: "This calms the nerve that is causing pain down your leg." },
    { atc: ["H02"], shortLabel: "Swelling", sentence: "This is a short course of steroid to shrink the swelling around the nerve." },
  ],
  "wisdom-tooth-extraction": [
    { atc: ["J01"], shortLabel: "Infection", sentence: "This antibiotic stops the sockets getting infected while they heal." },
  ],
  "dental-abscess": [
    { atc: ["J01"], shortLabel: "Infection", sentence: "This antibiotic treats the infection in your tooth." },
  ],
};

export function plainPurpose(
  med: NormalizedMed,
  labelFallback?: string | null,
  conditionId?: string | null,
): PlainPurpose {
  const ids = classIds(med.classes);

  for (const rule of CONTEXT[conditionId ?? ""] ?? []) {
    if (rule.atc.some((prefix) => ids.some((id) => id.startsWith(prefix)))) {
      return { sentence: rule.sentence, shortLabel: rule.shortLabel, curated: true };
    }
  }
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

  // A list of chemical names ("aspirin and caffeine and salicylamide") means
  // nothing to the person this is for. If no class matched, say so plainly
  // and let the clinician fill it in before the screen is turned.

  // The label's own indication, simplified, before any generic sentence. The
  // clinician sees `curated: false` and can reword it before the screen turns.
  const fromTheLabel = fromLabel(labelFallback);
  if (fromTheLabel) return { sentence: fromTheLabel, shortLabel: "Medicine", curated: false };

  return {
    sentence: "Your doctor prescribed this for you. We will explain what it is for before you leave.",
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
    // Never tell a patient their directions were "not readable". The clinician
    // sees this flagged in the composer and fixes it; the patient sees a
    // sentence that is true and calm.
    return { text: "Take it the way your doctor told you.", parsed: false };
  }

  const { unitsPerDose, dosesPerDay, asNeeded } = parseSigQuantities(sig);

  // Migraine-style directions have no daily schedule at all.
  const onset = /at (?:the )?(?:first sign|onset|start)|when (?:a |the )?(?:migraine|headache|attack) (?:starts|begins)/i.exec(sig);
  if (onset) {
    let text = "One pill as soon as the migraine starts.";
    const rep = /repeat (?:once )?(?:after|in) (\d+) ?(?:h|hr|hrs|hour|hours)/i.exec(sig);
    if (rep) text += ` If it comes back, you can take one more after ${rep[1]} hours - but only once.`;
    return { text, parsed: true };
  }

  if (dosesPerDay === null && !asNeeded) return { text: sig, parsed: false };

  const words = ["", "One", "Two", "Three", "Four", "Five", "Six"];
  const count = unitsPerDose === 0.5 ? "Half a" : (words[unitsPerDose] ?? String(unitsPerDose));
  const pill = unitsPerDose === 1 || unitsPerDose === 0.5 ? "pill" : "pills";

  const s = sig.toLowerCase();
  let when = "";
  if (/bedtime|nightly|at night|qhs|qpm|every evening|every night/.test(s)) when = "at bedtime";
  else if (/qam|every morning|in the morning/.test(s)) when = "in the morning";
  else if (dosesPerDay === 1) when = "once a day";
  else if (dosesPerDay === 2) when = "twice a day";
  else if (dosesPerDay === 3) when = "three times a day";
  else if (dosesPerDay === 0.5) when = "every other day";
  else if (dosesPerDay !== null && dosesPerDay < 0.5) when = "once a week";
  else if (dosesPerDay && dosesPerDay >= 4) when = `up to ${dosesPerDay} times a day`;

  let text = `${count} ${pill}${when ? `, ${when}` : ""}.`;
  if (asNeeded) text += " Only when you need it.";

  // Keep the qualifiers that change what the patient should do.
  if (/with food|with a meal|with meals/.test(s)) text += " Take it with food.";
  if (/empty stomach/.test(s)) text += " Take it on an empty stomach.";
  // "x 7 days", "for 7 days", or a bare trailing "7 days" from an EHR field -
  // but not "every 2 days", which is a frequency.
  const days = s.match(/(?<!every\s)(?<!q)(?:x|for)?\s*(\d+)\s*(?:days?|d\b)(?!\s*(?:a|per)\b)/);
  if (days) text += ` For ${days[1]} days.`;
  const months = s.match(/(?:x|for)\s*(\d+)\s*months?/);
  if (months) text += ` For ${months[1]} months.`;

  return { text, parsed: true };
}
