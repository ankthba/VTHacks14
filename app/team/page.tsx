import { SiteNav } from "@/components/SiteNav";
import { InkUnderline, InkRing } from "@/components/Ink";
import { InkImage } from "@/components/InkImage";
import { APP_NAME } from "@/lib/brand";
import { TEAM, VALUES } from "@/lib/team";
import { asset } from "@/lib/staticMode";

export const metadata = { title: `${APP_NAME}: the team` };

const initials = (name: string) => name.split(/\s+/).map((w) => w[0]).slice(0, 2).join("").toUpperCase();

export default function TeamPage() {
  return (
    <main id="top" className="flex-1 w-full max-w-6xl mx-auto px-5 pb-16">
      <SiteNav current="team" depth={1} />

      <header className="page-hero rise">
        <div>
          <p className="eyebrow">The people behind {APP_NAME}</p>
          <h1 className="display" style={{ fontSize: "clamp(2.4rem, 5vw, 4rem)" }}>
            Small team, <span className="ink-under">clear purpose.<InkUnderline className="ink-under-svg" draw /></span>
          </h1>
          <p className="text-lg text-[color:var(--muted)] mt-4 max-w-xl">
            We make what a doctor says easier to understand: carefully, calmly, and with respect for the person it is for.
          </p>
        </div>
        <div className="page-hero-art" aria-hidden>
          <div style={{ height: "100%", aspectRatio: "902 / 1149" }}>
            <InkImage src={asset("/anatomy/bodies.png")} className="block w-full h-full" />
          </div>
        </div>
      </header>

      <section className="team-grid">
        {TEAM.map((p, n) => (
          <article key={p.name} className="person rise" style={{ animationDelay: `${120 + n * 90}ms` }}>
            <div className="portrait">
              {p.photo ? (
                <img src={p.photo} alt="" className="block w-full h-full object-cover" />
              ) : (
                <span className="portrait-initials display">
                  <InkRing className="portrait-ring" draw />
                  {initials(p.name)}
                </span>
              )}
            </div>
            <div>
              <p className="eyebrow">{String(n + 1).padStart(2, "0")}</p>
              <h2 className="display-sm text-3xl">{p.name}</h2>
              <p className="meta-chip mt-1">{p.role}</p>
              <p className="mt-4 text-[15px] leading-relaxed text-[color:var(--muted)]">{p.bio}</p>
              {p.links.length > 0 && (
                <p className="mt-4 flex flex-wrap gap-4">
                  {p.links.map((l) => (
                    <a key={l.href} href={l.href} className="link-action" target="_blank" rel="noopener noreferrer">{l.label}<span className="nav-ext" aria-hidden>&#8599;</span></a>
                  ))}
                </p>
              )}
            </div>
          </article>
        ))}
      </section>

      <section className="values">
        <div>
          <p className="eyebrow">How we work</p>
          <h2 className="display" style={{ fontSize: "clamp(1.8rem, 3.4vw, 2.8rem)" }}>
            Built with <span className="ink-under">care.<InkUnderline className="ink-under-svg" /></span>
          </h2>
        </div>
        <div className="values-list">
          {VALUES.map((v) => (
            <div key={v.title}>
              <h3 className="display-sm text-xl">{v.title}</h3>
              <p className="mt-1 text-[14px] leading-relaxed text-[color:var(--muted)]">{v.text}</p>
            </div>
          ))}
        </div>
      </section>

      <footer className="py-8 border-t text-[13px] text-[color:var(--muted)] flex flex-wrap gap-x-6 gap-y-2">
        <span>{APP_NAME}</span>
        <span>VTHacks 14</span>
        <span>Educational demo. Not medical advice.</span>
      </footer>
    </main>
  );
}
