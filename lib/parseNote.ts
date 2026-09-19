import { z } from "zod";
import { activeProvider, generateJson, type ImagePart } from "./llm";
import { matchCondition } from "./anatomy/conditions";

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
  /** How the extraction was done. */
  method: "deterministic" | "model" | "both";
}

const SECTION_ALIASES: Record<keyof ParsedNote, string[]> = {
  diagnoses: [
    "diagnosis", "diagnoses", "discharge diagnosis", "discharge diagnoses",
    "principal diagnosis", "primary diagnosis", "assessment", "impression",
    "assessment and plan", "a/p", "problem list", "final diagnosis", "reason for visit",
    "secondary", "secondary diagnosis", "secondary diagnoses", "other diagnoses", "comorbidities",
  ],
  medications: [
    "medications", "discharge medications", "medication list", "new medications",
    "prescriptions", "rx", "meds", "medications on discharge", "take these medicines",
  ],
  instructions: [
    "instructions", "discharge instructions", "patient instructions", "activity",
    "diet", "wound care", "plan", "recommendations", "what to do", "home care",
  ],
  followUp: [
    "follow up", "follow-up", "followup", "return", "appointments", "return to clinic",
    "return precautions", "when to seek care", "call if",
  ],
};

/** "Ibuprofen 600 mg PO TID x 7 days" -> name + sig, without needing a model. */
const MED_LINE = /^[-*•\d.)\s]*([A-Za-z][A-Za-z0-9\-/ ]{1,40}?)\s+(\d+(?:\.\d+)?\s*(?:mg|mcg|g|ml|units?|%)\b.*)$/i;

function normaliseHeader(line: string): keyof ParsedNote | null {
  const h = line
    .toLowerCase()
    .replace(/[:#*_-]+$/g, "")
    .replace(/^[#*_\s]+/g, "")
    .trim();
  if (h.length > 40) return null;
  for (const [key, aliases] of Object.entries(SECTION_ALIASES) as [keyof ParsedNote, string[]][]) {
    if (aliases.some((a) => h === a || h.startsWith(`${a} `) || h.startsWith(`${a}:`))) {
      return key;
    }
  }
  return null;
}

function cleanLine(l: string) {
  return l.replace(/^[-*•\d.)\s]+/, "").trim();
}

export function parseDeterministic(text: string): ParsedNote {
  const out: ParsedNote = { diagnoses: [], medications: [], instructions: [], followUp: [] };
  let section: keyof ParsedNote | null = null;

  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line) continue;

    // A header line may also carry content after the colon: "Diagnosis: NSTEMI".
    const colon = line.indexOf(":");
    const headerPart = colon > 0 ? line.slice(0, colon) : line;
    const rest = colon > 0 ? line.slice(colon + 1).trim() : "";
    const key = normaliseHeader(headerPart);

    if (key) {
      section = key;
      if (rest) pushInto(out, key, rest);
      continue;
    }

    if (!section) {
      // Medication lines are recognisable anywhere by their dose pattern.
      const m = line.match(MED_LINE);
      if (m) out.medications.push({ name: m[1].trim(), sig: m[2].trim() });
      continue;
    }
    pushInto(out, section, cleanLine(line));
  }
  return out;
}

function pushInto(out: ParsedNote, key: keyof ParsedNote, value: string) {
  if (!value) return;
  if (key === "medications") {
    const m = value.match(MED_LINE);
    out.medications.push(
      m ? { name: m[1].trim(), sig: m[2].trim() } : { name: value, sig: null },
    );
    return;
  }
  // Several diagnoses may share a line, but so may qualifiers of one:
  // "Distal radius fracture, left, nondisplaced" is ONE diagnosis. Split only
  // on semicolons, or on a comma that starts a new capitalised item.
  if (key === "diagnoses") {
    for (const d of value.split(/;\s*|,\s+(?=[A-Z])/)) {
      if (d.trim()) out.diagnoses.push(d.trim());
    }
    return;
  }
  out[key].push(value);
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

  const primary = result.diagnoses.map(matchCondition).find((c) => c !== null) ?? null;

  return { ...result, conditionId: primary?.id ?? null, method };
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
  const medKey = (m: { name: string }) => m.name.toLowerCase().trim();
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
