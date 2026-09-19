import { z } from "zod";
import { activeProvider, generateJson, type ImagePart } from "./llm";
import { chooseCondition, matchConditionDetailed } from "./anatomy/conditions";
import { detectHowTos } from "./howto";

/**
 * Turn a clinical document into the inputs for an explain card.
 *
 * Doctors already write the note. Asking them to re-enter it into a second
 * form is the friction that kills adoption, so the note IS the input: paste a
 * discharge summary, an after-visit summary, or a clinic note, or photograph
 * the printed page.
 *
 * Two extraction paths, layered:
 *   1. DETERMINISTIC - section headers and line patterns. Discharge summaries
 *      are structured enough that this gets most of the way on its own, and it
 *      works with no API key.
 *   2. MODEL - fills gaps in unstructured prose. Output is validated against
 *      the same schema, and the diagnosis is still matched against our curated
 *      library rather than trusted as free text.
 *
 * Diagnosis matching is deterministic in both cases: the model may find the
 * phrase "NSTEMI", but which diagram and which plain sentence that becomes is
 * decided by the library, not by the model.
 */

export const ParsedNoteSchema = z.object({
  diagnoses: z.array(z.string()),
  medications: z.array(
    z.object({
      name: z.string(),
      strength: z.string().nullable().optional(),
      sig: z.string().nullable(),
    }),
  ),
  instructions: z.array(z.string()),
  followUp: z.array(z.string()),
});
export type ParsedNote = z.infer<typeof ParsedNoteSchema>;

export interface ParseResult extends ParsedNote {
  /** The library condition the primary diagnosis resolved to, if any. */
  conditionId: string | null;
  /** The phrase or code in the note that produced that match. */
  conditionMatchedOn: string | null;
  /** Procedures the instructions call for, from the how-to library. */
  howtoIds: string[];
  /** How the extraction was done. */
  method: "deterministic" | "model" | "both";
}

const SECTION_ALIASES: Record<keyof ParsedNote, string[]> = {
  diagnoses: [
    "diagnosis", "diagnoses", "dx", "discharge diagnosis", "discharge diagnoses", "discharge dx",
    "principal diagnosis", "principal dx", "primary diagnosis", "primary dx", "final diagnosis",
    "secondary", "secondary diagnosis", "secondary diagnoses", "secondary dx", "other diagnoses",
    "comorbidities", "assessment", "impression", "assessment and plan", "a/p", "a&p",
    "problem list", "problems", "reason for visit", "chief complaint", "cc", "hpi",
  ],
  medications: [
    "medications", "medication", "medication list", "meds", "med list", "rx", "prescriptions",
    "discharge medications", "discharge meds", "meds at discharge", "medications at discharge",
    "medications on discharge", "new medications", "new meds", "current medications",
    "medications (active)", "active medications", "take these medicines", "prescribed",
  ],
  instructions: [
    "instructions", "discharge instructions", "patient instructions", "activity", "diet",
    "wound care", "plan", "recommendations", "what to do", "home care", "care instructions",
    "restrictions", "precautions",
  ],
  followUp: [
    "follow up", "follow-up", "followup", "f/u", "fu", "return", "appointments", "return to clinic",
    "rtc", "return precautions", "when to seek care", "call if", "when to call", "next steps",
  ],
};

/**
 * "Ibuprofen 600 mg PO TID x 7 days" -> name / strength / directions.
 * Anchored at line start; used for lines under a medications header.
 */
const MED_LINE =
  /^[-*•\d.)\s]*([A-Za-z][A-Za-z0-9\-/ ]{1,40}?)\s+(\d+(?:\.\d+)?\s*(?:mg|mcg|g|ml|units?|%|meq)\b)\s*(.*)$/i;

/**
 * The same shape found anywhere in prose: "started on ibuprofen 600mg TID
 * with food and acetaminophen 500mg q6h prn pain". Captures the drug, the
 * strength, and the directions up to the next drug, a full stop, or "and".
 */
const MED_PROSE =
  /\b([A-Za-z][a-z]{3,}(?:\s[a-z]{4,})?)\s*(\d+(?:\.\d+)?\s*(?:mg|mcg|g|ml|units?|meq))\b([^.;]*?)(?=\s+(?:and|plus|,|;|\.|$)\b|\s+[A-Za-z][a-z]{3,}\s*\d|[.;]|$)/g;

/**
 * Prose puts ordinary words right before a drug: "started on ibuprofen",
 * "continue home lisinopril". The regex above may sweep one of them into the
 * name; these are dropped from the front of a captured name.
 */
const NAME_STOPWORDS = new Set([
  "home", "continue", "continued", "started", "start", "on", "with", "and", "take", "takes",
  "taking", "given", "gave", "give", "prescribed", "prescribe", "added", "add", "resume",
  "increase", "decrease", "oral", "daily", "also", "plus", "then", "now", "his", "her", "their",
]);
const cleanName = (n: string) =>
  n.split(/\s+/).filter((w, i, a) => !(NAME_STOPWORDS.has(w.toLowerCase()) && i < a.length - 1)).join(" ");

