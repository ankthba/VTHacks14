import { dailyMedUrl, fetchLabel, interactionsText } from "./openfda";
import { generateJson, activeProvider } from "./llm";
import { displayName } from "./display";
import { InteractionVerdictSchema } from "./schemas";
import type { Finding, NormalizedMed, Severity } from "./types";

/**
 * Pairwise interaction checking, grounded in retrieved FDA label text.
 *
 * The NLM RxNav interaction API (rxnav.nlm.nih.gov/REST/interaction/*) was
 * retired 2024-01-02 and now returns HTTP 404 - we confirmed that rather than
 * trusting the docs. There is no free drop-in replacement.
 *
 * Rather than ask a model "do A and B interact?", which invites confabulation,
 * this runs in two separable stages:
 *
 *   DETECTION  - deterministic. We retrieve A's actual FDA drug-interactions
 *                section and search it for B's ingredient names and class
 *                keywords. The quote we display is the matching sentence,
 *                lifted verbatim. No model runs, so nothing can be invented,
 *                and this stage works with no API key at all.
 *
 *   PHRASING   - optional. If a model is configured it rewrites that sentence
 *                into plain language and rates severity, seeing ONLY the quote
 *                we already extracted. If it is unavailable we fall back to a
 *                template. The model can change the wording; it cannot change
 *                whether a finding exists.
 */

/**
 * Class words that appear in label text as a group rather than by drug name.
 * A warfarin label says "NSAIDs", never "ibuprofen, naproxen, ketoprofen...".
 */
const CLASS_KEYWORDS: { match: RegExp; words: string[] }[] = [
  { match: /nonsteroidal anti-?inflammatory|propionic acid|M01A/i, words: ["nsaid", "nonsteroidal anti-inflammatory", "non-steroidal anti-inflammatory"] },
  { match: /angiotensin.converting enzyme|C09A/i, words: ["ace inhibitor", "angiotensin converting enzyme"] },
  { match: /angiotensin 2 receptor|angiotensin ii receptor|C09C/i, words: ["angiotensin receptor blocker", "angiotensin ii receptor"] },
  { match: /opioid|N02A/i, words: ["opioid", "narcotic analgesic"] },
  { match: /benzodiazepine|N05BA|N05CD/i, words: ["benzodiazepine"] },
  { match: /proton pump|A02BC/i, words: ["proton pump inhibitor"] },
  { match: /HMG-?CoA|statin|C10AA/i, words: ["statin", "hmg-coa reductase inhibitor"] },
  { match: /serotonin reuptake|N06AB/i, words: ["ssri", "selective serotonin reuptake inhibitor"] },
  { match: /anticoagulant|vitamin K antagonist|B01A/i, words: ["anticoagulant", "warfarin"] },
  { match: /salicylate|B01AC06|N02BA/i, words: ["salicylate", "aspirin"] },
];

/** Every term whose presence in a label means "this passage is about that drug". */
function searchTerms(med: NormalizedMed): string[] {
  const terms = new Set<string>();

  for (const ing of med.ingredients) {
    // "hydrocodone bitartrate" -> also match the base name.
    terms.add(ing.name.toLowerCase());
    const base = ing.name.toLowerCase().split(" ")[0];
    if (base.length > 4) terms.add(base);
  }

  const classText = med.classes.map((c) => `${c.className} ${c.classId}`).join(" ");
  for (const entry of CLASS_KEYWORDS) {
    if (entry.match.test(classText)) {
      for (const w of entry.words) terms.add(w);
    }
  }
  return [...terms].filter((t) => t.length > 3);
}

