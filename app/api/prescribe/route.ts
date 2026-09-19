import { NextRequest, NextResponse } from "next/server";
import "@/lib/cache.node";
import { z } from "zod";
import { BottleRecordSchema } from "@/lib/schemas";
import { checkPrescription } from "@/lib/prescribeCheck";

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
    return NextResponse.json(await checkPrescription({ candidate: body.candidate, candidateStrength: body.candidateStrength, current: body.current }));
  } catch (e) {
    return NextResponse.json(
      { error: "Check failed", detail: e instanceof Error ? e.message : String(e) },
      { status: 500 },
    );
  }
}
