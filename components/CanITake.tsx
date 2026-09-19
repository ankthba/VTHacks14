"use client";

import { useState } from "react";
import { FindingCard } from "@/components/FindingCard";
import type { BottleRecord } from "@/lib/schemas";
import type { Finding } from "@/lib/types";

interface Variant {
  id: string;
  brand: string;
  substanceNames: string[];
  purpose: string | null;
}

interface Response {
  status: "choose" | "checked" | "unknown";
  message?: string;
  variants?: Variant[];
  verdict?: "stop" | "caution" | "clear";
  headline?: string;
  findings?: Finding[];
  chosen?: Variant;
}

/** The ones people actually reach for, and that most often hide acetaminophen. */
const COMMON = ["NyQuil", "DayQuil", "Excedrin", "Advil PM", "Midol", "Benadryl", "Aleve", "Tylenol PM"];

const VERDICT = {
  stop: { fg: "var(--high)", bg: "var(--high-bg)", word: "Ask before you take this" },
  caution: { fg: "var(--moderate)", bg: "var(--moderate-bg)", word: "Worth asking first" },
  clear: { fg: "var(--ok)", bg: "var(--ok-bg)", word: "Nothing flagged" },
} as const;

/**
 * The question people actually have, at the moment they have it: standing in
 * the aisle holding a box. Runs the same deterministic checks as the main
 * pipeline against the medicines already on the table.
 */
export function CanITake({
  current,
  demo,
}: {
  current: BottleRecord[];
  demo?: string | null;
}) {
  const [query, setQuery] = useState("");
  const [res, setRes] = useState<Response | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function run(q: string, variantId?: string) {
    if (!q.trim()) return;
    setBusy(true);
    setError(null);
    if (!variantId) setRes(null);
    try {
      const r = await fetch("/api/can-i-take", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ query: q, current, demo, variantId }),
      });
      const json = await r.json();
      if (!r.ok) throw new Error(json.detail ?? json.error ?? "Check failed");
      setRes(json);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  const tone = res?.verdict ? VERDICT[res.verdict] : null;

  return (
    <section className="card p-6">
      <h2 className="display-sm text-3xl">Can I take something else?</h2>
      <p className="text-[color:var(--muted)] mt-1 text-[15px]">
        About to buy a cold or pain medicine? Check it against what you already
        take &mdash; before you buy it, not after.
      </p>

      <form
        className="mt-4 flex flex-wrap gap-2 no-print"
        onSubmit={(e) => {
          e.preventDefault();
          run(query);
        }}
      >
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="e.g. NyQuil"
          className="flex-1 min-w-[12rem] rounded-lg border border-[color:var(--line)] bg-white px-3 py-2.5 text-[15px]"
        />
        <button
          type="submit"
          disabled={busy || !query.trim()}
          className="btn btn-primary disabled:opacity-50"
        >
          {busy ? "Checking..." : "Check it"}
        </button>
      </form>

      <div className="mt-3 flex flex-wrap gap-2 no-print">
        {COMMON.map((c) => (
          <button
            key={c}
            onClick={() => {
              setQuery(c);
              run(c);
            }}
            disabled={busy}
            className="chip disabled:opacity-50"
          >
            {c}
          </button>
        ))}
      </div>

      {error && (
        <p className="mt-4 text-[15px]" style={{ color: "var(--high)" }}>
          {error}
        </p>
      )}

      {/*
        A brand name is not a product: "NyQuil" is four different formulations
        and only some contain acetaminophen. We ask rather than guess.
      */}
      {res?.status === "choose" && (
        <div className="mt-5">
          <p className="font-semibold">{res.message}</p>
          <div className="mt-3 space-y-2">
            {res.variants?.map((v) => {
              const hasApap = v.substanceNames.some((s) => s.includes("ACETAMINOPHEN"));
              return (
                <button
                  key={v.id}
                  onClick={() => run(query, v.id)}
                  disabled={busy}
                  className="w-full text-left rounded-xl border border-[color:var(--line)] p-3 hover:border-[color:var(--accent)] disabled:opacity-50"
                >
                  <span className="font-bold block">{v.brand}</span>
                  <span className="text-sm text-[color:var(--muted)]">
                    {v.substanceNames.join(", ").toLowerCase()}
                  </span>
                  {hasApap && (
                    <span className="text-sm block mt-1 font-semibold" style={{ color: "var(--high)" }}>
                      contains acetaminophen
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {res?.status === "unknown" && (
        <p className="mt-4 rounded-xl border p-3 text-[15px]" style={{ background: "var(--moderate-bg)", borderColor: "var(--moderate)" }}>
          {res.message}
        </p>
      )}

      {res?.status === "checked" && tone && (
        <div className="mt-5">
          <div
            className="rounded-xl border p-4"
            style={{ background: tone.bg, borderColor: tone.fg }}
          >
            <span
              className="text-xs font-bold uppercase tracking-[0.08em] px-2.5 py-1 rounded-full"
              style={{ background: tone.fg, color: "#fff" }}
            >
              {tone.word}
            </span>
            <p className="text-lg font-bold mt-2" style={{ color: tone.fg }}>
              {res.headline}
            </p>
            {res.chosen && (
              <p className="text-sm text-[color:var(--muted)] mt-1">
                Checked: {res.chosen.brand} &mdash;{" "}
                {res.chosen.substanceNames.join(", ").toLowerCase()}
              </p>
            )}
            {res.verdict === "clear" && (
              <p className="text-[15px] mt-2">
                That is not the same as &ldquo;safe&rdquo;. It means the checks we
                run found nothing between this and your current medicines. Dose
                limits, allergies and your own history are not covered here.
              </p>
            )}
          </div>

          {res.findings && res.findings.length > 0 && (
            <div className="mt-4 space-y-3">
              {res.findings.map((f) => (
                <FindingCard key={f.id} finding={f} />
              ))}
            </div>
          )}
        </div>
      )}
    </section>
  );
}
