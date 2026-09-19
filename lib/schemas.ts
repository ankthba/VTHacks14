import { z } from "zod";

/** One medication as read off a bottle label by the vision model. */
export const BottleRecordSchema = z.object({
  drug_text: z.string().nullable(),
  strength: z.string().nullable(),
  sig: z.string().nullable(),
  quantity: z.string().nullable(),
  prescriber: z.string().nullable(),
  fill_date: z.string().nullable(),
  confidence: z.number().min(0).max(1),
});
export type BottleRecord = z.infer<typeof BottleRecordSchema>;

export const ExtractionSchema = z.array(BottleRecordSchema);

/** The closed question we ask about a retrieved FDA label section. */
export const InteractionVerdictSchema = z.object({
  interaction: z.boolean(),
  quote: z.string().nullable(),
  plain_language: z.string(),
  severity: z.enum(["high", "moderate", "low"]),
});
export type InteractionVerdict = z.infer<typeof InteractionVerdictSchema>;

export const OnePagerSchema = z.object({
  meds: z.array(
    z.object({
      name: z.string(),
      what_its_for: z.string(),
      how_to_take: z.string(),
    }),
  ),
  questions: z.array(
    z.object({
      finding_id: z.string(),
      headline: z.string(),
      body: z.string(),
    }),
  ),
  schedule_note: z.string(),
});
export type OnePager = z.infer<typeof OnePagerSchema>;
