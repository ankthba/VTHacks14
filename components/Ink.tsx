/**
 * Interface marks drawn by hand, in the same ink as the anatomy.
 *
 * Each path is deliberately a little uneven. A perfect stroke would read as a
 * font glyph; these should read as the same pen that drew the wrist.
 */
const stroke = { fill: "none", stroke: "currentColor", strokeLinecap: "round" as const, strokeLinejoin: "round" as const };

export function InkUnderline({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 200 14" preserveAspectRatio="none" className={className} aria-hidden>
      <path d="M3 9 C 30 4, 60 12, 95 7 S 150 10, 197 5" {...stroke} strokeWidth="3.2" />
      <path d="M8 12.5 C 50 8.5, 110 13, 190 9.5" {...stroke} strokeWidth="1.8" opacity=".65" />
    </svg>
  );
}

export function InkArrow({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 44 22" width="30" height="15" className={className} aria-hidden>
      <path d="M3 12 C 14 10, 26 11, 39 10.5" {...stroke} strokeWidth="2.6" />
      <path d="M31 4 C 34 7, 37 9.5, 40 10.5 C 37 12, 34 15, 31.5 18.5" {...stroke} strokeWidth="2.6" />
    </svg>
  );
}

export function InkCheck({ className = "", size = 20 }: { className?: string; size?: number }) {
  return (
    <svg viewBox="0 0 22 22" width={size} height={size} className={className} aria-hidden>
      <path d="M3.5 12.5 C 6 14, 8 16.5, 9.5 18.5 C 12 13, 15 8, 19.5 3.5" {...stroke} strokeWidth="2.6" />
    </svg>
  );
}

export function InkRing({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 40 40" className={className} aria-hidden>
      <path d="M20 4 C 30 3, 37 10, 36 20 C 35 31, 27 37, 18 36 C 9 35, 3 28, 4 19 C 5 10, 12 5, 22 5" {...stroke} strokeWidth="2.4" />
    </svg>
  );
}

export function InkStroke({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 100 8" preserveAspectRatio="none" className={className} aria-hidden>
      <path d="M2 4.5 C 25 2.5, 55 6, 98 3.5" {...stroke} strokeWidth="3.5" />
    </svg>
  );
}
