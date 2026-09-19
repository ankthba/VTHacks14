import { z } from "zod";

/**
 * A field that may be null, absent, or a string - always read back as
 * `string | null`.
 *
 * Absence has to be accepted, not just null. Swift's synthesized Codable
 * encoder uses `encodeIfPresent`, so a nil property is omitted from the JSON
 * entirely rather than sent as null. A strictly-nullable-but-required schema
 * rejected every request from the iOS app with a 400 while the web app, whose
 * JSON.stringify emits explicit nulls, worked fine.
 */
const optionalText = z
  .string()
  .nullish()
  .transform((v) => v ?? null);

/** One medication as read off a bottle label by the vision model. */
export const BottleRecordSchema = z.object({
  drug_text: optionalText,
  strength: optionalText,
  sig: optionalText,
  quantity: optionalText,
  prescriber: optionalText,
  fill_date: optionalText,
  confidence: z.number().min(0).max(1).catch(0.5),
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
