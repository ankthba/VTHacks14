import { activeProvider, generate } from "./llm";
import { displayName } from "./display";
import { fetchLabel, firstSentence, dailyMedUrl } from "./openfda";
import type { AnalysisResult, NormalizedMed } from "./types";

export interface MedSummary {
  med_id: string;
  name: string;
  what_its_for: string;
  source_url: string | null;
}

/**
 * "What is this for" comes from the label's indications section, not from the
 * model's memory. The model only shortens it.
 */
export async function summarizeMeds(meds: NormalizedMed[]): Promise<MedSummary[]> {
  return Promise.all(
    meds.map(async (m) => {
      const label = await fetchLabel(m);
      const raw = firstSentence(label?.indications_and_usage, 400);
      return {
        med_id: m.id,
        name: displayName(m),
        what_its_for: raw ?? "Not stated on the retrieved FDA label.",
        source_url: dailyMedUrl(label),
      };
    }),
  );
}

const DISCLAIMER =
  "Educational demo. Not medical advice. Always confirm with your pharmacist or physician.";

/**
 * Deterministic one-pager. Runs with no API keys at all, which keeps the app
 * useful offline and gives the LLM path something to fall back to.
 */
export function renderOnePagerPlain(
  result: AnalysisResult,
  summaries: MedSummary[],
): string {
  const lines: string[] = [];
  lines.push("YOUR MEDICATIONS");
  lines.push("");
  for (const m of result.meds) {
    const s = summaries.find((x) => x.med_id === m.id);
    lines.push(`- ${displayName(m)}  (${m.canonical_name ?? "unmatched"})`);
    if (m.sig) lines.push(`    How to take it: ${m.sig}`);
    if (s) lines.push(`    What it is for: ${trimTo(s.what_its_for, 200)}`);
  }

  lines.push("");
  lines.push("THINGS TO ASK YOUR PHARMACIST ABOUT");
  lines.push("");
  if (result.findings.length === 0) {
    lines.push("- Nothing was flagged. That is not the same as 'everything is fine' -");
    lines.push("  it means these checks found nothing in the FDA labels we read.");
  }
  for (const f of result.findings) {
    lines.push(`- [${f.severity.toUpperCase()}] ${f.headline}`);
    for (const l of f.detail.split("\n")) lines.push(`    ${l.trim()}`);
    if (f.quote) lines.push(`    FDA label says: "${trimTo(f.quote, 240)}"`);
    for (const c of f.citations) lines.push(`    Source: ${c.label} - ${c.url}`);
  }

  lines.push("");
  lines.push("YOUR DAILY SCHEDULE");
  lines.push("");
  for (const slot of ["morning", "midday", "evening", "bedtime", "as needed"] as const) {
    const items = result.schedule.filter((s) => s.slot === slot);
    if (!items.length) continue;
    lines.push(`${slot.toUpperCase()}`);
    for (const i of items) lines.push(`    ${i.med_name} - ${i.instruction}`);
  }

  lines.push("");
  lines.push(DISCLAIMER);
  return lines.join("\n");
}

/**
 * Plain-language rewrite. The model is given ONLY the structured findings this
 * app already computed - it is a writer, not a source. If it is unavailable we
 * ship the deterministic version above.
 */
export async function renderOnePagerLLM(
  result: AnalysisResult,
  summaries: MedSummary[],
  language: string,
): Promise<{ text: string; generated: boolean }> {
  const plain = renderOnePagerPlain(result, summaries);
  if (activeProvider() === "none") return { text: plain, generated: false };

  const prompt = `Rewrite the medication summary below so a patient can read it.

RULES
- Target a 6th-grade reading level. Short sentences. Common words.
- Write in ${language}.
- Do NOT add any medical fact that is not in the text below. Do not add drugs,
  doses, risks or advice of your own.
- Never tell the reader to stop, start or change a medicine. Everything in the
  middle section is phrased as a question to ask their pharmacist.
- Keep every source URL exactly as written, on its own line.
- Keep the three section headings, translated.
- End with this line, translated: "${DISCLAIMER}"
- Return plain text only. No markdown, no code fences.

<<<
${plain}
>>>`;

  try {
    const text = await generate(prompt);
    return { text: text.trim(), generated: true };
  } catch {
    return { text: plain, generated: false };
  }
}

function trimTo(s: string, n: number) {
  return s.length > n ? `${s.slice(0, n).trimEnd()}...` : s;
}

export { DISCLAIMER };
