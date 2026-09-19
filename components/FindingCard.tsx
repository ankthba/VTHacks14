import type { Finding } from "@/lib/types";

const TONE = {
  high: { bg: "var(--high-bg)", fg: "var(--high)" },
  moderate: { bg: "var(--moderate-bg)", fg: "var(--moderate)" },
  low: { bg: "var(--ok-bg)", fg: "var(--ok)" },
} as const;

/** A patient is being told what to ask; a prescriber is being told what to weigh. */
const WORD = {
  patient: { high: "Ask about this first", moderate: "Worth asking", low: "Minor" },
  clinician: { high: "Review before prescribing", moderate: "Consider", low: "Minor" },
} as const;

export function FindingCard({
  finding,
  audience = "patient",
}: {
  finding: Finding;
  audience?: "patient" | "clinician";
}) {
  const tone = TONE[finding.severity];
  const isArithmetic = finding.kind !== "label_interaction";

  return (
    <article
      className="finding-card card p-6"
      style={{ background: tone.bg, borderColor: tone.fg + "33" }}
    >
      <div className="flex flex-wrap items-center gap-2 mb-2">
        <span
          className="text-xs font-bold uppercase tracking-[0.08em] px-2.5 py-1 rounded-full"
          style={{ background: tone.fg, color: "#fff" }}
        >
          {WORD[audience][finding.severity]}
        </span>
        {/*
          The provenance badge is the whole thesis of the project, so it is on
          every card rather than buried in a footnote. Note the distinction:
          duplicate/dose findings are arithmetic end to end, while interaction
          findings are DETECTED deterministically (string search over retrieved
          label text) but may have their wording rephrased by a model.
        */}
        <span
          className="text-xs font-semibold px-2.5 py-1 rounded-full border"
          style={{ color: tone.fg, borderColor: tone.fg + "60" }}
          title={
            isArithmetic
              ? "Produced by set arithmetic over RxNorm ingredient and class identifiers. No language model was involved at any stage."
              : "Detected by searching the retrieved FDA label text for this medicine. The quote is verbatim; only the plain-language wording may be model-written."
          }
        >
          {isArithmetic ? "computed - no model involved" : "found in FDA label text"}
        </span>
      </div>

      <h3 className="display-sm text-2xl leading-snug" style={{ color: tone.fg }}>
        {finding.headline}
      </h3>

      <p className="mt-2 whitespace-pre-line text-[15px] text-[color:var(--foreground)]">
        {finding.detail}
      </p>

      {finding.quote && (
        <blockquote className="mt-3 border-l-4 pl-3 italic text-[15px]" style={{ borderColor: tone.fg }}>
          &ldquo;{finding.quote}&rdquo;
          <span className="not-italic text-xs block mt-1 text-[color:var(--muted)]">
            quoted from the FDA label
          </span>
        </blockquote>
      )}

      {finding.citations.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-sm">
          {finding.citations.map((c, i) => (
            <a
              key={`${c.url}-${i}`}
              href={c.url}
              target="_blank"
              rel="noopener noreferrer"
              className="underline text-[color:var(--accent-text)]"
            >
              {c.label}
            </a>
          ))}
        </div>
      )}
    </article>
  );
}
