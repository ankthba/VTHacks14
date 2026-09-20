"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { InkArrow, InkCheck, InkGlass, InkRing, InkUnderline } from "@/components/Ink";
import { Menu } from "@/components/Menu";
import { PrescriberCheck } from "@/components/PrescriberCheck";
import { SiteNav } from "@/components/SiteNav";
import { CONDITIONS, REGIONS } from "@/lib/anatomy/conditions";
import type { DiagramId } from "@/lib/anatomy/conditions";
import { Diagram } from "@/components/Diagram";
import { PatientStory } from "@/components/PatientStory";
import { Figure, type BodyType } from "@/components/BodyLocator";
import { HOWTOS } from "@/lib/howto";
import { DEMO_NOTES } from "@/lib/demoNotes";
import { APP_NAME, APP_TAGLINE } from "@/lib/brand";
import { IS_STATIC, asset, loadDemoBundle } from "@/lib/staticMode";
import { parseDeterministic } from "@/lib/parseNote";
import { chooseCondition } from "@/lib/anatomy/conditions";
import { detectHowTos } from "@/lib/howto";
import { buildExplainCard } from "@/lib/explain";
import type { Slide } from "@/lib/explain";

interface MedRow {
  name: string;
  strength?: string | null;
  sig: string;
  purpose?: string;
  howToTake?: string;
}
interface Card {
  headline: string;
  skipped: string[];
  diagram: DiagramId | null;
  marks: string[];
  meds: { sourceIndex: number; name: string; purpose: string; howToTake: string }[];
  instructions: string[];
  spoken: string;
  language: string;
  langTag: string;
  rtl: boolean;
  slides: Slide[];
}

const ALL_LANGUAGES = ["English", "Spanish", "Vietnamese", "Chinese (Simplified)", "Arabic"];
const COMMON_INSTRUCTIONS = [
  "Keep the splint dry.",
  "Come back in 2 weeks.",
  "Call us if it gets worse.",
  "No driving until we say so.",
  "Rest it for 48 hours.",
];

/**
 * The clinician's side. One document, three numbered steps, a preview that is
 * drawn as the slide it will become - then the screen is turned.
 */
