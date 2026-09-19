/**
 * Simple, deliberately non-photographic diagrams for the exam room.
 *
 * Line drawings, not anatomical renders, and that is a design decision rather
 * than a shortcut. The audience is a patient who has just been given news and
 * may be frightened, in pain, or reading in a second language. Detail competes
 * with comprehension: a clear picture beats an accurate one when the goal is
 * "understand what happened to me".
 *
 * Each diagram exposes `mark` regions the clinician can highlight, so one
 * drawing serves several conditions without a separate asset each time.
 *
 * `synonyms` exist so a parsed clinical note can be matched against this list -
 * a discharge summary says "Colles fracture" or "NSTEMI", not our plain label.
 */

export interface Condition {
  id: string;
  /** What a clinician would search for. */
  label: string;
  region: string;
  /** One plain sentence a patient can repeat back. This is the whole point. */
  plain: string;
  diagram: DiagramId;
  marks: string[];
  /** Terms that may appear in a real note for this condition. */
  synonyms: string[];
  /** ICD-10-CM prefixes. EHR exports lead with the code, not the words. */
  icd10: string[];
}

export type DiagramId =
  | "wrist"
  | "knee"
  | "shoulder"
  | "spine"
  | "heart"
  | "lung"
  | "head"
  | "abdomen"
  | "ankle"
  | "hip"
  | "mouth"
  | "body";

const C = (
  id: string,
  label: string,
  region: string,
  plain: string,
  diagram: DiagramId,
  marks: string[],
  synonyms: string[],
): Condition => ({ id, label, region, plain, diagram, marks, synonyms, icd10: [] });

