"use client";

import type { BottleRecord } from "@/lib/schemas";

const LOW_CONFIDENCE = 0.75;

/**
 * Human-in-the-loop correction. Anything the vision model was unsure about is
 * called out explicitly rather than silently passed downstream - a wrong drug
 * name here would poison every check that follows.
 */
export function BottleReview({
  bottles,
  onChange,
  onRemove,
}: {
  bottles: BottleRecord[];
  onChange: (index: number, patch: Partial<BottleRecord>) => void;
  onRemove: (index: number) => void;
}) {
  return (
    <div className="space-y-4">
      {bottles.map((b, i) => {
        const low = b.confidence < LOW_CONFIDENCE;
        return (
          <div
            key={i}
            className="rounded-xl border bg-[color:var(--surface)] p-4"
            style={{ borderColor: low ? "var(--moderate)" : "var(--line)" }}
          >
            <div className="flex items-start justify-between gap-3 mb-3">
              <span
                className="text-xs font-semibold px-2 py-1 rounded"
                style={{
                  background: low ? "var(--moderate-bg)" : "var(--ok-bg)",
                  color: low ? "var(--moderate)" : "var(--ok)",
                }}
              >
                {low
                  ? `Please confirm - read with ${Math.round(b.confidence * 100)}% confidence`
                  : `Read with ${Math.round(b.confidence * 100)}% confidence`}
              </span>
              <button
                type="button"
                onClick={() => onRemove(i)}
                className="text-sm underline text-[color:var(--muted)] hover:text-[color:var(--high)]"
              >
                Remove
              </button>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <Field
                label="Medication name"
                value={b.drug_text}
                onChange={(v) => onChange(i, { drug_text: v })}
              />
              <Field
                label="Strength"
                value={b.strength}
                onChange={(v) => onChange(i, { strength: v })}
              />
              <div className="sm:col-span-2">
                <Field
                  label="Directions (how to take it)"
                  value={b.sig}
                  onChange={(v) => onChange(i, { sig: v })}
                />
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string | null;
  onChange: (v: string) => void;
}) {
  return (
    <label className="block">
      <span className="block text-sm font-semibold mb-1">{label}</span>
      <input
        type="text"
        value={value ?? ""}
        placeholder="not readable"
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-lg border border-[color:var(--line)] bg-white px-3 py-2 text-[15px]"
      />
    </label>
  );
}
