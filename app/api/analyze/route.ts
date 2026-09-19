import { NextRequest, NextResponse } from "next/server";
import { normalizeAll } from "@/lib/normalize";
import { buildSchedule, deterministicFindings, sortFindings } from "@/lib/analyze";
import { labelInteractions } from "@/lib/interactions";
import { renderOnePagerLLM, summarizeMeds } from "@/lib/onepager";
import { BottleRecordSchema } from "@/lib/schemas";
import { getScenario } from "@/lib/fixtures";
import { activeProvider } from "@/lib/llm";
import { z } from "zod";

export const runtime = "nodejs";
export const maxDuration = 60;

const BodySchema = z.object({
  bottles: z.array(BottleRecordSchema).optional(),
  demo: z.string().nullable().optional(),
  language: z.string().default("English"),
  skipInteractions: z.boolean().default(false),
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

  const bottles = body.demo
    ? getScenario(body.demo).bottles
    : (body.bottles ?? []);

  if (bottles.length === 0) {
    return NextResponse.json({ error: "No medications to analyze." }, { status: 400 });
  }

  const warnings: string[] = [];

  try {
    const meds = await normalizeAll(bottles);

    for (const m of meds) {
      if (m.unresolved) {
        warnings.push(
          `"${m.input_text}" could not be matched to a drug record, so it was left out of every check.`,
        );
      }
    }

    // Deterministic first: these are the findings we are willing to stand behind.
    const computed = deterministicFindings(meds);

    let retrieved: Awaited<ReturnType<typeof labelInteractions>> = [];
    if (!body.skipInteractions) {
      retrieved = await labelInteractions(meds);
      if (activeProvider() === "none") {
        warnings.push(
          "No language model key is set, so interaction findings use a plain template instead of tailored wording. Detection itself does not use a model, so no finding is missing because of this.",
        );
      }
    }

    // A pair already flagged as the same ingredient or the same class does not
    // also need "the label mentions the other one" - that is the same issue
    // stated twice, and the deterministic finding is the clearer of the two.
    const covered = new Set(
      computed
        .filter((f) => f.kind === "duplicate_ingredient" || f.kind === "duplicate_class")
        .map((f) => [...f.med_ids].sort().join("|")),
    );
    const extra = retrieved.filter(
      (f) => !covered.has([...f.med_ids].sort().join("|")),
    );

    const result = {
      meds,
      findings: sortFindings([...computed, ...extra]),
      schedule: buildSchedule(meds),
      warnings,
    };

    const summaries = await summarizeMeds(meds);
    const onePager = await renderOnePagerLLM(result, summaries, body.language);

    return NextResponse.json({
      ...result,
      summaries,
      onePager: onePager.text,
      onePagerGenerated: onePager.generated,
      provider: activeProvider(),
    });
  } catch (e) {
    return NextResponse.json(
      { error: "Analysis failed", detail: e instanceof Error ? e.message : String(e) },
      { status: 500 },
    );
  }
}
