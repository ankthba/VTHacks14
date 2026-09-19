import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { normalizeAll, normalizeOne } from "@/lib/normalize";
import { deterministicFindings, sortFindings } from "@/lib/analyze";
import { labelInteractions } from "@/lib/interactions";
import { prescribingBrief } from "@/lib/prescribing";
import { BottleRecordSchema } from "@/lib/schemas";
import { displayName } from "@/lib/display";

export const runtime = "nodejs";
export const maxDuration = 60;

const BodySchema = z.object({
  /** What the patient is already taking. */
  current: z.array(BottleRecordSchema).default([]),
  /** The drug being considered. */
  candidate: z.string().min(1),
  candidateStrength: z.string().nullish(),
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
        message: `"${body.candidate}" could not be matched to a drug record, so nothing below would be trustworthy. Check the spelling or try the generic name.`,
      });
    }

    const current = await normalizeAll(body.current);
    const all = [...current, candidate];

    // Same deterministic engine as the patient side; only findings that involve
    // the drug being considered are relevant here.
    const involves = (ids: string[]) => ids.includes(candidate.id);
    const computed = deterministicFindings(all).filter((f) => involves(f.med_ids));
    const retrieved = (await labelInteractions(all, "clinician")).filter((f) =>
      involves(f.med_ids),
    );

    const covered = new Set(
      computed
        .filter((f) => f.kind === "duplicate_ingredient" || f.kind === "duplicate_class")
        .map((f) => [...f.med_ids].sort().join("|")),
    );
    const findings = sortFindings([
      ...computed,
      ...retrieved.filter((f) => !covered.has([...f.med_ids].sort().join("|"))),
    ]);

    const brief = await prescribingBrief(candidate);

    return NextResponse.json({
      status: "ok",
      candidate: {
        id: candidate.id,
        name: displayName(candidate),
        canonical: candidate.canonical_name,
        rxcui: candidate.rxcui,
        ingredients: candidate.ingredients,
      },
      current: current.map((m) => ({
        id: m.id,
        name: displayName(m),
        canonical: m.canonical_name,
        unresolved: !!m.unresolved,
      })),
      findings,
      brief,
    });
  } catch (e) {
    return NextResponse.json(
      { error: "Check failed", detail: e instanceof Error ? e.message : String(e) },
      { status: 500 },
    );
  }
}