export const CONDITIONS: Condition[] = [
  // ---- Wrist / hand --------------------------------------------------------
  C("distal-radius-fracture", "Distal radius fracture (broken wrist)", "Wrist",
    "You broke one of the two bones in your forearm, close to your wrist.",
    "wrist", ["radius-break"],
    ["distal radius", "colles", "colles' fracture", "broken wrist", "wrist fracture", "radial fracture"]),
  C("scaphoid-fracture", "Scaphoid fracture", "Wrist",
    "You broke a small bone on the thumb side of your wrist. This one heals slowly because it has a poor blood supply.",
    "wrist", ["scaphoid"], ["scaphoid", "navicular fracture"]),
  C("carpal-tunnel", "Carpal tunnel syndrome", "Wrist",
    "A nerve is being squeezed as it passes through a narrow tunnel in your wrist. That is why your fingers tingle.",
    "wrist", ["scaphoid"], ["carpal tunnel", "median nerve compression"]),

  // ---- Knee ----------------------------------------------------------------
  C("meniscus-tear", "Meniscus tear", "Knee",
    "You tore the cushion of cartilage that sits between the two bones of your knee.",
    "knee", ["meniscus"], ["meniscus", "meniscal tear", "torn cartilage"]),
  C("acl-tear", "ACL tear", "Knee",
    "You tore one of the ligaments that holds your knee steady from the inside.",
    "knee", ["acl"], ["acl", "anterior cruciate", "cruciate ligament"]),
  C("knee-osteoarthritis", "Knee osteoarthritis", "Knee",
    "The smooth surface inside your knee has worn down, so the bones rub instead of gliding.",
    "knee", ["meniscus"], ["osteoarthritis", "oa knee", "degenerative joint disease", "knee arthritis"]),

  // ---- Shoulder ------------------------------------------------------------
  C("rotator-cuff-tear", "Rotator cuff tear", "Shoulder",
    "You tore one of the tendons that lifts and turns your shoulder.",
    "shoulder", ["cuff"], ["rotator cuff", "supraspinatus tear", "cuff tear"]),
  C("shoulder-dislocation", "Shoulder dislocation", "Shoulder",
    "The ball of your arm bone came out of its socket. We have put it back.",
    "shoulder", ["cuff"], ["dislocation", "dislocated shoulder", "glenohumeral dislocation"]),
  C("frozen-shoulder", "Adhesive capsulitis (frozen shoulder)", "Shoulder",
    "The lining around your shoulder joint has tightened, so the joint cannot move through its full range.",
    "shoulder", ["cuff"], ["adhesive capsulitis", "frozen shoulder"]),

  // ---- Back ----------------------------------------------------------------
  C("lumbar-disc-herniation", "Lumbar disc herniation", "Lower back",
    "One of the cushions between the bones of your lower back is bulging and pressing on a nerve. That is why the pain runs down your leg.",
    "spine", ["disc"], ["disc herniation", "herniated disc", "hnp", "sciatica", "radiculopathy", "slipped disc"]),
  C("spinal-stenosis", "Lumbar spinal stenosis", "Lower back",
    "The channel your spinal nerves run through has narrowed, so they get squeezed when you stand and walk.",
    "spine", ["disc"], ["stenosis", "spinal stenosis", "canal narrowing"]),
  C("compression-fracture", "Vertebral compression fracture", "Lower back",
    "One of the bones in your spine has collapsed a little, like a can pressed from both ends.",
    "spine", ["disc"], ["compression fracture", "vertebral fracture", "wedge fracture"]),

  // ---- Heart ---------------------------------------------------------------
  C("atrial-fibrillation", "Atrial fibrillation", "Heart",
    "The top chambers of your heart are beating irregularly instead of in a steady rhythm. That lets blood pool, which can form a clot.",
    "heart", ["atria"], ["atrial fibrillation", "afib", "a-fib", "af with rvr"]),
  C("myocardial-infarction", "Myocardial infarction (heart attack)", "Heart",
    "One of the arteries feeding your heart muscle became blocked, so part of the muscle was starved of blood.",
    "heart", ["coronary"], ["myocardial infarction", "mi", "nstemi", "stemi", "heart attack", "acute coronary syndrome", "acs"]),
  C("heart-failure", "Heart failure", "Heart",
    "Your heart is not pumping strongly enough, so fluid backs up into your lungs and legs.",
    "heart", ["atria"], ["heart failure", "chf", "hfref", "hfpef", "congestive heart failure"]),
  C("angina", "Angina", "Heart",
    "Your heart muscle is not getting quite enough blood when it works hard. That is the chest tightness you feel.",
    "heart", ["coronary"], ["angina", "stable angina", "chest pain cardiac"]),

  // ---- Lungs ---------------------------------------------------------------
  C("pneumonia", "Pneumonia", "Lungs",
    "There is an infection in part of your lung. The small air sacs there have filled with fluid, so less air gets through.",
    "lung", ["lobe"], ["pneumonia", "cap", "community acquired pneumonia", "lobar pneumonia"]),
  C("copd", "COPD exacerbation", "Lungs",
    "The airways in your lungs are narrowed and inflamed, which is why breathing out is harder than breathing in.",
    "lung", ["airway"], ["copd", "chronic obstructive", "emphysema", "copd exacerbation"]),
  C("asthma", "Asthma exacerbation", "Lungs",
    "The airways in your lungs tightened and swelled, so air cannot move through them easily.",
    "lung", ["airway"], ["asthma", "asthma exacerbation", "reactive airway"]),
  C("pulmonary-embolism", "Pulmonary embolism", "Lungs",
    "A blood clot travelled to your lung and blocked one of its blood vessels.",
    "lung", ["lobe"], ["pulmonary embolism", "pe", "lung clot"]),

  // ---- Head ----------------------------------------------------------------
  C("concussion", "Concussion", "Head",
    "Your brain was shaken inside your skull. Nothing is broken, but it needs quiet and rest to recover.",
    "head", ["brain"], ["concussion", "mild tbi", "head injury", "mtbi"]),
  C("ischemic-stroke", "Ischemic stroke", "Head",
    "A blood vessel in your brain became blocked, so part of your brain did not get blood.",
    "head", ["vessel"], ["stroke", "cva", "ischemic stroke", "cerebrovascular accident"]),
  C("tia", "Transient ischemic attack (TIA)", "Head",
    "Blood flow to part of your brain was briefly blocked. The symptoms passed, but it is a warning sign.",
    "head", ["vessel"], ["tia", "transient ischemic", "mini stroke"]),
  C("migraine", "Migraine", "Head",
    "This is a migraine. Nerves and blood vessels around your brain become irritated, which causes the pain and the light sensitivity.",
    "head", ["brain"], ["migraine", "migraine headache"]),

  // ---- Abdomen -------------------------------------------------------------
  C("appendicitis", "Appendicitis", "Abdomen",
    "Your appendix, a small pouch attached to your bowel, is inflamed and needs to come out.",
    "abdomen", ["appendix"], ["appendicitis", "appendix"]),
  C("cholecystitis", "Gallstones / cholecystitis", "Abdomen",
    "Stones have formed in your gallbladder and it has become inflamed. That is the pain under your right ribs.",
    "abdomen", ["gallbladder"], ["cholecystitis", "gallstones", "cholelithiasis", "biliary colic"]),
  C("diverticulitis", "Diverticulitis", "Abdomen",
    "Small pouches in your large bowel have become inflamed and infected.",
    "abdomen", ["bowel"], ["diverticulitis", "diverticular disease"]),
  C("gerd", "Acid reflux (GERD)", "Abdomen",
    "Acid from your stomach is washing back up into your food pipe, which is what burns.",
    "abdomen", ["stomach"], ["gerd", "reflux", "acid reflux", "gastroesophageal reflux"]),

  // ---- Ankle / foot --------------------------------------------------------
  C("ankle-sprain", "Ankle sprain", "Ankle",
    "You stretched or tore the ligaments on the outside of your ankle. The bone is not broken.",
    "ankle", ["ligament"], ["ankle sprain", "sprained ankle", "lateral ligament"]),
  C("ankle-fracture", "Ankle fracture", "Ankle",
    "You broke one of the bones that forms your ankle joint.",
    "ankle", ["malleolus"], ["ankle fracture", "malleolar", "broken ankle", "weber"]),
  C("achilles-rupture", "Achilles tendon rupture", "Ankle",
    "The thick cord connecting your calf muscle to your heel has torn.",
    "ankle", ["achilles"], ["achilles", "tendon rupture"]),

  // ---- Hip -----------------------------------------------------------------
  C("hip-fracture", "Hip fracture", "Hip",
    "You broke the top of your thigh bone, near where it meets your hip.",
    "hip", ["neck"], ["hip fracture", "femoral neck", "intertrochanteric", "broken hip"]),
  C("hip-osteoarthritis", "Hip osteoarthritis", "Hip",
    "The smooth surface in your hip joint has worn away, so the bones grind instead of gliding.",
    "hip", ["joint"], ["hip osteoarthritis", "hip oa", "hip arthritis"]),

  // ---- Mouth / teeth -------------------------------------------------------
  C("wisdom-tooth-extraction", "Wisdom tooth extraction", "Mouth",
    "The teeth at the very back of your jaw were taken out. There is now a small hole in the bone where each one sat, and it will fill in over the next few weeks.",
    "mouth", ["socket"],
    ["wisdom tooth", "wisdom teeth", "third molar", "third molars", "impacted third molar", "tooth extraction", "dental extraction", "extraction site", "s/p extraction"]),
  C("dry-socket", "Dry socket", "Mouth",
    "The blood clot that should be protecting the hole where your tooth was has come out too early, so the bone underneath is exposed. That is why it hurts more now than it did.",
    "mouth", ["socket"], ["dry socket", "alveolar osteitis", "alveolitis"]),
  C("dental-abscess", "Tooth abscess", "Mouth",
    "There is a pocket of infection at the root of one of your teeth. Antibiotics calm it down, but the tooth itself will need treating.",
    "mouth", ["root"], ["dental abscess", "tooth abscess", "periapical abscess", "odontogenic infection"]),

  // ---- Whole body / systemic ----------------------------------------------
  C("type-2-diabetes", "Type 2 diabetes", "General",
    "Your body is not using insulin properly, so too much sugar stays in your blood.",
    "body", ["core"], ["type 2 diabetes", "t2dm", "diabetes mellitus", "dm2", "hyperglycemia"]),
  C("hypertension", "High blood pressure", "General",
    "The pressure inside your blood vessels is higher than it should be. It does not usually cause symptoms, which is why it gets missed.",
    "body", ["core"], ["hypertension", "htn", "high blood pressure", "elevated bp"]),
  C("uti", "Urinary tract infection", "General",
    "You have an infection in your urinary system. Antibiotics will clear it.",
    "body", ["core"], ["uti", "urinary tract infection", "cystitis", "pyelonephritis"]),
  C("cellulitis", "Cellulitis", "General",
    "You have a bacterial infection in the skin and the tissue just under it.",
    "body", ["core"], ["cellulitis", "skin infection", "soft tissue infection"]),
];


