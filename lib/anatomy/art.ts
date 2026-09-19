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

export const ART: Partial<Record<DiagramId, ArtDiagram>> = {};

/** The default spot, as a fraction of the drawing's width. */
export const SPOT_WIDTH = 0.18;
