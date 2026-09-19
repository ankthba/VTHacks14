"use client";

import { useEffect, useState } from "react";

const KEY = "aperta-theme";

/**
 * Dark mode is never on unless you ask: deep green paper, beige ink. It
 * ignores the system setting on purpose, so a laptop in a dark clinic room
 * shows the doctor exactly the page they set up. The choice is remembered in
 * this browser only.
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
    <button type="button" onClick={flip} className={`chip theme-toggle ${className}`} aria-pressed={dark} title={dark ? "Back to paper" : "Dark green paper"}>
      {dark ? (
        <svg viewBox="0 0 22 22" width="16" height="16" aria-hidden><circle cx="11" cy="11" r="4.2" fill="none" stroke="currentColor" strokeWidth="2" /><path d="M11 2.5v2.6M11 16.9v2.6M2.5 11h2.6M16.9 11h2.6M5 5l1.8 1.8M15.2 15.2 17 17M17 5l-1.8 1.8M6.8 15.2 5 17" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>
      ) : (
        <svg viewBox="0 0 22 22" width="16" height="16" aria-hidden><path d="M13.5 3.2 C 8.6 4.1, 6 8.6, 7.4 13 C 8.8 17.3, 13.6 19.4, 17.8 17.6 C 12.4 17.2, 9.6 12.6, 11.3 8 C 11.8 6.1, 12.5 4.5, 13.5 3.2 Z" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" /></svg>
      )}
      <span className="ml-1.5">{dark ? "Paper" : "Dark"}</span>
    </button>
  );
}

/** Runs before paint so a remembered dark choice never flashes light. */
export const THEME_BOOT = `try{if(localStorage.getItem("${KEY}")==="dark")document.documentElement.dataset.theme="dark"}catch(e){}`;
