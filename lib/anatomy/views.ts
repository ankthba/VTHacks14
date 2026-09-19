import type { DiagramId } from "./conditions";

/** What each view is, for someone who has never been told. Half a breath each. */
export const VIEWS: Record<DiagramId, { label: string; plain: string }> = {
  head: { label: "Head", plain: "The skull, and the brain inside it." },
  eye: { label: "Eye", plain: "A clear window at the front, a light-sensing layer at the back." },
  ear: { label: "Ear", plain: "Canal, eardrum, tiny bones, and the coiled inner ear." },
  mouth: { label: "Mouth", plain: "Teeth, tongue, and the throat behind." },
  neck: { label: "Neck", plain: "Windpipe and voice box in front, the thyroid around them." },
  shoulder: { label: "Shoulder", plain: "A ball-and-socket joint held by a cuff of tendons." },
  elbow: { label: "Elbow", plain: "The hinge between the upper arm and the forearm." },
  wrist: { label: "Wrist and hand", plain: "Forearm bones, eight wrist bones, then the hand." },
  heart: { label: "Heart", plain: "A four-chamber pump with its own arteries on the surface." },
  lung: { label: "Lungs", plain: "Two spongy organs that pass oxygen into the blood." },
  abdomen: { label: "Abdomen", plain: "Liver and stomach above, the coils of the bowel below." },
  kidney: { label: "Kidneys and bladder", plain: "Two filters that make urine, two tubes, the bladder." },
  spine: { label: "Spine", plain: "A stack of bones with cushioning discs between them." },
  hip: { label: "Hip", plain: "The ball of the thigh bone in its socket in the pelvis." },
  knee: { label: "Knee", plain: "Thigh bone meets shin bone, kneecap in front." },
  ankle: { label: "Ankle and foot", plain: "Shin bones on the ankle bone, on the heel, out to the toes." },
  skin: { label: "Skin", plain: "A thin outer layer, a thick layer beneath, fat below." },
  body: { label: "Whole body", plain: "For things that affect all of you at once." },
};
