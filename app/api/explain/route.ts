import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { buildExplainCard } from "@/lib/explain";

export const runtime = "nodejs";
export const maxDuration = 60;

const BodySchema = z.object({
  conditionId: z.string().nullish(),
  customHeadline: z.string().nullish(),
  medNames: z
    .array(z.object({ name: z.string(), strength: z.string().nullish(), sig: z.string().nullish() }))
    .default([]),
  instructions: z.array(z.string()).default([]),
  howtoIds: z.array(z.string()).default([]),
  language: z.string().default("English"),
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
    const { card, translation } = await buildExplainCard({
      conditionId: body.conditionId,
      customHeadline: body.customHeadline,
      meds: body.medNames.map((m) => ({
        drug_text: m.name,
        strength: m.strength ?? null,
        sig: m.sig ?? null,
        quantity: null,
        prescriber: null,
        fill_date: null,
        confidence: 1,
      })),
      instructions: body.instructions,
      howtoIds: body.howtoIds,
      language: body.language,
    });

    const warnings: string[] = [];
    if (body.language !== "English" && translation.provider === "none") {
      warnings.push(`Could not translate into ${body.language}; showing English.`);
    } else if (translation.untranslated > 0) {
      warnings.push(
        `${translation.untranslated} line(s) could not be translated and are shown in English.`,
      );
    }

    return NextResponse.json({ card, translation, warnings });
  } catch (e) {
    return NextResponse.json(
      { error: "Failed", detail: e instanceof Error ? e.message : String(e) },
      { status: 500 },
    );
  }
}