export default function Home() {
  const [region, setRegion] = useState(REGIONS[0]);
  /** The screen turning: the page swings out, the content swaps, it swings in. */
  const [flip, setFlip] = useState<"" | "out" | "in">("");
  function turnTo(patient: boolean) {
    const reduce = typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (reduce) { setPatientView(patient); return; }
    setFlip("out");
    window.setTimeout(() => {
      setPatientView(patient);
      setFlip("in");
      window.setTimeout(() => setFlip(""), 400);
    }, 330);
  }
  const [query, setQuery] = useState("");
  /** A condition the pointer is resting on: the preview shows it before it is chosen. */
  const [hoverId, setHoverId] = useState<string | null>(null);
  // The preview follows a resting pointer, not a passing one: a short dwell
  // before it swaps, and nothing while the page is scrolling under the mouse.
  const hoverTimer = useRef<number | null>(null);
  const scrollingUntil = useRef(0);
  useEffect(() => {
    const onScroll = () => { scrollingUntil.current = Date.now() + 250; };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);
  const hoverStart = (id: string) => {
    if (hoverTimer.current) window.clearTimeout(hoverTimer.current);
    hoverTimer.current = window.setTimeout(() => {
      if (Date.now() < scrollingUntil.current) return;
      setHoverId(id);
    }, 280);
  };
  const hoverEnd = () => {
    if (hoverTimer.current) window.clearTimeout(hoverTimer.current);
    hoverTimer.current = null;
    setHoverId(null);
  };
  const [conditionId, setConditionId] = useState<string | null>(null);
  const [choosing, setChoosing] = useState(false);
  const [customHeadline, setCustomHeadline] = useState("");
  const [meds, setMeds] = useState<MedRow[]>([]);
  const [instructions, setInstructions] = useState<string[]>([]);
  const [freeInstruction, setFreeInstruction] = useState("");
  const [howtoIds, setHowtoIds] = useState<string[]>([]);
  const [language, setLanguage] = useState("English");
  const [bodyType, setBodyType] = useState<BodyType>("male");
  const [languages, setLanguages] = useState<string[]>(ALL_LANGUAGES);

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

  useEffect(() => {
    if (IS_STATIC) loadDemoBundle().then((b) => setLanguages(b.languages)).catch(() => {});
  }, []);

  const selected = CONDITIONS.find((c) => c.id === conditionId) ?? null;
  const inRegion = useMemo(() => CONDITIONS.filter((c) => c.region === region), [region]);
  /** Search across every category: label, plain sentence, and the clinical words. */
  const found = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    const score = (c: (typeof CONDITIONS)[number]) => {
      if (c.label.toLowerCase().startsWith(q)) return 0;
      if (c.label.toLowerCase().includes(q)) return 1;
      if (c.synonyms.some((x) => x.startsWith(q))) return 2;
      if (c.synonyms.some((x) => x.includes(q))) return 3;
      if (c.region.toLowerCase().includes(q) || c.plain.toLowerCase().includes(q)) return 4;
      return -1;
    };
    return CONDITIONS.map((c) => ({ c, s: score(c) })).filter((x) => x.s >= 0).sort((a, b) => a.s - b.s).slice(0, 14).map((x) => x.c);
  }, [query]);
  const listed = query.trim() ? found : inRegion;
  const hovered = hoverId ? CONDITIONS.find((c) => c.id === hoverId) ?? null : null;
  /** The drawing a category is mostly about, for the preview before anything is chosen. */
  const regionView = useMemo(() => {
    const counts = new Map<DiagramId, number>();
    for (const c of inRegion) counts.set(c.diagram, (counts.get(c.diagram) ?? 0) + 1);
    return [...counts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? "body";
  }, [inRegion]);
  const hasContent = !!selected || meds.length > 0 || instructions.length > 0;

  type Snapshot = {
    conditionId: string | null;
    customHeadline: string;
    meds: MedRow[];
    instructions: string[];
    howtoIds: string[];
    /** Set when the caller has fresher values than state (a chained call). */
    noteText?: string;
    language?: string;
  };

  /** The note is the input. Everything below fills from it for review. */
  async function ingestNote(files?: FileList | null, textOverride?: string): Promise<Snapshot | null> {
    const source = textOverride ?? noteText;
    if (textOverride !== undefined) setNoteText(textOverride);
    if (!source.trim() && !files?.length) return null;
    setNoteBusy(true);
    setNoteError(null);
    setNoteStatus(null);
    const started = Date.now();
    try {
      let json: {
        conditionId: string | null;
        conditionLabel?: string | null;
        medications?: { name: string; strength?: string | null; sig: string | null }[];
        instructions?: string[];
        followUp?: string[];
        howtoIds?: string[];
        skipped?: string[];
        method: string;
      };

      if (IS_STATIC) {
        const bundle = await loadDemoBundle();
        const hit = bundle.notes.find((n) => n.note.trim() === source.trim());
        if (hit) {
          json = hit.parse as unknown as typeof json;
        } else {
          // The published site has no server, and needs none: the parser is
          // deterministic code, so it runs right here in the page.
          const det = parseDeterministic(source);
          const primary = chooseCondition(det.diagnoses);
          json = {
            ...det,
            conditionId: primary?.condition.id ?? null,
            howtoIds: detectHowTos([...det.instructions, ...det.followUp, source]),
            method: "deterministic",
          };
        }
      } else {
        const fd = new FormData();
        fd.append("text", source);
        Array.from(files ?? []).forEach((f) => fd.append("images", f));
        const r = await fetch("/api/parse-note", { method: "POST", body: fd });
        json = await r.json();
        if (!r.ok) throw new Error((json as { detail?: string; error?: string }).detail ?? (json as { error?: string }).error ?? "Could not read the note.");
      }

      // Reading takes a beat even when the answer is instant: the spot is
      // searching the body in the preview, and it should be seen to land.
      await new Promise((r) => setTimeout(r, Math.max(0, 1400 - (Date.now() - started))));

      const c = json.conditionId ? CONDITIONS.find((x) => x.id === json.conditionId) : undefined;
      if (c) {
        setRegion(c.region);
        setConditionId(c.id);
        setCustomHeadline(c.plain);
        setChoosing(false);
      }
      const parsedMeds: MedRow[] = (json.medications ?? []).map((m) => ({
        name: m.name,
        strength: m.strength ?? null,
        sig: m.sig ?? "",
      }));
      if (parsedMeds.length) setMeds(parsedMeds);
      const instr = [...(json.instructions ?? []), ...(json.followUp ?? [])];
      if (instr.length) setInstructions(instr);
      const parsedHowtos = json.howtoIds ?? [];
      if (parsedHowtos.length) setHowtoIds(parsedHowtos);
      setSkippedLines(json.skipped ?? []);

      const bits = [
        c ? `matched "${c.label}"` : "no diagnosis in the library",
        `${parsedMeds.length} medicine${parsedMeds.length === 1 ? "" : "s"}`,
        `${instr.length} instruction${instr.length === 1 ? "" : "s"}`,
        ...(parsedHowtos.length ? [`${parsedHowtos.length} walkthrough${parsedHowtos.length === 1 ? "" : "s"}`] : []),
      ];
      setNoteStatus(bits.join(" · "));

      const snap: Snapshot = {
        conditionId: c?.id ?? conditionId,
        customHeadline: c?.plain ?? customHeadline,
        meds: parsedMeds.length ? parsedMeds : meds,
        instructions: instr.length ? instr : instructions,
        howtoIds: parsedHowtos.length ? parsedHowtos : howtoIds,
        noteText: source,
      };
      void build(false, snap);
      return snap;
    } catch (e) {
      setNoteError(e instanceof Error ? e.message : String(e));
      return null;
    } finally {
      setNoteBusy(false);
    }
  }

  /**
   * Deep links, for demos and screenshots: ?note=wrist|wisdom&turn=1&slide=3
   * &lang=Spanish&theme=dark&body=female. The page loads, reads the note,
   * and turns itself.
   */
  const [initialSlide, setInitialSlide] = useState(0);
  useEffect(() => {
    if (typeof window === "undefined") return;
    const q = new URLSearchParams(window.location.search);
    const demo = DEMO_NOTES.find((d) => d.id === q.get("note"));
    if (!demo) return;
    const lang = q.get("lang") ?? "English";
    if (q.get("theme") === "dark") document.documentElement.dataset.theme = "dark";
    if (q.get("body") === "female") setBodyType("female");
    setLanguage(lang);
    setInitialSlide(Math.max(0, Number(q.get("slide") ?? 0) || 0));
    (async () => {
      const snap = await ingestNote(undefined, demo.note);
      if (snap && q.get("turn")) await build(true, { ...snap, language: lang });
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function build(showPatient: boolean, snap?: Snapshot) {
    const cur: Snapshot = snap ?? { conditionId, customHeadline, meds, instructions, howtoIds };
    const text = cur.noteText ?? noteText;
    const lang = cur.language ?? language;

    // Audio may only start inside a user gesture. The turn is that gesture;
    // the first clip arrives after a fetch, so unlock playback now.
    if (showPatient && typeof window !== "undefined") {
      try {
        const a = new Audio(
          "data:audio/mp3;base64,SUQzBAAAAAAAI1RTU0UAAAAPAAADTGF2ZjU4Ljc2LjEwMAAAAAAAAAAAAAAA//tQxAADB8AhSmxhIIEVCSiJrDCQBTcu3UrAIwUdkRgQbFAZC1CQEwTJ9mjRvBA4UOLD8nKVOWfh+UlK3z/177OXrfOdKl7pyn3Xf//WreyTRUoAWgBgkOAGbZHBgG1OF6zM82DWbZaUmMBptgQhGjsyYqc9ae9XPAcyjiJvlN18v7wWm6jyMqxXWIzcxxCmqk7qFTlxQGA9wFO7WkpIi16kJmS0yLdG/qU8KY/8ZIgOgRQUNCYgvZtEyGqoJ9cJGhZlfDhMTFf",
        );
        a.volume = 0;
        void a.play().catch(() => {});
      } catch {
        // Nothing to unlock; the Play button still works.
      }
    }

    setBusy(true);
    try {
      let json: { card?: Card; warnings?: string[]; detail?: string; error?: string };

      if (IS_STATIC) {
        const bundle = await loadDemoBundle();
        const hit = bundle.notes.find((n) => n.note.trim() === text.trim());
        const prebuilt = hit?.cards[lang] as Card | undefined;
        if (prebuilt) {
          json = { card: prebuilt, warnings: [] };
        } else {
          // Built in the page: RxNorm, the FDA label and the translator are
          // public services the browser can ask directly.
          const { card, translation } = await buildExplainCard({
            conditionId: cur.conditionId,
            customHeadline: cur.customHeadline || null,
            meds: cur.meds
              .filter((m) => m.name.trim())
              .map((m) => ({ drug_text: m.name, strength: m.strength ?? null, sig: m.sig || null, quantity: null, prescriber: null, fill_date: null, confidence: 1 })),
            medOverrides: Object.fromEntries(cur.meds.filter((m) => m.name.trim()).map((m, i) => [i, { purpose: m.purpose ?? null, howToTake: m.howToTake ?? null }])),
            instructions: cur.instructions,
            howtoIds: cur.howtoIds,
            language: lang,
          });
          json = {
            card: card as unknown as Card,
            warnings: translation.untranslated > 0 ? ["Some lines could not be translated and are shown in English."] : [],
          };
        }
      } else {
        const r = await fetch("/api/explain", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            conditionId: cur.conditionId,
            customHeadline: cur.customHeadline || null,
            medNames: cur.meds
              .filter((m) => m.name.trim())
              .map((m) => ({ name: m.name, strength: m.strength ?? null, sig: m.sig, purpose: m.purpose ?? null, howToTake: m.howToTake ?? null })),
            instructions: cur.instructions,
            howtoIds: cur.howtoIds,
            language: lang,
          }),
        });
        json = await r.json();
        if (!r.ok) throw new Error(json.detail ?? json.error ?? "Failed");
      }

      const built = json.card ?? null;
      setCard(built);
      setWarnings(json.warnings ?? []);

      // Generated sentences come back into the rows so they can be reworded.
      if (built && language === "English") {
        const byIdx = new Map(built.meds.map((m) => [m.sourceIndex, m]));
        setMeds((prev) => {
          let k = -1;
          return prev.map((m) => {
            if (!m.name.trim()) return m;
            k += 1;
            const g = byIdx.get(k);
            return g ? { ...m, purpose: m.purpose ?? g.purpose, howToTake: m.howToTake ?? g.howToTake } : m;
          });
        });
      }

      const dropped = built?.skipped ?? [];
      if (dropped.length && showPatient) {
        setSkippedLines((prev) => [...new Set([...prev, ...dropped])]);
        setWarnings((w) => [...w, `${dropped.length} line(s) could not be read as medicines and were left out - see "Not used".`]);
        return;
      }
      if (showPatient && built) turnTo(true);
    } catch (e) {
      setWarnings([e instanceof Error ? e.message : String(e)]);
    } finally {
      setBusy(false);
    }
  }

  // ---- The turned screen ----
  if (patientView && card) {
    return (
      <div className={`ink-green flex-1 flex flex-col ${flip ? `turn ${flip}` : ""}`}>
        <PatientStory
          slides={card.slides}
          diagram={card.diagram}
          marks={card.marks}
          langTag={card.langTag}
          rtl={card.rtl}
          body={bodyType}
          onBack={() => turnTo(false)}
          initialIndex={initialSlide}
        />
      </div>
    );
  }

  const stepClass = (done: boolean, active: boolean) => `step-n ${done ? "done" : active ? "" : "todo"}`;
  const primaryLabel: ReactNode = busy ? "Getting it ready\u2026" : <>Turn the screen around <InkArrow className="arrow inline-block ml-1 align-[-2px]" /></>;
  const taglineWords = APP_TAGLINE.split(" ");
  const taglineLast = taglineWords.pop();
  const canTurn = hasContent && !busy;

  return (
    <div className={`ink-green flex-1 w-full ${flip ? `turn ${flip}` : ""}`}>
      <div className="max-w-6xl mx-auto px-5">
        <SiteNav current="explain" className="rise" />

        <header className="pt-12 pb-10 rise" style={{ animationDelay: "60ms" }}>
          <h1 className="display" style={{ fontSize: "clamp(2.4rem, 5vw, 4rem)" }}>
            {taglineWords.join(" ")}{" "}
            <span className="ink-under">{taglineLast}<InkUnderline className="ink-under-svg" draw /></span>
          </h1>
          <p className="text-lg text-[color:var(--muted)] mt-4 max-w-xl">
            Paste the note you already wrote. Check what the patient will hear. Turn the screen.
          </p>
          {/* The masthead: the anatomy, in our own ink, before a word of UI. */}
          <div className="ink-row mt-10" aria-hidden>
            {(["head", "heart", "lung", "wrist", "abdomen", "spine", "knee", "shoulder"] as DiagramId[]).map((id, n) => (
              <div key={id} className="h-full flex-none rise" style={{ animationDelay: `${120 + n * 70}ms` }}><Diagram id={id} fit /></div>
            ))}
          </div>
        </header>

        <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_400px] items-start pb-16">
          {/* ---------------- The document ---------------- */}
          <div className="doc rise" style={{ animationDelay: "220ms" }}>
            <section>
              <div className="step">
                <span className={stepClass(!!noteStatus, true)}><InkRing className="step-ring" draw />1</span>
                <h2 className="display-sm text-2xl">Start from the note</h2>
              </div>

              <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2 mb-2">
                <label htmlFor="note" className="field-label" style={{ marginBottom: 0 }}>Your note</label>
                <span className="flex flex-wrap items-baseline gap-x-3 gap-y-1 text-[13px] text-[color:var(--muted)]">
                  or try an example:
                  {DEMO_NOTES.map((d) => (
                    <button key={d.id} onClick={() => { setNoteText(d.note); setNoteError(null); }} className={`chip ${noteText.trim() === d.note.trim() ? "on" : ""}`}>
                      {d.title}
                    </button>
                  ))}
                </span>
              </div>
              <textarea
                id="note"
                value={noteText}
                onChange={(e) => setNoteText(e.target.value)}
                rows={7}
                placeholder={"Click here and paste the note: a discharge summary, a clinic note, an EHR export. Nothing is stored."}
                className="field note text-[15px] leading-relaxed"
              />
              <input ref={noteFileRef} type="file" accept="image/*" multiple className="hidden" onChange={(e) => ingestNote(e.target.files)} />
              <div className="flex flex-wrap items-center gap-4 mt-3">
                <button onClick={() => ingestNote()} disabled={noteBusy || !noteText.trim()} className="btn btn-primary disabled:opacity-50">
                  {noteBusy ? "Reading the note\u2026" : "Read the note"}
                </button>
                {!IS_STATIC && (
                  <button onClick={() => noteFileRef.current?.click()} disabled={noteBusy} className="link-action">
                    or photograph the page
                  </button>
                )}
                {noteStatus && <span className="text-sm" style={{ color: "var(--ok)" }}>{noteStatus}</span>}
              </div>
              {noteError && <p className="text-sm mt-3" style={{ color: "var(--high)" }}>{noteError}</p>}

              {skippedLines.length > 0 && (
                <div className="mt-4 pl-4 border-l-2" style={{ borderColor: "var(--moderate)" }}>
                  <p className="text-sm font-semibold" style={{ color: "var(--moderate)" }}>Not used. The patient will not hear these</p>
                  <ul className="mt-2 space-y-1 text-sm">
                    {skippedLines.map((l) => (
                      <li key={l} className="flex justify-between gap-3">
                        <span className="font-mono">{l}</span>
                        <button onClick={() => setSkippedLines((p) => p.filter((x) => x !== l))} className="link-action">dismiss</button>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </section>

            <section>
              <div className="step">
                <span className={stepClass(false, hasContent)}><InkRing className="step-ring" draw />2</span>
                <h2 className="display-sm text-2xl">Check what they will hear</h2>
              </div>
              {!hasContent && (
                <p className="text-[15px] text-[color:var(--muted)]">Read a note, or set it up by hand below.</p>
              )}

              {/* What happened */}
              <div className="mt-2">
                <div className="flex items-baseline justify-between gap-4">
                  <span className="field-label">What happened</span>
                  {selected && !choosing && (
                    <button onClick={() => setChoosing(true)} className="link-action">Change</button>
                  )}
                </div>
                {selected && !choosing ? (
                  <textarea
                    value={customHeadline}
                    onChange={(e) => setCustomHeadline(e.target.value)}
                    rows={2}
                    className="field text-[16px]"
                  />
                ) : (
                  <>
                    <label className="search mb-4">
                      <InkGlass />
                      <input
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        placeholder={`Search ${CONDITIONS.length} conditions: "ankle", "UTI", "S52"`}
                        className="field"
                        aria-label="Search conditions"
                      />
                    </label>
                    {!query.trim() && (
                      <div className="tabs mb-3">
                        {REGIONS.map((r) => (
                          <button key={r} onClick={() => setRegion(r)} className={`tab ${r === region ? "on" : ""}`}>{r}</button>
                        ))}
                      </div>
                    )}
                    {query.trim() && listed.length === 0 && (
                      <p className="text-[15px] text-[color:var(--muted)]">Nothing matches. Try the part of the body, or the ICD-10 code.</p>
                    )}
                    <div className="list-hairline border-t border-[color:var(--line-soft)]">
                      {listed.map((c) => (
                        <button
                          key={c.id}
                          onClick={() => { setConditionId(c.id); setRegion(c.region); setCustomHeadline(c.plain); setChoosing(false); setQuery(""); setHoverId(null); }}
                          onMouseEnter={() => hoverStart(c.id)}
                          onMouseLeave={hoverEnd}
                          onFocus={() => setHoverId(c.id)}
                          onBlur={hoverEnd}
                          className="row w-full text-left py-3 hover:opacity-75"
                        >
                          <span
                            className="ink-radio flex-none w-5 h-5 mt-1 border-2"
                            style={{ borderColor: c.id === conditionId ? "var(--accent-text)" : "var(--ink)", background: c.id === conditionId ? "var(--accent)" : "transparent" }}
                          />
                          <span>
                            <span className="font-semibold block">
                              {c.label}
                              {query.trim() && <span className="font-normal text-[13px] text-[color:var(--muted)]"> &middot; {c.region}</span>}
                            </span>
                            <span className="text-[14px] text-[color:var(--muted)]">{c.plain}</span>
                          </span>
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </div>

              {/* Medicines */}
              <div className="mt-7">
                <div className="flex items-baseline justify-between gap-4">
                  <span className="field-label">Medicines</span>
                  <button onClick={() => setMeds((p) => [...p, { name: "", sig: "" }])} className="link-action">+ Add</button>
                </div>
                {meds.length === 0 && <p className="text-[15px] text-[color:var(--muted)]">No medicines yet. Reading a note fills these in.</p>}
                <div className="space-y-4">
                  {meds.map((m, i) => (
                    <div key={i} className="pt-3 border-t border-[color:var(--line-soft)] first:border-0 first:pt-0">
                      <div className="grid gap-2 sm:grid-cols-[1.2fr_0.6fr_1.6fr_auto] items-center">
                        <input value={m.name} placeholder="Ibuprofen" onChange={(e) => setMeds((p) => p.map((x, j) => (j === i ? { ...x, name: e.target.value, purpose: undefined, howToTake: undefined } : x)))} className="field" />
                        <input value={m.strength ?? ""} placeholder="600 mg" onChange={(e) => setMeds((p) => p.map((x, j) => (j === i ? { ...x, strength: e.target.value } : x)))} className="field" />
                        <input value={m.sig} placeholder="1 tablet three times daily with food" onChange={(e) => setMeds((p) => p.map((x, j) => (j === i ? { ...x, sig: e.target.value, howToTake: undefined } : x)))} className="field" />
                        <button onClick={() => setMeds((p) => p.filter((_, j) => j !== i))} className="link-action justify-self-end">remove</button>
                      </div>
                      {(m.purpose !== undefined || m.howToTake !== undefined) && (
                        <div className="grid gap-2 sm:grid-cols-2 mt-2">
                          <input value={m.purpose ?? ""} placeholder="What it is for, in their words" onChange={(e) => setMeds((p) => p.map((x, j) => (j === i ? { ...x, purpose: e.target.value } : x)))} className="field" style={{ background: "var(--surface-warm)" }} />
                          <input value={m.howToTake ?? ""} placeholder="How to take it, in their words" onChange={(e) => setMeds((p) => p.map((x, j) => (j === i ? { ...x, howToTake: e.target.value } : x)))} className="field" style={{ background: "var(--surface-warm)" }} />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {meds.some((m) => m.name.trim()) && <PrescriberCheck meds={meds} />}

              {/* What to do */}
              <div className="mt-7">
                <span className="field-label">What to do</span>
                {instructions.length > 0 && (
                  <ul className="mb-3 space-y-1.5">
                    {instructions.map((t) => (
                      <li key={t} className="flex justify-between gap-3 text-[15px]">
                        <span className="flex items-start gap-2"><InkCheck className="flex-none mt-[3px] text-[color:var(--accent-text)]" size={16} />{t}</span>
                        <button onClick={() => setInstructions((p) => p.filter((x) => x !== t))} className="link-action">remove</button>
                      </li>
                    ))}
                  </ul>
                )}
                <div className="flex flex-wrap gap-2 mb-2">
                  {COMMON_INSTRUCTIONS.filter((t) => !instructions.includes(t)).map((t) => (
                    <button key={t} onClick={() => setInstructions((p) => [...p, t])} className="chip">+ {t}</button>
                  ))}
                </div>
                <div className="flex gap-2">
                  <input
                    value={freeInstruction}
                    onChange={(e) => setFreeInstruction(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter" && freeInstruction.trim()) { setInstructions((p) => [...p, freeInstruction.trim()]); setFreeInstruction(""); } }}
                    placeholder="Anything else they should remember - press Enter"
                    className="field"
                  />
                </div>
              </div>

              {/* How to do it */}
              <div className="mt-7">
                <span className="field-label">How to do it</span>
                <div className="flex flex-wrap gap-2 items-center">
                  {howtoIds.map((id) => {
                    const h = HOWTOS.find((x) => x.id === id);
                    return h ? (
                      <button key={id} onClick={() => setHowtoIds((p) => p.filter((x) => x !== id))} className="chip on" title="Remove">
                        {h.title} &times;
                      </button>
                    ) : null;
                  })}
                  <Menu
                    label="+ Add a walkthrough"
                    items={HOWTOS.filter((h) => !howtoIds.includes(h.id)).map((h) => ({ id: h.id, label: h.title }))}
                    onPick={(id) => setHowtoIds((p) => [...p, id])}
                  />
                </div>
                <p className="text-[13px] text-[color:var(--muted)] mt-2">One screen each, steps numbered, read aloud.</p>
              </div>
            </section>

            <section className="lg:hidden">
              <div className="step">
                <span className={stepClass(false, canTurn)}><InkRing className="step-ring" draw />3</span>
                <h2 className="display-sm text-2xl">Turn the screen</h2>
              </div>
              <button onClick={() => build(true)} disabled={!canTurn} className="btn btn-primary btn-turn w-full py-4 text-lg disabled:opacity-50">{primaryLabel}</button>
            </section>
          </div>

          {/* ---------------- The preview ---------------- */}
          <aside className="lg:sticky lg:top-6 space-y-4 rise" style={{ animationDelay: "320ms" }}>
            <div className="slide-preview">
              <div className="flex items-center justify-between gap-2 flex-wrap mb-5">
                <Menu
                  label={language}
                  items={languages.map((l) => ({ id: l, label: l, on: l === language }))}
                  onPick={setLanguage}
                />
                {(hovered ?? selected)?.diagram === "body" && (
                  <div className="flex gap-1">
                    {(["female", "male"] as BodyType[]).map((b) => (
                      <button key={b} onClick={() => setBodyType(b)} className={`chip ${bodyType === b ? "on" : ""}`}>
                        {b === "female" ? "Female" : "Male"}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {(hovered ?? selected) ? (
                <div key={(hovered ?? selected)!.id} className="mx-auto max-w-[220px] mb-5"><Diagram id={(hovered ?? selected)!.diagram} marks={(hovered ?? selected)!.marks} /></div>
              ) : !noteBusy && regionView !== "body" ? (
                <div key={regionView} className="mx-auto max-w-[220px] mb-5" aria-hidden><Diagram id={regionView} /></div>
              ) : (
                <div className="mx-auto h-44 mb-5 flex items-end justify-center gap-6 transition-opacity duration-500" aria-hidden style={{ opacity: noteBusy ? 1 : 0.3 }}>
                  <div className="h-full"><Figure region="body" body="female" spot={false} searching={noteBusy} /></div>
                  <div className="h-full"><Figure region="body" body="male" spot={false} searching={noteBusy} /></div>
                </div>
              )}
              {(hovered?.plain || customHeadline || selected?.plain) && (
                <p key={hovered?.id ?? "chosen"} className="display-sm" style={{ fontSize: "1.6rem" }}>{hovered?.plain || customHeadline || selected?.plain}</p>
              )}

              {meds.filter((m) => m.name.trim()).length > 0 && (
                <div className="mt-5 pt-4 border-t border-[color:var(--line-soft)] space-y-2">
                  {meds.filter((m) => m.name.trim()).map((m, i) => (
                    <p key={i} className="text-[15px]">
                      <span className="font-semibold">{m.name}</span>
                      {m.purpose && <span className="text-[color:var(--muted)]"> &middot; {m.purpose}</span>}
                    </p>
                  ))}
                </div>
              )}
            </div>

            <button onClick={() => build(true)} disabled={!canTurn} className="btn btn-primary btn-turn w-full py-4 text-lg disabled:opacity-50 hidden lg:block">
              {primaryLabel}
            </button>
            {warnings.map((w) => <p key={w} className="text-sm text-[color:var(--muted)]">{w}</p>)}
            <p className="text-[13px] text-[color:var(--muted)]">
              Nothing is stored. The note lives in this tab and is gone when you close it.
            </p>
          </aside>
        </div>

        <footer className="py-8 border-t border-[color:var(--line-soft)] text-[13px] text-[color:var(--muted)] space-y-2">
          <div className="flex flex-wrap gap-x-6 gap-y-2">
            <span>{APP_NAME}</span>
            <span>VTHacks 14</span>
            <span>Educational demo. Not medical advice.</span>
          </div>
          <p>
            Accessible by design: every colour pairing clears WCAG AA, the whole flow works from the keyboard,
            every picture is described for a screen reader, motion honours your reduced-motion setting,
            Arabic reads right to left, every screen is read aloud, and the story prints on one sheet.
          </p>
        </footer>
      </div>
    </div>
  );
}
