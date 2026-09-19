import { activeProvider, generateJson } from "./llm";
import { cacheGet, cacheSet } from "./cache";
import { z } from "zod";

/**
 * Translation for the patient screen, with no key required.
 *
 * Two providers, best-available first:
 *   1. A configured model (Gemini/Anthropic) - translates the whole card in one
 *      call with the medical constraints in the prompt.
 *   2. MyMemory, a free public translation memory. No key, ~5,000 characters a
 *      day anonymously. Sentence-at-a-time, so it is slower and blunter, but it
 *      works with nothing configured - which is the state this project is
 *      demoed in.
 *
 * Every string is cached to disk by (language, text) hash. The demo cards are
 * pre-translated and committed, so on stage nothing is fetched at all.
 *
 * In either path the translator only translates. What a drug is for, and how to
 * take it, was decided by the curated library in English; nothing clinical is
 * introduced here. Medication names are never passed through - the patient
 * has to match them against a printed bottle.
 */

export const LANGUAGES: Record<string, { mymemory: string; tag: string; native: string }> = {
  English: { mymemory: "en", tag: "en-US", native: "English" },
  Spanish: { mymemory: "es", tag: "es-ES", native: "Español" },
  Vietnamese: { mymemory: "vi", tag: "vi-VN", native: "Tiếng Việt" },
  "Chinese (Simplified)": { mymemory: "zh-CN", tag: "zh-CN", native: "简体中文" },
  Arabic: { mymemory: "ar", tag: "ar-SA", native: "العربية" },
};

const key = (lang: string, text: string) => `translate|${lang}|${text}`;

async function readCache(k: string): Promise<string | null> {
  return cacheGet<string>(k);
}

async function writeCache(k: string, value: string) {
  await cacheSet(k, value);
}

async function mymemory(text: string, to: string): Promise<string | null> {
  const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=en|${to}`;
  try {
    const r = await fetch(url, { signal: AbortSignal.timeout(12_000) });
    const j = (await r.json()) as {
      responseStatus?: number;
      responseData?: { translatedText?: string };
    };
    const t = j.responseData?.translatedText?.trim();
    if (j.responseStatus !== 200 || !t) return null;
    // MyMemory returns its error text with a 200 in the body sometimes.
    if (/^(MYMEMORY WARNING|QUERY LENGTH LIMIT)/i.test(t)) return null;
    return t;
  } catch {
    return null;
  }
}

/**
 * Translate a list of strings. Returns the originals for anything that could
 * not be translated, and says so in `untranslated`, rather than failing the
 * whole card.
 */
export async function translateStrings(
  strings: string[],
  language: string,
): Promise<{ out: string[]; provider: "none" | "model" | "mymemory" | "cache"; untranslated: number }> {
  const lang = LANGUAGES[language];
  if (!lang || lang.mymemory === "en") return { out: strings, provider: "none", untranslated: 0 };

  const out = [...strings];
  const pending: number[] = [];
  for (let i = 0; i < strings.length; i++) {
    if (!strings[i].trim()) continue;
    const hit = await readCache(key(lang.mymemory, strings[i]));
    if (hit) out[i] = hit;
    else pending.push(i);
  }
  if (pending.length === 0) return { out, provider: "cache", untranslated: 0 };

  // Path 1: a real model, whole batch, with the constraints stated.
  if (activeProvider() !== "none") {
    try {
      const payload = pending.map((i) => strings[i]);
      const res = await generateJson(
        `Translate each string into ${language} at a 6th-grade reading level. Translate only - do not add, remove, soften or reinterpret any medical statement. Keep the same order and count.\n\nReturn ONLY a JSON array of strings.\n${JSON.stringify(payload)}`,
        z.array(z.string()).length(payload.length),
      );
      for (let k = 0; k < pending.length; k++) {
        out[pending[k]] = res[k];
        await writeCache(key(lang.mymemory, strings[pending[k]]), res[k]);
      }
      return { out, provider: "model", untranslated: 0 };
    } catch {
      // Fall through to MyMemory.
    }
  }

  // Path 2: MyMemory, one string at a time, sequential to be polite to a free API.
  let untranslated = 0;
  for (const i of pending) {
    const t = await mymemory(strings[i], lang.mymemory);
    if (t) {
      out[i] = t;
      await writeCache(key(lang.mymemory, strings[i]), t);
    } else {
      untranslated++;
    }
  }
  return { out, provider: "mymemory", untranslated };
}
