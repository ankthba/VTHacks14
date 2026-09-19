import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { buildExplainCard, explainTranslationPrompt } from "@/lib/explain";
import { activeProvider, generateJson } from "@/lib/llm";

export const runtime = "nodejs";
export const maxDuration = 60;

const BodySchema = z.object({
  conditionId: z.string().nullish(),
  customHeadline: z.string().nullish(),
  medNames: z.array(z.object({ name: z.string(), sig: z.string().nullish() })).default([]),
  instructions: z.array(z.string()).default([]),
  language: z.string().default("English"),
});

const TranslatedSchema = z.object({
  headline: z.string(),
  meds: z.array(
    z.object({ shortLabel: z.string(), purpose: z.string(), howToTake: z.string() }),
  ),
  instructions: z.array(z.string()),
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
    let card = await buildExplainCard({
      conditionId: body.conditionId,
      customHeadline: body.customHeadline,
      meds: body.medNames.map((m) => ({
        drug_text: m.name,
        strength: null,
        sig: m.sig ?? null,
        quantity: null,
        prescriber: null,
        fill_date: null,
        confidence: 1,
      })),
      instructions: body.instructions,
    });

    const warnings: string[] = [];

    if (body.language !== "English") {
      if (activeProvider() === "none") {
        warnings.push(
          `No language model key is set, so the card stays in English. The explanation itself is unaffected — it is assembled from a curated list, not generated.`,
        );
      } else {
        try {
          const t = await generateJson(
            explainTranslationPrompt(card, body.language),
            TranslatedSchema,
          );
          if (t.meds.length === card.meds.length) {
            card = {
              ...card,
              headline: t.headline,
              meds: card.meds.map((m, i) => ({ ...m, ...t.meds[i] })),
              instructions: t.instructions,
              spoken: [
                t.headline,
                ...card.meds.map((m, i) => `${m.name}. ${t.meds[i].purpose} ${t.meds[i].howToTake}`),
                ...t.instructions,
              ].join(" "),
            };
          }
        } catch {
          warnings.push(`Could not translate into ${body.language}; showing English.`);
        }
      }
    }

    return NextResponse.json({ card, warnings });
  } catch (e) {
    return NextResponse.json(
      { error: "Failed", detail: e instanceof Error ? e.message : String(e) },
      { status: 500 },
    );
  }
}
