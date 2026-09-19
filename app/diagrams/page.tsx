import { CONDITIONS, REGIONS, type DiagramId } from "@/lib/anatomy/conditions";
import { Diagram } from "@/components/Diagram";

/** Every view once, with every structure it can mark switched on. */
function uniqueViews() {
  const seen = new Map<DiagramId, Set<string>>();
  for (const c of CONDITIONS) {
    const set = seen.get(c.diagram) ?? new Set<string>();
    c.marks.forEach((m) => set.add(m));
    seen.set(c.diagram, set);
  }
  return [...seen.entries()].map(([id, marks]) => ({ id, marks: [...marks] }));
}

import { APP_NAME } from "@/lib/brand";

export const metadata = { title: `${APP_NAME} - anatomy library` };

/** Every condition in the library, with its structure marked. */
export default function DiagramsPage() {
  return (
    <main className="flex-1 w-full max-w-6xl mx-auto px-4 py-8">
      <h1 className="display text-5xl">Anatomy library</h1>
      <p className="text-lg text-[color:var(--muted)] mt-3 max-w-2xl">
        {CONDITIONS.length} conditions across{" "}
        {new Set(CONDITIONS.map((c) => c.diagram)).size} anatomical views. Each
        marked structure is a real one.
      </p>
      <h2 className="display-sm text-3xl mt-10 mb-4">The views</h2>
      <div className="grid gap-4 grid-cols-2 md:grid-cols-4 lg:grid-cols-6">
        {uniqueViews().map((v) => (
          <div key={v.id} className="card p-3">
            <Diagram id={v.id} marks={v.marks} />
            <p className="text-sm font-semibold mt-2 capitalize">{v.id}</p>
          </div>
        ))}
      </div>

      {REGIONS.map((r) => (
        <section key={r}>
          <h2 className="display-sm text-3xl mt-14 mb-1">{r}</h2>
          <p className="text-sm text-[color:var(--muted)] mb-5">{CONDITIONS.filter((c) => c.region === r).length} conditions</p>
          <div className="grid gap-x-6 gap-y-8 sm:grid-cols-2 lg:grid-cols-3">
            {CONDITIONS.filter((c) => c.region === r).map((c) => (
              <div key={c.id} className="card">
                <div className="max-w-[160px] mx-auto">
                  <Diagram id={c.diagram} marks={c.marks} />
                </div>
                <p className="font-semibold mt-3">{c.label}</p>
                <p className="text-sm text-[color:var(--muted)]">{c.plain}</p>
                {c.icd10.length > 0 && <p className="meta-chip mt-2">{c.icd10.join(" · ")}</p>}
              </div>
            ))}
          </div>
        </section>
      ))}
    </main>
  );
}
