import { CONDITIONS, REGIONS, type DiagramId } from "@/lib/anatomy/conditions";
import { Diagram } from "@/components/Diagram";

/** Every view once, drawn plain: the red belongs to a diagnosis, not a catalogue. */
function uniqueViews(): DiagramId[] {
  return [...new Set(CONDITIONS.map((c) => c.diagram))];
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
        {uniqueViews().length} anatomical views. Every red spot on a condition
        sits on the real structure.
      </p>
      <h2 className="display-sm text-3xl mt-10 mb-4">The views</h2>
      <div className="grid gap-x-10 gap-y-12 grid-cols-2 md:grid-cols-4 lg:grid-cols-6">
        {uniqueViews().map((id) => (
          <div key={id} className="card">
            <div className="aspect-square w-full flex items-center justify-center p-[5%]">
              <Diagram id={id} fit />
            </div>
            <p className="text-sm font-semibold mt-3 capitalize">{id}</p>
          </div>
        ))}
      </div>

      {REGIONS.map((r) => (
        <section key={r}>
          <h2 className="display-sm text-3xl mt-14 mb-1">{r}</h2>
          <p className="text-sm text-[color:var(--muted)] mb-5">{CONDITIONS.filter((c) => c.region === r).length} conditions</p>
          <div className="grid gap-x-10 gap-y-12 sm:grid-cols-2 lg:grid-cols-3">
            {CONDITIONS.filter((c) => c.region === r).map((c) => (
              <div key={c.id} className="card">
                <div className="aspect-square w-full max-w-[200px] mx-auto flex items-center justify-center p-[5%]">
                  <Diagram id={c.diagram} marks={c.marks} fit />
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
