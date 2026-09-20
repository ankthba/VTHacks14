"use client";

import { useState } from "react";
import { FAQ } from "@/lib/faq";

/** One question open at a time, the first by default; a drawn plus that turns. */
export function Faq() {
  const [open, setOpen] = useState(0);
  return (
    <div className="faq-list">
      {FAQ.map((item, n) => {
        const isOpen = open === n;
        return (
          <article key={n} className={`faq-item ${isOpen ? "open" : ""}`}>
            <button type="button" className="faq-q" aria-expanded={isOpen} onClick={() => setOpen(isOpen ? -1 : n)}>
              <span className="faq-n">{n + 1}</span>
              <span className="faq-label display-sm">{item.q}</span>
              <span className="faq-toggle" aria-hidden>
                <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <path d="M4 12.3 C 9 11.6, 15 12.4, 20 11.8" />
                  <path className="faq-v" d="M12.2 4 C 11.6 9, 12.3 15, 11.9 20" />
                </svg>
              </span>
            </button>
            <div className="faq-a"><div><p>{item.a}</p></div></div>
          </article>
        );
      })}
    </div>
  );
}
