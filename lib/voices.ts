/**
 * Pick the best built-in voice, not the default one.
 *
 * Every browser ships a handful of voices per language and defaults to the
 * oldest. On a Mac the difference between "Fred" and "Ava (Premium)" or
 * "Samantha (Enhanced)" is the difference between a robot and a person. When
 * ElevenLabs cannot answer - no key, or the free budget is spent - this is
 * what reads to the patient, so it is worth choosing.
 */
const PREFERRED = [
  /premium/i, /enhanced/i, /natural/i, /neural/i, /\bava\b/i, /\bzoe\b/i, /\bsamantha\b/i,
  /\bkaren\b/i, /\bmoira\b/i, /\bdaniel\b/i, /google/i, /microsoft .*online/i, /siri/i,
];

export function bestVoice(langTag: string): SpeechSynthesisVoice | null {
  if (typeof window === "undefined" || !window.speechSynthesis) return null;
  const all = window.speechSynthesis.getVoices();
  if (all.length === 0) return null;
  const lang = langTag.toLowerCase();
  const base = lang.split("-")[0];
  const exact = all.filter((v) => v.lang.toLowerCase() === lang);
  const same = all.filter((v) => v.lang.toLowerCase().startsWith(base));
  const pool = exact.length ? exact : same.length ? same : all;

  for (const re of PREFERRED) {
    const hit = pool.find((v) => re.test(v.name));
    if (hit) return hit;
  }
  // Prefer a non-"compact"/low-quality voice if that is all that separates them.
  return pool.find((v) => !/compact|eloquence|novelty/i.test(v.name)) ?? pool[0];
}

/** Voices load asynchronously in some browsers; resolve once they exist. */
export function whenVoicesReady(): Promise<void> {
  return new Promise((resolve) => {
    if (typeof window === "undefined" || !window.speechSynthesis) return resolve();
    if (window.speechSynthesis.getVoices().length) return resolve();
    const done = () => { window.speechSynthesis.removeEventListener("voiceschanged", done); resolve(); };
    window.speechSynthesis.addEventListener("voiceschanged", done);
    setTimeout(done, 800);
  });
}