/** Splits label prose into sentences we can quote without mangling. */
function sentences(text: string): string[] {
  return text
    .replace(/\s+/g, " ")
    .split(/(?<=[.;:])\s+(?=[A-Z(])/)
    .map((s) => s.trim())
    .filter((s) => s.length > 20);
}

interface Hit {
  sentence: string;
  term: string;
}

/** DETECTION - pure string search over retrieved label text. */
function findMentions(labelText: string, other: NormalizedMed): Hit | null {
  const terms = searchTerms(other);
  if (terms.length === 0) return null;

  const sents = sentences(labelText);
  // Prefer a sentence naming the drug itself over one naming only its class.
  const ingredientTerms = new Set(
    other.ingredients.flatMap((i) => [
      i.name.toLowerCase(),
      i.name.toLowerCase().split(" ")[0],
    ]),
  );

  let classHit: Hit | null = null;
  for (const s of sents) {
    const low = s.toLowerCase();
    for (const t of terms) {
      if (!low.includes(t)) continue;
      if (ingredientTerms.has(t)) return { sentence: s, term: t };
      classHit ??= { sentence: s, term: t };
    }
  }
  return classHit;
}

/** Heuristic severity used when no model is available to rate the quote. */
function severityFromText(s: string): Severity {
  const low = s.toLowerCase();
  if (/fatal|death|severe|hemorrhage|haemorrhage|contraindicated|boxed warning|life-threatening/.test(low)) {
    return "high";
  }
  if (/bleed|increase[sd]? the risk|avoid|caution|monitor closely/.test(low)) {
    return "high";
  }
  if (/monitor|may (increase|decrease|reduce)|adjust/.test(low)) return "moderate";
  return "moderate";
}

function buildPrompt(subject: NormalizedMed, other: NormalizedMed, quote: string) {
  return `This sentence is copied word-for-word from the FDA "Drug Interactions" label section for ${displayName(subject)}:

<<<
${quote}
>>>

The patient also takes ${displayName(other)} (active ingredients: ${other.ingredients.map((i) => i.name).join(", ") || "unknown"}).

Using ONLY the sentence above, write a one-sentence explanation a patient can
understand, at a 6th-grade reading level, phrased as something to ask their
pharmacist about. Never tell them to stop or change a medicine.

Reply with JSON only:
{"interaction": true, "quote": ${JSON.stringify(quote.slice(0, 200))}, "plain_language": "<one sentence>", "severity": "high"|"moderate"|"low"}

Set "interaction" to false only if the sentence above is genuinely unrelated to ${displayName(other)}.
Do not use any knowledge from outside the sentence above.`;
}


/**
 * Label sections often contain long tables flattened into one "sentence". Show
 * a window centred on the matched term so the citation displays the part that
 * actually matters, rather than the first 400 characters of a drug-class table.
 */
function quoteWindow(sentence: string, term: string, width = 280): string {
  if (sentence.length <= width) return sentence;

  const at = sentence.toLowerCase().indexOf(term.toLowerCase());
  if (at === -1) return `${sentence.slice(0, width)}...`;

  let start = Math.max(0, at - Math.floor(width / 2));
  let end = Math.min(sentence.length, start + width);
  // Snap to word boundaries so we never cut a drug name in half.
  if (start > 0) {
    const sp = sentence.indexOf(" ", start);
    if (sp !== -1 && sp < at) start = sp + 1;
  }
  const lastSp = sentence.lastIndexOf(" ", end);
  if (lastSp > at + term.length) end = lastSp;

  return `${start > 0 ? "..." : ""}${sentence.slice(start, end).trim()}${end < sentence.length ? "..." : ""}`;
}

async function checkDirection(
  subject: NormalizedMed,
  other: NormalizedMed,
): Promise<Finding | null> {
  const label = await fetchLabel(subject, { requireInteractions: true });
  const text = interactionsText(label);
  if (!text) return null;

  // Stage 1: deterministic. If the label does not mention it, we emit nothing.
  // Silence is the correct output.
  const hit = findMentions(text, other);
  if (!hit) return null;

  const quote = quoteWindow(hit.sentence, hit.term);

  let plain = `The FDA label for ${displayName(subject)} talks about taking it together with ${displayName(other)}. Ask your pharmacist whether that applies to you.`;
  let severity = severityFromText(hit.sentence);

  // Stage 2: optional phrasing pass over the quote we already extracted.
  if (activeProvider() !== "none") {
    try {
      const v = await generateJson(
        buildPrompt(subject, other, quote),
        InteractionVerdictSchema,
      );
      if (v.interaction && v.plain_language.trim()) {
        plain = v.plain_language.trim();
        severity = v.severity;
      }
    } catch {
      // Keep the deterministic template.
    }
  }

  const url =
    dailyMedUrl(label) ??
    `https://api.fda.gov/drug/label.json?search=openfda.rxcui:%22${subject.rxcui}%22&limit=1`;

  return {
    id: `interaction-${subject.id}-${other.id}`,
    kind: "label_interaction",
    severity,
    // Detection was deterministic; only the wording above may be model-written.
    computed: true,
    med_ids: [subject.id, other.id],
    headline: `The ${displayName(subject)} label warns about ${displayName(other)}`,
    detail: plain,
    quote,
    citations: [{ label: `FDA label: ${displayName(subject)}`, url }],
  };
}

export async function labelInteractions(meds: NormalizedMed[]): Promise<Finding[]> {
  const resolved = meds.filter((m) => m.rxcui && m.ingredients.length > 0);
  const jobs: Promise<Finding | null>[] = [];

  for (let i = 0; i < resolved.length; i++) {
    for (let j = i + 1; j < resolved.length; j++) {
      jobs.push(checkDirection(resolved[i], resolved[j]));
      jobs.push(checkDirection(resolved[j], resolved[i]));
    }
  }

  const results = (await Promise.all(jobs)).filter((f): f is Finding => f !== null);

  // Merge both directions for a pair into the more severe single finding.
  const rank: Record<Severity, number> = { high: 0, moderate: 1, low: 2 };
  const byPair = new Map<string, Finding>();
  for (const f of results) {
    const key = [...f.med_ids].sort().join("|");
    const existing = byPair.get(key);
    if (!existing) {
      byPair.set(key, f);
      continue;
    }
    const keep = rank[f.severity] < rank[existing.severity] ? f : existing;
    const drop = keep === f ? existing : f;
    keep.citations = [...keep.citations, ...drop.citations];
    byPair.set(key, keep);
  }
  return [...byPair.values()];
}
