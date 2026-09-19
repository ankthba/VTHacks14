/**
 * Simple, deliberately non-photographic diagrams for the exam room.
 *
 * These are line drawings, not anatomical renders, and that is a design
 * decision rather than a shortcut. The audience is a patient who has just been
 * given bad news and may be frightened, in pain, or reading in a second
 * language. Detail competes with comprehension: a clear picture beats an
 * accurate one when the goal is "understand what happened to me".
 *
 * Each diagram exposes a `mark` region the clinician can highlight, so the same
 * drawing serves several conditions without needing a separate asset each time.
 */

export interface Condition {
  id: string;
  /** What a clinician would search for. */
  label: string;
  region: string;
  /** One plain sentence a patient can repeat back. This is the whole point. */
  plain: string;
  /** Which diagram to draw, and which part to mark. */
  diagram: DiagramId;
  marks: string[];
}

export type DiagramId = "wrist" | "knee" | "shoulder" | "spine" | "heart" | "lung";

export const CONDITIONS: Condition[] = [
  {
    id: "distal-radius-fracture",
    label: "Distal radius fracture (broken wrist)",
    region: "Wrist",
    plain: "You broke one of the two bones in your forearm, close to your wrist.",
    diagram: "wrist",
    marks: ["radius-break"],
  },
  {
    id: "scaphoid-fracture",
    label: "Scaphoid fracture",
    region: "Wrist",
    plain:
      "You broke a small bone on the thumb side of your wrist. This one heals slowly because it has a poor blood supply.",
    diagram: "wrist",
    marks: ["scaphoid"],
  },
  {
    id: "meniscus-tear",
    label: "Meniscus tear",
    region: "Knee",
    plain:
      "You tore the cushion of cartilage that sits between the two bones of your knee.",
    diagram: "knee",
    marks: ["meniscus"],
  },
  {
    id: "acl-tear",
    label: "ACL tear",
    region: "Knee",
    plain:
      "You tore one of the ligaments that holds your knee steady from the inside.",
    diagram: "knee",
    marks: ["acl"],
  },
  {
    id: "rotator-cuff-tear",
    label: "Rotator cuff tear",
    region: "Shoulder",
    plain:
      "You tore one of the tendons that lifts and turns your shoulder.",
    diagram: "shoulder",
    marks: ["cuff"],
  },
  {
    id: "lumbar-disc-herniation",
    label: "Lumbar disc herniation",
    region: "Lower back",
    plain:
      "One of the cushions between the bones of your lower back is bulging and pressing on a nerve. That is why the pain runs down your leg.",
    diagram: "spine",
    marks: ["disc"],
  },
  {
    id: "atrial-fibrillation",
    label: "Atrial fibrillation",
    region: "Heart",
    plain:
      "The top chambers of your heart are beating irregularly instead of in a steady rhythm. That lets blood pool, which can form a clot.",
    diagram: "heart",
    marks: ["atria"],
  },
  {
    id: "myocardial-infarction",
    label: "Myocardial infarction (heart attack)",
    region: "Heart",
    plain:
      "One of the arteries feeding your heart muscle became blocked, so part of the muscle was starved of blood.",
    diagram: "heart",
    marks: ["coronary"],
  },
  {
    id: "pneumonia",
    label: "Pneumonia",
    region: "Lungs",
    plain:
      "There is an infection in part of your lung. The small air sacs there have filled with fluid, so less air gets through.",
    diagram: "lung",
    marks: ["lobe"],
  },
  {
    id: "copd",
    label: "COPD exacerbation",
    region: "Lungs",
    plain:
      "The airways in your lungs are narrowed and inflamed, which is why breathing out is harder than breathing in.",
    diagram: "lung",
    marks: ["airway"],
  },
];

export const byId = (id: string) => CONDITIONS.find((c) => c.id === id) ?? null;

export const REGIONS = [...new Set(CONDITIONS.map((c) => c.region))];