/** Words that mean a mentioned drug is NOT one to take. */
const NEGATED = /\b(allerg|stop|stopped|discontinu|hold|held|do not take|avoid|no longer)\w*/i;

/** A sentence that tells the patient to do something. */
const INSTRUCTION_CUES =
  /\b(keep|elevate|ice|rest|avoid|no |do not|don'?t|wear|use|apply|change|clean|drink|eat|diet|activity|weight.?bear|non.?weight|crutch|brace|splint|sling|shower|bath|drive|driving|lift|lifting|exercise|rehab|walk|sleep|rice\b)/i;

/** A sentence about coming back or calling. */
const FOLLOWUP_CUES =
  /\b(f\/u|follow.?up|rtc|return|come back|call|911|ed\b|er\b|emergency|clinic|appointment|see (?:your|the)|recheck|repeat (?:x-?ray|film|labs?|imaging)|in \d+ ?(?:day|wk|week|month))/i;

function normaliseHeader(line: string): keyof ParsedNote | null {
  const h = line
    .toLowerCase()
    .replace(/[:#*_\-–—]+$/g, "")
    .replace(/^[#*_\s\-–—]+/g, "")
    .replace(/\s+/g, " ")
    .trim();
  if (h.length > 44) return null;
  for (const [key, aliases] of Object.entries(SECTION_ALIASES) as [keyof ParsedNote, string[]][]) {
    if (aliases.some((a) => h === a || h.startsWith(`${a} `) || h.startsWith(`${a}:`) || h.startsWith(`${a}(`))) {
      return key;
    }
  }
  return null;
}

const cleanLine = (l: string) => l.replace(/^[-*•·\d.)\s]+/, "").trim();

/** Strip a leading ICD code for display; matching still sees the raw text. */
const stripIcd = (d: string) => d.replace(/^[A-Z]\d{2}(?:\.\d{1,4})?[A-Z]?\s*[-–:]?\s*/, "").trim() || d;

function looksLikeMed(line: string) {
  return MED_LINE.test(line) || /\|\s*\d+\s*(?:tab|cap)/i.test(line);
}

function parseMedLine(value: string): ParsedNote["medications"][number] | null {
  // EHR pipe fields: "Ibuprofen 600 MG tablet | 1 tablet | Oral | 3 times daily | 7 days"
  if (value.includes("|")) {
    const [head, ...rest] = value.split("|").map((x) => x.trim());
    const m = head.match(/^([A-Za-z][A-Za-z0-9\-/ ]{1,40}?)\s+(\d+(?:\.\d+)?\s*(?:mg|mcg|g|ml|units?|%|meq))\b/i);
    if (m) return { name: m[1].trim(), strength: m[2].trim(), sig: rest.join(" ").trim() || null };
    return { name: head, strength: null, sig: rest.join(" ").trim() || null };
  }
  const m = value.match(MED_LINE);
  if (m) return { name: m[1].trim(), strength: m[2].trim(), sig: m[3].trim() || null };
  return null;
}

/** Split prose into sentences without breaking on "q6h." or decimals. */
function sentences(text: string): string[] {
  return text
    .replace(/\s+/g, " ")
    .split(/(?<=[.!?])\s+(?=[A-Z])/)
    .map((x) => x.trim())
    .filter((x) => x.length > 3);
}

export function parseDeterministic(text: string): ParsedNote {
  const out: ParsedNote = { diagnoses: [], medications: [], instructions: [], followUp: [] };
  let section: keyof ParsedNote | null = null;
  let sawHeader = false;

  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line) continue;

    // A header may carry content after the colon: "Dx: ankle sprain".
    const colon = line.indexOf(":");
    const headerPart = colon > 0 ? line.slice(0, colon) : line;
    const rest = colon > 0 ? line.slice(colon + 1).trim() : "";
    const key = normaliseHeader(headerPart);

    if (key) {
      section = key;
      sawHeader = true;
      if (rest) pushInto(out, key, rest);
      continue;
    }

    if (!section) {
      // No header yet - still catch a line that is unmistakably a medication.
      const med = looksLikeMed(line) ? parseMedLine(cleanLine(line)) : null;
      if (med) out.medications.push(med);
      continue;
    }

    const value = cleanLine(line);
    // Under a medications header, a line with no dose is not a medication -
    // it is the note moving on without a new header ("RICE. Weight bear...").
    if (section === "medications" && !looksLikeMed(value) && value.length > 20) {
      routeSentence(out, value);
      continue;
    }
    pushInto(out, section, value);
  }

  // Prose notes have no headers at all. Fall back to scanning the whole text.
  if (!sawHeader || (out.diagnoses.length === 0 && out.medications.length === 0)) {
    scanProse(text, out);
  }
  return out;
}

function pushInto(out: ParsedNote, key: keyof ParsedNote, value: string) {
  if (!value) return;
  if (key === "medications") {
    const med = parseMedLine(value);
    out.medications.push(med ?? { name: value, strength: null, sig: null });
    return;
  }
  if (key === "diagnoses") {
    // "Distal radius fracture, left, nondisplaced" is ONE diagnosis; a comma
    // followed by a capital starts another. Semicolons always separate.
    for (const d of value.split(/;\s*|,\s+(?=[A-Z])/)) {
      if (d.trim()) out.diagnoses.push(stripIcd(d.trim()));
    }
    return;
  }
  // Instruction sections often hold several sentences on one line.
  const parts = key === "followUp" || key === "instructions" ? sentences(value) : [value];
  for (const p of parts) {
    if (key === "instructions" && FOLLOWUP_CUES.test(p) && !INSTRUCTION_CUES.test(p)) out.followUp.push(p);
    else out[key].push(p);
  }
}

/** A sentence that arrived without a header: decide where it belongs. */
function routeSentence(out: ParsedNote, s: string) {
  for (const p of sentences(s)) {
    if (FOLLOWUP_CUES.test(p)) out.followUp.push(p);
    else if (INSTRUCTION_CUES.test(p)) out.instructions.push(p);
  }
}

/** Free-text H&P with no structure: medications, diagnosis and instructions from prose. */
function scanProse(text: string, out: ParsedNote) {
  const seen = new Set(out.medications.map((m) => m.name.toLowerCase()));
  for (const sent of sentences(text)) {
    if (NEGATED.test(sent)) continue;
    for (const m of sent.matchAll(MED_PROSE)) {
      const name = cleanName(m[1].trim());
      if (seen.has(name.toLowerCase())) continue;
      seen.add(name.toLowerCase());
      out.medications.push({ name, strength: m[2].trim(), sig: m[3].trim() || null });
    }
  }
  if (out.diagnoses.length === 0) {
    const hit = matchConditionDetailed(text);
    if (hit) out.diagnoses.push(hit.matched);
  }
  if (out.instructions.length === 0 && out.followUp.length === 0) {
    for (const sent of sentences(text)) {
      // Skip the sentences that were medication orders.
      if (MED_PROSE.test(sent)) { MED_PROSE.lastIndex = 0; continue; }
      MED_PROSE.lastIndex = 0;
      if (FOLLOWUP_CUES.test(sent)) out.followUp.push(sent);
      else if (INSTRUCTION_CUES.test(sent)) out.instructions.push(sent);
    }
  }
}

const MODEL_PROMPT = `Extract the patient-relevant facts from this clinical document.

Return JSON only:
{
  "diagnoses": ["<each diagnosis or problem, as written>"],
  "medications": [{"name": "<drug and strength as written>", "sig": "<directions as written, or null>"}],
  "instructions": ["<each activity, diet, wound-care or general instruction>"],
  "followUp": ["<each follow-up appointment or return precaution>"]
}

RULES
- Copy phrases as written. Do not paraphrase, expand abbreviations, or add anything not in the document.
- Include only medications the patient is told to TAKE. Skip anything stopped, held, or listed as an allergy.
- Use null when directions are absent. Use [] for empty sections.
- No prose, no code fence.`;

function isThin(p: ParsedNote) {
  return p.diagnoses.length === 0 || (p.medications.length === 0 && p.instructions.length === 0);
}

export async function parseNote(
  text: string,
  images: ImagePart[] = [],
): Promise<ParseResult> {
  const det = text.trim() ? parseDeterministic(text) : { diagnoses: [], medications: [], instructions: [], followUp: [] };
  let result: ParsedNote = det;
  let method: ParseResult["method"] = "deterministic";

  // A photographed page has no text to parse; an unstructured note may leave
  // the deterministic pass thin. Either way the model fills in - and its
  // output goes through the same schema and the same library match.
  if ((images.length > 0 || isThin(det)) && activeProvider() !== "none") {
    try {
      const prompt = text.trim() ? `${MODEL_PROMPT}\n\n<<<\n${text}\n>>>` : MODEL_PROMPT;
      const fromModel = await generateJson(prompt, ParsedNoteSchema, images);
      result = merge(det, fromModel);
      method = text.trim() ? "both" : "model";
    } catch {
      // Keep the deterministic result.
    }
  }

  const primary = chooseCondition(result.diagnoses);

  return {
    ...result,
    conditionId: primary?.condition.id ?? null,
    conditionMatchedOn: primary?.matched ?? null,
    howtoIds: detectHowTos([...result.instructions, ...result.followUp, text]),
    method,
  };
}

/** Union, deterministic first, de-duplicated case-insensitively. */
function merge(a: ParsedNote, b: ParsedNote): ParsedNote {
  const dedupe = (xs: string[]) => {
    const seen = new Set<string>();
    return xs.filter((x) => {
      const k = x.toLowerCase().trim();
      if (!k || seen.has(k)) return false;
      seen.add(k);
      return true;
    });
  };
  const medKey = (m: { name: string }) => m.name.toLowerCase().trim().split(" ")[0];
  const meds = [...a.medications];
  for (const m of b.medications) {
    if (!meds.some((x) => medKey(x) === medKey(m))) meds.push(m);
  }
  return {
    diagnoses: dedupe([...a.diagnoses, ...b.diagnoses]),
    medications: meds,
    instructions: dedupe([...a.instructions, ...b.instructions]),
    followUp: dedupe([...a.followUp, ...b.followUp]),
  };
}
