import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { normalizeAll } from "@/lib/normalize";
import { findOTCVariants } from "@/lib/otc";
import { checkAddition } from "@/lib/checkAddition";
import { BottleRecordSchema } from "@/lib/schemas";
import { getScenario } from "@/lib/fixtures";

export const runtime = "nodejs";
export const maxDuration = 60;

const BodySchema = z.object({
  query: z.string().min(1),
  current: z.array(BottleRecordSchema).optional(),
  demo: z.string().nullish(),
  /** Set once the user has picked which formulation they are holding. */
  variantId: z.string().nullish(),
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

  const variants = await findOTCVariants(body.query);

  if (variants.length === 0) {
    // Refusing to answer is the correct output. Guessing which product someone
    // is holding is exactly the failure this feature exists to prevent.
    return NextResponse.json({
      status: "unknown",
      message:
        `We could not identify "${body.query}" well enough to check it safely. ` +
        `Read the "Active ingredients" list on the box and search for one of those, ` +
        `or ask the pharmacist at the counter.`,
      variants: [],
    });
  }

  // A brand name is not a product. If the formulations differ in what they
  // contain, the user has to say which box is in their hand.
  if (!body.variantId && variants.length > 1) {
    return NextResponse.json({
      status: "choose",
      message: `"${body.query}" is sold in ${variants.length} different formulations, and they do not all contain the same things. Which one are you holding?`,
      variants,
    });
  }

  const chosen = body.variantId
    ? variants.find((v) => v.id === body.variantId)
    : variants[0];

  if (!chosen) {
    return NextResponse.json({ error: "That formulation was not found." }, { status: 400 });
  }

  const records = body.demo ? getScenario(body.demo).bottles : (body.current ?? []);
  if (records.length === 0) {
    return NextResponse.json(
      { error: "Add your current medications first." },
      { status: 400 },
    );
  }

  try {
    const current = await normalizeAll(records);
    const result = await checkAddition(current, chosen);
    return NextResponse.json({ status: "checked", chosen, ...result });
  } catch (e) {
    return NextResponse.json(
      { error: "Check failed", detail: e instanceof Error ? e.message : String(e) },
      { status: 500 },
    );
  }
}
