# Aperta — Devpost

## One line

Paste the discharge note. Turn the screen around. The patient understands.

**Try it:** https://aniketh.net/aperta/ · **Code:** https://github.com/ankthba/VTHacks14

## Inspiration

Patients forget most of what they are told in a visit and misremember much of
the rest. The fix everyone agrees on — teach-back, where the patient says it
back in their own words — takes minutes a fifteen-minute slot does not have.
So the explanation evaporates the moment they leave, and the follow-up call
three days later is "what was I supposed to do with the syringe?"

The most valuable screen in medicine is the one the doctor turns toward the
patient. Nobody owns it. That is where we built.

## What it does

A clinician pastes the note they already wrote — a discharge summary, an
after-visit summary, a clinic note in prose — and the tool assembles what the
patient needs:

- **Where on me.** A hand-drawn whole-body figure (female or male) with a red spot over the place
  glowing, then a zoom into a marked line drawing: *this* bone, *this* socket.
- **What happened**, in one sentence a person can repeat back.
- **Each medicine**: what it is for, in plain words, and how to take it
  (*"One pill, three times a day. Take it with food. For 7 days."*).
- **What to do next**, and **how to actually do it** — nine step-by-step
  walkthroughs (rinsing a tooth socket with the syringe, an inhaler with a
  spacer, crutches, eye drops, a sling, a dressing, an injection pen, ice and
  elevation, splint care) attached automatically when the note calls for them.
- In **Spanish, Vietnamese, Chinese or Arabic**, **read aloud** one screen at a
  time by ElevenLabs, advancing when the voice finishes, and **printed** on one
  sheet for the fridge.

The clinician reviews every sentence before the screen turns. They are the
author; this is a drafting tool.

## How we built it

Next.js 16, TypeScript, Tailwind. RxNorm and RxClass for drug identity and
class, openFDA for labels, MyMemory for key-less translation, ElevenLabs for
voice. The look is a document,
not an app: warm beige paper, Lora and Figtree, hairlines instead of boxes,
no shadows, and the body figures are our own ink. WCAG AA on every pairing.

The part we are proudest of is what the model is *not* allowed to do:

- **Parsing is deterministic first.** Section headers (about sixty aliases),
  ICD-10-CM prefixes on every condition, dose patterns, pipe-delimited EHR
  fields, and prose scanning. A model fills gaps only if one is configured;
  the demo runs with none.
- **What a diagnosis becomes is decided by a curated library** — 205 conditions
  in 21 categories across 18 anatomical views, each with the synonyms a real note uses
  ("NSTEMI", "Colles", "HNP", "s/p extraction"). A code outranks any phrase;
  the longest phrase wins.