/**
 * Clinical vocabulary an EHR or a discharge summary actually uses, keyed by
 * condition. Kept separate from the display table above so the human-readable
 * part stays readable. Applied at module load.
 */
const CLINICAL_VOCAB: Record<string, { synonyms: string[]; icd10: string[] }> = {
  "distal-radius-fracture": { synonyms: ["lower end of radius", "lower end of the radius", "fracture of the lower end of", "distal end of radius", "distal radial"], icd10: ["S52.5", "S52.6"] },
  "scaphoid-fracture": { synonyms: [], icd10: ["S62.0"] },
  "carpal-tunnel": { synonyms: [], icd10: ["G56.0"] },
  "meniscus-tear": { synonyms: ["tear of meniscus", "medial meniscus", "lateral meniscus"], icd10: ["S83.2", "M23.2"] },
  "acl-tear": { synonyms: ["sprain of anterior cruciate"], icd10: ["S83.5"] },
  "knee-osteoarthritis": { synonyms: ["osteoarthritis of knee", "primary osteoarthritis of knee"], icd10: ["M17"] },
  "rotator-cuff-tear": { synonyms: ["rotator cuff syndrome", "incomplete rotator cuff tear", "complete rotator cuff tear"], icd10: ["M75.1", "S46.0"] },
  "shoulder-dislocation": { synonyms: ["dislocation of shoulder joint", "anterior dislocation of humerus"], icd10: ["S43.0"] },
  "frozen-shoulder": { synonyms: [], icd10: ["M75.0"] },
  "lumbar-disc-herniation": { synonyms: ["intervertebral disc displacement", "lumbar radiculopathy", "disc displacement"], icd10: ["M51.1", "M51.2", "M54.1"] },
  "spinal-stenosis": { synonyms: [], icd10: ["M48.06", "M48.0"] },
  "compression-fracture": { synonyms: ["wedge compression fracture", "fracture of lumbar vertebra"], icd10: ["S32.0", "M80.08", "M48.5"] },
  "atrial-fibrillation": { synonyms: ["paroxysmal atrial fibrillation", "persistent atrial fibrillation"], icd10: ["I48"] },
  "myocardial-infarction": { synonyms: ["st elevation myocardial infarction", "non-st elevation myocardial infarction", "non st elevation", "type 2 mi", "s/p pci", "s/p des"], icd10: ["I21", "I22", "I25.2"] },
  "heart-failure": { synonyms: ["heart failure with reduced ejection", "heart failure with preserved ejection", "acute on chronic heart failure", "chf exacerbation"], icd10: ["I50"] },
  "angina": { synonyms: ["unstable angina"], icd10: ["I20"] },
  "pneumonia": { synonyms: ["pneumonia, unspecified organism", "bacterial pneumonia", "aspiration pneumonia"], icd10: ["J18", "J15", "J13", "J69.0"] },
  "copd": { synonyms: ["chronic obstructive pulmonary disease", "acute exacerbation of copd", "aecopd"], icd10: ["J44"] },
  "asthma": { synonyms: ["acute asthma", "status asthmaticus"], icd10: ["J45", "J46"] },
  "pulmonary-embolism": { synonyms: ["pulmonary thromboembolism", "segmental pe", "subsegmental pe"], icd10: ["I26"] },
  "concussion": { synonyms: ["concussion without loss of consciousness", "concussion with loss of consciousness"], icd10: ["S06.0"] },
  "ischemic-stroke": { synonyms: ["cerebral infarction", "acute ischemic stroke", "ischaemic stroke"], icd10: ["I63"] },
  "tia": { synonyms: ["transient cerebral ischemic attack"], icd10: ["G45.9", "G45"] },
  "migraine": { synonyms: ["migraine without aura", "migraine with aura"], icd10: ["G43"] },
  "appendicitis": { synonyms: ["acute appendicitis"], icd10: ["K35", "K36", "K37"] },
  "cholecystitis": { synonyms: ["acute cholecystitis", "calculus of gallbladder", "choledocholithiasis"], icd10: ["K80", "K81"] },
  "diverticulitis": { synonyms: ["diverticulitis of large intestine"], icd10: ["K57"] },
  "gerd": { synonyms: ["gastro-esophageal reflux disease", "gastroesophageal reflux disease"], icd10: ["K21"] },
  "ankle-sprain": { synonyms: ["sprain of ankle", "sprain of calcaneofibular", "sprain of talofibular", "lateral ankle sprain"], icd10: ["S93.4", "S93.6"] },
  "ankle-fracture": { synonyms: ["fracture of lateral malleolus", "fracture of medial malleolus", "bimalleolar", "trimalleolar"], icd10: ["S82.5", "S82.6", "S82.8"] },
  "achilles-rupture": { synonyms: ["rupture of achilles", "achilles tendon tear"], icd10: ["S86.0"] },
  "hip-fracture": { synonyms: ["fracture of femoral neck", "fracture of neck of femur", "intertrochanteric fracture", "fracture of head and neck of femur"], icd10: ["S72.0", "S72.1", "S72.2"] },
  "hip-osteoarthritis": { synonyms: ["osteoarthritis of hip", "primary osteoarthritis of hip"], icd10: ["M16"] },
  "type-2-diabetes": { synonyms: ["type 2 diabetes mellitus", "diabetes mellitus type 2", "diabetes type 2", "niddm"], icd10: ["E11"] },
  "hypertension": { synonyms: ["essential hypertension", "essential (primary) hypertension", "hypertensive"], icd10: ["I10", "I11", "I12", "I13"] },
  "uti": { synonyms: ["urinary tract infection, site not specified", "acute cystitis", "acute pyelonephritis"], icd10: ["N39.0", "N30", "N10"] },
  "cellulitis": { synonyms: ["cellulitis of", "cellulitis and abscess"], icd10: ["L03"] },
};

