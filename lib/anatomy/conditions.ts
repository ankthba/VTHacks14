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
  | "body";

const C = (
  id: string,
  label: string,
  region: string,
  plain: string,
  diagram: DiagramId,
  marks: string[],
  synonyms: string[],
): Condition => ({ id, label, region, plain, diagram, marks, synonyms });

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

export const byId = (id: string) => CONDITIONS.find((c) => c.id === id) ?? null;

export const REGIONS = [...new Set(CONDITIONS.map((c) => c.region))];

/**
 * Match free text from a clinical note against the library.
 *
 * Longest synonym wins, so "transient ischemic attack" is not captured by
 * "stroke" and "hip osteoarthritis" is not captured by "osteoarthritis".
 */
export function matchCondition(text: string): Condition | null {
  const t = ` ${text.toLowerCase().replace(/[^a-z0-9\s'-]/g, " ").replace(/\s+/g, " ")} `;

  let best: { c: Condition; len: number } | null = null;
  for (const c of CONDITIONS) {
    for (const syn of [...c.synonyms, c.label.toLowerCase()]) {
      const s = syn.toLowerCase();
      // Word-boundary match so "pe" does not fire inside "pelvis".
      if (!new RegExp(`(^|\\s)${s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(\\s|$)`).test(t)) {
        continue;
      }
      if (!best || s.length > best.len) best = { c, len: s.length };
    }
  }
  return best?.c ?? null;
}
