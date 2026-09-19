"use client";

import { useState } from "react";
import { FindingCard } from "@/components/FindingCard";
import { PriorAuth } from "@/components/PriorAuth";
import type { Finding } from "@/lib/types";

interface Brief {
  boxedWarning: string | null;
  contraindications: string | null;
  dosing: string | null;
  dosageForms: string | null;
  populations: { heading: string; text: string }[];
  access: { verdict: string; note: string };
  labelUrl: string | null;
  labelFound: boolean;
}

interface Result {
  status: "ok" | "unresolved";
  message?: string;
  candidate?: { name: string; canonical: string | null; rxcui: string | null };
  current?: { id: string; name: string; canonical: string | null; unresolved: boolean }[];
  findings?: Finding[];
  brief?: Brief;
}

/**
 * The prescriber's ten seconds before committing to a drug.
 *
 * Deliberately denser than the patient view - a clinician wants everything on
 * one screen, not one card at a time. Same engine underneath, and the same
 * rule: every section is lifted from the FDA label with a link back to it, and
 * nothing is written by a model.
 */
export default function ClinicianPage() {
  const [candidate, setCandidate] = useState("");
  const [strength, setStrength] = useState("");
  const [currentText, setCurrentText] = useState("");
  const [res, setRes] = useState<Result | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function run() {
    if (!candidate.trim()) return;
    setBusy(true);
    setError(null);
    setRes(null);
    try {
      const current = currentText
        .split("\n")
        .map((l) => l.trim())
        .filter(Boolean)
        .map((line) => ({
          drug_text: line,
          strength: null,
          sig: null,
          quantity: null,
          prescriber: null,
          fill_date: null,
          confidence: 1,
        }));

      const r = await fetch("/api/prescribe", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          candidate,
          candidateStrength: strength || null,
          current,
        }),
      });
      const json = await r.json();
      if (!r.ok) throw new Error(json.detail ?? json.error ?? "Failed");
      setRes(json);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="flex-1 w-full max-w-5xl mx-auto px-4 py-8">
      <header className="mb-8">
        <h1 className="display text-5xl">Before you prescribe</h1>
        <p className="text-lg text-[color:var(--muted)] mt-3 max-w-2xl">
          Label-grounded check against what this patient already takes. Every
          section below is lifted from the FDA label, not summarised by a model.
        </p>
      </header>

      <section className="float-card p-6">
        <div className="grid gap-4 sm:grid-cols-3">
          <label className="block sm:col-span-2">
            <span className="block text-sm font-semibold mb-1">
              Drug being considered
            </span>
            <input
              value={candidate}
              onChange={(e) => setCandidate(e.target.value)}
              placeholder="e.g. Apixaban"
              className="w-full rounded-lg border border-[color:var(--line)] bg-white px-3 py-2.5 text-[15px]"
            />
          </label>
          <label className="block">
            <span className="block text-sm font-semibold mb-1">Strength</span>
            <input
              value={strength}
              onChange={(e) => setStrength(e.target.value)}
              placeholder="5 mg"
              className="w-full rounded-lg border border-[color:var(--line)] bg-white px-3 py-2.5 text-[15px]"
            />
          </label>
        </div>

        <label className="block mt-4">
          <span className="block text-sm font-semibold mb-1">
            Current medications &mdash; one per line
          </span>
          <textarea
            value={currentText}
            onChange={(e) => setCurrentText(e.target.value)}
            rows={4}
            placeholder={"Warfarin sodium 5 mg\nIbuprofen 600 mg"}
            className="w-full rounded-lg border border-[color:var(--line)] bg-white px-3 py-2.5 text-[15px] font-mono"
          />
        </label>

        <button
          onClick={run}
          disabled={busy || !candidate.trim()}
          className="btn btn-primary mt-4 disabled:opacity-50"
        >
          {busy ? "Checking…" : "Check"}
        </button>
      </section>

      {error && (
        <p className="mt-6 text-[15px]" style={{ color: "var(--high)" }}>
          {error}
        </p>
      )}

      {res?.status === "unresolved" && (
        <p
          className="mt-6 rounded-xl border p-4 text-[15px]"
          style={{ background: "var(--moderate-bg)", borderColor: "var(--moderate)" }}
        >
          {res.message}
        </p>
      )}

      {res?.status === "ok" && res.brief && (
        <div className="mt-8 space-y-10">
          <div>
            <h2 className="display-sm text-3xl">{res.candidate?.name}</h2>
            <p className="text-[color:var(--muted)] text-[15px]">
              {res.candidate?.canonical}
            </p>
          </div>

          {res.brief.boxedWarning && (
            <section>
              {/* A boxed warning is the single most consequential thing on a
                  label, so it is shown first and never abbreviated away. */}
              <span
                className="meta-chip"
                style={{ color: "var(--high)", borderColor: "var(--high)" }}
              >
                Boxed warning
              </span>
              <p
                className="mt-3 p-4 rounded-xl text-[15px] leading-relaxed"
                style={{ background: "var(--high-bg)" }}
              >
                {res.brief.boxedWarning}
              </p>
            </section>
          )}

          {res.findings && res.findings.length > 0 && (
            <section>
              <h3 className="display-sm text-2xl mb-3">
                Against this patient&rsquo;s current medications
              </h3>
              <div className="space-y-3">
                {res.findings.map((f) => (
                  <FindingCard key={f.id} finding={f} audience="clinician" />
                ))}
              </div>
            </section>
          )}

          {res.findings?.length === 0 && (res.current?.length ?? 0) > 0 && (
            <section>
              <h3 className="display-sm text-2xl mb-2">
                Against this patient&rsquo;s current medications
              </h3>
              <p className="text-[15px] text-[color:var(--muted)]">
                No duplicate ingredient, duplicate class, or labelled interaction
                found. That is the result of these specific checks, not a
                clearance.
              </p>
            </section>
          )}

          <section>
            <h3 className="display-sm text-2xl mb-3">Access</h3>
            <div className="row border-t border-[color:var(--line-soft)]">
              <span className="icon-box">$</span>
              <div>
                <p className="font-semibold capitalize">{res.brief.access.verdict}</p>
                <p className="text-[15px] text-[color:var(--muted)]">
                  {res.brief.access.note}
                </p>
                <p className="text-sm text-[color:var(--muted)] mt-1">
                  Counted from the FDA NDC directory. Plan-specific formulary and
                  prior-authorisation status are not in any free dataset and are
                  deliberately not guessed at here.
                </p>
              </div>
            </div>
          </section>

          {res.brief.populations.length > 0 && (
            <section>
              <h3 className="display-sm text-2xl mb-3">Specific populations</h3>
              <div className="list-hairline border-t border-[color:var(--line-soft)]">
                {res.brief.populations.map((p) => (
                  <div key={p.heading} className="row">
                    <span className="icon-box text-sm">&#9679;</span>
                    <div>
                      <p className="font-semibold">{p.heading}</p>
                      <p className="text-[15px] text-[color:var(--muted)] leading-relaxed">
                        {p.text}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {res.brief.dosing && (
            <section>
              <h3 className="display-sm text-2xl mb-3">Dosing</h3>
              <p className="text-[15px] leading-relaxed">{res.brief.dosing}</p>
            </section>
          )}

          {res.brief.contraindications && (
            <section>
              <h3 className="display-sm text-2xl mb-3">Contraindications</h3>
              <p className="text-[15px] leading-relaxed">
                {res.brief.contraindications}
              </p>
            </section>
          )}

          <PriorAuth
            candidate={candidate}
            candidateStrength={strength}
            current={currentText
              .split("\n")
              .map((l) => l.trim())
              .filter(Boolean)
              .map((line) => ({
                drug_text: line,
                strength: null,
                sig: null,
                quantity: null,
                prescriber: null,
                fill_date: null,
                confidence: 1,
              }))}
          />

          {res.brief.labelUrl && (
            <a
              href={res.brief.labelUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block underline text-[color:var(--accent)]"
            >
              Full FDA label on DailyMed
            </a>
          )}
        </div>
      )}
    </main>
  );
}
