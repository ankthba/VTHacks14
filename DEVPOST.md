# Aperta: Devpost

## One line

Paste the discharge note. Turn the screen around. The patient understands.

**Try it:** https://aperta.health/ (paste any note) · **Code:** https://github.com/ankthba/VTHacks14

## Inspiration

Patients often forget most of what they are told in a visit and misremember much of the rest. The fix is using a platform that can explain and retain the information from a doctor's visit. It takes minutes; a fifteen-minute slot does not have. So the forgotten visit quickly turns around to be a simple instruction sheet that can help the patient tenfold.

We believe the most valuable screen in medicine is the one the doctor turns toward the patient. It brings clarity from misrecollection.

## What it does

A clinician pastes the note they already wrote: a discharge summary, an after-visit summary, a clinic note, an EHR export with ICD-10 codes. Aperta assembles what the patient needs and shows the clinician every sentence before the screen turns.

- **Where on me**: A hand-drawn body with a red spot over the place, then a zoom into a drawing of the part with the structure marked: *this* bone, *this* socket. Every drawing is hand-drawn, eighteen views, and every spot is a real structure.
- **What happened**: In one sentence, a person can repeat back from a library of 205 conditions in 21 categories.
- **Each medicine**: Clear instructions on when and how many times the patient should take the medicine.
- **Before you prescribe**: On the same screen, one medicine is checked against the rest: duplicates, labelled interactions, the boxed warning, specific populations, dosing, contraindications, whether a generic exists. Lifted from the FDA label, with a link back to it.
- **What to do next** & **how to actually do it**: Nine step-by-step walkthroughs (rinsing a tooth socket with the syringe, an inhaler with a spacer, crutches, eye drops, a sling, a dressing, an injection pen, ice and elevation, splint care), attached automatically when the note calls for them.
- In **Spanish, Vietnamese, Chinese, or Arabic** & **read aloud features**: Each screen is read aloud, with ElevenLabs on the example notes and the browser's own voice for anything else. Additionally, there is a print-out feature for the HCP to share with the patient.

## How we built it

Next.js 16 with the App Router, TypeScript and Tailwind v4, exported as a fully static site. Drug identity and class come from RxNorm and RxClass, labels and packaging from openFDA, translation from MyMemory, which needs no key. Read-aloud uses ElevenLabs clips baked in at build time for the example notes, and the browser's own voice for anything a clinician pastes. Every drawing was made by hand in Procreate and exported as black ink on transparency, so one file reads as black ink on paper and beige ink on the dark board.

The published site has no backend and needs none. The parser, the card builder and the prescriber check are ordinary TypeScript running in the page, so any note pasted at the demo link works with no key, and the note itself never reaches a server of ours.

Four rules run through the code:

- **Parsing is deterministic first.** Around eighty section-header aliases, ICD-10 prefixes on every condition, dose patterns, pipe-delimited EHR fields, and a prose scan for notes written with no headers at all. A model fills gaps only when one is configured, and the demo runs with none.
- **The library decides what a diagnosis becomes.** Each of the 205 conditions carries the words a real note uses for it ("NSTEMI", "Colles", "HNP", "s/p extraction") and its ICD-10 prefixes. A code outranks any phrase, the longest phrase wins, and "ST depression" on an ECG line is not depression.
- **What a medicine is for comes from 95 curated class rules**, keyed on ATC and EPC identifiers rather than drug names, then a visit-context layer for the cases where the class alone misleads, then the label's own indication. Never "ask your pharmacist", because the doctor is in the room.
- **Translation only translates.** Drug names pass through untouched, because the patient has to match them to the bottle.

Nothing clinical is generated. Which drawing, which sentence and which warning a note turns into is decided by code and by the library, and the clinician reads all of it before the screen turns around.

## Challenges

**A real note produced 48 slides, and slide two was a symptom.** A line reading `Headache (QOD)` under *Medications* was pushed through as a drug, and RxNorm's fuzzy matcher resolved it to a headache powder. Every step of every how-to had a slide of its own as well. Now a line is a medication only if it reads as a drug order and the resolution shares a word with what was printed, anything else is handed back to the clinician under **Not used**, and a walkthrough is one screen with its steps numbered on it. That note is five screens.

**No two notes are written the same way.** Testers pasted things the parser had never seen: "Medicine:" where we expected "Medications", sigs that started with a dash, prose with no headers anywhere, and a second note pasted over the first that left the old prescription sitting on screen. Each one became a case in a regression suite that now runs eight note formats on every change, so fixing one note cannot quietly break another.

**"Real 3D anatomy" was the wrong ask.** Photographic organ models read as gory to someone who has just had bad news, and a third-party model cannot be marked with *your* fracture. So we cut 3D and drew all eighteen views ourselves. Getting them in took a small pipeline of its own: crop each drawing to its ink, recolour it to the ink of the page, then print a labelled sheet of every condition's red spot on its drawing and check them by eye. The spot for a Colles fracture sits on the lower end of the radius because someone looked.

**Design is where the hours went.** Three passes to get from tasteful-but-generic to something with craft: the interface is drawn in the same ink as the anatomy, the marks draw themselves, the screen literally turns, and the spot searches the body while a note is read and lands with a bounce. The rest was subtraction: cards, shadows, pills, native dropdowns, the system dark mode.

## Accomplishments that we're proud of

- Runs end to end with **zero API keys**, including the published site. Keys add voice quality, photo input and a prior-auth letter, never a finding.
- **Every anatomical view is hand-drawn**, with every condition's spot on a real structure.
- A **note-parsing regression** across eight formats that runs on every change.
- A **refusal discipline** you can demo: type a symptom under Medications and watch it get handed back instead of read aloud.
- **The turn.** Nobody else's demo turns the laptop around.

## What we learned

The hard problem was never rendering anatomy or calling a model. It was refusing to guess in a domain where a confident wrong sentence is a harm, and making that refusal visible so a judge, and a clinician, can trust the rest. The second lesson: craft is a series of removals.

## What's next

Teach-back: the patient says it back, the tool checks that the three facts that matter survived. Pharmacist-validated purpose sentences. Per-clinic phrasing. The recorded voice on every screen once the character budget allows.

*Educational demo. Not medical advice. No real patient data was used.*

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
