import { asset } from "@/lib/staticMode";
import type { HowToArt } from "./howto";

/**
 * Hand-drawn pictures for the walkthroughs, where the clinician has drawn
 * one. Same treatment as the anatomy: the PNG's alpha is a mask over the
 * page's ink. Any walkthrough without an entry falls back to the line art.
 */
export const HOWTO_ART: Partial<Record<HowToArt, { src: string; w: number; h: number; label: string }>> = {
  syringe: { src: asset("/anatomy/howto-syringe.png"), w: 1003, h: 442, label: "The syringe for rinsing the socket" },
  inhaler: { src: asset("/anatomy/howto-inhaler.png"), w: 1248, h: 698, label: "The inhaler pushed into its spacer" },
  crutches: { src: asset("/anatomy/howto-crutches.png"), w: 888, h: 1561, label: "A pair of crutches" },
  eyedrops: { src: asset("/anatomy/howto-eyedrops.png"), w: 333, h: 894, label: "The eye-drop bottle" },
  sling: { src: asset("/anatomy/howto-sling.png"), w: 1044, h: 939, label: "An arm in a sling, the strap over the shoulder" },
};
