# Aperta: Devpost

## One line

Paste the discharge note. Turn the screen around. The patient understands.

**Try it:** https://aperta.health/ (paste any note) · **Code:** https://github.com/ankthba/VTHacks14

## Inspiration

Patients forget most of what they are told in a visit and misremember much of
the rest. The fix everyone agrees on is teach-back, where the patient says it
back in their own words, and it takes minutes a fifteen-minute slot does not
have. So the explanation evaporates in the parking lot, and the call three
days later is "what was I supposed to do with the syringe?"

The most valuable screen in medicine is the one the doctor turns toward the
patient. Nobody owns it. That is where we built.

## What it does

A clinician pastes the note they already wrote: a discharge summary, an
after-visit summary, a clinic note in prose, an EHR export that leads with
ICD-10 codes. Aperta assembles what the patient needs and shows the clinician
every sentence before the screen turns.

- **Where on me.** A hand-drawn body, hers or his, with a red spot over the
  place, then a zoom into a drawing of the part with the structure marked:
  *this* bone, *this* socket, *this* valve. Every drawing is our own ink,
  eighteen views, and every spot is a real structure.
- **What happened**, in one sentence a person can repeat back, from a library
  of 205 conditions in 21 categories.
- **Each medicine**: what it is for, in plain words, and how to take it
  ("One pill, three times a day. Take it with food. For 7 days.").
- **Before you prescribe.** On the same screen as the list, one medicine is
  checked against the rest: duplicates, labelled interactions, the boxed
  warning, specific populations, dosing, contraindications, and whether a
  generic exists. Lifted from the FDA label, with a link back to it.
- **What to do next**, and **how to actually do it**: nine step-by-step
  walkthroughs (rinsing a tooth socket with the syringe, an inhaler with a
  spacer, crutches, eye drops, a sling, a dressing, an injection pen, ice and
  elevation, splint care), attached automatically when the note calls for
  them.
- In **Spanish, Vietnamese, Chinese or Arabic**, **read aloud** one screen at
  a time, advancing when the voice finishes, and **printed** as a one-sheet
  handout for the fridge.

Then the clinician presses one button and the screen turns: their page swings
away and the patient's page swings in.

## How we built it

Next.js 16, TypeScript, Tailwind. RxNorm and RxClass for drug identity and
class, openFDA for labels and the NDC directory, MyMemory for key-less
translation, the browser's own voice for read-aloud with ElevenLabs as an
option. Every drawing was made by hand in Procreate and dropped in as black ink
on transparency; a colour filter turns it beige on the dark board.

The published site has no server and needs none: the parser, the card builder
and the prescriber check are deterministic code that run in the page against
public services, so any note pasted at the demo link works.

The part we are proudest of is what the model is *not* allowed to do:

- **Parsing is deterministic first.** Section headers (about sixty aliases),
  ICD-10 prefixes on every condition, dose patterns, pipe-delimited EHR
  fields, prose scanning. A model fills gaps only if one is configured; the
  demo runs with none.
