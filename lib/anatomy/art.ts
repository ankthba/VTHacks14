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
  // The skull, three-quarter view, jaw open. Serves the head and the mouth.
  head: {
    src: asset("/anatomy/skull.png"),
    w: 750,
    h: 1040,
    label: "The skull",
    spots: {
      brain: { x: 0.5, y: 0.2, s: 2.2 },                                     // the cranium
      vessel: { x: 0.76, y: 0.28, s: 1 },                                    // the temple, where the middle cerebral artery runs
      nerve: { x: 0.76, y: 0.52, s: 0.9 },                                   // in front of the ear, where the facial nerve emerges
      throat: { x: 0.69, y: 0.74, s: 0.9 },                                  // behind the jaw
      sinus: [{ x: 0.19, y: 0.5, s: 0.8 }, { x: 0.24, y: 0.32, s: 0.6 }],   // cheek and brow sinuses
    },
  },
  mouth: {
    src: asset("/anatomy/skull.png"),
    w: 750,
    h: 1040,
    label: "The skull, jaw open",
    spots: {
      socket: [{ x: 0.45, y: 0.67, s: 0.6 }, { x: 0.52, y: 0.75, s: 0.6 }], // the back teeth, upper and lower
      root: { x: 0.39, y: 0.65, s: 0.7 },                                    // a molar root
      tooth: { x: 0.28, y: 0.69, s: 0.6 },                                   // a front tooth
      gum: { x: 0.24, y: 0.82, s: 0.9 },                                     // along the lower teeth
      tongue: { x: 0.22, y: 0.76, s: 0.8 },                                  // inside the open mouth
      joint: { x: 0.71, y: 0.56, s: 0.7 },                                   // the jaw hinge
    },
  },
  // The lungs from the front, windpipe above.
  lung: {
    src: asset("/anatomy/lung.png"),
    w: 761,
    h: 863,
    label: "The lungs and airways",
    spots: {
      lobe: { x: 0.2, y: 0.79, s: 1.3 },                                     // the lower lobe
      airway: [{ x: 0.3, y: 0.5, s: 1 }, { x: 0.7, y: 0.5, s: 1 }],         // the main airways into each lung
      pleura: { x: 0.1, y: 0.65, s: 1.2 },                                   // the lining at the edge of the lung
    },
  },
  // The abdomen from the front: liver and stomach above, the bowel below.
  abdomen: {
    src: asset("/anatomy/abdomen.png"),
    w: 749,
    h: 964,
    label: "Organs of the abdomen",
    spots: {
      liver: { x: 0.32, y: 0.17, s: 1.4 },                                   // upper right of the abdomen
      stomach: { x: 0.66, y: 0.2, s: 1.1 },                                  // upper left
      gallbladder: { x: 0.39, y: 0.24, s: 0.6 },                             // tucked under the liver
      pancreas: { x: 0.51, y: 0.28, s: 1 },                                  // behind the stomach
      bowel: { x: 0.48, y: 0.55, s: 1.6 },                                   // the coils of the bowel
      appendix: { x: 0.47, y: 0.77, s: 0.7 },                                // hanging off the start of the large bowel
      rectum: { x: 0.5, y: 0.96, s: 0.6 },                                   // the last stretch
      hernia: { x: 0.15, y: 0.83, s: 0.8 },                                  // the groin
    },
  },
  // Whole body: her and him side by side, the same figures the locator uses.
  // Every whole-body mark is spotted on both.
  body: {
    src: asset("/anatomy/bodies.png"),
    w: 902,
    h: 1149,
    label: "The body",
    spots: {
      core: [{ x: 0.229, y: 0.42, s: 1.4 }, { x: 0.796, y: 0.42, s: 1.4 }],       // the trunk
      pelvis: [{ x: 0.229, y: 0.56, s: 0.95 }, { x: 0.796, y: 0.56, s: 0.95 }],   // the pelvis
      blood: [{ x: 0.229, y: 0.32, s: 1.3 }, { x: 0.796, y: 0.321, s: 1.3 }],     // the chest, where the blood is pumped
      bones: [{ x: 0.184, y: 0.66, s: 0.8 }, { x: 0.755, y: 0.659, s: 0.8 }],     // a long bone, the thigh
      joints: [{ x: 0.092, y: 0.2, s: 0.6 }, { x: 0.686, y: 0.202, s: 0.6 }, { x: 0.184, y: 0.745, s: 0.6 }, { x: 0.755, y: 0.744, s: 0.6 }], // shoulders and knees
    },
  },
  // The ear in section: outer ear at right, canal, eardrum, middle ear, cochlea at left.
  ear: {
    src: asset("/anatomy/ear.png"),
    w: 969,
    h: 945,
    label: "The ear, in cross-section",
    spots: {
      "inner-ear": { x: 0.19, y: 0.59, s: 1 },                               // the cochlea
      "middle-ear": { x: 0.45, y: 0.56, s: 0.8 },                            // the space behind the eardrum
      eardrum: { x: 0.56, y: 0.57, s: 0.6 },                                 // the inner end of the canal
      canal: { x: 0.62, y: 0.6, s: 0.8 },                                    // the ear canal
      wax: { x: 0.66, y: 0.61, s: 0.6 },                                     // near the opening
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
