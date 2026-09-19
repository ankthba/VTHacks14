"use client";

import { useCallback, useRef, useState } from "react";
import { BottleReview } from "@/components/BottleReview";
import { FindingCard } from "@/components/FindingCard";
import { ScheduleGrid } from "@/components/ScheduleGrid";
import { ReconcileTable } from "@/components/ReconcileTable";
import { ReadAloud } from "@/components/ReadAloud";
import { CanITake } from "@/components/CanITake";
import { SCENARIOS } from "@/lib/fixtures";
import type { BottleRecord } from "@/lib/schemas";
import type { AnalysisResult, NormalizedMed, ReconcileRow } from "@/lib/types";
import { displayName } from "@/lib/display";

type Stage = "start" | "review" | "results";

interface ApiResult extends AnalysisResult {
  dischargeMeds: NormalizedMed[];
  reconciliation: ReconcileRow[] | null;
  summaries: { med_id: string; name: string; what_its_for: string; source_url: string | null }[];
  onePager: string;
  onePagerGenerated: boolean;
  provider: string;
}

const LANGUAGES = ["English", "Spanish", "Vietnamese", "Chinese (Simplified)", "Arabic"];
const LANG_TAG: Record<string, string> = {
  English: "en-US",
  Spanish: "es-ES",
  Vietnamese: "vi-VN",
  "Chinese (Simplified)": "zh-CN",
  Arabic: "ar-SA",
};

