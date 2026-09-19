"use client";

import { useState } from "react";
import { FindingCard } from "@/components/FindingCard";
import { PriorAuth } from "@/components/PriorAuth";
import { Menu } from "@/components/Menu";
import { IS_STATIC } from "@/lib/staticMode";
import { checkPrescription } from "@/lib/prescribeCheck";
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

export interface CheckMed { name: string; strength?: string | null }

const bottle = (m: CheckMed) => ({
  drug_text: [m.name, m.strength].filter(Boolean).join(" "),
  strength: null, sig: null, quantity: null, prescriber: null, fill_date: null, confidence: 1,
});

/**
 * The prescriber's ten seconds before committing to a drug, on the same
 * screen as the list it is being added to. Pick one medicine from the list
 * (or name another); it is checked against the rest. Every section is lifted
 * from the FDA label with a link back to it, and nothing is written by a model.
 */
export function PrescriberCheck({ meds }: { meds: CheckMed[] }) {
  const named = meds.filter((m) => m.name.trim());
  const [pick, setPick] = useState<string>("0");
  const [other, setOther] = useState("");
  const [otherStrength, setOtherStrength] = useState("");
  const [res, setRes] = useState<Result | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const idx = pick === "other" ? -1 : Math.min(Number(pick), named.length - 1);
  const candidate: CheckMed | null = idx >= 0 ? named[idx] ?? null : other.trim() ? { name: other.trim(), strength: otherStrength || null } : null;
  const current = named.filter((_, i) => i !== idx);
  const items = [
    ...named.map((m, i) => ({ id: String(i), label: [m.name, m.strength].filter(Boolean).join(" "), on: pick === String(i) })),
    { id: "other", label: "Another drug…", on: pick === "other" },
  ];
  const label = idx >= 0 && named[idx] ? [named[idx].name, named[idx].strength].filter(Boolean).join(" ") : pick === "other" ? "Another drug" : "Pick a medicine";

  async function run() {
    if (!candidate) return;
    setBusy(true); setError(null); setRes(null);
    try {
      if (IS_STATIC) {
        // No server on the published site: the check runs in the page.
        setRes((await checkPrescription({ candidate: candidate.name, candidateStrength: candidate.strength ?? null, current: current.map(bottle) })) as Result);
      } else {
        const r = await fetch("/api/prescribe", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ candidate: candidate.name, candidateStrength: candidate.strength ?? null, current: current.map(bottle) }),
        });
        const json = await r.json();
        if (!r.ok) throw new Error(json.detail ?? json.error ?? "The check failed.");
        setRes(json);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mt-7">
      <span className="field-label">Before you prescribe</span>
      <p className="text-[15px] text-[color:var(--muted)]">
        Check one medicine against the rest of the list: duplicates, labelled interactions, the boxed warning, who it is not for, and whether a generic exists. Lifted from the FDA label, never summarised by a model.
      </p>

      {(
        <>
          <div className="flex flex-wrap items-center gap-x-5 gap-y-3 mt-4">
            <Menu label={label} items={items} onPick={(id) => { setPick(id); setRes(null); }} />
            {pick === "other" && (
              <>
                <input value={other} onChange={(e) => setOther(e.target.value)} placeholder="Drug being considered" className="field w-56" />
                <input value={otherStrength} onChange={(e) => setOtherStrength(e.target.value)} placeholder="Strength" className="field w-24" />
              </>
            )}
            <button onClick={run} disabled={busy || !candidate} className="btn btn-primary disabled:opacity-50">
              {busy ? "Checking the label…" : "Check"}
            </button>
            {current.length > 0 && candidate && (
              <span className="text-[13px] text-[color:var(--muted)]">against {current.map((m) => m.name).join(", ")}</span>
            )}
          </div>

          {error && <p className="mt-4 text-[15px]" style={{ color: "var(--high)" }}>{error}</p>}
          {res?.status === "unresolved" && (
            <p className="mt-4 pl-4 border-l-2 text-[15px]" style={{ borderColor: "var(--moderate)" }}>{res.message}</p>
          )}

          {res?.status === "ok" && res.brief && (
            <div className="mt-6 space-y-8 rise">
              <div>
                <h3 className="display-sm text-2xl">{res.candidate?.name}</h3>
                {res.candidate?.canonical && <p className="text-[color:var(--muted)] text-[14px]">{res.candidate.canonical}</p>}
              </div>

              {res.brief.boxedWarning && (
                <section className="pl-4 border-l-2" style={{ borderColor: "var(--high)" }}>
                  <p className="meta-chip" style={{ color: "var(--high)" }}>Boxed warning</p>
                  <p className="mt-2 text-[15px] leading-relaxed">{res.brief.boxedWarning}</p>
                </section>
              )}

              {res.findings && res.findings.length > 0 && (
                <section>
                  <p className="field-label">Against the rest of the list</p>
                  <div className="space-y-3">
                    {res.findings.map((f) => <FindingCard key={f.id} finding={f} audience="clinician" />)}
                  </div>
                </section>
              )}
              {res.findings?.length === 0 && (res.current?.length ?? 0) > 0 && (
                <section>
                  <p className="field-label">Against the rest of the list</p>
                  <p className="text-[15px] text-[color:var(--muted)]">
                    No duplicate ingredient, duplicate class, or labelled interaction found. That is the result of these specific checks, not a clearance.
                  </p>
                </section>
              )}

              <section>
                <p className="field-label">Access</p>
                <p className="font-semibold capitalize">{res.brief.access.verdict}</p>
                <p className="text-[15px] text-[color:var(--muted)]">{res.brief.access.note}</p>
                <p className="text-[13px] text-[color:var(--muted)] mt-1">
                  Counted from the FDA NDC directory. Plan formularies and prior-authorisation status are not in any free dataset and are not guessed at.
                </p>
              </section>

              {res.brief.populations.length > 0 && (
                <section>
                  <p className="field-label">Specific populations</p>
                  <div className="list-hairline border-t border-[color:var(--line-soft)]">
                    {res.brief.populations.map((p) => (
                      <div key={p.heading} className="py-3">
                        <p className="font-semibold">{p.heading}</p>
                        <p className="text-[15px] text-[color:var(--muted)] leading-relaxed">{p.text}</p>
                      </div>
                    ))}
                  </div>
                </section>
              )}

              {res.brief.dosing && (
                <section>
                  <p className="field-label">Dosing</p>
                  <p className="text-[15px] leading-relaxed">{res.brief.dosing}</p>
                </section>
              )}
              {res.brief.contraindications && (
                <section>
                  <p className="field-label">Contraindications</p>
                  <p className="text-[15px] leading-relaxed">{res.brief.contraindications}</p>
                </section>
              )}

              {!IS_STATIC && <PriorAuth candidate={candidate?.name ?? ""} candidateStrength={candidate?.strength ?? ""} current={current.map(bottle)} />}

              {res.brief.labelUrl && (
                <a href={res.brief.labelUrl} target="_blank" rel="noopener noreferrer" className="link-action">Full FDA label on DailyMed</a>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
