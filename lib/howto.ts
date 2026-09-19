/**
 * How to actually do the thing you were told to do.
 *
 * Discharge instructions say "irrigate the socket with the syringe after
 * meals" and assume the patient knows what that means. Most do not, and they
 * do not ask. Each procedure here is a short numbered walkthrough in plain
 * words, one step per screen, read aloud - the demonstration the nurse would
 * give if there were time.
 *
 * Curated and deterministic, like everything else the patient reads. The
 * `triggers` let a parsed note attach the right one automatically; the
 * clinician can also add or remove any of them before turning the screen.
 */

export interface HowTo {
  id: string;
  title: string;
  /** Words in an instruction that mean this procedure is needed. */
  triggers: RegExp;
  /** A one-line reason, so the patient knows why it matters. */
  why: string;
  steps: string[];
  /** Simple illustration id, drawn in components/HowToArt.tsx. */
  art: HowToArt;
}

export type HowToArt = "syringe" | "inhaler" | "crutches" | "eyedrops" | "sling" | "dressing" | "pen" | "ice" | "splint";

export const HOWTOS: HowTo[] = [
  {
    id: "socket-irrigation",
    title: "Rinsing the tooth socket with the syringe",
    triggers: /\b(irrigat|syringe|socket|extraction site|wisdom t(ee|oo)th|dry socket)\b/i,
    why: "Food gets trapped in the hole where the tooth was. Rinsing it out stops infection and pain.",
    steps: [
      "Start on the day your dentist told you - usually the third day after the tooth came out. Not before.",
      "Fill the plastic syringe with warm water, or salt water if you were given some.",
      "Stand over the sink. Put the tip of the syringe near the hole, not deep into it.",
      "Squeeze gently so the water washes over the socket. It should not hurt.",
      "Let the water fall out of your mouth. Do not spit hard and do not swish.",
      "Do this after every meal and before bed, until the hole has closed over.",
    ],
    art: "syringe",
  },
  {
    id: "inhaler-spacer",
    title: "Using your inhaler with the spacer",
    triggers: /\b(inhaler|spacer|puffer|albuterol|salbutamol|mdi)\b/i,
    why: "Most of a puff ends up on the back of your throat. The spacer gets the medicine into your lungs.",
    steps: [
      "Shake the inhaler well, then fit it into the end of the spacer.",
      "Breathe all the way out, away from the spacer.",
      "Put the mouthpiece in your mouth and close your lips around it.",
      "Press the inhaler once. Then breathe in slowly and deeply through your mouth.",
      "Hold your breath and count to ten. Then breathe out slowly.",
      "If you need a second puff, wait one minute and do it all again.",
    ],
    art: "inhaler",
  },
  {
    id: "crutches",
    title: "Walking with crutches",
    triggers: /\b(crutch|non.?weight.?bearing|nwb|toe.?touch)\b/i,
    why: "Used the wrong way, crutches put your weight on your armpits and can damage the nerves there.",
    steps: [
      "Set the height so the top of each crutch sits two fingers below your armpit.",
      "Your weight goes on your hands, never on your armpits.",
      "Move both crutches forward a short step, then swing your good leg up to them.",
      "Keep the hurt leg lifted, or just touching the floor if you were told toe-touch.",
      "Going upstairs: good leg first, then the crutches. Going down: crutches first, then the good leg.",
      "Take small steps. Speed comes later.",
    ],
    art: "crutches",
  },
  {
    id: "eye-drops",
    title: "Putting in eye drops",
    triggers: /\b(eye ?drops?|ophthalmic|gtt)\b/i,
    why: "Most drops miss the eye or get blinked straight out. This way, they stay in.",
    steps: [
      "Wash your hands.",
      "Tip your head back and look up at the ceiling.",
      "With one finger, pull your lower lid down to make a small pocket.",
      "Hold the bottle above the eye and squeeze one drop into the pocket. Do not let the tip touch your eye.",
      "Close your eye gently and press a finger on the inner corner, by your nose, for one minute.",
      "If you use more than one kind of drop, wait five minutes between them.",
    ],
    art: "eyedrops",
  },
  {
    id: "sling",
    title: "Wearing your sling",
    triggers: /\b(sling|immobiliz)\w*/i,
    why: "The sling holds the shoulder still so it can heal. Worn loose, it does nothing.",
    steps: [
      "Slide your arm in so your elbow sits right in the corner of the sling.",
      "Your hand should be higher than your elbow, and your wrist should be supported, not hanging out.",
      "Bring the strap over your opposite shoulder and adjust it so your arm rests across your stomach.",
      "Take it off only to wash, and for the exercises you were shown, unless told otherwise.",
      "Sleep in it, propped up on pillows, until we say you can stop.",
    ],
    art: "sling",
  },
  {
    id: "dressing-change",
    title: "Changing the dressing",
    triggers: /\b(dressing|bandage|wound care|gauze|steri.?strip)\b/i,
    why: "A clean, dry dressing keeps bacteria out while the skin closes.",
    steps: [
      "Wash your hands and lay out the new dressing before you start.",
      "Peel the old dressing off slowly, pulling toward the wound, not away from it.",
      "Look at the wound. A little pink is normal. Spreading redness, pus, or a bad smell means call us.",
      "Clean around it with clean water. Pat dry - do not rub.",
      "Put the new dressing on so it covers the wound with a margin all round.",
      "Change it as often as we told you, and any time it gets wet or dirty.",
    ],
    art: "dressing",
  },
  {
    id: "insulin-pen",
    title: "Giving yourself an injection with the pen",
    triggers: /\b(insulin|pen injector|inject|subcutaneous|subq|enoxaparin|lovenox|ozempic|semaglutide)\b/i,
    why: "Done right, the needle is so short and fine you barely feel it.",
    steps: [
      "Wash your hands. Check the pen says the right medicine and is not past its date.",
      "Screw on a new needle and take off both caps.",
      "Dial two units and press the button until a drop appears at the tip. This clears the air.",
      "Dial your dose.",
      "Pinch a fold of skin on your stomach, at least a hand's width from your belly button.",
      "Push the needle straight in, press the button all the way, and count slowly to ten before pulling out.",
      "Put the needle in the sharps container. Never reuse it.",
    ],
    art: "pen",
  },
  {
    id: "ice-and-elevate",
    title: "Ice and elevation",
    triggers: /\b(ice|elevat|rice\b|cold pack|swelling)\w*/i,
    why: "Cold and height both push the swelling down. Less swelling means less pain and faster healing.",
    steps: [
      "Wrap the ice or cold pack in a thin towel. Never put ice straight on the skin.",
      "Hold it on the sore area for twenty minutes, then take it off for at least an hour.",
      "Do this a few times a day for the first two or three days.",
      "When you are sitting or lying down, prop the injured part up on pillows so it is higher than your heart.",
    ],
    art: "ice",
  },
  {
    id: "splint-care",
    title: "Looking after your splint or cast",
    triggers: /\b(splint|cast\b|plaster)\w*/i,
    why: "A wet or damaged splint stops holding the bone straight, and skin underneath can break down.",
    steps: [
      "Keep it dry. In the shower, cover it with a plastic bag and tape the top closed.",
      "Do not push anything down inside it to scratch. Try cool air from a hair dryer instead.",
      "Wiggle your fingers or toes often to keep the blood moving.",
      "If your fingers go numb, turn pale or blue, or the pain suddenly gets much worse, come back straight away. That cannot wait.",
    ],
    art: "splint",
  },
];

export const howToById = (id: string) => HOWTOS.find((h) => h.id === id) ?? null;

/** Which procedures a set of instructions calls for. */
export function detectHowTos(texts: string[]): string[] {
  const joined = texts.join("\n");
  return HOWTOS.filter((h) => h.triggers.test(joined)).map((h) => h.id);
}
