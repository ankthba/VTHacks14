"use client";

import { useMemo, useState } from "react";
import { CONDITIONS, REGIONS } from "@/lib/anatomy/conditions";
import { Diagram } from "@/components/Diagram";
import { ReadAloud } from "@/components/ReadAloud";
import type { DiagramId } from "@/lib/anatomy/conditions";

interface MedExplain {
  name: string;
  shortLabel: string;
  purpose: string;
  howToTake: string;
  curated: boolean;
}
interface Card {
  headline: string;
  diagram: DiagramId | null;
  marks: string[];
  meds: MedExplain[];
  instructions: string[];
  spoken: string;
}

const LANGUAGES = ["English", "Spanish", "Vietnamese", "Chinese (Simplified)", "Arabic"];
const LANG_TAG: Record<string, string> = {
  English: "en-US",
  Spanish: "es-ES",
  Vietnamese: "vi-VN",
  "Chinese (Simplified)": "zh-CN",
  Arabic: "ar-SA",
};

const COMMON_INSTRUCTIONS = [
  "Keep the splint dry.",
  "Come back in 2 weeks.",
  "Call us if it gets worse.",
  "No driving until we say so.",
  "Rest it for 48 hours.",
];

/**
 * Two surfaces, one screen.
 *
 * The clinician composes on the left in the seconds they already spend
 * explaining, then turns the screen around. The patient view is deliberately
 * enormous and nearly wordless: one picture, one sentence, and what to do.
 */
