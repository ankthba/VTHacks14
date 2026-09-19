"use client";

import { useEffect, useId, useRef, useState } from "react";

/**
 * A menu of our own: paper, hairlines, the soft shape, and it rises in.
 * Replaces the browser's dropdown, which belongs to the operating system,
 * not to this page. Arrow keys move, Enter chooses, Escape closes.
 */
export function Menu({
  label,
  items,
  onPick,
  className = "",
  align = "left",
}: {
  label: React.ReactNode;
  items: { id: string; label: string; on?: boolean }[];
  onPick: (id: string) => void;
  className?: string;
  align?: "left" | "right";
}) {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const root = useRef<HTMLDivElement>(null);
  const id = useId();

  useEffect(() => {
    if (!open) return;
    const away = (e: MouseEvent) => { if (!root.current?.contains(e.target as Node)) setOpen(false); };
    const key = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
      if (e.key === "ArrowDown") { e.preventDefault(); setActive((a) => Math.min(items.length - 1, a + 1)); }
      if (e.key === "ArrowUp") { e.preventDefault(); setActive((a) => Math.max(0, a - 1)); }
      if (e.key === "Enter" && items[active]) { e.preventDefault(); onPick(items[active].id); setOpen(false); }
    };
    document.addEventListener("mousedown", away);
    document.addEventListener("keydown", key);
    return () => { document.removeEventListener("mousedown", away); document.removeEventListener("keydown", key); };
  }, [open, items, active, onPick]);

  return (
    <div ref={root} className={`relative inline-block ${className}`}>
      <button
        type="button"
        className={`chip menu-trigger ${open ? "on" : ""}`}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={id}
        onClick={() => { setOpen((o) => !o); setActive(Math.max(0, items.findIndex((i) => i.on))); }}
      >
        {label}
        <svg viewBox="0 0 10 6" width="10" height="6" aria-hidden className="ml-1.5 inline-block"><path d="M1 1l4 4 4-4" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /></svg>
      </button>
      {open && (
        <ul id={id} role="listbox" className={`menu rise ${align === "right" ? "right-0" : "left-0"}`}>
          {items.map((it, n) => (
            <li key={it.id} role="option" aria-selected={!!it.on}>
              <button
                type="button"
                className={`menu-item ${it.on ? "on" : ""} ${n === active ? "active" : ""}`}
                onMouseEnter={() => setActive(n)}
                onClick={() => { onPick(it.id); setOpen(false); }}
              >
                {it.label}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