export default function Home() {
  const [stage, setStage] = useState<Stage>("start");
  const [bottles, setBottles] = useState<BottleRecord[]>([]);
  const [discharge, setDischarge] = useState<BottleRecord[]>([]);
  const [activeDemo, setActiveDemo] = useState<string | null>(null);
  const [result, setResult] = useState<ApiResult | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [language, setLanguage] = useState("English");
  const fileRef = useRef<HTMLInputElement>(null);
  const dischargeRef = useRef<HTMLInputElement>(null);

  const loadScenario = useCallback(async (id: string) => {
    setError(null);
    setBusy("Loading demo labels...");
    try {
      const res = await fetch(`/api/extract?demo=${id}`, { method: "POST" });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Failed");
      setBottles(json.bottles);
      setDischarge(json.discharge ?? []);
      setActiveDemo(id);
      setStage("review");
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(null);
    }
  }, []);

  const upload = useCallback(
    async (files: FileList, kind: "bottles" | "discharge" = "bottles") => {
      setError(null);
      setBusy(kind === "discharge" ? "Reading the paperwork..." : "Reading the labels...");
      try {
        const fd = new FormData();
        Array.from(files).forEach((f) => fd.append("images", f));
        const res = await fetch(`/api/extract?kind=${kind}`, { method: "POST", body: fd });
        const json = await res.json();
        if (!res.ok) throw new Error(json.detail ?? json.error ?? "Failed");

        setActiveDemo(null);
        if (kind === "discharge") {
          if (!json.discharge?.length) {
            throw new Error("No medications were found on that paperwork.");
          }
          setDischarge(json.discharge);
        } else {
          if (!json.bottles?.length) {
            throw new Error("No medication labels were found in those photos.");
          }
          setBottles(json.bottles);
        }
        setStage("review");
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e));
      } finally {
        setBusy(null);
      }
    },
    [],
  );

  const analyze = useCallback(
    async (lang = language) => {
      setError(null);
      setBusy("Checking ingredients, classes and FDA labels...");
      try {
        const res = await fetch("/api/analyze", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ bottles, discharge, language: lang }),
        });
        const json = await res.json();
        if (!res.ok) throw new Error(json.detail ?? json.error ?? "Failed");
        setResult(json);
        setStage("results");
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e));
      } finally {
        setBusy(null);
      }
    },
    [bottles, discharge, language],
  );

  return (
    <main className="flex-1 w-full max-w-4xl mx-auto px-4 py-8">
      <header className="mb-8 no-print">
        <h1 className="text-4xl font-black tracking-tight">PillPile</h1>
        <p className="text-lg text-[color:var(--muted)] mt-1">
          Photograph the bottles on the kitchen table. Get back questions worth
          asking your pharmacist.
        </p>
      </header>

      {error && (
        <div
          role="alert"
          className="no-print mb-6 rounded-xl border p-4"
          style={{ background: "var(--high-bg)", borderColor: "var(--high)" }}
        >
          <strong style={{ color: "var(--high)" }}>Something went wrong.</strong>
          <p className="text-[15px] mt-1">{error}</p>
        </div>
      )}

      {busy && (
        <div className="no-print mb-6 rounded-xl border border-[color:var(--line)] bg-[color:var(--surface)] p-4">
          <p className="font-semibold">{busy}</p>
          <div className="mt-2 h-1.5 w-full overflow-hidden rounded bg-[color:var(--line)]">
            <div className="h-full w-1/3 animate-pulse rounded bg-[color:var(--accent)]" />
          </div>
        </div>
      )}

      {stage === "start" && (
        <StartScreen
          onPick={loadScenario}
          onUpload={upload}
          fileRef={fileRef}
          dischargeRef={dischargeRef}
          disabled={!!busy}
        />
      )}

      {stage === "review" && (
        <section className="no-print">
          <h2 className="text-2xl font-bold mb-1">Check what we read</h2>
          <p className="text-[color:var(--muted)] mb-5">
            Everything below came off the labels. Fix anything that is wrong
            before we check it &mdash; a wrong name here would make every check
            wrong too.
          </p>
          <BottleReview
            bottles={bottles}
            onChange={(i, patch) =>
              setBottles((prev) => prev.map((b, j) => (j === i ? { ...b, ...patch, confidence: 1 } : b)))
            }
            onRemove={(i) => setBottles((prev) => prev.filter((_, j) => j !== i))}
          />
          {discharge.length > 0 && (
            <div className="mt-6">
              <h3 className="text-xl font-bold mb-1">
                From the discharge paperwork
              </h3>
              <p className="text-[color:var(--muted)] mb-3 text-[15px]">
                These will be compared against the bottles above.
              </p>
              <BottleReview
                bottles={discharge}
                onChange={(i, patch) =>
                  setDischarge((prev) => prev.map((b, j) => (j === i ? { ...b, ...patch, confidence: 1 } : b)))
                }
                onRemove={(i) => setDischarge((prev) => prev.filter((_, j) => j !== i))}
              />
            </div>
          )}

          <div className="mt-6 flex flex-wrap items-center gap-3">
            <button
              onClick={() => analyze()}
              disabled={!!busy || bottles.length === 0}
              className="rounded-lg bg-[color:var(--accent)] px-6 py-3 text-lg font-bold text-white disabled:opacity-50"
            >
              Check these {bottles.length} medicines
            </button>
            <button
              onClick={() => { setStage("start"); setBottles([]); setDischarge([]); }}
              className="underline text-[color:var(--muted)]"
            >
              Start over
            </button>
          </div>
        </section>
      )}

      {stage === "results" && result && (
        <Results
          result={result}
          bottles={bottles}
          demo={activeDemo}
          language={language}
          onLanguage={(l) => { setLanguage(l); analyze(l); }}
          onRestart={() => { setStage("start"); setBottles([]); setDischarge([]); setResult(null); }}
        />
      )}
    </main>
  );
}

