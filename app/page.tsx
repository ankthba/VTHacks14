"use client";

import { useMemo, useRef, useState } from "react";
import { CONDITIONS, REGIONS } from "@/lib/anatomy/conditions";
import { APP_NAME, APP_TAGLINE } from "@/lib/brand";
import { Diagram } from "@/components/Diagram";
import { PatientStory } from "@/components/PatientStory";
import type { BodyType } from "@/components/BodyLocator";
import { HOWTOS } from "@/lib/howto";
import { DEMO_NOTES } from "@/lib/demoNotes";
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
  skipped: string[];
  diagram: DiagramId | null;
  marks: string[];
  meds: MedExplain[];
  instructions: string[];
  spoken: string;
  language: string;
  langTag: string;
  rtl: boolean;
  slides: import("@/lib/explain").Slide[];
}

const LANGUAGES = ["English", "Spanish", "Vietnamese", "Chinese (Simplified)", "Arabic"];

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
  const [meds, setMeds] = useState<{ name: string; strength?: string | null; sig: string; purpose?: string; howToTake?: string }[]>([{ name: "", sig: "" }]);
  const [instructions, setInstructions] = useState<string[]>([]);
  const [howtoIds, setHowtoIds] = useState<string[]>([]);
  const [freeInstruction, setFreeInstruction] = useState("");
  const [language, setLanguage] = useState("English");
  const [bodyType, setBodyType] = useState<BodyType>("neutral");

  const [noteText, setNoteText] = useState("");
  const [noteBusy, setNoteBusy] = useState(false);
  const [noteError, setNoteError] = useState<string | null>(null);
  const [noteStatus, setNoteStatus] = useState<string | null>(null);
  const [skippedLines, setSkippedLines] = useState<string[]>([]);
  const noteFileRef = useRef<HTMLInputElement>(null);

  const [card, setCard] = useState<Card | null>(null);
  const [busy, setBusy] = useState(false);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [patientView, setPatientView] = useState(false);

  const inRegion = useMemo(
    () => CONDITIONS.filter((c) => c.region === region),
    [region],
  );
  const selected = CONDITIONS.find((c) => c.id === conditionId) ?? null;

  /**
   * The note is the input. Everything the composer needs is pulled out of it
   * and dropped into the editable fields, so the clinician reviews rather than
   * re-types. Nothing is turned toward the patient until they say so.
   */
  async function ingestNote(files?: FileList | null) {
    if (!noteText.trim() && !files?.length) return;
    setNoteBusy(true);
    setNoteError(null);
    setNoteStatus(null);
    try {
      const fd = new FormData();
      fd.append("text", noteText);
      Array.from(files ?? []).forEach((f) => fd.append("images", f));
      const r = await fetch("/api/parse-note", { method: "POST", body: fd });
      const json = await r.json();
      if (!r.ok) throw new Error(json.detail ?? json.error ?? "Could not read the note.");

      if (json.conditionId) {
        const c = CONDITIONS.find((x) => x.id === json.conditionId);
        if (c) {
          setRegion(c.region);
          setConditionId(c.id);
          setCustomHeadline(c.plain);
        }
      }
      if (json.medications?.length) {
        setMeds(json.medications.map((m: { name: string; strength?: string | null; sig: string | null }) => ({ name: m.name, strength: m.strength ?? null, sig: m.sig ?? "" })));
      }
      const instr = [...(json.instructions ?? []), ...(json.followUp ?? [])];
      if (instr.length) setInstructions(instr);
      if (json.howtoIds?.length) setHowtoIds(json.howtoIds);
      setSkippedLines(json.skipped ?? []);

      const bits = [
        json.conditionLabel ? `matched "${json.conditionLabel}"` : "no diagnosis in the library",
        `${json.medications?.length ?? 0} medicine(s)`,
        `${instr.length} instruction(s)`,
        ...(json.howtoIds?.length ? [`${json.howtoIds.length} how-to walkthrough(s) attached`] : []),
      ];
      setNoteStatus(`Read the note (${json.method}): ${bits.join(", ")}. Review below, then turn the screen.`);
      setTimeout(() => build(false), 0);
    } catch (e) {
      setNoteError(e instanceof Error ? e.message : String(e));
    } finally {
      setNoteBusy(false);
    }
  }

  async function build(showPatient: boolean) {
    setBusy(true);
    try {
      const r = await fetch("/api/explain", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          conditionId,
          customHeadline: customHeadline || null,
          medNames: meds
            .filter((m) => m.name.trim())
            .map((m) => ({ name: m.name, strength: m.strength ?? null, sig: m.sig, purpose: m.purpose ?? null, howToTake: m.howToTake ?? null })),
          instructions,
          howtoIds,
          language,
        }),
      });
      const json = await r.json();
      setCard(json.card ?? null);
      setWarnings(json.warnings ?? []);
      // Pull the generated sentences back into the rows so the clinician can
      // reword them. Only for English previews - the story is built fresh.
      if (json.card && language === "English") {
        const kept = meds.filter((m) => m.name.trim());
        const byIdx = new Map<number, { purpose: string; howToTake: string }>(
          json.card.meds.map((m: { sourceIndex: number; purpose: string; howToTake: string }) => [m.sourceIndex, m]),
        );
        setMeds(kept.map((m, i) => {
          const g = byIdx.get(i);
          return g ? { ...m, purpose: m.purpose ?? g.purpose, howToTake: m.howToTake ?? g.howToTake } : m;
        }));
      }
      // Anything dropped at build time is a line the patient will NOT hear.
      // It is shown here, and the screen is not turned until it has been seen.
      const dropped: string[] = json.card?.skipped ?? [];
      if (dropped.length && showPatient) {
        setSkippedLines((prev) => [...new Set([...prev, ...dropped])]);
        setWarnings((w) => [
          ...w,
          `${dropped.length} line(s) were not readable as medicines and were left out. They are listed under "Not used" - fix or ignore them, then turn the screen.`,
        ]);
        return;
      }
      if (showPatient) setPatientView(true);
    } finally {
      setBusy(false);
    }
  }

  // ---- Patient view: the screen has been turned around. ----
  if (patientView && card) {
    return (
      <PatientStory
        slides={card.slides}
        diagram={card.diagram}
        marks={card.marks}
        langTag={card.langTag}
        rtl={card.rtl}
        body={bodyType}
        onBack={() => setPatientView(false)}
      />
    );
  }

  // ---- Clinician view: compose it. ----
  return (
    <main className="flex-1 w-full max-w-5xl mx-auto px-4 py-8">
      <header className="mb-8">
        <p className="text-sm font-semibold tracking-[0.08em] uppercase text-[color:var(--muted)]">
          {APP_NAME}
        </p>
        <h1 className="display text-5xl mt-1">{APP_TAGLINE}</h1>
        <p className="text-lg text-[color:var(--muted)] mt-3 max-w-2xl">
          Build what you are about to say, then turn the screen around. It goes
          home with them in their language.
        </p>
        <div className="flex flex-wrap gap-2 mt-4 no-print">
          <a href="/clinician" className="meta-chip hover:border-[color:var(--accent)]">
            Prescribing? Check the drug first &rarr;
          </a>
          <a href="/diagrams" className="meta-chip hover:border-[color:var(--accent)]">
            Anatomy library &rarr;
          </a>
          <a href="/pillpile" className="meta-chip hover:border-[color:var(--accent)]">
            Patient medication checker &rarr;
          </a>
        </div>
      </header>

      <div className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
        <div className="space-y-6">
          <section className="float-card p-6" style={{ borderColor: "var(--accent)" }}>
            <h2 className="display-sm text-2xl">Start from the note</h2>
            <p className="text-[15px] text-[color:var(--muted)] mt-1">
              Paste the discharge summary or visit note, or photograph the page.
              Everything below fills in for you to check.
            </p>
            <div className="flex flex-wrap gap-2 mt-3">
              {DEMO_NOTES.map((d) => (
                <button key={d.id} onClick={() => setNoteText(d.note)} className="chip">
                  {d.title}
                </button>
              ))}
            </div>
            <textarea
              value={noteText}
              onChange={(e) => setNoteText(e.target.value)}
              rows={6}
              placeholder={"Discharge Diagnosis: Distal radius fracture, left\n\nDischarge Medications:\n1. Ibuprofen 600 mg PO TID with food x 7 days\n\nFollow-up:\n- Orthopedics in 2 weeks for repeat X-ray"}
              className="w-full mt-4 rounded-lg border border-[color:var(--line)] bg-white px-3 py-2.5 text-[15px] font-mono"
            />
            <input
              ref={noteFileRef}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={(e) => ingestNote(e.target.files)}
            />
            <div className="flex flex-wrap gap-2 mt-3">
              <button
                onClick={() => ingestNote()}
                disabled={noteBusy || !noteText.trim()}
                className="btn btn-primary disabled:opacity-50"
              >
                {noteBusy ? "Reading\u2026" : "Read the note"}
              </button>
              <button
                onClick={() => noteFileRef.current?.click()}
                disabled={noteBusy}
                className="btn btn-secondary disabled:opacity-50"
              >
                Photograph the page
              </button>
            </div>
            {noteStatus && (
              <p className="text-sm mt-3" style={{ color: "var(--ok)" }}>{noteStatus}</p>
            )}
            {noteError && (
              <p className="text-sm mt-3" style={{ color: "var(--high)" }}>{noteError}</p>
            )}
            {skippedLines.length > 0 && (
              <div className="mt-4 rounded-xl border p-3" style={{ background: "var(--moderate-bg)", borderColor: "var(--moderate)" }}>
                <p className="text-sm font-semibold" style={{ color: "var(--moderate)" }}>
                  Not used &mdash; the patient will not see these
                </p>
                <ul className="mt-1 space-y-0.5 text-sm">
                  {skippedLines.map((l) => (
                    <li key={l} className="flex justify-between gap-3">
                      <span className="font-mono">{l}</span>
                      <button onClick={() => setSkippedLines((p) => p.filter((x) => x !== l))} className="underline text-[color:var(--muted)]">
                        dismiss
                      </button>
                    </li>
                  ))}
                </ul>
                <p className="text-xs text-[color:var(--muted)] mt-2">
                  A line is used only when it is clearly a drug with a dose, or a
                  diagnosis or instruction the library recognises. Add anything
                  missing in the sections below.
                </p>
              </div>
            )}
            <p className="text-xs text-[color:var(--muted)] mt-3">
              The note is read once and never stored. Which diagram and which
              plain sentence a diagnosis becomes is decided by our curated
              library, not generated.
            </p>
          </section>

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
                <div key={i} className="rounded-xl border border-[color:var(--line-soft)] p-3 space-y-2" style={{ background: "var(--surface-warm)" }}>
                  <div className="grid gap-2 sm:grid-cols-2">
                    <input
                      value={m.name}
                      placeholder="Ibuprofen 600 mg"
                      onChange={(e) =>
                        setMeds((p) => p.map((x, j) => (j === i ? { ...x, name: e.target.value, purpose: undefined, howToTake: undefined } : x)))
                      }
                      className="rounded-lg border border-[color:var(--line)] bg-white px-3 py-2.5 text-[15px]"
                    />
                    <input
                      value={m.sig}
                      placeholder="1 tablet three times daily with food"
                      onChange={(e) =>
                        setMeds((p) => p.map((x, j) => (j === i ? { ...x, sig: e.target.value, howToTake: undefined } : x)))
                      }
                      className="rounded-lg border border-[color:var(--line)] bg-white px-3 py-2.5 text-[15px]"
                    />
                  </div>
                  {(m.purpose !== undefined || m.howToTake !== undefined) && (
                    <div className="grid gap-2 sm:grid-cols-2">
                      <label className="block">
                        <span className="block text-xs font-semibold text-[color:var(--muted)] mb-1">What the patient hears it is for</span>
                        <input
                          value={m.purpose ?? ""}
                          onChange={(e) => setMeds((p) => p.map((x, j) => (j === i ? { ...x, purpose: e.target.value } : x)))}
                          className="w-full rounded-lg border border-[color:var(--line)] bg-white px-3 py-2 text-[15px]"
                        />
                      </label>
                      <label className="block">
                        <span className="block text-xs font-semibold text-[color:var(--muted)] mb-1">How to take it, in their words</span>
                        <input
                          value={m.howToTake ?? ""}
                          onChange={(e) => setMeds((p) => p.map((x, j) => (j === i ? { ...x, howToTake: e.target.value } : x)))}
                          className="w-full rounded-lg border border-[color:var(--line)] bg-white px-3 py-2 text-[15px]"
                        />
                      </label>
                    </div>
                  )}
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

          <section className="float-card p-6">
            <h2 className="display-sm text-2xl">How to do it</h2>
            <p className="text-[15px] text-[color:var(--muted)] mt-1 mb-3">
              Step-by-step walkthroughs, one step per screen. The ones the note
              calls for are already on; add any others.
            </p>
            <div className="flex flex-wrap gap-2">
              {HOWTOS.map((h) => {
                const on = howtoIds.includes(h.id);
                return (
                  <button
                    key={h.id}
                    onClick={() =>
                      setHowtoIds((p) => (on ? p.filter((x) => x !== h.id) : [...p, h.id]))
                    }
                    className="chip"
                    style={
                      on
                        ? { background: "var(--accent)", color: "var(--accent-ink)", borderColor: "var(--accent)" }
                        : undefined
                    }
                  >
                    {on ? "\u2713 " : ""}{h.title}
                  </button>
                );
              })}
            </div>
          </section>
        </div>

        {/* Live preview - what the patient is about to see. */}
        <aside className="lg:sticky lg:top-6 h-fit space-y-4">
          <section className="float-card p-6">
            <div className="flex items-center justify-between mb-3 gap-2 flex-wrap">
              <h2 className="display-sm text-2xl">Preview</h2>
              <div className="flex gap-1">
                {(["female", "male"] as BodyType[]).map((b) => (
                  <button
                    key={b}
                    onClick={() => setBodyType((cur) => (cur === b ? "neutral" : b))}
                    className="chip"
                    style={bodyType === b ? { background: "var(--accent)", color: "var(--accent-ink)", borderColor: "var(--accent)" } : undefined}
                  >
                    {b === "female" ? "Female" : "Male"}
                  </button>
                ))}
              </div>
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