- **What a diagnosis becomes is decided by the library.** Each condition
  carries the words a real note uses ("NSTEMI", "Colles", "HNP", "s/p
  extraction") and its codes. A code outranks any phrase; the longest phrase
  wins; "ST depression" on an ECG line is not depression.
- **What a medicine is for comes from a curated map of about ninety drug
  classes**, then a visit-context layer (topiramate for a migraine patient is
  "taken every day to make migraines happen less often", not "prevents
  seizures"), then the label's own indication simplified. Never "ask your
  pharmacist." The doctor is in the room.
- **Translation only translates.** Drug names are never translated; they must
  match the bottle.

## Challenges

**A real note produced 48 slides, and slide two was a symptom.** A line
reading `Headache (QOD)` under *Medications* was pushed through as a drug, and
RxNorm's fuzzy matcher resolved it to an aspirin and caffeine headache powder.
Every how-to step also had its own slide. We rebuilt both: a line is a
medication only if it reads as a drug order and the resolution shares a word
with what was printed; everything else is shown to the clinician as **Not
used** and the screen does not turn until they have seen it. A how-to is one
screen with its steps numbered on it. That note is now five screens.

**"Real 3D anatomy" was the wrong ask.** We embedded photographic organ models
and they read as gory to someone who has just had bad news, and a third-party
model cannot be marked with *your* fracture. So we removed 3D and drew every
part ourselves: eighteen views, each spot checked against the drawing on a
labelled sheet before it shipped.

**The library was forty conditions and it was nothing.** It is now 205, in the
categories a patient would look under, and the matcher had to grow with it:
punctuation normalised on both sides, guards for phrases that use a
condition's name to mean something else, and a search that takes a name, a
clinical term or a code.

**Design is where the hours went.** Three passes to get from "tasteful but
generic" to something with craft: the interface is drawn in the same ink as
the anatomy, the marks draw themselves, the screen literally turns, the spot
searches the body while a note is read and lands with a bounce. And the
things we took out: cards, shadows, pills, native dropdowns, em dashes, the
system dark mode.

**Free tiers are budgets.** The ElevenLabs tier is 10,000 characters; we spent
half of it on text we then restructured. Audio is cached by text hash, and a
one-line switch reads everything with the browser voice while rehearsing.
Lesson: bake last.

## Accomplishments

- Runs end to end with **zero API keys**, including the published site.
  Adding keys adds voice quality, photo input and a prior-auth letter, never a
  finding.
- **Every anatomical view is hand-drawn**, with every condition's spot placed
  on a real structure.
- A **note-parsing regression** across seven formats (prose H&P, an EHR export
  with codes, a cardiac discharge, a terse ED note, junk under Medications,
  both demo notes) that runs on every change.
- A **refusal discipline** you can demo: type a symptom under Medications and
  watch it get handed back instead of read aloud.
- **The turn.** Nobody else's demo turns the laptop around.

## What we learned

The hard problem was never rendering anatomy or calling a model. It was
refusing to guess in a domain where a confident wrong sentence ("take the
headache powder", "usually inexpensive") is a harm, and making that refusal
visible so a judge, and a clinician, can trust the rest. The second lesson was
that craft is a series of removals.

## What's next

Teach-back: the patient says it back, the tool checks that the three facts
that matter survived. Pharmacist-validated purpose sentences. A bladder for
the kidney drawing. Per-clinic phrasing. And the recorded voice for every
screen once the character budget allows.

---

## Where it came from

This grew out of **PillPile**, a patient-facing checker that photographed pill
bottles and found hidden duplicate ingredients by set intersection over RxNorm
identifiers (Norco plus Tylenol is 5,300 mg of acetaminophen a day). That
engine still powers every medication sentence here. The pivot was realising
the same rigor mattered more on the screen a doctor turns toward a patient,
and its prescriber check now sits on the main screen, under the medicines it
is checking.

---

## Design

The whole thing is built for one moment: a laptop turned toward a patient who
is frightened, may not read well, and may not speak English. Every decision
follows from that.

- **One idea per screen, paced by the voice.** A screen holds one sentence in
  words a twelve-year-old knows, big enough to read from a chair, sized to how
  much is on the screen so it always fits. The next one arrives when the
  reading finishes. The doctor never scrolls.
- **"Where on me" before "what is it."** The picture opens on a whole body,
  hers or his, with a red spot on the place, and only then zooms into the
  part. The drawings are ours, so nothing looks like a specimen.
- **A document, not an app.** Warm paper, Lora and Figtree, hairlines instead
  of boxes, no shadows, no pills.
- **Drawn in the same ink.** The headline underline, the ring around the
  current step, the check marks, the progress strokes, every rule on the page
  and the magnifying glass in the search are hand-drawn strokes, and they
  draw themselves in front of you.
- **The screen turns.** Because that is what is physically happening in the
  room.
- **Paper and Evergreen.** A dark mode only ever on by the button, never by
  the system: a near-black green board with beige ink and beige buttons.
- **Accessible as a baseline.** Every colour pairing clears WCAG AA, the flow
  works from the keyboard, every picture carries a description, motion
  honours reduced-motion, Arabic renders right to left, every screen is read
  aloud, and the story prints on one sheet.
- **Refusal is a feature of the interface.** A line the parser could not use
  is shown under *Not used* rather than guessed at. A drug name is never
  translated. A prescriber check that finds nothing says exactly what it
  checked.

# Impiricus track: five-minute pitch

**Brief:** *Build the next HCP engagement tool.*

**0:00 The room.** "Every HCP engagement strategy is trying to get into one
room: the exam room, at the moment of prescribing. Reps can't be there. Email
isn't there. But the physician is, with a screen, about to explain something
the patient will forget by the parking lot."

**0:40 The demo, live, from the note.** Paste the wisdom-tooth discharge note.
The spot searches the body and lands on the jaw. Point at *Not used*: "it
refused to read the line that wasn't a drug." Press the button and let them
watch the screen turn. Body, jaw, back molars. Ibuprofen in plain words. *How
to rinse the socket with the syringe*, six steps, read aloud. Switch to
Spanish. Print the handout. Ninety seconds.

**2:10 Why this is engagement, not a patient app.** "Patient education is
approved-content territory. Adherence is your shared interest with the
prescriber. This tool is opened *by the physician, in the room, for the
patient*, the one touchpoint a rep never gets, and it earns that by removing
work, not adding a message. *Be the answer, not the ad.*"

**3:00 What Impiricus does with it.** The how-to library and purpose
sentences are the natural home for approved, product-specific patient
materials (a spacer walkthrough, an injection-pen walkthrough) delivered at
the second the clinician needs them, and measurable: which walkthroughs were
turned toward patients this week, in which language, for which drug class.
Signal a rep visit cannot produce. And the prescriber check is on the same
screen, so the moment of prescribing and the moment of explaining are one.

**3:50 The discipline, in one breath.** "Nothing clinical is generated. Every
sentence is curated or quoted, every skipped line is shown, every model call
is optional. That is what makes it something a health system would let into
the room."

**4:20 Ask.** "We want to build the teach-back loop with a partner who
already has the content and the HCP network. That's you."

**4:40 Close.** Turn the laptop around one more time. Leave the jaw on screen.

---

## Track notes

| Track | Fit |
|---|---|
| **Impiricus** | The pitch above. Physician-initiated, in-room, content-delivering, measurable, with the prescriber check on the same screen. |
| **Overall** | A real problem, a working end-to-end demo with no keys that reads any note, a parsing regression, visible refusals. |
| **Best UI/UX** | Hand-drawn anatomy and a hand-drawn interface in the same ink; the turn; one idea per screen paced by the voice; Paper and Evergreen; WCAG AA verified; keyboard, screen reader, reduced motion, right-to-left and print all honoured. |
| **HokieAI sidekick** | *Proposed:* a campus assistant should refuse medication questions. Aperta is what sits on the other side of that boundary. |

## Limitations we will say out loud

Label-derived and library-derived only; 205 conditions; class-based purposes
corrected by visit context but still wrong for some off-label uses, which is
why every sentence is editable and shown first; free machine translation;
deterministic parsing tuned on seven formats; drawings that show where, not
surgical detail; educational demo, not medical advice.
