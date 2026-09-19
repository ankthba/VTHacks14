/**
 * Interface marks drawn by hand, in the same ink as the anatomy.
 *
 * Each path is deliberately a little uneven. A perfect stroke would read as a
 * font glyph; these should read as the same pen that drew the wrist.
 */
const stroke = { fill: "none", stroke: "currentColor", strokeLinecap: "round" as const, strokeLinejoin: "round" as const, pathLength: 100 };

/** Add `draw` and the mark is drawn in front of you, stroke by stroke. */
const cls = (base: string, draw?: boolean) => `${base}${draw ? " ink-draw" : ""}`.trim();

export function InkUnderline({ className = "", draw }: { className?: string; draw?: boolean }) {
  return (
    <svg viewBox="0 0 200 14" preserveAspectRatio="none" className={cls(className, draw)} aria-hidden>
      <path d="M3 9 C 30 4, 60 12, 95 7 S 150 10, 197 5" {...stroke} strokeWidth="3.2" />
      <path d="M8 12.5 C 50 8.5, 110 13, 190 9.5" {...stroke} strokeWidth="1.8" opacity=".65" />
    </svg>
  );
}

export function InkArrow({ className = "", draw }: { className?: string; draw?: boolean }) {
  return (
    <svg viewBox="0 0 44 22" width="30" height="15" className={cls(className, draw)} aria-hidden>
      <path d="M3 12 C 14 10, 26 11, 39 10.5" {...stroke} strokeWidth="2.6" />
      <path d="M31 4 C 34 7, 37 9.5, 40 10.5 C 37 12, 34 15, 31.5 18.5" {...stroke} strokeWidth="2.6" />
    </svg>
  );
}

export function InkCheck({ className = "", size = 20, draw, delay = 0 }: { className?: string; size?: number; draw?: boolean; delay?: number }) {
  return (
    <svg viewBox="0 0 22 22" width={size} height={size} className={cls(className, draw)} style={{ animationDelay: `${delay}ms` }} aria-hidden>
      <path d="M3.5 12.5 C 6 14, 8 16.5, 9.5 18.5 C 12 13, 15 8, 19.5 3.5" {...stroke} strokeWidth="2.6" />
    </svg>
  );
}

export function InkRing({ className = "", draw }: { className?: string; draw?: boolean }) {
  return (
    <svg viewBox="0 0 40 40" className={cls(className, draw)} aria-hidden>
      <path d="M20 4 C 30 3, 37 10, 36 20 C 35 31, 27 37, 18 36 C 9 35, 3 28, 4 19 C 5 10, 12 5, 22 5" {...stroke} strokeWidth="2.4" />
    </svg>
  );
}

export function InkStroke({ className = "", draw }: { className?: string; draw?: boolean }) {
  return (
    <svg viewBox="0 0 100 8" preserveAspectRatio="none" className={cls(className, draw)} aria-hidden>
      <path d="M2 4.5 C 25 2.5, 55 6, 98 3.5" {...stroke} strokeWidth="3.5" />
    </svg>
  );
}

/** Three arcs: the voice is speaking. */
export function InkSound({ className = "", speaking }: { className?: string; speaking?: boolean }) {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" className={`${className}${speaking ? " speaking" : ""}`} aria-hidden>
      <path d="M4 10 C 5 9, 6 9, 7 10 C 6 12, 6 13, 7 14" {...stroke} strokeWidth="2.2" />
      <path d="M11 6 C 13.5 8, 14 12, 12.5 16.5" {...stroke} strokeWidth="2.2" />
      <path d="M16 3 C 20 7, 20.5 14, 17.5 20" {...stroke} strokeWidth="2.2" />
    </svg>
  );
}

/** A magnifying glass with a glint, drawn a little crooked, that peers in when you type. */
export function InkGlass({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" className={`ink-glass ${className}`} aria-hidden fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10 3.6 C 13.8 3.2, 16.6 6, 16.3 9.6 C 16 13.2, 13 15.6, 9.6 15.3 C 6.2 15, 3.9 12.3, 4.1 9.2 C 4.3 6, 6.7 3.9, 10 3.6 Z" />
      <path d="M14.6 14.2 L 20.6 20.4" strokeWidth="2.8" />
      <path d="M7.2 7.6 C 7.8 6.6, 8.7 6, 9.7 5.9" className="glint" strokeWidth="1.6" />
    </svg>
  );
}
