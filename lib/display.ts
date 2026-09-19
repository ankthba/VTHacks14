import type { NormalizedMed } from "./types";

/**
 * A short name a patient would recognise.
 *
 * RxNorm's canonical name is precise but unreadable on a patient sheet
 * ("acetaminophen 325 MG / hydrocodone bitartrate 5 MG Oral Tablet [Norco]").
 * We prefer the brand in brackets, then what was actually printed on the
 * bottle, and keep the canonical name as a subtitle for anyone checking us.
 */
export function displayName(med: NormalizedMed): string {
  const brand = med.canonical_name?.match(/\[([^\]]+)\]/)?.[1];
  if (brand) return brand;

  const printed = med.input_text?.trim();
  if (printed && printed !== "(unreadable)") {
    return printed.replace(/\b\w/g, (c) => c.toUpperCase());
  }

  // Fall back to the ingredient list rather than the full dosage-form string.
  if (med.ingredients.length) {
    return med.ingredients.map((i) => i.name).join(" + ");
  }
  return med.canonical_name ?? "this medicine";
}

/** "Norco (5 mg / 325 mg tablet)" style subtitle. */
export function strengthLine(med: NormalizedMed): string | null {
  return med.canonical_name ?? null;
}
