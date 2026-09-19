"use client";

import { useEffect, useState } from "react";

const KEY = "aperta-theme";

/**
 * Paper or chalkboard. The chalkboard is never on unless you ask: a deep
 * green board with beige chalk. It ignores the system setting on purpose, so
 * a laptop in a dark clinic room shows the doctor exactly the page they set
 * up. The choice is remembered in this browser only.
 */
export function ThemeToggle({ className = "" }: { className?: string }) {
  const [dark, setDark] = useState(false);
  useEffect(() => {
    setDark(document.documentElement.dataset.theme === "dark");
  }, []);
  const flip = () => {
    const next = !dark;
    setDark(next);
    document.documentElement.dataset.theme = next ? "dark" : "";
    try { localStorage.setItem(KEY, next ? "dark" : "light"); } catch {}
  };
  return (
    <button type="button" onClick={flip} className={`chip theme-toggle ${className}`} aria-pressed={dark} title={dark ? "Back to paper" : "Write it on the chalkboard"}>
      {dark ? (
        /* A sun with a face and rays that never quite agree on a length. */
        <svg viewBox="0 0 24 24" width="18" height="18" className="sun" aria-hidden fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
          <g className="rays">
            <path d="M12 1.8 L12.2 4.4" /><path d="M21.6 11.7 L19.2 11.9" /><path d="M12.1 22 L11.8 19.6" /><path d="M2.4 12.2 L4.9 12.1" />
            <path d="M18.4 5.2 L17 6.8" /><path d="M19 19.1 L17.2 17.4" /><path d="M5 18.8 L6.9 17" /><path d="M5.3 5 L7 6.7" />
          </g>
          <path d="M12 7.5 C 14.7 7.1, 16.7 9.1, 16.5 11.8 C 16.3 14.5, 14.2 16.5, 11.6 16.4 C 9.1 16.3, 7.3 14.3, 7.4 11.7 C 7.5 9.2, 9.4 7.7, 12 7.5 Z" />
          <path d="M10.3 11.1 L10.3 11.2 M13.7 11.1 L13.7 11.2" strokeWidth="2.2" />
          <path d="M10.4 13.3 Q12 14.7 13.6 13.3" />
        </svg>
      ) : (
        /* A sleepy moon, one star, a wink of a smile. */
        <svg viewBox="0 0 24 24" width="18" height="18" className="moon" aria-hidden fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
          <path d="M13.4 3 C 8.4 3.9, 5.5 8.4, 6.9 13 C 8.3 17.5, 13.2 19.9, 17.6 18.2 C 12.2 17.7, 9.3 12.9, 11 8.1 C 11.6 6.2, 12.3 4.5, 13.4 3 Z" />
          <path d="M8.6 10.4 Q9.5 11.2 10.4 10.4" />
          <path d="M9 13.4 Q10.3 14.6 11.5 13.5" />
          <path className="star" d="M19 4.2 l0.6 1.5 l1.5 0.6 l-1.5 0.6 l-0.6 1.5 l-0.6 -1.5 l-1.5 -0.6 l1.5 -0.6 Z" strokeWidth="1.4" />
          <path className="star2" d="M20.6 12.2 L20.6 12.3" strokeWidth="2.4" />
        </svg>
      )}
      <span className="ml-1.5">{dark ? "Paper" : "Chalkboard"}</span>
    </button>
  );
}

/** Runs before paint so a remembered dark choice never flashes light. */
export const THEME_BOOT = `try{if(localStorage.getItem("${KEY}")==="dark")document.documentElement.dataset.theme="dark"}catch(e){}`;
