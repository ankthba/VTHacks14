import type { DiagramId } from "@/lib/anatomy/conditions";

/**
 * Schematic body diagrams for the exam room.
 *
 * Drawn as simple line art on purpose. The reader is a patient who may be in
 * pain, frightened, or working in a second language, and detail competes with
 * comprehension - a clear picture beats an accurate one when the goal is
 * "understand what happened to me". Everything is stroked in currentColor so a
 * single component works on both the clinician and patient surfaces.
 */

const STROKE = 5;

function Mark({
  on,
  hideWhenOff,
  children,
}: {
  on: boolean;
  /** For small structures that only make sense once they are the subject. */
  hideWhenOff?: boolean;
  children: React.ReactNode;
}) {
  if (hideWhenOff && !on) return null;
  return (
    <g
      style={{
        stroke: on ? "var(--high)" : "currentColor",
        fill: on ? "var(--high-bg)" : "transparent",
        strokeWidth: on ? STROKE + 1.5 : STROKE,
      }}
    >
      {children}
    </g>
  );
}

export function Diagram({
  id,
  marks = [],
  className,
}: {
  id: DiagramId;
  marks?: string[];
  className?: string;
}) {
  const on = (k: string) => marks.includes(k);
  const base = {
    fill: "none",
    stroke: "currentColor",
    strokeWidth: STROKE,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
  };

  const common = {
    viewBox: "0 0 240 260",
    className,
    role: "img" as const,
    style: { color: "var(--foreground)", width: "100%", height: "auto" },
  };

  if (id === "wrist") {
    return (
      <svg {...common} aria-label="Diagram of the forearm and wrist bones">
        <g {...base}>
          {/* Ulna - the forearm bone on the little-finger side. */}
          <path d="M98 18 L98 150 Q98 164 108 172" />
          {/*
            The hand is one closed silhouette rather than a palm plus separate
            fingers. Drawn as separate strokes it reads as legs; as a single
            mitten outline it reads unmistakably as a hand, which is all this
            needs to do.
          */}
          <path d="M84 176 Q76 182 76 200 L76 226 Q76 250 104 252 L140 252 Q166 250 166 226 L166 186 Q166 176 156 176 Z" />
          {/* Finger separations, suggested from inside the outline. */}
          <path d="M104 252 L104 224" strokeWidth={3} />
          <path d="M124 252 L124 222" strokeWidth={3} />
          <path d="M144 252 L144 224" strokeWidth={3} />
          {/* Thumb. */}
          <path d="M76 202 Q58 206 56 224" />
        </g>
        {/* Radius, with the break just above the wrist - the common fracture. */}
        <Mark on={on("radius-break")}>
          <path d="M150 18 L150 128" fill="none" />
          <path d="M136 136 L164 146" fill="none" />
          <path d="M150 154 L150 174" fill="none" />
        </Mark>
        {/* Scaphoid - small bone on the thumb side of the wrist. */}
        <Mark on={on("scaphoid")} hideWhenOff>
          <ellipse cx="146" cy="192" rx="15" ry="11" />
        </Mark>
      </svg>
    );
  }

  if (id === "knee") {
    return (
      <svg {...common} aria-label="Diagram of the knee joint">
        <g {...base}>
          {/* Femur above, tibia and fibula below. */}
          <path d="M96 16 L96 96 Q96 110 84 116" />
          <path d="M154 16 L154 96 Q154 110 166 116" />
          <path d="M100 160 L100 246" />
          <path d="M150 160 L150 246" />
          <path d="M172 168 L176 232" />
          {/* Kneecap. */}
          <circle cx="125" cy="130" r="20" />
        </g>
        {/* Meniscus - the cartilage wedges between the bones. */}
        <Mark on={on("meniscus")}>
          <path d="M82 152 L118 152" fill="none" />
          <path d="M132 152 L168 152" fill="none" />
        </Mark>
        {/* ACL - the ligament crossing inside the joint. */}
        <Mark on={on("acl")}>
          <path d="M104 116 L146 156" fill="none" />
        </Mark>
      </svg>
    );
  }

  if (id === "shoulder") {
    return (
      <svg {...common} aria-label="Diagram of the shoulder joint">
        <g {...base}>
          {/* Shoulder blade and collarbone. */}
          <path d="M36 74 L120 62" />
          <path d="M44 96 Q80 140 78 196" />
          {/* Upper arm bone. */}
          <path d="M162 116 L184 240" />
          <circle cx="150" cy="96" r="30" />
        </g>
        {/* Rotator cuff - the tendon band over the top of the joint. */}
        <Mark on={on("cuff")}>
          <path d="M120 70 Q150 54 180 78" fill="none" />
        </Mark>
      </svg>
    );
  }

  if (id === "spine") {
    return (
      <svg {...common} aria-label="Diagram of the lower spine">
        <g {...base}>
          {[0, 1, 2, 4].map((i) => (
            <rect key={i} x="84" y={26 + i * 48} width="72" height="30" rx="7" />
          ))}
          {/* Spinal cord running behind the vertebrae. */}
          <path d="M170 26 L170 240" strokeWidth={3} />
        </g>
        {/* The bulging disc, and the nerve it presses on. */}
        <Mark on={on("disc")}>
          <path d="M84 206 L156 206 Q176 216 156 226 L84 226 Z" />
        </Mark>
      </svg>
    );
  }

  if (id === "heart") {
    return (
      <svg {...common} aria-label="Diagram of the heart">
        <g {...base}>
          <path d="M120 236 Q40 168 40 108 Q40 56 82 56 Q110 56 120 86 Q130 56 158 56 Q200 56 200 108 Q200 168 120 236 Z" />
          <path d="M120 86 L120 200" strokeWidth={3} />
        </g>
        {/* Upper chambers - where fibrillation happens. */}
        <Mark on={on("atria")}>
          <path d="M62 96 Q120 74 178 96" fill="none" />
        </Mark>
        {/* A coronary artery on the surface of the muscle. */}
        <Mark on={on("coronary")}>
          <path d="M96 78 Q78 130 92 178" fill="none" />
        </Mark>
      </svg>
    );
  }

  return (
    <svg {...common} aria-label="Diagram of the lungs">
      <g {...base}>
        {/* Windpipe splitting into both lungs. */}
        <path d="M120 18 L120 74" />
        <path d="M120 74 L84 104" />
        <path d="M120 74 L156 104" />
        <path d="M74 112 Q40 150 52 206 Q64 238 104 224 L104 116 Z" />
        <path d="M166 112 Q200 150 188 206 Q176 238 136 224 L136 116 Z" />
      </g>
      {/* One lobe consolidated by infection. */}
      <Mark on={on("lobe")}>
        <path d="M144 150 Q176 152 180 196 Q170 220 144 214 Z" />
      </Mark>
      {/* Narrowed airways. */}
      <Mark on={on("airway")}>
        <path d="M84 120 L70 150" fill="none" />
        <path d="M156 120 L170 150" fill="none" />
      </Mark>
    </svg>
  );
}
