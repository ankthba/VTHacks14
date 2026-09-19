import { NextRequest, NextResponse } from "next/server";
import { normalizeAll } from "@/lib/normalize";
import { buildSchedule, deterministicFindings, sortFindings } from "@/lib/analyze";
import { labelInteractions } from "@/lib/interactions";
import { renderOnePagerLLM, summarizeMeds } from "@/lib/onepager";
import { BottleRecordSchema } from "@/lib/schemas";
import { getScenario } from "@/lib/fixtures";
import { reconcile } from "@/lib/reconcile";
import { buildCards, cardTranslationPrompt, type MedCard } from "@/lib/cards";
import { generateJson } from "@/lib/llm";
import { firstSentence } from "@/lib/openfda";
import { activeProvider } from "@/lib/llm";
import { z } from "zod";

export const runtime = "nodejs";
export const maxDuration = 60;

const TranslatedCardsSchema = z.array(
  z.object({
    med_id: z.string(),
    shortLabel: z.string(),
    purpose: z.string(),
    howToTake: z.string(),
    warning: z.string().nullish(),
  }),
);

const BodySchema = z.object({
  bottles: z.array(BottleRecordSchema).optional(),
  discharge: z.array(BottleRecordSchema).optional(),
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

  const scenario = body.demo ? getScenario(body.demo) : null;
  const bottles = scenario ? scenario.bottles : (body.bottles ?? []);
  const dischargeRecs = scenario ? (scenario.discharge ?? []) : (body.discharge ?? []);

  if (bottles.length === 0) {
    return NextResponse.json({ error: "No medications to analyze." }, { status: 400 });
  }

  const warnings: string[] = [];

  try {
    const [meds, dischargeMeds] = await Promise.all([
      normalizeAll(bottles),
      normalizeAll(dischargeRecs),
    ]);

    // Reconciliation runs only when a discharge list was supplied. It is
    // deterministic set comparison, same as the duplicate checks.
    const rec = dischargeRecs.length ? reconcile(dischargeMeds, meds) : null;

    for (const m of meds) {
      if (m.unresolved) {
        warnings.push(
          `"${m.input_text}" could not be matched to a drug record, so it was left out of every check.`,
        );
      }
    }

    // Deterministic first: these are the findings we are willing to stand behind.
    const computed = [
      ...deterministicFindings(meds),
      ...(rec?.findings ?? []),
    ];

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
      dischargeMeds,
      reconciliation: rec?.rows ?? null,
      findings: sortFindings([...computed, ...extra]),
      schedule: buildSchedule(meds),
      warnings,
    };

    const summaries = await summarizeMeds(meds);

    // Plain-language cards: the primary view for someone who cannot read the
    // label. Purpose and directions come from curated deterministic mappings,
    // so this works with no model and says the same thing every time.
    const fallbacks: Record<string, string | null> = {};
    for (const s of summaries) {
      fallbacks[s.med_id] = firstSentence([s.what_its_for], 160);
    }
    let cards: MedCard[] = buildCards(meds, result.findings, fallbacks);

    if (body.language !== "English" && activeProvider() !== "none") {
      try {
        const translated = await generateJson(
          cardTranslationPrompt(cards, body.language),
          TranslatedCardsSchema,
        );
        const byId = new Map(translated.map((t) => [t.med_id, t]));
        cards = cards.map((c) => {
          const t = byId.get(c.med_id);
          if (!t) return c;
          const merged = {
            ...c,
            shortLabel: t.shortLabel,
            purpose: t.purpose,
            howToTake: t.howToTake,
            warning: t.warning ?? null,
          };
          return {
            ...merged,
            spoken: [
              `${c.name}.`,
              merged.purpose,
              merged.howToTake,
              merged.warning ? merged.warning : "",
            ]
              .filter(Boolean)
              .join(" "),
          };
        });
      } catch {
        warnings.push(
          `The cards could not be translated into ${body.language}, so they are shown in English.`,
        );
      }
    } else if (body.language !== "English") {
      warnings.push(
        `No language model key is set, so the cards stay in English. The checks themselves are unaffected.`,
      );
    }
    const onePager = await renderOnePagerLLM(
      result,
      summaries,
      body.language,
      rec?.rows ?? null,
    );

    return NextResponse.json({
      ...result,
      cards,
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