for (const c of CONDITIONS) {
  const v = CLINICAL_VOCAB[c.id];
  if (!v) continue;
  c.synonyms.push(...v.synonyms);
  c.icd10 = v.icd10;
}

export const byId = (id: string) => CONDITIONS.find((c) => c.id === id) ?? null;

export const REGIONS = [...new Set(CONDITIONS.map((c) => c.region))];

export interface ConditionMatch {
  condition: Condition;
  /** The phrase or code in the text that produced the match. */
  matched: string;
}

const esc = (x: string) => x.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/**
 * Match free text against the library.
 *
 * ICD-10 codes are checked first and outrank any phrase: an EHR export leads
 * with "S52.502A" and follows it with wording ("fracture of the lower end of
 * right radius") that no synonym list will ever fully cover, and a code is
 * exact. Among phrases the longest wins, so "transient ischemic attack" is not
 * captured by "stroke" and "hip osteoarthritis" not by "osteoarthritis".
 */
export function matchConditionDetailed(text: string): ConditionMatch | null {
  const raw = text.toUpperCase();
  for (const c of CONDITIONS) {
    for (const code of c.icd10) {
      const m = raw.match(new RegExp(`(?:^|[^A-Z0-9])(${esc(code)}[0-9A-Z.]*)`));
      if (m) return { condition: c, matched: m[1] };
    }
  }

  const t = ` ${text.toLowerCase().replace(/[^a-z0-9\s'/-]/g, " ").replace(/\s+/g, " ")} `;
  let best: { c: Condition; s: string } | null = null;
  for (const c of CONDITIONS) {
    for (const syn of [...c.synonyms, c.label.toLowerCase()]) {
      const s = syn.toLowerCase();
      // Word-boundary match so "pe" does not fire inside "pelvis".
      if (!new RegExp(`(^|\\s)${esc(s)}(\\s|$)`).test(t)) continue;
      if (!best || s.length > best.s.length) best = { c, s };
    }
  }
  return best ? { condition: best.c, matched: best.s } : null;
}

export function matchCondition(text: string): Condition | null {
  return matchConditionDetailed(text)?.condition ?? null;
}

/**
 * The principal diagnosis among several. Order in the note matters, but a
 * diagnosis with a specific diagram beats a systemic one listed first: a
 * wrist fracture with "hypertension" as a secondary should show the wrist,
 * not a body outline.
 */
export function chooseCondition(candidates: string[]): ConditionMatch | null {
  const matches = candidates
    .map(matchConditionDetailed)
    .filter((m): m is ConditionMatch => m !== null);
  if (matches.length === 0) return null;
  return matches.find((m) => m.condition.diagram !== "body") ?? matches[0];
}
