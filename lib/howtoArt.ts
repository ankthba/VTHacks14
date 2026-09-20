import { asset } from "@/lib/staticMode";
import type { HowToArt } from "./howto";

/**
 * Hand-drawn pictures for the walkthroughs, where the clinician has drawn
 * one. Same treatment as the anatomy: the PNG's alpha is a mask over the
 * page's ink. All nine are drawn; the line art below each remains as a
 * fallback only.
 */
export const HOWTO_ART: Partial<Record<HowToArt, { src: string; w: number; h: number; label: string }>> = {
  syringe: { src: asset("/anatomy/howto-syringe.png"), w: 1003, h: 442, label: "The syringe for rinsing the socket" },
  inhaler: { src: asset("/anatomy/howto-inhaler.png"), w: 1248, h: 698, label: "The inhaler pushed into its spacer" },
  crutches: { src: asset("/anatomy/howto-crutches.png"), w: 888, h: 1561, label: "A pair of crutches" },
  eyedrops: { src: asset("/anatomy/howto-eyedrops.png"), w: 333, h: 894, label: "The eye-drop bottle" },
  sling: { src: asset("/anatomy/howto-sling.png"), w: 1044, h: 939, label: "An arm in a sling, the strap over the shoulder" },
  dressing: { src: asset("/anatomy/howto-dressing.png"), w: 942, h: 1066, label: "A bandaged hand, a roll of tape and a gauze pad" },
  pen: { src: asset("/anatomy/howto-pen.png"), w: 1239, h: 462, label: "The injection pen with its cap off" },
  ice: { src: asset("/anatomy/howto-ice.png"), w: 1130, h: 844, label: "An ice bag" },
  splint: { src: asset("/anatomy/howto-splint.png"), w: 712, h: 1022, label: "A cast and a splint on the forearm" },
};
