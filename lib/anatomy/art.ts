import { asset } from "@/lib/staticMode";
import type { DiagramId } from "./conditions";

/**
 * Hand-drawn anatomy.
 *
 * Where the clinician has drawn the part themselves, that drawing replaces
 * the vector line art for the view. The diagnosis is shown the same way it is
 * on the body figure: a red spot over the structure, not a re-coloured line.
 * Spots are fractions of the drawing's box - x across, y down - and s scales
 * the spot against a default of about a fifth of the drawing's width.
 */
export interface ArtSpot { x: number; y: number; s: number }
export interface ArtDiagram {
  src: string;
  w: number;
  h: number;
  label: string;
  /** Position for each mark the conditions on this view can set. A drawing
      with two views of the same part carries one spot per view. */
  spots: Record<string, ArtSpot | ArtSpot[]>;
}

export const SPOT_SRC = asset("/anatomy/spot.png");

export const ART: Partial<Record<DiagramId, ArtDiagram>> = {
  // Back of the hand, fingers up, thumb to the right; radius and ulna below.
  wrist: {
    src: asset("/anatomy/hand.png"),
    w: 828,
    h: 1057,
    label: "Bones of the forearm, wrist and hand",
    spots: {
      "radius-break": { x: 0.58, y: 0.77, s: 1 },   // lower end of the radius, thumb side
      scaphoid: { x: 0.55, y: 0.7, s: 0.7 },        // proximal carpal on the thumb side
      tunnel: { x: 0.46, y: 0.69, s: 1 },           // across the carpals
      tendon: { x: 0.62, y: 0.75, s: 0.7 },         // over the radial styloid
      finger: { x: 0.37, y: 0.23, s: 0.7 },         // middle finger, middle phalanx
      metacarpal: { x: 0.27, y: 0.56, s: 0.8 },     // fifth metacarpal
      cyst: { x: 0.44, y: 0.64, s: 0.6 },           // back of the wrist
      palm: { x: 0.44, y: 0.54, s: 1.1 },           // across the metacarpals
    },
  },
  // Knee from the front: femur above, patella, tibia below, fibula to the right.
  knee: {
    src: asset("/anatomy/knee.png"),
    w: 515,
    h: 1083,
    label: "Bones and ligaments of the knee",
    spots: {
      patella: { x: 0.375, y: 0.43, s: 0.8 },        // the kneecap
      bursa: { x: 0.375, y: 0.42, s: 1.2 },          // in front of the kneecap
      acl: { x: 0.375, y: 0.47, s: 0.8 },            // inside the joint, between the condyles
      meniscus: { x: 0.375, y: 0.49, s: 1.2 },       // the joint line
      back: { x: 0.375, y: 0.5, s: 1 },              // behind the joint
      mcl: { x: 0.21, y: 0.5, s: 0.7 },              // inner edge of the joint
      tibia: { x: 0.375, y: 0.53, s: 1.2 },          // the tibial plateau
      "patellar-tendon": { x: 0.375, y: 0.56, s: 0.7 }, // kneecap down to the shin
    },
  },
  // Shoulder from the front: humerus at left, clavicle across the top, shoulder blade at right.
  shoulder: {
    src: asset("/anatomy/shoulder.png"),
    w: 855,
    h: 956,
    label: "Bones and tendons of the shoulder",
    spots: {
      "humerus-head": { x: 0.31, y: 0.29, s: 1 },    // the ball of the joint
      cuff: { x: 0.3, y: 0.22, s: 0.9 },             // over the top of the ball, under the acromion
      ac: { x: 0.35, y: 0.19, s: 0.6 },              // where the collarbone meets the shoulder blade
      biceps: { x: 0.32, y: 0.37, s: 0.7 },          // front of the ball, into the groove
      clavicle: { x: 0.61, y: 0.18, s: 0.8 },        // mid-shaft of the collarbone
    },
  },
  // The whole spine, from behind (left) and from the side (right). Lumbar
  // conditions are spotted on both views.
  spine: {
    src: asset("/anatomy/spine.png"),
    w: 728,
    h: 1218,
    label: "The spine, from behind and from the side",
    spots: {
      disc: [{ x: 0.22, y: 0.83, s: 0.7 }, { x: 0.73, y: 0.82, s: 0.7 }],       // L4-L5
      vertebra: [{ x: 0.22, y: 0.74, s: 0.7 }, { x: 0.75, y: 0.75, s: 0.7 }],   // a lumbar body
      muscle: [{ x: 0.32, y: 0.76, s: 0.8 }, { x: 0.88, y: 0.76, s: 0.8 }],     // beside and behind the lumbar spine
      sacrum: [{ x: 0.22, y: 0.91, s: 0.8 }, { x: 0.77, y: 0.92, s: 0.8 }],     // the base of the spine
      coccyx: { x: 0.72, y: 0.985, s: 0.5 },                                     // the tailbone tip, side view
    },
  },
  // The heart from the front: aorta and great vessels above, atria either side,
  // coronary arteries over the ventricles, apex at the bottom.
  heart: {
    src: asset("/anatomy/heart.png"),
    w: 687,
    h: 1008,
    label: "The heart and its great vessels",
    spots: {
      atria: [{ x: 0.27, y: 0.24, s: 0.8 }, { x: 0.75, y: 0.5, s: 0.8 }],  // the two upper chambers
      coronary: { x: 0.5, y: 0.74, s: 1.1 },                                // the artery down the front
      vessels: { x: 0.27, y: 0.08, s: 1.1 },                                // the aorta and its branches
      valve: { x: 0.44, y: 0.3, s: 0.7 },                                   // the aortic valve at the root
      pericardium: { x: 0.48, y: 0.54, s: 2.6 },                            // the sac around the whole heart
      "chest-wall": { x: 0.48, y: 0.5, s: 1.5 },                            // the chest in front of the heart
    },
  },
};

/** Every spot for a mark, whether the drawing has one view or two. */
export const spotsFor = (art: ArtDiagram, mark: string): ArtSpot[] => {
  const v = art.spots[mark];
  return v === undefined ? [] : Array.isArray(v) ? v : [v];
};

/** The default spot, as a fraction of the drawing's width. */
export const SPOT_WIDTH = 0.18;
