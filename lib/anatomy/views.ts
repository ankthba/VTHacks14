import type { DiagramId } from "./conditions";

/** What each view is, for someone who has never been told. One breath each. */
export const VIEWS: Record<DiagramId, { label: string; plain: string }> = {
  head: { label: "Head", plain: "The skull, and inside it the brain: the part of you that thinks, remembers, moves your body and feels pain." },
  eye: { label: "Eye", plain: "A ball with a clear window at the front and a light-sensing layer at the back, joined to the brain by a nerve." },
  ear: { label: "Ear", plain: "The outer ear funnels sound down a canal to the eardrum. Behind it, tiny bones and a coiled inner ear turn sound into signals and keep your balance." },
  mouth: { label: "Mouth", plain: "Teeth in two arches, the tongue, and the throat behind. Where eating, speaking and breathing all begin." },
  neck: { label: "Neck", plain: "The windpipe and voice box at the front, the thyroid gland wrapped around them, and the spine running up the back." },
  shoulder: { label: "Shoulder", plain: "A ball-and-socket joint where the arm bone meets the shoulder blade, held by a cuff of tendons, with the collarbone across the top." },
  elbow: { label: "Elbow", plain: "The hinge between the upper arm bone and the two forearm bones, with the muscles that bend the arm and turn the hand." },
  wrist: { label: "Wrist and hand", plain: "Two forearm bones meet eight small wrist bones, then the long bones of the hand and the fingers." },
  heart: { label: "Heart", plain: "A muscular pump with four chambers. The vessels on its surface feed the muscle itself; the big vessels above carry blood to the body and lungs." },
  lung: { label: "Lungs", plain: "Two spongy organs that fill with air through the windpipe and its branches, passing oxygen into the blood." },
  abdomen: { label: "Abdomen", plain: "The belly: liver and stomach at the top, the long coils of the bowel below, the appendix hanging off the start of the large bowel." },
  kidney: { label: "Kidneys and bladder", plain: "Two kidneys filter your blood and make urine, which runs down two tubes to the bladder, and out." },
  spine: { label: "Spine", plain: "A stack of bones with cushioning discs between them, protecting the nerves that run from the brain to the rest of the body." },
  hip: { label: "Hip", plain: "The ball at the top of the thigh bone sitting in a socket in the pelvis, the deepest joint in the body." },
  knee: { label: "Knee", plain: "The thigh bone meets the shin bone with the kneecap in front, cushioned by cartilage and held by ligaments." },
  ankle: { label: "Ankle and foot", plain: "The shin bones sit on the ankle bone, which sits on the heel. Ligaments hold it, and the long bones of the foot run out to the toes." },
  skin: { label: "Skin", plain: "Three layers: the thin outer layer you can see, the thicker layer beneath it with hair roots, sweat glands and vessels, and fat below." },
  body: { label: "Whole body", plain: "For things that affect all of you at once: blood sugar, blood, bones, joints, weight." },
};
