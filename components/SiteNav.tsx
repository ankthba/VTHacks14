import { InkArrow } from "@/components/Ink";
import { ThemeToggle } from "@/components/ThemeToggle";
import { APP_NAME } from "@/lib/brand";
import { IS_STATIC, asset } from "@/lib/staticMode";

export type NavPage = "explain" | "library" | "team" | "faq";

/**
 * The one nav, on every page: wordmark, the pages with the current one
 * underlined in ink, the theme toggle, the repo. `depth` is how many
 * folders down the page sits, so the static site's relative links resolve.
 */
export function SiteNav({ current, depth = 0, className = "" }: { current: NavPage; depth?: number; className?: string }) {
  const up = IS_STATIC ? "../".repeat(depth) || "./" : "/";
  const to = (path: string) => (IS_STATIC ? `${up}${path}${path ? "/" : ""}` : `/${path}`);
  const link = (page: NavPage, path: string, label: React.ReactNode) => (
    <a href={to(path)} className={`nav-link ${current === page ? "on" : ""}`} aria-current={current === page ? "page" : undefined}>
      {label}
    </a>
  );
  return (
    <nav className={`nav ${className}`}>
      <a href={to("")} className="wordmark flex items-center gap-2">
        <img src={asset("/anatomy/spot.png")} alt="" width={18} height={17} draggable={false} />
        {APP_NAME}
      </a>
      <div className="nav-links">
        {link("explain", "", current === "explain" ? "Explain a note" : <span className="flex items-center gap-2"><InkArrow className="inline-block -scale-x-100" /> Explain a note</span>)}
        {link("library", "diagrams", "Anatomy library")}
        {link("team", "team", "Team")}
        {link("faq", "faq", "FAQ")}
      </div>
      <div className="nav-right">
        <ThemeToggle />
        <a href="https://github.com/ankthba/VTHacks14" className="nav-link" target="_blank" rel="noopener noreferrer">
          GitHub<span className="nav-ext" aria-hidden>&#8599;</span>
        </a>
      </div>
    </nav>
  );
}
