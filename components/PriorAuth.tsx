"use client";

import { useState } from "react";

interface Alternative {
  name: string;
  access: { verdict: string; note: string };
}

interface Packet {
  candidateName: string;
  access: { verdict: string; note: string };
  paLikely: boolean;
  alternatives: Alternative[];
}

interface Res {
  status: "ok" | "unresolved";
  message?: string;
  packet?: Packet;
  letter?: string;
  composed?: boolean;
}

/**
 * Prior-authorisation drafting.
 *
 * Prior auth is the largest administrative burden in prescribing and a leading
 * cause of abandoned prescriptions. The evidence needed already exists, split
 * between the label and what the prescriber knows; this assembles it.
 *
 * Every line of the output is tagged with its source, and the model is only
 * allowed to compose prose from the assembled statements. That constraint is
 * the point: a fabricated clinical justification sent to a payer is a real
 * harm, not a bad demo.
 */
export function PriorAuth({
  candidate,
  candidateStrength,
  current,
}: {
  candidate: string;
  candidateStrength: string;
  current: { drug_text: string; strength: null; sig: null; quantity: null; prescriber: null; fill_date: null; confidence: number }[];
}) {
  const [age, setAge] = useState("");
  const [diagnosis, setDiagnosis] = useState("");
  const [renal, setRenal] = useState("");
  const [tried, setTried] = useState([{ drug: "", outcome: "" }]);
  const [res, setRes] = useState<Res | null>(null);
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);

  async function run() {
    setBusy(true);
    setRes(null);
    try {
      const r = await fetch("/api/prior-auth", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          candidate,
          candidateStrength: candidateStrength || null,
          current,
          patient: {
            age: age || null,
            diagnosis: diagnosis || null,
            renalFunction: renal || null,
            triedAndFailed: tried.filter((t) => t.drug.trim()),
          },
        }),
      });
      setRes(await r.json());
    } catch {
      setRes({ status: "unresolved", message: "Request failed." });
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="float-card p-6">
      <h3 className="display-sm text-2xl">Prior authorization</h3>
      <p className="text-[15px] text-[color:var(--muted)] mt-1">
        Assemble the justification from the label and what you already know
        about this patient. Every line is tagged with where it came from.
      </p>

      <div className="grid gap-4 sm:grid-cols-3 mt-5">
        <Field label="Age" value={age} onChange={setAge} placeholder="78" />
        <Field
          label="Renal function"
          value={renal}
          onChange={setRenal}
          placeholder="CrCl 38 mL/min"
        />
        <Field
          label="Indication"
          value={diagnosis}
          onChange={setDiagnosis}
          placeholder="Nonvalvular atrial fibrillation"
        />
      </div>

      <div className="mt-5">
        <p className="text-sm font-semibold mb-2">
          Tried and failed &mdash; what a payer adjudicates on
        </p>
        <div className="space-y-2">
          {tried.map((t, i) => (
            <div key={i} className="grid gap-2 sm:grid-cols-2">
              <input
                value={t.drug}
                placeholder="Warfarin"
                onChange={(e) =>
                  setTried((p) => p.map((x, j) => (j === i ? { ...x, drug: e.target.value } : x)))
                }
                className="rounded-lg border border-[color:var(--line)] bg-white px-3 py-2 text-[15px]"
              />
              <input
                value={t.outcome}
                placeholder="Labile INR, two bleeding events"
                onChange={(e) =>
                  setTried((p) => p.map((x, j) => (j === i ? { ...x, outcome: e.target.value } : x)))
                }
                className="rounded-lg border border-[color:var(--line)] bg-white px-3 py-2 text-[15px]"
              />
            </div>
          ))}
        </div>
        <button
          onClick={() => setTried((p) => [...p, { drug: "", outcome: "" }])}
          className="chip mt-2"
        >
          + Add another
        </button>
      </div>

      <button
        onClick={run}
        disabled={busy}
        className="btn btn-primary mt-5 disabled:opacity-50"
      >
        {busy ? "Assembling…" : "Draft the justification"}
      </button>

      {res?.status === "unresolved" && (
        <p className="mt-4 text-[15px]" style={{ color: "var(--high)" }}>
          {res.message}
        </p>
      )}

      {res?.status === "ok" && res.packet && (
        <div className="mt-6 space-y-6">
          <div className="row border-t border-[color:var(--line-soft)]">
            <span className="icon-box">{res.packet.paLikely ? "!" : "✓"}</span>
            <div>
              <p className="font-semibold">
                {res.packet.paLikely
                  ? "Prior authorization is more likely for this drug"
                  : "Prior authorization is less likely"}
              </p>
              <p className="text-[15px] text-[color:var(--muted)]">
                {res.packet.access.note}
              </p>
            </div>
          </div>

          {res.packet.alternatives.length > 0 && (
            <div>
              <p className="font-semibold mb-2">
                Same-class alternatives a reviewer will ask about
              </p>
              <div className="list-hairline border-t border-[color:var(--line-soft)]">
                {res.packet.alternatives.map((a) => (
                  <div key={a.name} className="row">
                    <span className="icon-box text-sm">&#9679;</span>
                    <div>
                      <p className="font-semibold capitalize">{a.name}</p>
                      <p className="text-[15px] text-[color:var(--muted)]">
                        {a.access.note}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div>
            <div className="flex items-center justify-between mb-2">
              <p className="font-semibold">Draft justification</p>
              <button
                className="chip"
                onClick={() => {
                  navigator.clipboard?.writeText(res.letter ?? "");
                  setCopied(true);
                  setTimeout(() => setCopied(false), 1800);
                }}
              >
                {copied ? "Copied" : "Copy"}
              </button>
            </div>
            <pre className="whitespace-pre-wrap font-sans text-[15px] leading-relaxed rounded-xl border border-[color:var(--line-soft)] p-5" style={{ background: "var(--surface-warm)" }}>
              {res.letter}
            </pre>
            <p className="text-sm text-[color:var(--muted)] mt-2">
              {res.composed
                ? "Composed from the assembled statements only — the model was given the evidence and forbidden from adding to it."
                : "Assembled deterministically. No model was involved."}
            </p>
          </div>
        </div>
      )}
    </section>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
}) {
  return (
    <label className="block">
      <span className="block text-sm font-semibold mb-1">{label}</span>
      <input
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-lg border border-[color:var(--line)] bg-white px-3 py-2.5 text-[15px]"
      />
    </label>
  );
}