- **What a medicine is for comes from a curated map of ~90 drug classes**, then
  a visit-context layer (topiramate for a migraine patient is "taken every day
  to make migraines happen less often", not "prevents seizures"), then the
  label's own indication simplified. Never "ask your pharmacist" — the doctor
  is in the room.
- **Translation only translates.** Drug names are never translated; they must
  match the bottle.

## Challenges

**A real note produced 48 slides, and slide two was a symptom.** A line reading
`Headache (QOD)` under *Medications* was pushed through as a drug, and RxNorm's
fuzzy matcher resolved it to an aspirin/caffeine headache powder. Every how-to
step also had its own slide. We rebuilt both: a line is a medication only if it
reads as a drug order and the resolution shares a word with what was printed;
everything else is shown to the clinician as **Not used** and the screen does
not turn until they have seen it. A how-to is one screen with its steps
numbered on it. That note is now five screens.

**"Real 3D anatomy" is the wrong ask.** We embedded photographic organ models
and they read as gory to someone who has just had bad news — and a third-party
model cannot be marked with *your* fracture. The whole-body locator zooming into
a marked drawing answers "where on me", which the model never could, and it
prints. So we removed 3D entirely and drew the anatomy ourselves.

**The free ElevenLabs tier is 10,000 characters for the weekend.** Audio is
cached to disk by text hash and committed, so every replay on stage is free and
offline. We spent about 4,600 of those characters generating audio for text we
then restructured. Lesson: bake last.

**RxClass poisons single drugs with combination products.** Amlodipine "is" a
renin inhibitor because aliskiren/amlodipine exists. Fixed by provenance: a
class mapping is kept only if it came from the drug's own ingredient concept.
This one came from the medication engine we started with (see below).

## Accomplishments

- Runs end to end with **zero API keys**. Adding keys adds voice quality,
  photo input and better translation — never a finding.
- The demo runs with the **wifi unplugged**: every RxNorm, openFDA, translation
  and audio response for the two demo notes is committed.
- The underlying medication engine is scored against a **40-case ground-truth
  set** (84.4% → 100% over the weekend, five real bugs found), and note parsing
  has its own pass/fail regression across six note formats.
- A **refusal discipline** you can demo: type a symptom under Medications and
  watch it get handed back instead of read aloud.

## What we learned

The hard problem was never rendering anatomy or calling a model. It was
refusing to guess in a domain where a confident wrong sentence — "take the
headache powder", "usually inexpensive" — is a harm, and making that refusal
visible so a judge, and a clinician, can trust the rest.

## What's next

Teach-back: the patient says it back, the tool checks the three facts that
matter survived. A larger condition library and pharmacist-validated purpose
sentences. Per-clinic phrasing. And a second ElevenLabs tier, so the how-to
screens get the good voice too.

---

## Where it came from

This grew out of **PillPile**, a patient-facing checker that photographed pill
bottles and found hidden duplicate ingredients by set intersection over RxNorm
IDs (Norco + Tylenol → 5,300 mg of acetaminophen a day). That engine, its eval
set, and its citation discipline still power every medication sentence here.
The pivot was realising the same rigor mattered more on the screen a doctor
turns toward a patient. PillPile lives on at `/pillpile`, and its prescriber
tool — label-grounded interactions, renal dosing, generic availability, a
prior-auth draft — at `/clinician`.

---

# Impiricus track — five-minute pitch

**Brief:** *Build the next HCP engagement tool.*

**0:00 — The room.** "Every HCP engagement strategy is trying to get into one
room: the exam room, at the moment of prescribing. Reps can't be there. Email
isn't there. But the physician is, with a screen, about to explain something
the patient will forget by the parking lot."

**0:40 — The demo (live, from the note).** Paste the wisdom-tooth discharge
note. Point at *Not used* — "it refused to read the line that wasn't a drug."
Turn the screen. Body → jaw → sockets. Ibuprofen in plain words. *How to rinse
the socket with the syringe*, six steps, read aloud. Switch to Spanish. Print.
Ninety seconds.

**2:10 — Why this is engagement, not a patient app.** "Patient education is
approved-content territory. Adherence is your shared interest with the
prescriber. This tool is opened *by the physician, in the room, for the
patient* — the one touchpoint a rep never gets — and it earns that by removing
work, not adding a message. *Be the answer, not the ad.*"

**3:00 — What Impiricus does with it.** The how-to library and purpose
sentences are the natural home for approved, product-specific patient
materials — a spacer walkthrough, an injection-pen walkthrough — delivered at
the second the clinician needs them, and measurable: which walkthroughs were
turned toward patients this week, in which language, for which drug class.
Signal a rep visit cannot produce.

**3:50 — The discipline, in one breath.** "Nothing clinical is generated. Every
sentence is curated or quoted, every skipped line is shown, every model call is
optional. That is what makes it something a health system would let into the
room."

**4:20 — Ask.** "We want to build the teach-back loop with a partner who
already has the content and the HCP network. That's you."

**4:40 — Close.** Turn the laptop around one more time. Leave the jaw on screen.

---

## Track notes

| Track | Fit |
|---|---|
| **Impiricus** | The pitch above. Physician-initiated, in-room, content-delivering, measurable. |
| **Overall** | Real problem, working end-to-end demo with no keys, measured accuracy, visible refusals. |
| **Best UI/UX** | Granola-derived system across web and iOS; WCAG AA verified; one idea per screen; paced read-aloud as the accessibility feature. |
| **HokieAI sidekick** | *Proposed:* a campus assistant should refuse medication questions — Aperta is what sits on the other side of that boundary. A `/ask` hand-off page that answers only drug questions with citations is a 45-minute add. |

## Limitations we will say out loud

Label-derived and library-derived only; 205 conditions; class-based purposes
corrected by visit context but still wrong for some off-label uses (which is
why every sentence is editable and shown first); free-tier machine translation;
deterministic parsing tuned on six formats; schematic drawings by design;
educational demo, not medical advice.
