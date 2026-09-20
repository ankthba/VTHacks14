import type { HowToArt as ArtId } from "@/lib/howto";
import { HOWTO_ART } from "@/lib/howtoArt";
import { InkImage } from "@/components/InkImage";

/**
 * One simple picture per procedure: the object in the hand, nothing else.
 * Line art in currentColor, the same visual language as the anatomy.
 */
export function HowToArt({ id, className }: { id: ArtId; className?: string }) {
  // The clinician's own drawing, when there is one.
  const drawn = HOWTO_ART[id];
  if (drawn) {
    return (
      <div className={className} role="img" aria-label={drawn.label} style={{ width: "100%", aspectRatio: `${drawn.w} / ${drawn.h}` }}>
        <InkImage src={drawn.src} className="block w-full h-full" />
      </div>
    );
  }

  const base = {
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 4,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
  };
  const common = {
    viewBox: "0 0 240 240",
    className,
    role: "img" as const,
    style: { color: "var(--foreground)", width: "100%", height: "auto" },
  };
  const hi = { stroke: "var(--high)", fill: "var(--high-bg)" };

  switch (id) {
    case "syringe":
      return (
        <svg {...common} aria-label="A syringe">
          <g {...base}>
            <rect x="40" y="96" width="120" height="44" rx="8" />
            <path d="M160 118 L196 118 M196 108 L196 128" />
            <path d="M40 118 L20 118 M14 100 L14 136" />
            <path d="M52 96 L52 140" strokeWidth={3} />
          </g>
          <path d="M200 118 L226 118" {...base} {...hi} strokeWidth={5} />
        </svg>
      );
    case "inhaler":
      return (
        <svg {...common} aria-label="An inhaler with a spacer">
          <g {...base}>
            <rect x="120" y="60" width="40" height="90" rx="10" />
            <path d="M120 150 Q118 172 140 174 L164 174" />
            <rect x="24" y="150" width="140" height="44" rx="22" />
            <path d="M24 172 L8 172" />
          </g>
          <ellipse cx="60" cy="172" rx="14" ry="10" {...base} {...hi} />
        </svg>
      );
    case "crutches":
      return (
        <svg {...common} aria-label="A pair of crutches">
          <g {...base}>
            <path d="M70 40 L70 220 M110 40 L110 220" />
            <path d="M60 40 L120 40" />
            <path d="M60 120 L120 120" />
            <path d="M150 40 L150 220 M190 40 L190 220" />
            <path d="M140 40 L200 40" />
            <path d="M140 120 L200 120" />
          </g>
          <path d="M60 120 L120 120 M140 120 L200 120" {...base} {...hi} strokeWidth={7} />
        </svg>
      );
    case "eyedrops":
      return (
        <svg {...common} aria-label="An eye and a dropper">
          <g {...base}>
            <path d="M30 150 Q120 90 210 150 Q120 210 30 150 Z" />
            <circle cx="120" cy="150" r="24" />
            <path d="M120 24 L120 70 M108 30 L132 30" />
          </g>
          <path d="M120 80 Q112 96 120 104 Q128 96 120 80 Z" {...base} {...hi} />
        </svg>
      );
    case "sling":
      return (
        <svg {...common} aria-label="An arm in a sling">
          <g {...base}>
            <circle cx="120" cy="40" r="22" />
            <path d="M80 70 Q120 60 160 70 L170 180 L70 180 Z" />
            <path d="M84 90 Q60 130 60 160" />
          </g>
          <path d="M70 140 L160 110 L166 126 L76 156 Z" {...base} {...hi} />
          <path d="M160 110 Q150 76 120 74" {...base} {...hi} />
        </svg>
      );
    case "dressing":
      return (
        <svg {...common} aria-label="A wound dressing">
          <g {...base}>
            <path d="M40 90 Q120 60 200 90 L200 150 Q120 180 40 150 Z" />
          </g>
          <rect x="84" y="96" width="72" height="50" rx="6" {...base} {...hi} />
          <path d="M100 108 L140 134 M140 108 L100 134" {...base} strokeWidth={2} />
        </svg>
      );
    case "pen":
      return (
        <svg {...common} aria-label="An injection pen">
          <g {...base}>
            <rect x="30" y="100" width="150" height="36" rx="18" />
            <path d="M180 118 L206 118" />
            <circle cx="52" cy="118" r="8" />
          </g>
          <path d="M60 170 Q120 150 180 170" {...base} {...hi} />
          <path d="M206 118 L222 118" {...base} {...hi} strokeWidth={3} />
        </svg>
      );
    case "ice":
      return (
        <svg {...common} aria-label="An ice pack on a raised leg">
          <g {...base}>
            <path d="M20 190 L110 190 L170 130 L220 130" />
            <path d="M20 200 L220 200" />
            <path d="M150 110 L200 110 L200 132" />
          </g>
          <rect x="128" y="94" width="64" height="30" rx="8" {...base} {...hi} />
        </svg>
      );
    case "splint":
      return (
        <svg {...common} aria-label="A splinted forearm">
          <g {...base}>
            <path d="M30 100 L170 100 Q200 100 200 130 Q200 160 170 160 L30 160 Z" />
            <path d="M200 120 L230 110 M200 130 L232 130 M200 140 L230 150" />
          </g>
          <path d="M50 100 L50 160 M90 100 L90 160 M130 100 L130 160" {...base} {...hi} />
        </svg>
      );
  }
}
