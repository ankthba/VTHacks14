import { asset } from "@/lib/staticMode";
import type { HowToArt } from "./howto";

/**
 * Hand-drawn pictures for the walkthroughs, where the clinician has drawn
 * one. Same treatment as the anatomy: the PNG's alpha is a mask over the
 * page's ink. Any walkthrough without an entry falls back to the line art.
 */
export const HOWTO_ART: Partial<Record<HowToArt, { src: string; w: number; h: number; label: string }>> = {
  syringe: { src: asset("/anatomy/howto-syringe.png"), w: 1003, h: 442, label: "The syringe for rinsing the socket" },
};