export default function ExplainPage() {
  const [region, setRegion] = useState(REGIONS[0]);
  const [conditionId, setConditionId] = useState<string | null>(null);
  const [customHeadline, setCustomHeadline] = useState("");
  const [meds, setMeds] = useState([{ name: "", sig: "" }]);
  const [instructions, setInstructions] = useState<string[]>([]);
  const [freeInstruction, setFreeInstruction] = useState("");
  const [language, setLanguage] = useState("English");

  const [card, setCard] = useState<Card | null>(null);
  const [busy, setBusy] = useState(false);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [patientView, setPatientView] = useState(false);

  const inRegion = useMemo(
    () => CONDITIONS.filter((c) => c.region === region),
    [region],
  );
  const selected = CONDITIONS.find((c) => c.id === conditionId) ?? null;

  async function build(showPatient: boolean) {
    setBusy(true);
    try {
      const r = await fetch("/api/explain", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          conditionId,
          customHeadline: customHeadline || null,
          medNames: meds.filter((m) => m.name.trim()),
          instructions,
          language,
        }),
      });
      const json = await r.json();
      setCard(json.card ?? null);
      setWarnings(json.warnings ?? []);
      if (showPatient) setPatientView(true);
    } finally {
      setBusy(false);
    }
  }

  // ---- Patient view: the screen has been turned around. ----
  if (patientView && card) {
    return (
      <main className="flex-1 w-full max-w-3xl mx-auto px-5 py-8">
        <button
          onClick={() => setPatientView(false)}
          className="chip no-print mb-6"
        >
          &larr; Back to the clinician view
        </button>

        {card.diagram && (
          <div className="mx-auto max-w-sm mb-8">
            <Diagram id={card.diagram} marks={card.marks} />
          </div>
        )}

        <h1 className="display text-5xl sm:text-6xl">{card.headline}</h1>

        {card.meds.length > 0 && (
          <section className="mt-10">
            <h2 className="display-sm text-3xl mb-4">Your medicines</h2>
            <div className="list-hairline border-t border-[color:var(--line-soft)]">
              {card.meds.map((m, i) => (
                <div key={i} className="row">
                  <span className="icon-box">&#9679;</span>
                  <div>
                    <p className="text-2xl font-semibold">{m.name}</p>
                    <p className="text-xl mt-1">{m.purpose}</p>
                    <p className="text-xl font-semibold mt-1">{m.howToTake}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {card.instructions.length > 0 && (
          <section className="mt-10">
            <h2 className="display-sm text-3xl mb-4">What to do</h2>
            <ul className="space-y-3">
              {card.instructions.map((t, i) => (
                <li key={i} className="flex gap-3 text-2xl leading-snug">
                  <span className="text-[color:var(--accent)]">&#10003;</span>
                  <span>{t}</span>
                </li>
              ))}
            </ul>
          </section>
        )}

        <div className="mt-10 flex flex-wrap gap-3 no-print">
          <ReadAloud text={card.spoken} lang={LANG_TAG[language] ?? "en-US"} />
          <button onClick={() => window.print()} className="btn btn-secondary">
            Print this
          </button>
        </div>
      </main>
    );
  }

  // ---- Clinician view: compose it. ----
  return (
    <main className="flex-1 w-full max-w-5xl mx-auto px-4 py-8">
      <header className="mb-8">
        <h1 className="display text-5xl">Explain it once, properly</h1>
        <p className="text-lg text-[color:var(--muted)] mt-3 max-w-2xl">
          Build what you are about to say, then turn the screen around. It goes
          home with them in their language.
        </p>
      </header>

      <div className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
        <div className="space-y-6">
          <section className="float-card p-6">
            <h2 className="display-sm text-2xl mb-3">What happened</h2>

            <div className="flex flex-wrap gap-2 mb-4">
              {REGIONS.map((r) => (
                <button
                  key={r}
                  onClick={() => {
                    setRegion(r);
                    setConditionId(null);
                  }}
                  className="chip"
                  style={
                    r === region
                      ? { background: "var(--accent)", color: "var(--accent-ink)", borderColor: "var(--accent)" }
                      : undefined
                  }
                >
                  {r}
                </button>
              ))}
            </div>

            <div className="list-hairline border-t border-[color:var(--line-soft)]">
              {inRegion.map((c) => (
                <button
                  key={c.id}
                  onClick={() => {
                    setConditionId(c.id);
                    setCustomHeadline(c.plain);
                  }}
                  className="row w-full text-left hover:opacity-70"
                >
                  <span
                    className="icon-box"
                    style={
                      c.id === conditionId
                        ? { background: "var(--accent)", color: "#fff", borderColor: "var(--accent)" }
                        : undefined
                    }
                  >
                    {c.id === conditionId ? "✓" : "○"}
                  </span>
                  <span>
                    <span className="font-semibold block">{c.label}</span>
                    <span className="text-[15px] text-[color:var(--muted)]">{c.plain}</span>
                  </span>
                </button>
              ))}
            </div>

            {selected && (
              <label className="block mt-4">
                <span className="block text-sm font-semibold mb-1">
                  Say it your way &mdash; this is what they will read
                </span>
                <textarea
                  value={customHeadline}
                  onChange={(e) => setCustomHeadline(e.target.value)}
                  rows={3}
                  className="w-full rounded-lg border border-[color:var(--line)] bg-white px-3 py-2.5 text-[15px]"
                />
              </label>
            )}
          </section>

          <section className="float-card p-6">
            <h2 className="display-sm text-2xl mb-3">Medicines</h2>
            <div className="space-y-2">
              {meds.map((m, i) => (
                <div key={i} className="grid gap-2 sm:grid-cols-2">
                  <input
                    value={m.name}
                    placeholder="Ibuprofen 600 mg"
                    onChange={(e) =>
                      setMeds((p) => p.map((x, j) => (j === i ? { ...x, name: e.target.value } : x)))
                    }
                    className="rounded-lg border border-[color:var(--line)] bg-white px-3 py-2.5 text-[15px]"
                  />
                  <input
                    value={m.sig}
                    placeholder="1 tablet three times daily with food"
                    onChange={(e) =>
                      setMeds((p) => p.map((x, j) => (j === i ? { ...x, sig: e.target.value } : x)))
                    }
                    className="rounded-lg border border-[color:var(--line)] bg-white px-3 py-2.5 text-[15px]"
                  />
                </div>
              ))}
            </div>
            <button
              onClick={() => setMeds((p) => [...p, { name: "", sig: "" }])}
              className="chip mt-3"
            >
              + Add another
            </button>
            <p className="text-sm text-[color:var(--muted)] mt-3">
              Plain-language descriptions come from a curated list keyed on drug
              class, not written fresh each time.
            </p>
          </section>

          <section className="float-card p-6">
            <h2 className="display-sm text-2xl mb-3">What to do</h2>
            <div className="flex flex-wrap gap-2">
              {COMMON_INSTRUCTIONS.map((t) => (
                <button
                  key={t}
                  onClick={() =>
                    setInstructions((p) => (p.includes(t) ? p.filter((x) => x !== t) : [...p, t]))
                  }
                  className="chip"
                  style={
                    instructions.includes(t)
                      ? { background: "var(--accent)", color: "var(--accent-ink)", borderColor: "var(--accent)" }
                      : undefined
                  }
                >
                  {t}
                </button>
              ))}
            </div>
            <div className="flex gap-2 mt-3">
              <input
                value={freeInstruction}
                onChange={(e) => setFreeInstruction(e.target.value)}
                placeholder="Anything else you want them to remember"
                className="flex-1 rounded-lg border border-[color:var(--line)] bg-white px-3 py-2.5 text-[15px]"
              />
              <button
                onClick={() => {
                  if (!freeInstruction.trim()) return;
                  setInstructions((p) => [...p, freeInstruction.trim()]);
                  setFreeInstruction("");
                }}
                className="chip"
              >
                Add
              </button>
            </div>
            {instructions.length > 0 && (
              <ul className="mt-3 space-y-1">
                {instructions.map((t) => (
                  <li key={t} className="text-[15px] flex justify-between gap-3">
                    <span>&#10003; {t}</span>
                    <button
                      onClick={() => setInstructions((p) => p.filter((x) => x !== t))}
                      className="underline text-[color:var(--muted)]"
                    >
                      remove
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>

        {/* Live preview - what the patient is about to see. */}
        <aside className="lg:sticky lg:top-6 h-fit space-y-4">
          <section className="float-card p-6">
            <div className="flex items-center justify-between mb-3">
              <h2 className="display-sm text-2xl">Preview</h2>
              <select
                value={language}
                onChange={(e) => setLanguage(e.target.value)}
                className="chip"
              >
                {LANGUAGES.map((l) => (
                  <option key={l}>{l}</option>
                ))}
              </select>
            </div>

            {selected ? (
              <div className="mx-auto max-w-[220px]">
                <Diagram id={selected.diagram} marks={selected.marks} />
              </div>
            ) : (
              <p className="text-[15px] text-[color:var(--muted)]">
                Pick what happened to see the picture they will see.
              </p>
            )}

            <p className="text-xl leading-snug mt-4">
              {customHeadline || selected?.plain || ""}
            </p>
          </section>

          <button
            onClick={() => build(true)}
            disabled={busy}
            className="btn btn-primary w-full py-4 text-lg disabled:opacity-50"
          >
            {busy ? "Preparing…" : "Turn the screen around →"}
          </button>

          {warnings.map((w) => (
            <p key={w} className="text-sm text-[color:var(--muted)]">
              {w}
            </p>
          ))}
        </aside>
      </div>
    </main>
  );
}
