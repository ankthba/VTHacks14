"use client";

import { useState } from "react";
import { ReadAloud } from "@/components/ReadAloud";

export interface MedCardView {
  med_id: string;
  name: string;
  shortLabel: string;
  purpose: string;
  howToTake: string;
  warning: string | null;
  curated: boolean;
  unresolved: boolean;
  spoken: string;
}

/**
 * One bottle at a time, in the largest type on the page.
 *
 * This is the primary view, not a simplified alternative to one. Someone who
 * cannot read a medicine label cannot read a dense findings list either, so the
 * findings page is the secondary view and this is what opens first.
 *
 * Design constraints, all deliberate: one idea per line, nothing below 18px,
 * navigation targets large enough to hit with a shaky hand, and every card
 * readable aloud on its own rather than only as part of a whole sheet.
 */
export function CardDeck({
  cards,
  lang,
}: {
  cards: MedCardView[];
  lang: string;
}) {
  const [i, setI] = useState(0);
  if (cards.length === 0) return null;

  const card = cards[Math.min(i, cards.length - 1)];
  const tone = card.warning
    ? { fg: "var(--high)", bg: "var(--high-bg)" }
    : card.unresolved
      ? { fg: "var(--moderate)", bg: "var(--moderate-bg)" }
      : { fg: "var(--ok)", bg: "var(--surface)" };

  return (
    <section>
      <div className="flex items-baseline justify-between mb-3 no-print">
        <h2 className="text-2xl font-bold">Your medicines, one at a time</h2>
        <span className="text-[15px] font-semibold text-[color:var(--muted)]">
          {i + 1} of {cards.length}
        </span>
      </div>

      <article
        className="rounded-2xl border-2 p-6 sm:p-8"
        style={{ background: tone.bg, borderColor: tone.fg }}
      >
        <span
          className="inline-block text-sm font-bold uppercase tracking-wide px-3 py-1.5 rounded-lg"
          style={{ background: tone.fg, color: "#fff" }}
        >
          {card.shortLabel}
        </span>

        {/* The name is never translated - it has to be matchable against the
            printed bottle by eye. */}
        <h3 className="text-4xl sm:text-5xl font-black leading-tight mt-4 break-words">
          {card.name}
        </h3>

        <p className="text-2xl leading-snug mt-5">{card.purpose}</p>

        <div className="mt-6 rounded-xl bg-white/70 border border-[color:var(--line)] p-4">
          <p className="text-sm font-bold uppercase tracking-wide text-[color:var(--muted)]">
            How to take it
          </p>
          <p className="text-2xl font-semibold leading-snug mt-1">{card.howToTake}</p>
        </div>

        {card.warning && (
          <div
            className="mt-5 rounded-xl p-4 border-2"
            style={{ borderColor: "var(--high)", background: "#fff" }}
          >
            <p className="text-sm font-bold uppercase tracking-wide" style={{ color: "var(--high)" }}>
              Ask your pharmacist
            </p>
            <p className="text-xl leading-snug mt-1 font-semibold">{card.warning}</p>
          </div>
        )}

        {!card.curated && !card.unresolved && (
          <p className="mt-4 text-sm text-[color:var(--muted)]">
            This description came from the medicine&rsquo;s official label rather
            than our own plain-language list, so it may be harder to read.
          </p>
        )}

        <div className="mt-6 no-print">
          <ReadAloud text={card.spoken} lang={lang} />
        </div>
      </article>

      <div className="mt-4 flex items-center gap-3 no-print">
        <button
          onClick={() => setI((n) => Math.max(0, n - 1))}
          disabled={i === 0}
          className="flex-1 rounded-xl border-2 border-[color:var(--foreground)] px-4 py-4 text-lg font-bold disabled:opacity-30"
        >
          &larr; Back
        </button>
        <button
          onClick={() => setI((n) => Math.min(cards.length - 1, n + 1))}
          disabled={i >= cards.length - 1}
          className="flex-1 rounded-xl bg-[color:var(--accent)] px-4 py-4 text-lg font-bold text-white disabled:opacity-30"
        >
          Next &rarr;
        </button>
      </div>

      {/* Dots double as direct navigation and as a progress indicator. */}
      <div className="mt-3 flex flex-wrap gap-2 no-print">
        {cards.map((c, n) => (
          <button
            key={c.med_id}
            onClick={() => setI(n)}
            aria-label={`Go to ${c.name}`}
            className="h-3 flex-1 min-w-[1.5rem] rounded-full"
            style={{
              background: n === i ? "var(--accent)" : c.warning ? "var(--high)" : "var(--line)",
              opacity: n === i ? 1 : 0.55,
            }}
          />
        ))}
      </div>

      {/* Printed sheets get every card, since there is no navigation on paper. */}
      <div className="hidden print:block mt-6">
        {cards.map((c) => (
          <div key={c.med_id} className="finding-card border-b py-3">
            <p className="text-xl font-bold">{c.name}</p>
            <p className="text-lg">{c.purpose}</p>
            <p className="text-lg font-semibold">{c.howToTake}</p>
            {c.warning && <p className="text-lg">Ask your pharmacist: {c.warning}</p>}
          </div>
        ))}
      </div>
    </section>
  );
}
