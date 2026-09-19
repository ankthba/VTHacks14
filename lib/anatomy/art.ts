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
  /** Position for each mark the conditions on this view can set. */
  spots: Record<string, ArtSpot>;
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
};

/** The default spot, as a fraction of the drawing's width. */
export const SPOT_WIDTH = 0.18;
