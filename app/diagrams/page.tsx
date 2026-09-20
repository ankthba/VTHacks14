import { CONDITIONS, REGIONS, type DiagramId } from "@/lib/anatomy/conditions";
import { Diagram } from "@/components/Diagram";
import { VIEWS } from "@/lib/anatomy/views";
import { UpButton } from "@/components/UpButton";
import { SiteNav } from "@/components/SiteNav";

/** Every view once, drawn plain: the red belongs to a diagnosis, not a catalogue. */
function uniqueViews(): DiagramId[] {
  return [...new Set(CONDITIONS.map((c) => c.diagram))];
}

const slug = (r: string) => r.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

/** The category a view belongs to: the one that uses it most. */
function homeOf(view: DiagramId): string {
  const counts = new Map<string, number>();
  for (const c of CONDITIONS) if (c.diagram === view) counts.set(c.region, (counts.get(c.region) ?? 0) + 1);
  return [...counts.entries()].sort((a, b) => b[1] - a[1])[0][0];
}

import { APP_NAME } from "@/lib/brand";

export const metadata = { title: `${APP_NAME} - anatomy library` };

/** Every condition in the library, with its structure marked. */
export default function DiagramsPage() {
  return (
    <main id="top" className="flex-1 w-full max-w-6xl mx-auto px-5 pb-16">
      <UpButton />
      <SiteNav current="library" depth={1} />
      <h1 className="display text-5xl mt-12">Anatomy library</h1>
      <p className="text-lg text-[color:var(--muted)] mt-3 max-w-2xl">
        {CONDITIONS.length} conditions across{" "}
        {uniqueViews().length} anatomical views. Every red spot on a condition
        sits on the real structure.
      </p>
      <div className="mt-10" />
      <div className="grid gap-x-10 gap-y-12 grid-cols-2 md:grid-cols-4 lg:grid-cols-6">
        {uniqueViews().map((id) => (
          <a key={id} href={`#${slug(homeOf(id))}`} className="card view-link block">
            <div className="aspect-square w-full flex items-center justify-center p-[5%]">
              <Diagram id={id} fit />
            </div>
            <p className="text-sm font-semibold mt-3">{VIEWS[id].label}</p>
            <p className="view-plain text-[13px] leading-snug text-[color:var(--muted)]">{VIEWS[id].plain}</p>
          </a>
        ))}
      </div>

      {REGIONS.map((r) => (
        <section key={r} id={slug(r)} className="scroll-mt-8">
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
