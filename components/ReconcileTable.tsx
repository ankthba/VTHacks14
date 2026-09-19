import { displayName } from "@/lib/display";
import type { ReconcileRow, ReconcileStatus } from "@/lib/types";

const STATUS: Record<
  ReconcileStatus,
  { label: string; fg: string; bg: string; rank: string }
> = {
  omission: { label: "No bottle found", fg: "var(--high)", bg: "var(--high-bg)", rank: "Missing" },
  dose_mismatch: { label: "Strengths disagree", fg: "var(--high)", bg: "var(--high-bg)", rank: "Conflict" },
  extra: { label: "Not on the list", fg: "var(--moderate)", bg: "var(--moderate-bg)", rank: "Extra" },
  matched: { label: "Matches", fg: "var(--ok)", bg: "var(--ok-bg)", rank: "OK" },
};

/**
 * The two-list comparison, shown side by side. This is the view that makes the
 * word "reconciliation" mean something: a judge reads the gaps without needing
 * the concept explained.
 */
export function ReconcileTable({ rows }: { rows: ReconcileRow[] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-[15px]">
        <thead>
          <tr className="text-left">
            <th className="border-b border-[color:var(--foreground)] pb-3 text-xs uppercase tracking-[0.08em] text-[color:var(--muted)] font-semibold pr-3 w-32">
              Status
            </th>
            <th className="border-b border-[color:var(--foreground)] pb-3 text-xs uppercase tracking-[0.08em] text-[color:var(--muted)] font-semibold pr-3">
              Discharge paperwork
            </th>
            <th className="border-b border-[color:var(--foreground)] pb-3 text-xs uppercase tracking-[0.08em] text-[color:var(--muted)] font-semibold">
              Bottle on the table
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => {
            const s = STATUS[r.status];
            return (
              <tr key={i} style={{ background: s.bg }} className="align-top">
                <td className="py-4 pr-3 border-b border-[color:var(--line-soft)]">
                  <span
                    className="text-xs font-bold uppercase tracking-wide px-2 py-1 rounded whitespace-nowrap"
                    style={{ background: s.fg, color: "#fff" }}
                  >
                    {s.rank}
                  </span>
                  <span className="block mt-1 text-xs" style={{ color: s.fg }}>
                    {s.label}
                  </span>
                </td>
                <td className="py-4 pr-3 border-b border-[color:var(--line-soft)]">
                  {r.discharge ? (
                    <>
                      <span className="font-semibold">{displayName(r.discharge)}</span>
                      <span className="block text-sm text-[color:var(--muted)]">
                        {r.discharge.canonical_name}
                      </span>
                    </>
                  ) : (
                    <span className="text-[color:var(--muted)]">&mdash;</span>
                  )}
                </td>
                <td className="py-4 border-b border-[color:var(--line-soft)]">
                  {r.bottle ? (
                    <>
                      <span className="font-semibold">{displayName(r.bottle)}</span>
                      <span className="block text-sm text-[color:var(--muted)]">
                        {r.bottle.canonical_name}
                      </span>
                    </>
                  ) : (
                    <span className="text-[color:var(--muted)]">&mdash;</span>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
