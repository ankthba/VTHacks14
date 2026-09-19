export type Severity = "high" | "moderate" | "low";

export interface Ingredient {
  rxcui: string;
  name: string;
}

export interface DrugClass {
  classId: string;
  className: string;
  classType: string; // ATC1-4 | EPC | MOA | ...
}

/** A medication after deterministic normalization against RxNorm. */
export interface NormalizedMed {
  id: string;
  input_text: string;
  strength: string | null;
  sig: string | null;
  confidence: number;
  rxcui: string | null;
  canonical_name: string | null;
  tty: string | null;
  match_score: number | null;
  ingredients: Ingredient[];
  classes: DrugClass[];
  /** mg of each ingredient per single dose, when parseable from the strength string. */
  per_dose_mg: Record<string, number>;
  unresolved?: boolean;
  /** Matched only against a retired RxNorm concept (withdrawn brand). */
  discontinued?: boolean;
}

export interface Citation {
  label: string;
  url: string;
}

export interface Finding {
  id: string;
  kind: "duplicate_ingredient" | "duplicate_class" | "cumulative_dose" | "label_interaction";
  severity: Severity;
  /** true when produced by set arithmetic rather than a language model. */
  computed: boolean;
  med_ids: string[];
  headline: string;
  detail: string;
  quote?: string | null;
  citations: Citation[];
}

export interface ScheduleSlot {
  slot: "morning" | "midday" | "evening" | "bedtime" | "as needed";
  med_id: string;
  med_name: string;
  instruction: string;
}

export interface AnalysisResult {
  meds: NormalizedMed[];
  findings: Finding[];
  schedule: ScheduleSlot[];
  warnings: string[];
}
