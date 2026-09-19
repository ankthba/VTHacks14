import type { DiagramId } from "@/lib/anatomy/conditions";
import { ART, SPOT_SRC, SPOT_WIDTH, spotsFor } from "@/lib/anatomy/art";

/**
 * Anatomically modeled diagrams for the exam room.
 *
 * Drawn as clean vector line art from real anatomy - the radius flares to its
 * styloid, the femur ends in two condyles, the left lung has two lobes and a
 * cardiac notch - because the patient should recognise it as THEIR wrist,
 * THEIR heart. Kept as line work rather than shaded render so a highlighted
 * structure reads instantly, and so it prints.
 *
 * Every marked structure is a real one. A highlight is never decorative.
 * Structures that only matter for one diagnosis (a Baker's cyst, a hernia)
 * are drawn only when marked, so the base drawing stays clean.
 */

const W = 4;

function Mark({
  on,
  hideWhenOff,
  children,
}: {
  on: boolean;
  hideWhenOff?: boolean;
  children: React.ReactNode;
}) {
  if (hideWhenOff && !on) return null;
  return (
    <g
      style={{
        stroke: on ? "var(--high)" : "currentColor",
        fill: on ? "var(--high-bg)" : "none",
        strokeWidth: on ? W + 1.5 : W,
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
  fit = false,
}: {
  id: DiagramId;
  marks?: string[];
  className?: string;
  /** Size by the container's height instead of its width, so a tall drawing
      inside a fixed frame is never cut off at the top or bottom. */
  fit?: boolean;
}) {
  const sizing = fit
    ? { height: "100%", width: "auto", maxWidth: "100%" }
    : { width: "100%", height: "auto" };

  // The clinician's own drawing, when there is one for this view.
  const art = ART[id];
  if (art) {
    return (
      <div className={className} role="img" aria-label={art.label} style={{ position: "relative", aspectRatio: `${art.w} / ${art.h}`, ...sizing }}>
        <img src={art.src} alt="" className="block w-full h-full" draggable={false} />
        {marks.flatMap((m) => spotsFor(art, m).map((p, i) => ({ key: `${m}-${i}`, p }))).map(({ key, p }) => {
          return (
            <img
              key={key}
              src={SPOT_SRC}
              alt=""
              aria-hidden
              draggable={false}
              className="spot absolute"
              style={{ left: `${p.x * 100}%`, top: `${p.y * 100}%`, width: `${SPOT_WIDTH * p.s * 100}%`, transform: "translate(-50%, -50%)" }}
            />
          );
        })}
      </div>
    );
  }

  const on = (k: string) => marks.includes(k);
  const base = {
    fill: "none",
    stroke: "currentColor",
    strokeWidth: W,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
  };
  const thin = { ...base, strokeWidth: 2 };
  const common = {
    viewBox: "0 0 300 360",
    className,
    role: "img" as const,
    style: { color: "var(--ink)", ...sizing },
  };

  // ---- Forearm, wrist and hand - anterior (palm-up) view -------------------
  if (id === "wrist") {
    return (
      <svg {...common} aria-label="Bones of the forearm, wrist and hand">
        <g {...base}>
          {/* Ulna: medial, narrows toward the wrist, ends in the ulnar head. */}
          <path d="M104 14 Q98 60 100 120 Q101 170 108 196 Q112 206 122 208 L122 194 Q116 170 116 120 Q116 60 118 14 Z" />
          <path d="M112 207 L110 216" />
          {/* Carpals - proximal row. */}
          <ellipse cx="146" cy="222" rx="13" ry="10" />
          <ellipse cx="122" cy="228" rx="11" ry="9" />
          <circle cx="118" cy="240" r="5" />
          {/* Carpals - distal row. */}
          <ellipse cx="130" cy="250" rx="12" ry="9" />
          <ellipse cx="156" cy="248" rx="12" ry="9" />
          <ellipse cx="180" cy="244" rx="10" ry="8" />
          <ellipse cx="200" cy="236" rx="11" ry="9" />
          {/* Metacarpals. */}
          <path d="M126 262 L118 306" /><path d="M150 260 L146 312" />
          <path d="M172 256 L172 310" /><path d="M192 250 L198 300" />
          <path d="M210 242 Q228 258 236 274" />
          {/* Phalanges. */}
          <path d="M116 312 L110 346" /><path d="M145 318 L142 352" />
          <path d="M172 316 L172 352" /><path d="M199 306 L204 340" />
          <path d="M238 278 Q250 288 254 300" />
        </g>
        {/* Radius: lateral, broad at the wrist, with the radial styloid. */}
        <Mark on={on("radius-break")}>
          <path d="M148 14 Q152 60 152 120 Q152 160 154 176" />
          <path d="M184 14 Q182 60 182 120 Q182 160 186 176" />
          <path d="M150 180 L192 190" />
          <path d="M154 186 Q160 200 190 206 Q204 210 208 224 L196 226 Q186 212 160 208 Q150 204 150 194 Z" />
        </Mark>
        {/* Scaphoid: the boat-shaped bone on the thumb side of the proximal row. */}
        <Mark on={on("scaphoid")} hideWhenOff>
          <path d="M168 220 Q180 214 190 226 Q186 238 172 236 Q162 232 168 220 Z" />
        </Mark>
        {/* Carpal tunnel: the band across the front of the carpals the median nerve runs under. */}
        <Mark on={on("tunnel")} hideWhenOff>
          <path d="M118 232 Q150 220 194 228 L192 250 Q150 262 122 254 Z" />
          <path d="M156 100 Q154 180 156 240" />
        </Mark>
        {/* The thumb tendons crossing the radial styloid. */}
        <Mark on={on("tendon")} hideWhenOff>
          <path d="M178 160 Q196 200 214 246" /><path d="M186 160 Q204 198 222 244" />
        </Mark>
        {/* One finger - a flexor tendon, a fracture, a stiff joint. */}
        <Mark on={on("finger")} hideWhenOff>
          <path d="M172 256 L172 310" /><path d="M172 316 L172 352" />
          <circle cx="172" cy="313" r="7" />
        </Mark>
        {/* The fifth metacarpal, the one a punch breaks. */}
        <Mark on={on("metacarpal")} hideWhenOff>
          <path d="M126 262 L118 306" /><path d="M116 292 L128 296" />
        </Mark>
        {/* A ganglion on the back of the wrist. */}
        <Mark on={on("cyst")} hideWhenOff>
          <circle cx="178" cy="206" r="10" />
        </Mark>
        {/* Cords in the palm pulling the fingers down. */}
        <Mark on={on("palm")} hideWhenOff>
          <path d="M120 300 Q150 270 200 296" /><path d="M146 312 Q150 286 152 268" />
        </Mark>
      </svg>
    );
  }

  // ---- Knee - anterior view --------------------------------------------------
  if (id === "knee") {
    return (
      <svg {...common} aria-label="Bones and ligaments of the knee">
        <g {...base}>
          <path d="M126 12 Q122 80 118 130 Q100 140 96 166 Q100 186 122 190 L178 190 Q200 186 204 166 Q200 140 182 130 Q178 80 174 12" />
          <path d="M136 190 Q150 170 164 190" />
          <path d="M132 136 Q150 122 168 136 Q172 160 150 176 Q128 160 132 136 Z" />
          <path d="M96 216 Q100 204 122 206 L178 206 Q200 204 204 216 Q206 232 196 240 L192 350 L108 350 L104 240 Q94 232 96 216 Z" />
          <path d="M138 250 Q150 262 162 250" {...thin} />
          <path d="M214 224 Q224 226 226 240 L232 350 L218 350 L212 244 Q206 234 214 224 Z" />
        </g>
        <Mark on={on("meniscus")}>
          <path d="M100 200 Q120 194 138 200" />
          <path d="M162 200 Q180 194 200 200" />
        </Mark>
        <Mark on={on("acl")}>
          <path d="M170 176 Q158 190 144 208" />
        </Mark>
        {/* Medial collateral ligament down the inside of the joint. */}
        <Mark on={on("mcl")} hideWhenOff>
          <path d="M104 166 Q96 210 104 250" /><path d="M112 168 Q106 210 112 248" />
        </Mark>
        <Mark on={on("patella")} hideWhenOff>
          <path d="M132 136 Q150 122 168 136 Q172 160 150 176 Q128 160 132 136 Z" />
        </Mark>
        {/* Patellar tendon from the kneecap to the tibial tuberosity. */}
        <Mark on={on("patellar-tendon")} hideWhenOff>
          <path d="M142 178 L140 250" /><path d="M158 178 L160 250" />
        </Mark>
        {/* Prepatellar bursa sitting on the front of the kneecap. */}
        <Mark on={on("bursa")} hideWhenOff>
          <ellipse cx="150" cy="150" rx="28" ry="34" />
        </Mark>
        {/* A Baker's cyst behind the joint. */}
        <Mark on={on("back")} hideWhenOff>
          <ellipse cx="232" cy="200" rx="14" ry="20" />
        </Mark>
        {/* The tibial plateau. */}
        <Mark on={on("tibia")} hideWhenOff>
          <path d="M96 216 Q100 204 122 206 L178 206 Q200 204 204 216 Q206 232 196 240 L104 240 Q94 232 96 216 Z" />
          <path d="M148 206 L156 240" />
        </Mark>
      </svg>
    );
  }

  // ---- Shoulder - anterior view ---------------------------------------------
  if (id === "shoulder") {
    return (
      <svg {...common} aria-label="Bones and tendons of the shoulder">
        <g {...base}>
          <path d="M40 92 Q100 78 158 90 Q172 94 176 104" />
          <path d="M60 116 Q80 112 96 122 L90 180 Q80 230 60 260 Q40 220 44 170 Q46 136 60 116 Z" />
          <path d="M150 88 Q176 82 190 96" />
          <circle cx="150" cy="150" r="34" />
          <path d="M170 178 Q182 200 184 240 L188 350 L156 350 L152 240 Q150 200 130 178" />
          <path d="M182 126 Q192 136 188 148" {...thin} />
        </g>
        <Mark on={on("cuff")}>
          <path d="M96 118 Q130 96 172 122 Q184 132 186 144" />
        </Mark>
        <Mark on={on("humerus-head")} hideWhenOff>
          <circle cx="150" cy="150" r="34" />
          <path d="M152 116 L142 150" />
        </Mark>
        {/* Acromioclavicular joint: where the collarbone meets the shoulder blade. */}
        <Mark on={on("ac")} hideWhenOff>
          <circle cx="180" cy="100" r="11" />
        </Mark>
        {/* Long head of biceps running down the front of the humerus. */}
        <Mark on={on("biceps")} hideWhenOff>
          <path d="M126 122 Q146 150 156 210" />
        </Mark>
        <Mark on={on("clavicle")} hideWhenOff>
          <path d="M40 92 Q100 78 158 90 Q172 94 176 104" />
          <path d="M104 74 L100 96" />
        </Mark>
      </svg>
    );
  }

  // ---- Lumbar spine - lateral view -----------------------------------------
  if (id === "spine") {
    return (
      <svg {...common} aria-label="Lumbar spine, side view">
        <g {...base}>
          {[0, 1, 2, 3].map((i) => {
            const y = 30 + i * 66;
            const x = 96 + Math.sin(i * 0.9) * 8;
            return (
              <g key={i}>
                <path d={`M${x} ${y} Q${x + 34} ${y - 6} ${x + 68} ${y} L${x + 66} ${y + 40} Q${x + 34} ${y + 46} ${x + 2} ${y + 40} Z`} />
                <path d={`M${x + 68} ${y + 12} L${x + 98} ${y + 8} L${x + 124} ${y + 24} L${x + 100} ${y + 34} L${x + 66} ${y + 32}`} />
              </g>
            );
          })}
          <path d="M176 22 Q184 140 180 300" {...thin} />
          <path d="M100 296 Q140 300 172 296 Q186 330 150 352 Q110 330 100 296 Z" />
        </g>
        <Mark on={on("disc")}>
          <path d="M100 232 Q134 224 170 232 Q184 244 172 258 L100 258 Q92 246 100 232 Z" />
          <path d="M172 246 Q192 250 204 268" />
        </Mark>
        {/* The muscles alongside the spine. */}
        <Mark on={on("muscle")} hideWhenOff>
          <path d="M226 24 Q246 160 234 300" /><path d="M244 24 Q264 160 252 300" />
        </Mark>
        {/* A vertebral body, compressed at the front. */}
        <Mark on={on("vertebra")} hideWhenOff>
          <path d="M102 96 Q136 90 170 96 L168 136 Q136 142 104 136 Z" />
          <path d="M108 104 L132 126" />
        </Mark>
        <Mark on={on("sacrum")} hideWhenOff>
          <path d="M100 296 Q140 300 172 296 Q186 330 150 352 Q110 330 100 296 Z" />
        </Mark>
        <Mark on={on("coccyx")} hideWhenOff>
          <path d="M146 342 Q160 348 152 358" />
        </Mark>
      </svg>
    );
  }

  // ---- Heart - anterior view -------------------------------------------------
  if (id === "heart") {
    return (
      <svg {...common} aria-label="The heart and its great vessels">
        <g {...base}>
          <path d="M146 96 Q146 40 186 40 Q222 40 222 80 L222 100" />
          <path d="M162 96 Q162 58 186 58 Q206 58 206 82 L206 100" />
          <path d="M104 104 L104 40" /><path d="M124 104 L124 40" />
          <path d="M134 110 Q126 84 150 76 Q176 70 178 96" />
          <path d="M96 118 Q78 150 84 200 Q94 262 150 300 Q222 262 232 190 Q238 150 220 116 Q200 100 172 106 Q154 100 134 110 Q112 100 96 118 Z" />
          <path d="M160 150 Q150 220 150 290" {...thin} />
          <path d="M92 150 Q150 138 226 150" {...thin} />
        </g>
        <Mark on={on("atria")}>
          <path d="M98 122 Q120 104 150 118 Q176 104 216 120 Q222 138 214 150 Q150 138 96 148 Q90 134 98 122 Z" />
        </Mark>
        <Mark on={on("coronary")}>
          <path d="M162 150 Q150 200 146 260" />
          <path d="M162 150 Q140 160 118 180" />
        </Mark>
        {/* The aorta and the vessels leaving the heart - pressure lives here. */}
        <Mark on={on("vessels")} hideWhenOff>
          <path d="M146 96 Q146 40 186 40 Q222 40 222 80 L222 100" />
          <path d="M162 96 Q162 58 186 58 Q206 58 206 82 L206 100" />
          <path d="M166 44 L166 12" /><path d="M186 40 L186 10" /><path d="M204 46 L206 14" />
        </Mark>
        {/* The pericardium: the sac around the heart. */}
        <Mark on={on("pericardium")} hideWhenOff>
          <path d="M86 110 Q62 150 70 206 Q82 276 150 318 Q234 276 246 190 Q254 144 230 104" />
        </Mark>
        {/* Costal cartilage: where the ribs meet the breastbone, in front of the heart. */}
        <Mark on={on("chest-wall")} hideWhenOff>
          <path d="M20 128 Q90 110 150 124 Q210 110 280 128" />
          <path d="M20 186 Q90 168 150 182 Q210 168 280 186" />
          <path d="M20 244 Q90 226 150 240 Q210 226 280 244" />
        </Mark>
        {/* The aortic valve at the root of the aorta. */}
        <Mark on={on("valve")} hideWhenOff>
          <circle cx="154" cy="102" r="12" />
          <path d="M154 90 L154 102 L144 108 M154 102 L164 108" />
        </Mark>
      </svg>
    );
  }

  // ---- Lungs - anterior view ------------------------------------------------
  if (id === "lung") {
    return (
      <svg {...common} aria-label="The lungs and airways">
        <g {...base}>
          <path d="M140 12 L140 92" /><path d="M160 12 L160 92" />
          {[24, 40, 56, 72].map((y) => (
            <path key={y} d={`M140 ${y} L160 ${y}`} {...thin} />
          ))}
          <path d="M140 92 Q124 110 108 128" /><path d="M160 92 Q176 110 192 128" />
          <path d="M112 124 Q96 140 88 160" {...thin} /><path d="M112 124 Q112 150 104 176" {...thin} />
          <path d="M188 124 Q204 140 212 160" {...thin} /><path d="M188 124 Q190 150 200 176" {...thin} />
          <path d="M126 104 Q70 112 54 170 Q44 240 62 300 Q80 334 122 326 L128 200 Z" />
          <path d="M60 196 Q90 186 126 176" {...thin} />
          <path d="M72 262 Q100 236 128 224" {...thin} />
          <path d="M174 104 Q230 112 246 170 Q256 240 238 300 Q220 334 178 326 L172 260 Q188 240 172 200 Z" />
          <path d="M226 258 Q200 234 174 226" {...thin} />
          <path d="M50 314 Q150 352 250 314" {...thin} />
        </g>
        <Mark on={on("lobe")}>
          <path d="M72 262 Q100 236 128 224 L122 326 Q80 334 62 300 Q66 280 72 262 Z" />
        </Mark>
        <Mark on={on("airway")}>
          <path d="M112 124 Q96 140 88 160" /><path d="M188 124 Q204 140 212 160" />
          <path d="M112 124 Q112 150 104 176" /><path d="M188 124 Q190 150 200 176" />
        </Mark>
        {/* The pleural space between the lung and the chest wall. */}
        <Mark on={on("pleura")} hideWhenOff>
          <path d="M126 94 Q60 102 44 170 Q34 246 54 308 Q74 344 122 336" />
          <path d="M126 104 Q70 112 54 170 Q44 240 62 300 Q80 334 122 326" />
        </Mark>
      </svg>
    );
  }

  // ---- Head - lateral view --------------------------------------------------
  if (id === "head") {
    return (
      <svg {...common} aria-label="The skull and brain, side view">
        <g {...base}>
          <path d="M70 180 Q56 100 130 50 Q210 24 254 96 Q272 150 240 200 Q232 230 214 244 L214 280 Q190 300 150 296 L96 296 Q70 260 70 180 Z" />
          <path d="M92 190 Q108 176 122 192" {...thin} />
          <path d="M88 236 Q80 260 96 274" {...thin} />
          <path d="M100 296 Q140 320 184 306" {...thin} />
          <path d="M198 214 Q228 208 232 236 Q220 256 196 244 Z" {...thin} />
          <path d="M186 246 L186 286" {...thin} />
        </g>
        <Mark on={on("brain")}>
          <path d="M96 176 Q84 110 148 72 Q212 52 236 112 Q246 160 224 196 Q190 232 140 222 Q104 212 96 176 Z" />
          <path d="M140 76 Q150 130 132 186" />
          <path d="M96 176 Q140 160 184 190" />
        </Mark>
        <Mark on={on("vessel")}>
          <path d="M150 210 Q168 178 200 156" />
          <path d="M168 178 Q182 174 194 182" />
          <path d="M184 166 Q198 154 214 156" />
        </Mark>
        {/* The facial nerve fanning forward from in front of the ear. */}
        <Mark on={on("nerve")} hideWhenOff>
          <path d="M206 236 Q170 226 128 206" />
          <path d="M206 236 Q170 244 126 246" />
          <path d="M206 236 Q176 262 136 284" />
        </Mark>
        {/* The throat, behind the mouth and down the neck. */}
        <Mark on={on("throat")} hideWhenOff>
          <path d="M180 250 Q186 290 172 336" /><path d="M200 252 Q206 292 194 340" />
        </Mark>
        {/* Frontal and maxillary sinuses. */}
        <Mark on={on("sinus")} hideWhenOff>
          <ellipse cx="98" cy="156" rx="12" ry="16" />
          <ellipse cx="106" cy="226" rx="16" ry="14" />
        </Mark>
      </svg>
    );
  }

  // ---- Abdomen - anterior view ----------------------------------------------
  if (id === "abdomen") {
    return (
      <svg {...common} aria-label="Organs of the abdomen">
        <g {...base}>
          <path d="M60 40 Q100 66 150 60 Q200 66 240 40" {...thin} />
          <path d="M70 66 Q110 88 150 82 Q190 88 230 66" {...thin} />
          <path d="M62 74 Q120 62 172 82 Q186 100 160 118 Q100 128 64 108 Q54 92 62 74 Z" />
          <path d="M176 78 Q212 66 234 92 Q244 124 214 138 Q188 140 178 122 Q170 100 176 78 Z" />
          <path d="M86 132 L86 250 Q90 274 114 276 L200 276 Q222 274 224 250 L224 140" />
          <path d="M112 160 Q150 150 190 162 Q150 180 112 196 Q150 206 190 216 Q150 236 112 250" {...thin} />
        </g>
        <Mark on={on("gallbladder")}>
          <path d="M128 112 Q144 108 152 122 Q146 136 130 132 Q120 124 128 112 Z" />
        </Mark>
        <Mark on={on("appendix")}>
          <path d="M96 258 Q88 280 98 300" />
        </Mark>
        <Mark on={on("bowel")} hideWhenOff>
          <path d="M200 276 Q222 274 224 250 L224 200" />
        </Mark>
        <Mark on={on("stomach")} hideWhenOff>
          <path d="M176 78 Q212 66 234 92 Q244 124 214 138 Q188 140 178 122 Q170 100 176 78 Z" />
        </Mark>
        {/* The rectum, the last stretch of the bowel. */}
        <Mark on={on("rectum")} hideWhenOff>
          <path d="M142 278 L142 318 Q150 328 158 318 L158 278" />
        </Mark>
        {/* A hernia bulging through the groin. */}
        <Mark on={on("hernia")} hideWhenOff>
          <path d="M98 290 Q116 300 100 320 Q80 312 98 290 Z" />
        </Mark>
        {/* The pancreas lying across the back of the abdomen. */}
        <Mark on={on("pancreas")} hideWhenOff>
          <path d="M120 136 Q170 118 226 132 Q176 152 120 148 Z" />
        </Mark>
        <Mark on={on("liver")} hideWhenOff>
          <path d="M62 74 Q120 62 172 82 Q186 100 160 118 Q100 128 64 108 Q54 92 62 74 Z" />
        </Mark>
      </svg>
    );
  }

  // ---- Ankle and foot - lateral view ----------------------------------------
  if (id === "ankle") {
    return (
      <svg {...common} aria-label="Bones and ligaments of the ankle and foot">
        <g {...base}>
          <path d="M120 12 L118 170 Q116 190 132 196 L160 196 Q176 190 174 170 L172 12" />
          <path d="M192 12 L194 176 Q196 200 186 208" />
          <path d="M118 200 Q150 186 184 204 Q194 226 176 236 L124 236 Q108 222 118 200 Z" />
          <path d="M104 238 Q88 262 100 290 Q124 300 172 292 L240 274 Q262 268 258 254 L184 240 Z" />
          <path d="M210 262 Q236 258 258 254" {...thin} />
        </g>
        <Mark on={on("malleolus")}>
          <path d="M184 176 Q200 190 190 212 Q180 220 174 208 Z" />
        </Mark>
        <Mark on={on("ligament")}>
          <path d="M186 208 Q176 218 164 224" />
          <path d="M188 214 Q184 234 174 244" />
        </Mark>
        <Mark on={on("achilles")}>
          <path d="M100 100 Q92 180 100 246" />
        </Mark>
        {/* The plantar fascia along the sole, from heel to toes. */}
        <Mark on={on("plantar")} hideWhenOff>
          <path d="M104 292 Q170 306 250 276" />
          <circle cx="108" cy="290" r="8" />
        </Mark>
        {/* The big toe joint. */}
        <Mark on={on("toe")} hideWhenOff>
          <circle cx="248" cy="264" r="13" />
          <path d="M258 254 Q282 250 292 262" />
        </Mark>
        {/* A metatarsal in the middle of the foot. */}
        <Mark on={on("metatarsal")} hideWhenOff>
          <path d="M176 280 L236 266" /><path d="M204 268 L210 280" />
        </Mark>
        <Mark on={on("nail")} hideWhenOff>
          <path d="M258 254 Q282 250 292 262" />
          <ellipse cx="284" cy="256" rx="8" ry="5" />
        </Mark>
      </svg>
    );
  }

  // ---- Hip and thigh - anterior view -----------------------------------------
  if (id === "hip") {
    return (
      <svg {...common} aria-label="The hip joint and thigh">
        <g {...base}>
          <path d="M40 60 Q80 30 140 44 Q180 52 200 92 Q214 128 196 150 Q180 160 168 150 Q156 130 130 126 Q90 122 60 100 Q36 84 40 60 Z" />
          <circle cx="182" cy="140" r="26" />
          <path d="M200 156 Q212 170 226 176" />
          <path d="M232 154 Q252 160 250 190 L246 350 L214 350 L212 200 Q208 184 200 176" />
          <path d="M226 176 Q220 190 212 200" />
        </g>
        <Mark on={on("neck")}>
          <path d="M200 156 Q214 170 232 154" />
          <path d="M206 170 L228 160" />
        </Mark>
        <Mark on={on("joint")} hideWhenOff>
          <circle cx="182" cy="140" r="30" />
        </Mark>
        {/* The deep vein running down the inside of the thigh. */}
        <Mark on={on("vein")} hideWhenOff>
          <path d="M176 172 Q192 260 200 350" />
          <ellipse cx="190" cy="262" rx="7" ry="16" />
        </Mark>
        {/* The bursa over the greater trochanter, the bony point of the hip. */}
        <Mark on={on("bursa")} hideWhenOff>
          <ellipse cx="248" cy="164" rx="12" ry="18" />
        </Mark>
        {/* Groin and hip-flexor muscles from the pelvis to the inner thigh. */}
        <Mark on={on("groin")} hideWhenOff>
          <path d="M150 152 Q176 210 204 262" /><path d="M136 146 Q166 210 192 268" />
        </Mark>
        {/* The hamstring down the back of the thigh. */}
        <Mark on={on("hamstring")} hideWhenOff>
          <path d="M256 200 Q266 280 258 350" /><path d="M264 210 Q274 280 268 350" />
        </Mark>
      </svg>
    );
  }

  // ---- Lower jaw - viewed from above, teeth in an arch ----------------------
  if (id === "mouth") {
    return (
      <svg {...common} aria-label="The lower jaw and teeth, seen from above">
        <g {...base}>
          <path d="M40 320 Q30 150 150 110 Q270 150 260 320" />
          <path d="M70 320 Q64 180 150 150 Q236 180 230 320" />
          {[
            [150, 130, 10, 12], [130, 134, 10, 12], [170, 134, 10, 12],
            [112, 142, 11, 13], [188, 142, 11, 13],
            [96, 156, 12, 14], [204, 156, 12, 14],
            [84, 176, 13, 15], [216, 176, 13, 15],
            [74, 200, 15, 17], [226, 200, 15, 17],
            [66, 228, 16, 18], [234, 228, 16, 18],
            [60, 258, 17, 19], [240, 258, 17, 19],
          ].map(([x, y, rx, ry], i) => (
            <ellipse key={i} cx={x} cy={y} rx={rx} ry={ry} />
          ))}
          <path d="M110 200 Q150 170 190 200 Q190 280 150 300 Q110 280 110 200 Z" {...thin} />
        </g>
        <Mark on={on("socket")}>
          <ellipse cx="56" cy="292" rx="17" ry="20" />
          <ellipse cx="244" cy="292" rx="17" ry="20" />
        </Mark>
        <Mark on={on("root")} hideWhenOff>
          <path d="M226 218 L230 246 L222 246 Z" />
          <circle cx="226" cy="252" r="12" />
        </Mark>
        {/* One tooth. */}
        <Mark on={on("tooth")} hideWhenOff>
          <ellipse cx="234" cy="228" rx="16" ry="18" />
          <path d="M226 218 L240 236" />
        </Mark>
        {/* The gum line along the inside of the arch. */}
        <Mark on={on("gum")} hideWhenOff>
          <path d="M70 320 Q64 180 150 150 Q236 180 230 320" />
        </Mark>
        <Mark on={on("tongue")} hideWhenOff>
          <path d="M110 200 Q150 170 190 200 Q190 280 150 300 Q110 280 110 200 Z" />
        </Mark>
        {/* The jaw joints, just in front of each ear. */}
        <Mark on={on("joint")} hideWhenOff>
          <circle cx="40" cy="314" r="13" /><circle cx="260" cy="314" r="13" />
        </Mark>
      </svg>
    );
  }

  // ---- Eye - cross-section, front of the eye to the left ---------------------
  if (id === "eye") {
    return (
      <svg {...common} aria-label="The eye, in cross-section">
        <g {...base}>
          {/* The globe. */}
          <circle cx="160" cy="190" r="88" />
          {/* Iris. */}
          <path d="M84 150 L100 166" /><path d="M84 230 L100 214" />
          {/* Optic nerve leaving the back. */}
          <path d="M246 206 Q270 216 292 230" /><path d="M240 222 Q264 232 286 246" />
          {/* Eyelids. */}
          <path d="M96 90 Q60 120 50 158" {...thin} />
          <path d="M96 290 Q60 260 50 222" {...thin} />
          {/* Eyelashes. */}
          <path d="M50 158 L38 150" {...thin} /><path d="M50 222 L38 230" {...thin} />
        </g>
        {/* The conjunctiva: the thin skin over the white of the eye. */}
        <Mark on={on("conjunctiva")} hideWhenOff>
          <path d="M96 112 Q72 140 74 160" /><path d="M96 268 Q72 240 74 220" />
        </Mark>
        <Mark on={on("lid")} hideWhenOff>
          <path d="M96 90 Q60 120 50 158" />
          <circle cx="60" cy="140" r="9" />
        </Mark>
        {/* The cornea: the clear window at the front. */}
        <Mark on={on("cornea")}>
          <path d="M84 150 Q56 190 84 230" />
        </Mark>
        {/* The lens, just behind the iris. */}
        <Mark on={on("lens")}>
          <ellipse cx="104" cy="190" rx="12" ry="30" />
        </Mark>
        {/* The retina lining the back of the eye. */}
        <Mark on={on("retina")}>
          <path d="M136 120 Q236 130 236 190 Q236 250 136 260" />
        </Mark>
      </svg>
    );
  }

  // ---- Ear - cross-section: outer, middle and inner ear -----------------------
  if (id === "ear") {
    return (
      <svg {...common} aria-label="The ear, in cross-section">
        <g {...base}>
          {/* The outer ear. */}
          <path d="M96 70 Q28 90 34 170 Q40 250 96 262 Q120 250 110 214" />
          <path d="M80 110 Q60 130 66 170 Q70 200 90 210" {...thin} />
          {/* The bone of the skull around the middle and inner ear. */}
          <path d="M160 60 Q260 40 292 120 L292 300 Q240 320 176 300" {...thin} />
          {/* Eustachian tube down to the back of the throat. */}
          <path d="M198 224 Q214 260 226 300" {...thin} />
        </g>
        {/* The ear canal. */}
        <Mark on={on("canal")}>
          <path d="M96 168 Q130 164 166 170" /><path d="M96 206 Q130 210 166 204" />
        </Mark>
        {/* Wax blocking the canal. */}
        <Mark on={on("wax")} hideWhenOff>
          <ellipse cx="136" cy="187" rx="16" ry="14" />
        </Mark>
        {/* The eardrum. */}
        <Mark on={on("eardrum")}>
          <path d="M168 162 Q178 188 170 212" />
        </Mark>
        {/* The middle ear: the small air-filled space with the three tiny bones. */}
        <Mark on={on("middle-ear")}>
          <path d="M172 160 Q212 150 218 186 Q216 222 176 216" />
          <path d="M178 176 L190 170 L200 184 L212 178" />
        </Mark>
        {/* The inner ear: cochlea for hearing, canals for balance. */}
        <Mark on={on("inner-ear")}>
          <path d="M226 206 Q252 196 254 220 Q252 240 232 236 Q218 230 224 216 Q230 208 238 214" />
          <path d="M234 156 Q248 130 268 150" /><path d="M244 168 Q270 154 280 176" />
        </Mark>
      </svg>
    );
  }

  // ---- Neck - lateral view: cervical spine behind, throat in front ----------
  if (id === "neck") {
    return (
      <svg {...common} aria-label="The neck, side view">
        <g {...base}>
          {/* Base of the skull and the jaw. */}
          <path d="M60 30 Q160 4 260 40" />
          <path d="M60 30 Q50 60 70 84" {...thin} />
          {/* Seven cervical vertebrae, with the neck's gentle forward curve. */}
          {[0, 1, 2, 3, 4, 5, 6].map((i) => {
            const y = 62 + i * 38;
            const x = 150 + Math.sin(i * 0.55) * 8;
            return (
              <g key={i}>
                <path d={`M${x} ${y} Q${x + 20} ${y - 4} ${x + 40} ${y} L${x + 40} ${y + 24} Q${x + 20} ${y + 28} ${x} ${y + 24} Z`} />
                <path d={`M${x + 40} ${y + 8} L${x + 62} ${y + 4} L${x + 82} ${y + 16} L${x + 60} ${y + 22} L${x + 40} ${y + 20}`} {...thin} />
              </g>
            );
          })}
          {/* The windpipe. */}
          <path d="M90 200 L96 340" {...thin} /><path d="M114 200 L118 340" {...thin} />
          {[224, 248, 272, 296, 320].map((y) => <path key={y} d={`M92 ${y} L116 ${y}`} {...thin} />)}
        </g>
        {/* The long muscle from behind the ear to the collarbone. */}
        <Mark on={on("muscle")} hideWhenOff>
          <path d="M228 60 Q150 200 76 340" /><path d="M252 76 Q170 210 100 344" />
        </Mark>
        {/* A disc between two vertebrae, bulging onto the nerve. */}
        <Mark on={on("disc")} hideWhenOff>
          <path d="M162 200 Q182 194 202 200 L202 212 Q182 218 162 212 Z" />
          <path d="M202 206 Q222 210 236 226" />
        </Mark>
        <Mark on={on("vertebra")} hideWhenOff>
          <path d="M158 176 Q178 172 198 176 L198 200 Q178 204 158 200 Z" />
        </Mark>
        {/* Lymph glands along the side of the neck. */}
        <Mark on={on("gland")} hideWhenOff>
          <circle cx="150" cy="150" r="9" /><circle cx="140" cy="184" r="10" /><circle cx="128" cy="222" r="9" />
        </Mark>
        {/* The thyroid, wrapped around the front of the windpipe. */}
        <Mark on={on("thyroid")} hideWhenOff>
          <path d="M84 262 Q70 250 74 232 Q80 218 92 226 L116 226 Q128 218 134 232 Q138 250 124 262 Q104 270 84 262 Z" />
        </Mark>
      </svg>
    );
  }

  // ---- Elbow - anterior view: humerus above, radius and ulna below ----------
  if (id === "elbow") {
    return (
      <svg {...common} aria-label="Bones of the elbow">
        <g {...base}>
          {/* Humerus widening to its two epicondyles. */}
          <path d="M128 12 Q124 100 112 156 Q92 166 88 184 Q100 202 124 200 L176 200 Q204 202 214 184 Q210 166 190 156 Q178 100 174 12" />
          {/* Capitulum and trochlea. */}
          <path d="M116 200 Q132 214 148 200" {...thin} /><path d="M154 200 Q170 216 186 200" {...thin} />
          {/* Radius: head, neck, shaft. */}
          <ellipse cx="124" cy="222" rx="17" ry="8" />
          <path d="M112 226 Q110 250 108 350" /><path d="M136 226 Q134 250 130 350" />
          {/* Ulna with the trochlear notch and shaft. */}
          <path d="M156 214 Q172 206 190 214 L196 350 L164 350 Q160 260 156 214 Z" />
        </g>
        <Mark on={on("lateral-epicondyle")} hideWhenOff>
          <circle cx="92" cy="180" r="12" />
          <path d="M96 190 Q104 230 108 270" />
        </Mark>
        <Mark on={on("medial-epicondyle")} hideWhenOff>
          <circle cx="210" cy="180" r="12" />
          <path d="M206 190 Q198 230 194 270" />
        </Mark>
        {/* The olecranon: the point of the elbow, with its bursa. */}
        <Mark on={on("olecranon")} hideWhenOff>
          <path d="M190 214 Q204 196 200 178" />
          <ellipse cx="208" cy="204" rx="12" ry="16" />
        </Mark>
        <Mark on={on("radial-head")}>
          <ellipse cx="124" cy="222" rx="17" ry="8" />
          <path d="M112 226 Q110 240 112 248" /><path d="M136 226 Q134 240 132 248" />
        </Mark>
        {/* The ulnar nerve passing behind the inner elbow - the funny bone. */}
        <Mark on={on("nerve")} hideWhenOff>
          <path d="M222 60 Q230 140 222 196 Q212 240 202 300" />
        </Mark>
      </svg>
    );
  }

  // ---- Urinary system - anterior view ---------------------------------------
  if (id === "kidney") {
    return (
      <svg {...common} aria-label="The kidneys, bladder and the tubes between them">
        <g {...base}>
          {/* The great vessels between the kidneys. */}
          <path d="M142 30 L142 230" {...thin} /><path d="M158 30 L158 230" {...thin} />
          {/* Left-hand kidney on the viewer's right (patient's left). */}
          <path d="M236 60 Q262 76 258 126 Q250 166 216 164 Q194 152 200 120 Q198 84 236 60 Z" />
          <path d="M204 110 Q214 118 204 130" {...thin} />
          <path d="M200 120 Q186 200 160 256" />
          {/* Urethra. */}
          <path d="M150 314 L150 350" />
        </g>
        {/* The right-hand kidney (patient's right). */}
        <Mark on={on("kidney")}>
          <path d="M64 60 Q38 76 42 126 Q50 166 84 164 Q106 152 100 120 Q102 84 64 60 Z" />
          <path d="M96 110 Q86 118 96 130" />
        </Mark>
        {/* The ureter, with a stone on its way down. */}
        <Mark on={on("ureter")}>
          <path d="M100 120 Q114 200 140 256" />
          {on("ureter") && <circle cx="118" cy="190" r="7" />}
        </Mark>
        <Mark on={on("bladder")}>
          <ellipse cx="150" cy="278" rx="46" ry="34" />
        </Mark>
        {/* The prostate, just below the bladder. */}
        <Mark on={on("prostate")} hideWhenOff>
          <circle cx="150" cy="322" r="15" />
        </Mark>
      </svg>
    );
  }

  // ---- Skin - cross-section ----------------------------------------------------
  if (id === "skin") {
    return (
      <svg {...common} aria-label="The skin, in cross-section">
        <g {...base}>
          {/* Surface. */}
          <path d="M16 90 Q50 80 84 90 T152 90 T220 90 T288 90" />
          {/* Base of the epidermis. */}
          <path d="M16 122 Q50 112 84 122 T152 122 T220 122 T288 122" {...thin} />
          {/* Base of the dermis. */}
          <path d="M16 236 L288 236" {...thin} />
          {/* Fat below. */}
          {[[40, 270], [86, 290], [134, 268], [182, 292], [230, 268], [272, 290], [64, 322], [112, 326], [160, 322], [208, 326], [256, 322]].map(([x, y]) => (
            <ellipse key={`${x}-${y}`} cx={x} cy={y} rx="22" ry="16" {...thin} />
          ))}
          {/* Sweat gland and its duct. */}
          <path d="M226 118 Q236 150 224 180" {...thin} />
          <path d="M224 180 Q206 190 216 204 Q230 214 232 198 Q228 186 214 194" {...thin} />
          {/* Small blood vessels in the dermis. */}
          <path d="M150 236 Q152 200 160 176 Q166 160 158 150" {...thin} />
          <path d="M170 236 Q172 206 178 186" {...thin} />
        </g>
        {/* The epidermis: the outer layer. */}
        <Mark on={on("surface")}>
          <path d="M16 90 Q50 80 84 90 T152 90 T220 90 T288 90 L288 122 Q254 112 220 122 T152 122 T84 122 T16 122 Z" />
        </Mark>
        {/* The dermis and the fat below it. */}
        <Mark on={on("deep")} hideWhenOff>
          <path d="M16 122 Q50 112 84 122 T152 122 T220 122 T288 122 L288 300 L16 300 Z" />
        </Mark>
        {/* A hair follicle with its oil gland. */}
        <Mark on={on("follicle")}>
          <path d="M100 30 L96 90" />
          <path d="M86 90 Q84 150 92 200 Q100 210 108 200 Q112 150 104 90" />
          <ellipse cx="116" cy="150" rx="10" ry="8" />
        </Mark>
        {/* A cut through the skin, closed with stitches. */}
        <Mark on={on("wound")} hideWhenOff>
          <path d="M176 84 L186 190 L196 84" />
          <path d="M170 106 L202 106" /><path d="M172 130 L200 130" /><path d="M176 154 L196 154" />
        </Mark>
      </svg>
    );
  }

  // ---- Whole body - for systemic conditions ---------------------------------
  return (
    <svg {...common} aria-label="The body">
      <g {...base}>
        <circle cx="150" cy="44" r="26" />
        <path d="M150 70 L150 96" />
        <path d="M100 100 Q150 90 200 100 L206 200 L190 200 L186 300 Q172 350 150 350 Q128 350 114 300 L110 200 L94 200 Z" />
        <path d="M100 100 Q70 140 66 200" /><path d="M200 100 Q230 140 234 200" />
      </g>
      <Mark on={on("core")}>
        <path d="M118 130 Q150 122 182 130 L184 200 L116 200 Z" />
      </Mark>
      <Mark on={on("pelvis")} hideWhenOff>
        <path d="M118 206 Q150 214 182 206 L186 246 Q150 256 114 246 Z" />
      </Mark>
      {/* The blood: vessels running through the whole body. */}
      <Mark on={on("blood")} hideWhenOff>
        <path d="M150 104 L150 300" />
        <path d="M150 136 Q120 160 96 196" /><path d="M150 136 Q180 160 204 196" />
        <path d="M150 220 Q132 260 124 300" /><path d="M150 220 Q168 260 176 300" />
      </Mark>
      {/* The long bones. */}
      <Mark on={on("bones")} hideWhenOff>
        <path d="M104 106 Q80 150 70 196" /><path d="M196 106 Q220 150 230 196" />
        <path d="M122 204 L118 300" /><path d="M178 204 L182 300" />
      </Mark>
      {/* The joints - shoulders, elbows, hips, knees, hands. */}
      <Mark on={on("joints")} hideWhenOff>
        {[[100, 100], [200, 100], [80, 150], [220, 150], [66, 200], [234, 200], [116, 204], [184, 204], [114, 300], [186, 300]].map(([x, y]) => (
          <circle key={`${x}-${y}`} cx={x} cy={y} r="8" />
        ))}
      </Mark>
    </svg>
  );
}
