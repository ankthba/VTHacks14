import type { DiagramId } from "@/lib/anatomy/conditions";

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
}: {
  id: DiagramId;
  marks?: string[];
  className?: string;
}) {
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
    style: { color: "var(--foreground)", width: "100%", height: "auto" },
  };

  // ---- Forearm, wrist and hand - anterior (palm-up) view -------------------
  if (id === "wrist") {
    return (
      <svg {...common} aria-label="Bones of the forearm, wrist and hand">
        <g {...base}>
          {/* Ulna: medial, narrows toward the wrist, ends in the ulnar head. */}
          <path d="M104 14 Q98 60 100 120 Q101 170 108 196 Q112 206 122 208 L122 194 Q116 170 116 120 Q116 60 118 14 Z" />
          {/* Ulnar styloid. */}
          <path d="M112 207 L110 216" />
          {/* Carpals - proximal row. */}
          <ellipse cx="146" cy="222" rx="13" ry="10" /> {/* lunate */}
          <ellipse cx="122" cy="228" rx="11" ry="9" />  {/* triquetrum */}
          <circle cx="118" cy="240" r="5" />             {/* pisiform */}
          {/* Carpals - distal row. */}
          <ellipse cx="130" cy="250" rx="12" ry="9" />  {/* hamate */}
          <ellipse cx="156" cy="248" rx="12" ry="9" />  {/* capitate */}
          <ellipse cx="180" cy="244" rx="10" ry="8" />  {/* trapezoid */}
          <ellipse cx="200" cy="236" rx="11" ry="9" />  {/* trapezium */}
          {/* Metacarpals. */}
          <path d="M126 262 L118 306" /><path d="M150 260 L146 312" />
          <path d="M172 256 L172 310" /><path d="M192 250 L198 300" />
          <path d="M210 242 Q228 258 236 274" />
          {/* Phalanges, drawn as tapered segments. */}
          <path d="M116 312 L110 346" /><path d="M145 318 L142 352" />
          <path d="M172 316 L172 352" /><path d="M199 306 L204 340" />
          <path d="M238 278 Q250 288 254 300" />
        </g>
        {/* Radius: lateral, broad at the wrist, with the radial styloid. The
            distal-radius fracture is the classic fall-on-outstretched-hand injury. */}
        <Mark on={on("radius-break")}>
          <path d="M148 14 Q152 60 152 120 Q152 160 154 176" />
          <path d="M184 14 Q182 60 182 120 Q182 160 186 176" />
          {/* Fracture line through the distal metaphysis. */}
          <path d="M150 180 L192 190" />
          <path d="M154 186 Q160 200 190 206 Q204 210 208 224 L196 226 Q186 212 160 208 Q150 204 150 194 Z" />
        </Mark>
        {/* Scaphoid: the boat-shaped bone on the thumb side of the proximal row. */}
        <Mark on={on("scaphoid")} hideWhenOff>
          <path d="M168 220 Q180 214 190 226 Q186 238 172 236 Q162 232 168 220 Z" />
        </Mark>
      </svg>
    );
  }

  // ---- Knee - anterior view --------------------------------------------------
  if (id === "knee") {
    return (
      <svg {...common} aria-label="Bones and ligaments of the knee">
        <g {...base}>
          {/* Femur shaft widening into the medial and lateral condyles. */}
          <path d="M126 12 Q122 80 118 130 Q100 140 96 166 Q100 186 122 190 L178 190 Q200 186 204 166 Q200 140 182 130 Q178 80 174 12" />
          {/* Intercondylar notch. */}
          <path d="M136 190 Q150 170 164 190" />
          {/* Patella, sitting on the front of the joint. */}
          <path d="M132 136 Q150 122 168 136 Q172 160 150 176 Q128 160 132 136 Z" />
          {/* Tibial plateau and shaft. */}
          <path d="M96 216 Q100 204 122 206 L178 206 Q200 204 204 216 Q206 232 196 240 L192 350 L108 350 L104 240 Q94 232 96 216 Z" />
          {/* Tibial tuberosity. */}
          <path d="M138 250 Q150 262 162 250" {...thin} />
          {/* Fibula: lateral, thin, head just below the plateau. */}
          <path d="M214 224 Q224 226 226 240 L232 350 L218 350 L212 244 Q206 234 214 224 Z" />
        </g>
        {/* Menisci: the C-shaped cartilage between condyles and plateau. */}
        <Mark on={on("meniscus")}>
          <path d="M100 200 Q120 194 138 200" />
          <path d="M162 200 Q180 194 200 200" />
        </Mark>
        {/* ACL: from the lateral femoral condyle down and forward to the tibia. */}
        <Mark on={on("acl")}>
          <path d="M170 176 Q158 190 144 208" />
        </Mark>
      </svg>
    );
  }

  // ---- Shoulder - anterior view ---------------------------------------------
  if (id === "shoulder") {
    return (
      <svg {...common} aria-label="Bones and tendons of the shoulder">
        <g {...base}>
          {/* Clavicle. */}
          <path d="M40 92 Q100 78 158 90 Q172 94 176 104" />
          {/* Scapula: glenoid, acromion and blade. */}
          <path d="M60 116 Q80 112 96 122 L90 180 Q80 230 60 260 Q40 220 44 170 Q46 136 60 116 Z" />
          <path d="M150 88 Q176 82 190 96" /> {/* acromion */}
          {/* Humerus: head, anatomical neck, shaft. */}
          <circle cx="150" cy="150" r="34" />
          <path d="M170 178 Q182 200 184 240 L188 350 L156 350 L152 240 Q150 200 130 178" />
          {/* Greater tubercle. */}
          <path d="M182 126 Q192 136 188 148" {...thin} />
        </g>
        {/* Rotator cuff: supraspinatus passing over the joint to the tubercle. */}
        <Mark on={on("cuff")}>
          <path d="M96 118 Q130 96 172 122 Q184 132 186 144" />
        </Mark>
      </svg>
    );
  }

  // ---- Lumbar spine - lateral view -----------------------------------------
  if (id === "spine") {
    return (
      <svg {...common} aria-label="Lumbar spine, side view">
        <g {...base}>
          {/* Vertebral bodies with spinous processes behind. Lumbar lordosis
              gives the gentle forward curve. */}
          {[0, 1, 2, 3].map((i) => {
            const y = 30 + i * 66;
            const x = 96 + Math.sin(i * 0.9) * 8;
            return (
              <g key={i}>
                <path d={`M${x} ${y} Q${x + 34} ${y - 6} ${x + 68} ${y} L${x + 66} ${y + 40} Q${x + 34} ${y + 46} ${x + 2} ${y + 40} Z`} />
                {/* Pedicle, lamina and spinous process. */}
                <path d={`M${x + 68} ${y + 12} L${x + 98} ${y + 8} L${x + 124} ${y + 24} L${x + 100} ${y + 34} L${x + 66} ${y + 32}`} />
              </g>
            );
          })}
          {/* Spinal canal. */}
          <path d="M176 22 Q184 140 180 300" {...thin} />
          {/* Sacrum. */}
          <path d="M100 296 Q140 300 172 296 Q186 330 150 352 Q110 330 100 296 Z" />
        </g>
        {/* The L4-L5 disc bulging backward into the canal and onto the nerve root. */}
        <Mark on={on("disc")}>
          <path d="M100 232 Q134 224 170 232 Q184 244 172 258 L100 258 Q92 246 100 232 Z" />
          <path d="M172 246 Q192 250 204 268" />
        </Mark>
      </svg>
    );
  }

  // ---- Heart - anterior view -------------------------------------------------
  if (id === "heart") {
    return (
      <svg {...common} aria-label="The heart and its great vessels">
        <g {...base}>
          {/* Aortic arch and descending aorta. */}
          <path d="M146 96 Q146 40 186 40 Q222 40 222 80 L222 100" />
          <path d="M162 96 Q162 58 186 58 Q206 58 206 82 L206 100" />
          {/* Superior vena cava. */}
          <path d="M104 104 L104 40" /><path d="M124 104 L124 40" />
          {/* Pulmonary trunk. */}
          <path d="M134 110 Q126 84 150 76 Q176 70 178 96" />
          {/* Ventricles and atria as one outline; apex points down and left. */}
          <path d="M96 118 Q78 150 84 200 Q94 262 150 300 Q222 262 232 190 Q238 150 220 116 Q200 100 172 106 Q154 100 134 110 Q112 100 96 118 Z" />
          {/* Interventricular groove. */}
          <path d="M160 150 Q150 220 150 290" {...thin} />
          {/* Atrioventricular groove. */}
          <path d="M92 150 Q150 138 226 150" {...thin} />
        </g>
        {/* The atria - upper chambers, where fibrillation originates. */}
        <Mark on={on("atria")}>
          <path d="M98 122 Q120 104 150 118 Q176 104 216 120 Q222 138 214 150 Q150 138 96 148 Q90 134 98 122 Z" />
        </Mark>
        {/* Left anterior descending coronary artery on the front surface. */}
        <Mark on={on("coronary")}>
          <path d="M162 150 Q150 200 146 260" />
          <path d="M162 150 Q140 160 118 180" />
        </Mark>
      </svg>
    );
  }

  // ---- Lungs - anterior view ------------------------------------------------
  if (id === "lung") {
    return (
      <svg {...common} aria-label="The lungs and airways">
        <g {...base}>
          {/* Trachea with cartilage rings. */}
          <path d="M140 12 L140 92" /><path d="M160 12 L160 92" />
          {[24, 40, 56, 72].map((y) => (
            <path key={y} d={`M140 ${y} L160 ${y}`} {...thin} />
          ))}
          {/* Main bronchi. */}
          <path d="M140 92 Q124 110 108 128" /><path d="M160 92 Q176 110 192 128" />
          {/* Lobar bronchi. */}
          <path d="M112 124 Q96 140 88 160" {...thin} /><path d="M112 124 Q112 150 104 176" {...thin} />
          <path d="M188 124 Q204 140 212 160" {...thin} /><path d="M188 124 Q190 150 200 176" {...thin} />
          {/* Right lung: three lobes. */}
          <path d="M126 104 Q70 112 54 170 Q44 240 62 300 Q80 334 122 326 L128 200 Z" />
          <path d="M60 196 Q90 186 126 176" {...thin} /> {/* horizontal fissure */}
          <path d="M72 262 Q100 236 128 224" {...thin} /> {/* oblique fissure */}
          {/* Left lung: two lobes with the cardiac notch. */}
          <path d="M174 104 Q230 112 246 170 Q256 240 238 300 Q220 334 178 326 L172 260 Q188 240 172 200 Z" />
          <path d="M226 258 Q200 234 174 226" {...thin} />
          {/* Diaphragm. */}
          <path d="M50 314 Q150 352 250 314" {...thin} />
        </g>
        {/* Right lower lobe consolidated by infection. */}
        <Mark on={on("lobe")}>
          <path d="M72 262 Q100 236 128 224 L122 326 Q80 334 62 300 Q66 280 72 262 Z" />
        </Mark>
        {/* Narrowed bronchi. */}
        <Mark on={on("airway")}>
          <path d="M112 124 Q96 140 88 160" /><path d="M188 124 Q204 140 212 160" />
          <path d="M112 124 Q112 150 104 176" /><path d="M188 124 Q190 150 200 176" />
        </Mark>
      </svg>
    );
  }

  // ---- Head - lateral view --------------------------------------------------
  if (id === "head") {
    return (
      <svg {...common} aria-label="The skull and brain, side view">
        <g {...base}>
          {/* Skull. */}
          <path d="M70 180 Q56 100 130 50 Q210 24 254 96 Q272 150 240 200 Q232 230 214 244 L214 280 Q190 300 150 296 L96 296 Q70 260 70 180 Z" />
          {/* Orbit, nose and jaw. */}
          <path d="M92 190 Q108 176 122 192" {...thin} />
          <path d="M88 236 Q80 260 96 274" {...thin} />
          <path d="M100 296 Q140 320 184 306" {...thin} />
          {/* Cerebellum and brainstem. */}
          <path d="M198 214 Q228 208 232 236 Q220 256 196 244 Z" {...thin} />
          <path d="M186 246 L186 286" {...thin} />
        </g>
        {/* The cerebrum, with major sulci suggested. */}
        <Mark on={on("brain")}>
          <path d="M96 176 Q84 110 148 72 Q212 52 236 112 Q246 160 224 196 Q190 232 140 222 Q104 212 96 176 Z" />
          <path d="M140 76 Q150 130 132 186" />
          <path d="M96 176 Q140 160 184 190" />
        </Mark>
        {/* Middle cerebral artery territory - the common stroke vessel. */}
        <Mark on={on("vessel")}>
          <path d="M150 210 Q168 178 200 156" />
          <path d="M168 178 Q182 174 194 182" />
          <path d="M184 166 Q198 154 214 156" />
        </Mark>
      </svg>
    );
  }

  // ---- Abdomen - anterior view ----------------------------------------------
  if (id === "abdomen") {
    return (
      <svg {...common} aria-label="Organs of the abdomen">
        <g {...base}>
          {/* Lower ribs framing the upper abdomen. */}
          <path d="M60 40 Q100 66 150 60 Q200 66 240 40" {...thin} />
          <path d="M70 66 Q110 88 150 82 Q190 88 230 66" {...thin} />
          {/* Liver, upper right (patient's right = viewer's left). */}
          <path d="M62 74 Q120 62 172 82 Q186 100 160 118 Q100 128 64 108 Q54 92 62 74 Z" />
          {/* Stomach, upper left. */}
          <path d="M176 78 Q212 66 234 92 Q244 124 214 138 Q188 140 178 122 Q170 100 176 78 Z" />
          {/* Large bowel framing the small bowel. */}
          <path d="M86 132 L86 250 Q90 274 114 276 L200 276 Q222 274 224 250 L224 140" />
          {/* Small bowel coils. */}
          <path d="M112 160 Q150 150 190 162 Q150 180 112 196 Q150 206 190 216 Q150 236 112 250" {...thin} />
        </g>
        {/* Gallbladder tucked under the liver. */}
        <Mark on={on("gallbladder")}>
          <path d="M128 112 Q144 108 152 122 Q146 136 130 132 Q120 124 128 112 Z" />
        </Mark>
        {/* Appendix hanging off the caecum, lower right. */}
        <Mark on={on("appendix")}>
          <path d="M96 258 Q88 280 98 300" />
        </Mark>
        <Mark on={on("bowel")} hideWhenOff>
          <path d="M200 276 Q222 274 224 250 L224 200" />
        </Mark>
        <Mark on={on("stomach")} hideWhenOff>
          <path d="M176 78 Q212 66 234 92 Q244 124 214 138 Q188 140 178 122 Q170 100 176 78 Z" />
        </Mark>
      </svg>
    );
  }

  // ---- Ankle - lateral view -------------------------------------------------
  if (id === "ankle") {
    return (
      <svg {...common} aria-label="Bones and ligaments of the ankle">
        <g {...base}>
          {/* Tibia and fibula coming down to the ankle. */}
          <path d="M120 12 L118 170 Q116 190 132 196 L160 196 Q176 190 174 170 L172 12" />
          <path d="M192 12 L194 176 Q196 200 186 208" />
          {/* Talus sitting in the mortise. */}
          <path d="M118 200 Q150 186 184 204 Q194 226 176 236 L124 236 Q108 222 118 200 Z" />
          {/* Calcaneus and the foot. */}
          <path d="M104 238 Q88 262 100 290 Q124 300 172 292 L240 274 Q262 268 258 254 L184 240 Z" />
          <path d="M210 262 Q236 258 258 254" {...thin} />
        </g>
        {/* Lateral malleolus - the tip of the fibula, the common fracture site. */}
        <Mark on={on("malleolus")}>
          <path d="M184 176 Q200 190 190 212 Q180 220 174 208 Z" />
        </Mark>
        {/* Anterior talofibular ligament - the one sprained. */}
        <Mark on={on("ligament")}>
          <path d="M186 208 Q176 218 164 224" />
          <path d="M188 214 Q184 234 174 244" />
        </Mark>
        {/* Achilles tendon into the heel. */}
        <Mark on={on("achilles")}>
          <path d="M100 100 Q92 180 100 246" />
        </Mark>
      </svg>
    );
  }

  // ---- Hip - anterior view --------------------------------------------------
  if (id === "hip") {
    return (
      <svg {...common} aria-label="The hip joint">
        <g {...base}>
          {/* Pelvis: iliac crest, acetabulum, pubis. */}
          <path d="M40 60 Q80 30 140 44 Q180 52 200 92 Q214 128 196 150 Q180 160 168 150 Q156 130 130 126 Q90 122 60 100 Q36 84 40 60 Z" />
          {/* Femur: head in the socket, neck, greater trochanter, shaft. */}
          <circle cx="182" cy="140" r="26" />
          <path d="M200 156 Q212 170 226 176" />
          <path d="M232 154 Q252 160 250 190 L246 350 L214 350 L212 200 Q208 184 200 176" />
          <path d="M226 176 Q220 190 212 200" />
        </g>
        {/* Femoral neck - where the classic hip fracture occurs. */}
        <Mark on={on("neck")}>
          <path d="M200 156 Q214 170 232 154" />
          <path d="M206 170 L228 160" />
        </Mark>
        <Mark on={on("joint")} hideWhenOff>
          <circle cx="182" cy="140" r="30" />
        </Mark>
      </svg>
    );
  }

  // ---- Lower jaw - viewed from above, teeth in an arch ----------------------
  if (id === "mouth") {
    return (
      <svg {...common} aria-label="The lower jaw and teeth, seen from above">
        <g {...base}>
          {/* The jaw bone as a horseshoe. */}
          <path d="M40 320 Q30 150 150 110 Q270 150 260 320" />
          <path d="M70 320 Q64 180 150 150 Q236 180 230 320" />
          {/* Teeth along the arch: incisors at the front, molars at the back. */}
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
          {/* Tongue, faintly. */}
          <path d="M110 200 Q150 170 190 200 Q190 280 150 300 Q110 280 110 200 Z" {...thin} />
        </g>
        {/* The empty sockets at the very back, where the wisdom teeth sat. */}
        <Mark on={on("socket")}>
          <ellipse cx="56" cy="292" rx="17" ry="20" />
          <ellipse cx="244" cy="292" rx="17" ry="20" />
        </Mark>
        {/* An infected root under one molar. */}
        <Mark on={on("root")} hideWhenOff>
          <path d="M226 218 L230 246 L222 246 Z" />
          <circle cx="226" cy="252" r="12" />
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
    </svg>
  );
}
