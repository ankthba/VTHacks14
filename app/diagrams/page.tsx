import { CONDITIONS, type DiagramId } from "@/lib/anatomy/conditions";
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
          <div key={v.id} className="float-card p-3">
            <Diagram id={v.id} marks={v.marks} />
            <p className="text-sm font-semibold mt-2 capitalize">{v.id}</p>
          </div>
        ))}
      </div>

      <h2 className="display-sm text-3xl mt-12 mb-4">The conditions</h2>
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {CONDITIONS.map((c) => (
          <div key={c.id} className="float-card p-4">
            <div className="max-w-[200px] mx-auto">
              <Diagram id={c.diagram} marks={c.marks} />
            </div>
            <p className="font-semibold mt-3">{c.label}</p>
            <p className="text-sm text-[color:var(--muted)]">{c.plain}</p>
          </div>
        ))}
      </div>
    </main>
  );
}
