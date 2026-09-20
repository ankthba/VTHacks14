import { NextRequest, NextResponse } from "next/server";
import "@/lib/cache.node";
import { z } from "zod";
import { normalizeAll, normalizeOne } from "@/lib/normalize";
import { deterministicFindings, sortFindings } from "@/lib/analyze";
import { labelInteractions } from "@/lib/interactions";
import { buildPriorAuthPacket, renderPriorAuthLetter } from "@/lib/priorAuth";
import { BottleRecordSchema } from "@/lib/schemas";
import { activeProvider, generate } from "@/lib/llm";

export const runtime = "nodejs";
export const maxDuration = 90;

const BodySchema = z.object({
  candidate: z.string().min(1),
  candidateStrength: z.string().nullish(),
  current: z.array(BottleRecordSchema).default([]),
  patient: z
    .object({
      age: z.string().nullish(),
      diagnosis: z.string().nullish(),
      renalFunction: z.string().nullish(),
      triedAndFailed: z
        .array(z.object({ drug: z.string(), outcome: z.string() }))
        .default([]),
    })
    .default({ triedAndFailed: [] }),
});

export async function POST(req: NextRequest) {
  let body;
  try {
    body = BodySchema.parse(await req.json());
  } catch (e) {
    return NextResponse.json(
      { error: "Bad request", detail: e instanceof Error ? e.message : String(e) },
      { status: 400 },
    );
  }

  try {
    const candidate = await normalizeOne(
      {
        drug_text: body.candidate,
        strength: body.candidateStrength ?? null,
        sig: null,
        quantity: null,
        prescriber: null,
        fill_date: null,
        confidence: 1,
      },
      "candidate",
    );
    if (candidate.unresolved) {
      return NextResponse.json({
        status: "unresolved",
        message: `"${body.candidate}" could not be matched to a drug record. Nothing generated from it would be trustworthy.`,
      });
    }

    const current = await normalizeAll(body.current);
    const all = [...current, candidate];
    const involves = (ids: string[]) => ids.includes(candidate.id);
    const findings = sortFindings([
      ...deterministicFindings(all).filter((f) => involves(f.med_ids)),
      ...(await labelInteractions(all, "clinician")).filter((f) => involves(f.med_ids)),
    ]);

    const packet = await buildPriorAuthPacket(candidate, current, findings, body.patient);
    const deterministic = renderPriorAuthLetter(packet, body.patient);

    // A model may compose the prose. It may not add a fact - the prompt gives
    // it the assembled evidence and forbids anything outside it, and the
    // deterministic letter is what ships if that fails.
    let letter = deterministic;
    let composed = false;
    if (activeProvider() !== "none") {
      try {
        const prose = await generate(
          `Rewrite the prior-authorization justification below as a professional letter to a payer's pharmacy benefit reviewer.

RULES
- Use ONLY the statements provided. Do not add any clinical claim, study, guideline or fact that is not below.
- Keep every source tag ([FDA label], [prescriber], [computed]) attached to the statement it belongs to.
- Keep every quotation exactly as written, and keep every URL.
- Do not overstate. Do not assert medical necessity beyond what the statements support.
- Professional, concise, and factual. No marketing language.
- Return plain text only.

<<<
${deterministic}
>>>`,
        );
        if (prose.trim().length > 200) {
          letter = prose.trim();
          composed = true;
        }
      } catch {
        // Keep the deterministic letter.
      }
    }

    return NextResponse.json({
      status: "ok",
      packet,
      letter,
      composed,
      findings,
    });
  } catch (e) {
    return NextResponse.json(
      { error: "Failed", detail: e instanceof Error ? e.message : String(e) },
      { status: 500 },
    );
  }
}
