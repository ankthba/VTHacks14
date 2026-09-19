import type { DiagramId } from "./conditions";

/**
 * Interactive 3D models for each anatomical view.
 *
 * Real rendered anatomy a patient can turn with a finger, embedded from
 * Sketchfab under Creative Commons licences. They are OPT-IN on the patient
 * screen ("See it in 3D"), not the default: a third-party model cannot be
 * marked with the diagnosis, and photographic organ renders read as gory to
 * someone who has just been given bad news. The default picture is the
 * whole-body locator zooming into the marked line drawing, which shows exactly
 * the part and prints. The models here were picked as the least clinical-
 * photographic available: illustrative red heart, translucent airways, bone.
 *
 * Attribution is a licence requirement, not a courtesy, so it is rendered under
 * every model.
 */
export interface Model3D {
  uid: string;
  title: string;
  author: string;
  license: string;
}

export const MODELS: Record<DiagramId, Model3D> = {
  wrist: { uid: "3a1c342fe20346deb454a05300563f2c", title: "Bones of the wrist, hand and fingers", author: "aquaman27", license: "CC BY-NC" },
  knee: { uid: "bd50aacad58b488ea80ed973b4874a08", title: "Knee Anatomy", author: "arloopa", license: "CC BY" },
  shoulder: { uid: "d3191cc41b9c4c94b393e1c26c4f0b02", title: "Shoulder joint", author: "arloopa", license: "CC BY" },
  spine: { uid: "bcd9eee09ce044ef98a69c315aa792e2", title: "The human spinal column", author: "scratchi", license: "CC BY" },
  heart: { uid: "00b5f4ec0b984325b453f8df07cd0cb5", title: "Cardiac Anatomy: Coronary arteries of the heart", author: "HannahNewey / University of Dundee", license: "CC BY" },
  lung: { uid: "ad7d7e16b98f421db0cda79f265fcc8d", title: "Anatomy of the airways", author: "eLearningUMCG", license: "CC BY" },
  head: { uid: "0aa0e33c5c854d1bab7bac9e1c7acaec", title: "Human brain, Cerebrum & Brainstem", author: "pranktoy", license: "CC BY" },
  abdomen: { uid: "ed05d3b7b49b4014a09d7a9d62e4f421", title: "Abdomen Anatomy", author: "eLearningUMCG", license: "CC BY-NC-ND" },
  ankle: { uid: "e80b6eb57bdb4eeea749fc23409e8022", title: "Right Foot Bones", author: "IRevans", license: "CC BY" },
  hip: { uid: "71a2dfe1a80444f89d90212a921ed0a2", title: "Human Pelvic Bone", author: "ebauer4", license: "CC BY" },
  mouth: { uid: "a47ef69ff3a4402783cff0f841bc5e0a", title: "Human skull and neck", author: "thesidekick", license: "CC BY" },
  body: { uid: "4de7b96a351a4a35b1b6e5415277ff07", title: "Skeleton", author: "diegoluga", license: "CC BY" },
};

/** Viewer chrome trimmed to what a patient needs: turn it, and go fullscreen. */
export const embedUrl = (uid: string) =>
  `https://sketchfab.com/models/${uid}/embed?autostart=1&preload=1&ui_infos=0&ui_watermark=0&ui_stop=0&ui_help=0&ui_settings=0&ui_vr=0&ui_ar=0&ui_inspector=0&ui_fullscreen=1&ui_annotations=1`;

export const modelPageUrl = (uid: string) => `https://sketchfab.com/models/${uid}`;