function StartScreen({
  onPick,
  onUpload,
  fileRef,
  dischargeRef,
  disabled,
}: {
  onPick: (id: string) => void;
  onUpload: (f: FileList, kind?: "bottles" | "discharge") => void;
  fileRef: React.RefObject<HTMLInputElement | null>;
  dischargeRef: React.RefObject<HTMLInputElement | null>;
  disabled: boolean;
}) {
  return (
    <div className="space-y-8">
      <section className="rounded-2xl border-2 border-dashed border-[color:var(--line)] bg-[color:var(--surface)] p-8 text-center">
        <h2 className="text-2xl font-bold">Take a photo of your bottles</h2>
        <p className="text-[color:var(--muted)] mt-2 max-w-xl mx-auto">
          One photo of the whole pile, or several photos. We read the printed
          label &mdash; never the pills themselves.
        </p>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={(e) => e.target.files && onUpload(e.target.files)}
        />
        <button
          onClick={() => fileRef.current?.click()}
          disabled={disabled}
          className="mt-5 rounded-lg bg-[color:var(--accent)] px-6 py-3 text-lg font-bold text-white disabled:opacity-50"
        >
          Choose photos
        </button>
        <p className="text-sm text-[color:var(--muted)] mt-4">
          Photos are read in memory and never stored. Nothing is saved after you
          close this page.
        </p>
      </section>

      <section className="rounded-2xl border border-[color:var(--line)] bg-[color:var(--surface)] p-6">
        <h2 className="text-xl font-bold">
          Optional: add your discharge paperwork
        </h2>
        <p className="text-[color:var(--muted)] mt-1 text-[15px]">
          Photograph the medication list the hospital sent you home with, and we
          will compare it against your bottles &mdash; what is missing, what is
          extra, and where the strengths disagree.
        </p>
        <input
          ref={dischargeRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={(e) => e.target.files && onUpload(e.target.files, "discharge")}
        />
        <button
          onClick={() => dischargeRef.current?.click()}
          disabled={disabled}
          className="mt-4 rounded-lg border-2 border-[color:var(--accent)] px-5 py-2.5 font-semibold text-[color:var(--accent)] disabled:opacity-50"
        >
          Add discharge paperwork
        </button>
      </section>

      <section>
        <h2 className="text-xl font-bold mb-1">Or try a prepared example</h2>
        <p className="text-[color:var(--muted)] text-sm mb-4">
          These use synthetic labels and need no camera or API key.
        </p>
        <div className="grid gap-3 sm:grid-cols-2">
          {SCENARIOS.map((s) => (
            <button
              key={s.id}
              onClick={() => onPick(s.id)}
              disabled={disabled}
              className="text-left rounded-xl border border-[color:var(--line)] bg-[color:var(--surface)] p-4 hover:border-[color:var(--accent)] disabled:opacity-50"
            >
              <span className="font-bold block">{s.title}</span>
              <span className="text-sm text-[color:var(--muted)]">{s.blurb}</span>
            </button>
          ))}
        </div>
      </section>
    </div>
  );
}

function Results({
  result,
  bottles,
  demo,
  language,
  onLanguage,
  onRestart,
}: {
  result: ApiResult;
  bottles: BottleRecord[];
  demo: string | null;
  language: string;
  onLanguage: (l: string) => void;
  onRestart: () => void;
}) {
  const high = result.findings.filter((f) => f.severity === "high").length;

  return (
    <div className="space-y-10">
      <section className="no-print flex flex-wrap items-center gap-3">
        <button
          onClick={() => window.print()}
          className="rounded-lg border-2 border-[color:var(--foreground)] px-4 py-2 font-semibold"
        >
          Print / save as PDF
        </button>
        <ReadAloud text={result.onePager} lang={LANG_TAG[language] ?? "en-US"} />
        <label className="flex items-center gap-2 text-sm">
          <span className="font-semibold">Language</span>
          <select
            value={language}
            onChange={(e) => onLanguage(e.target.value)}
            className="rounded-lg border border-[color:var(--line)] bg-white px-3 py-2"
          >
            {LANGUAGES.map((l) => (
              <option key={l}>{l}</option>
            ))}
          </select>
        </label>
        <button onClick={onRestart} className="underline text-[color:var(--muted)] ml-auto">
          Start over
        </button>
      </section>

      {result.reconciliation && (
        <section>
          <h2 className="text-2xl font-bold mb-1">
            Discharge list vs what is on the table
          </h2>
          <p className="text-[color:var(--muted)] mb-4 text-[15px]">
            Matched by active ingredient, so &ldquo;Norco&rdquo; on paperwork and
            &ldquo;hydrocodone/acetaminophen&rdquo; on a bottle count as the same
            medicine.
          </p>
          <ReconcileTable rows={result.reconciliation} />
        </section>
      )}

      {result.warnings.length > 0 && (
        <section className="rounded-xl border p-4" style={{ background: "var(--moderate-bg)", borderColor: "var(--moderate)" }}>
          <h2 className="font-bold" style={{ color: "var(--moderate)" }}>
            What this check could not cover
          </h2>
          <ul className="list-disc pl-5 mt-2 space-y-1 text-[15px]">
            {result.warnings.map((w, i) => <li key={i}>{w}</li>)}
          </ul>
        </section>
      )}

      <section>
        <h2 className="text-2xl font-bold mb-1">Your medications</h2>
        <p className="text-[color:var(--muted)] mb-4 text-[15px]">
          Each bottle matched to its official drug record and broken down into
          active ingredients.
        </p>
        <div className="space-y-3">
          {result.meds.map((m) => (
            <MedRow key={m.id} med={m} summary={result.summaries.find((s) => s.med_id === m.id)} />
          ))}
        </div>
      </section>

      <section>
        <h2 className="text-2xl font-bold mb-1">
          Things to ask your pharmacist about
        </h2>
        <p className="text-[color:var(--muted)] mb-4 text-[15px]">
          {result.findings.length === 0
            ? "Nothing was flagged. That is not the same as 'everything is fine' - it means these particular checks found nothing."
            : `${result.findings.length} thing${result.findings.length === 1 ? "" : "s"} worth raising${high ? `, ${high} of them important` : ""}.`}
        </p>
        <div className="space-y-4">
          {result.findings.map((f) => <FindingCard key={f.id} finding={f} />)}
        </div>
      </section>

      <CanITake current={bottles} demo={demo} />

      <section>
        <h2 className="text-2xl font-bold mb-4">Your daily schedule</h2>
        <ScheduleGrid schedule={result.schedule} />
      </section>

      <section className="print-sheet">
        <h2 className="text-2xl font-bold mb-1">The one-pager</h2>
        <p className="no-print text-[color:var(--muted)] mb-4 text-[15px]">
          {result.onePagerGenerated
            ? `Written in plain ${language} from the findings above. The model rewrote them - it did not add to them.`
            : "Generated directly from the findings, with no language model involved."}
        </p>
        <pre className="whitespace-pre-wrap font-sans text-[15px] leading-relaxed rounded-xl border border-[color:var(--line)] bg-[color:var(--surface)] p-5">
          {result.onePager}
        </pre>
      </section>
    </div>
  );
}

function MedRow({
  med,
  summary,
}: {
  med: NormalizedMed;
  summary?: { what_its_for: string; source_url: string | null };
}) {
  if (med.unresolved) {
    return (
      <div className="rounded-xl border p-4" style={{ background: "var(--moderate-bg)", borderColor: "var(--moderate)" }}>
        <p className="font-bold">{med.input_text}</p>
        <p className="text-[15px] mt-1">
          We could not match this to a drug record, so it was left out of every
          check. Check the spelling, or ask your pharmacist directly.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-[color:var(--line)] bg-[color:var(--surface)] p-4">
      {/*
        This single line is the product: the bottle said "Norco", the ingredients
        are hydrocodone AND acetaminophen. Everything else follows from it.
      */}
      <p className="text-[15px]">
        <span className="font-bold">{displayName(med)}</span>
        <span className="text-[color:var(--muted)]"> &rarr; </span>
        <span className="font-semibold">
          {med.ingredients.map((i) => i.name).join(" + ")}
        </span>
      </p>
      <p className="text-sm text-[color:var(--muted)] mt-1">{med.canonical_name}</p>
      {med.discontinued && (
        /* A withdrawn brand resolves only against RxNorm's historical record.
           Worth saying out loud: it usually means an old bottle. */
        <p className="text-sm mt-2 inline-block px-2 py-1 rounded" style={{ background: "var(--moderate-bg)", color: "var(--moderate)" }}>
          This product has been discontinued. We matched it to the historical
          record, so it is still fully checked &mdash; but it may be an old
          bottle worth asking about.
        </p>
      )}
      {med.sig && <p className="text-[15px] mt-2">How to take it: {med.sig}</p>}
      {summary && (
        <p className="text-[15px] mt-1">
          What it is for: {summary.what_its_for.slice(0, 220)}
          {summary.source_url && (
            <>
              {" "}
              <a href={summary.source_url} target="_blank" rel="noopener noreferrer" className="underline text-[color:var(--accent)]">
                (FDA label)
              </a>
            </>
          )}
        </p>
      )}
    </div>
  );
}
