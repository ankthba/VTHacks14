import { SiteNav } from "@/components/SiteNav";
import { InkUnderline, InkGlass } from "@/components/Ink";
import { Faq } from "@/components/Faq";
import { APP_NAME } from "@/lib/brand";

export const metadata = { title: `${APP_NAME}: questions, answered plainly` };

export default function FaqPage() {
  return (
    <main id="top" className="flex-1 w-full max-w-6xl mx-auto px-5 pb-16">
      <SiteNav current="faq" depth={1} />

      <header className="page-hero rise">
        <div>
          <p className="eyebrow">Questions, answered plainly</p>
          <h1 className="display" style={{ fontSize: "clamp(2.4rem, 5vw, 4rem)" }}>
            A little more <span className="ink-under">clarity.<InkUnderline className="ink-under-svg" draw /></span>
          </h1>
          <p className="text-lg text-[color:var(--muted)] mt-4 max-w-xl">
            What {APP_NAME} does, what it will not do, and what happens to what you type.
          </p>
        </div>
        <div className="page-hero-art page-hero-glass" aria-hidden>
          <InkGlass className="w-full h-full" />
        </div>
      </header>

      <section className="faq-layout">
        <aside className="faq-intro">
          <p className="eyebrow">FAQ</p>
          <h2 className="display" style={{ fontSize: "clamp(1.8rem, 3.2vw, 2.6rem)" }}>
            Good questions deserve <span className="ink-under">straight answers.<InkUnderline className="ink-under-svg" /></span>
          </h2>
          <p className="mt-4 text-[15px] leading-relaxed text-[color:var(--muted)] max-w-xs">
            These are general answers, not medical advice. For anything about your own care, ask your pharmacist or physician.
          </p>
          <p className="faq-note">
            Still wondering about something?<br />
            <a href="https://github.com/ankthba/VTHacks14/issues" className="link-action" target="_blank" rel="noopener noreferrer">Open an issue on GitHub<span className="nav-ext" aria-hidden>&#8599;</span></a>
          </p>
        </aside>
        <Faq />
      </section>

      <footer className="py-8 border-t text-[13px] text-[color:var(--muted)] flex flex-wrap gap-x-6 gap-y-2">
        <span>{APP_NAME}</span>
        <span>VTHacks 14</span>
        <span>Educational demo. Not medical advice.</span>
      </footer>
    </main>
  );
}
