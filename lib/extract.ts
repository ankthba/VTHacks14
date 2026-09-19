import { generateJson, type ImagePart } from "./llm";
import { ExtractionSchema, type BottleRecord } from "./schemas";

/**
 * We read the PRINTED LABEL, never the pills themselves. Identifying loose
 * tablets by imprint code is an open research problem; bottle labels are
 * high-contrast printed text that OCR handles reliably.
 */
const PROMPT = `You are reading photographs of prescription and over-the-counter medicine bottles.

Return a JSON array. One object per distinct medication label visible across all images.

Each object has exactly these fields:
  "drug_text"   - the medication name exactly as printed
  "strength"    - e.g. "10 mg", "5-325 mg"
  "sig"         - the directions, e.g. "Take 1 tablet by mouth every 6 hours as needed"
  "quantity"    - e.g. "30 tablets"
  "prescriber"  - the prescriber name if printed
  "fill_date"   - the fill date if printed
  "confidence"  - your confidence this label was read correctly, 0.0 to 1.0

RULES
- Read only the printed text on the labels. Do not identify pills by shape or colour.
- Use null for any field that is not legible or not present.
- Do NOT guess a drug name from partial text. Return what is printed, even if partial.
- If the same bottle appears in more than one photo, return it once.
- Set confidence below 0.7 for anything blurry, angled, or partially hidden.
- Return ONLY the JSON array. No prose, no code fence.`;

export async function extractFromImages(images: ImagePart[]): Promise<BottleRecord[]> {
  if (images.length === 0) return [];
  return generateJson(PROMPT, ExtractionSchema, images);
}
