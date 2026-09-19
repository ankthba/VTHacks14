# Aperta

**Explain it once, properly.**

A clinician pastes the discharge summary. The tool turns it into what the
patient still understands at home: where on their body, one plain sentence,
each medicine and how to take it, what to do next, and how to actually do it —
in their language, read aloud, one idea per screen, printed for the fridge.

Built at VTHacks 14, September 2026, for the Impiricus track: *build the next
HCP engagement tool.*

**Live demo:** https://aniketh.net/aperta/ — the two example notes, in English
and Spanish, with their audio. (Static site; live parsing of any note runs in
the full app below.)

---

## Educational demo. Not medical advice.

Every screen and printout carries that line. Nothing is stored — the note lives
for one request. No real patient data was used; the demo notes are synthetic.
The clinician is the author: every generated sentence is shown to them and is
editable before the screen is turned toward the patient.

---

## Why this is an HCP engagement tool

The most valuable screen in medicine is the one the doctor turns toward the
patient, and nobody owns it. A rep can never be in that room. Patient education
is core approved-content territory, adherence is the shared interest, and
being genuinely useful in that moment is *"be the answer, not the ad."*

Underneath is a real problem: patients forget most of what they are told in a
visit and misremember much of the rest. The evidence-based fix is teach-back,
which a fifteen-minute slot does not allow. So the explanation becomes an
artifact instead — built in the seconds the clinician already spends explaining,
from the note they already wrote.

---

## The flow

```
paste the note (or photograph it)
  │
  ├─► PARSE       diagnoses, medications + directions, instructions, follow-up
  │               deterministic first (headers, ICD-10, dose patterns, prose);
  │               a model fills gaps only if one is configured
  │
  ├─► MATCH       diagnosis → curated library (40 conditions, 12 anatomical views)
  │               ICD-10 code outranks any phrase; longest synonym wins
  │
  ├─► EXPLAIN     one plain sentence per medicine, from a curated class map
  │               (~90 classes) + a visit-context layer; directions rewritten
  │               ("PO TID x 7d" → "One pill, three times a day. For 7 days.")
  │
  ├─► HOW-TO      instructions that name a procedure attach a walkthrough
  │               (socket irrigation, inhaler + spacer, crutches, eye drops…)
  │
  ├─► TRANSLATE   Spanish, Vietnamese, Chinese, Arabic — free, key-less, cached
  │
  └─► TURN THE SCREEN
                  whole body → region glows → zoom into the marked drawing;
                  one screen per idea; read aloud; advances when the voice
                  finishes; prints on one sheet
```

## What it refuses to do

This is the part we would put on a poster.

- **It never invents a medication.** A line under *Medications* is a drug only
  if it reads as a drug order. A note with `Headache (QOD)` in that section
  once became an aspirin/caffeine headache powder — RxNorm's fuzzy matcher will
  resolve almost anything to *something*. A resolution is now trusted only if
  the printed name shares a word with the canonical one or carried a dose.
  Everything else is handed to the clinician as **Not used**, and the screen
  does not turn until they have seen it.
- **It never says "ask your pharmacist."** The doctor is in the room. Ninety
  drug classes have a curated sentence; a visit-context layer wins where the
  class is misleading (topiramate for a migraine patient is *"taken every day to
  make migraines happen less often"*, not *"prevents seizures"*); the label's
  own indication is the next fallback; and the clinician can reword anything.
- **It never translates a drug name.** The patient has to match it to the
  bottle.
- **It never shows a specimen.** The default picture is a whole-body locator
  zooming into a marked line drawing — it answers *"where on me"*, which a
  third-party 3D model cannot, and it prints. 3D is opt-in.
- **The model, when present, only translates or fills parsing gaps.** Which
  diagram and which plain sentence a diagnosis becomes is decided by the
  library. Nothing clinical is generated.

## The story is short on purpose

One picture, one screen per medicine, one screen of what to do, one screen per
how-to with its steps numbered on it, and an end. A typical visit is six to nine
screens. An earlier version put every how-to step on its own screen and turned
one note into 48; nobody sits through that.

---

## Running it

```bash
npm install
npm run dev          # http://localhost:3000
```

No API key is needed for anything above except photographing a page. Two demo
notes sit above the note box; their audio is pre-generated in English and
Spanish and committed, so the demo runs with the wifi unplugged.

| Key | Unlocks |
|---|---|
| `ELEVENLABS_API_KEY` | Natural read-aloud. Free tier is 10,000 characters; clips are cached to `.cache/tts` by text hash. Without it, the browser voice reads. |
| `GEMINI_API_KEY` | Photographing a printed note; one-batch translation; gap-filling on unstructured prose. |

```bash
npm run verify         # typecheck + note-parsing regression + medication evals
npm run precache:tts   # generate demo audio through the real pipeline
npm run export:demo    # prebuild the demo bundle (needs the dev server up)
npm run export:static  # static site for /aperta -> ./out
```

### Publishing the static demo

GitHub Pages has no server, so the published site is the demo in "static
mode": `export:demo` runs both example notes through the real pipeline and
saves the parse, the card per language and every cached clip into
`public/demo`; `export:static` builds with `basePath: /aperta` and the server
routes moved aside. Copy `out/` to `aperta/` in the site repo. The site root
needs a `.nojekyll` file, or Pages silently drops the `_next/` directory and
the page arrives unstyled.

## Surfaces

| Route | |
|---|---|
| `/` | The explain tool. Clinician side, then *Turn the screen around* |
| `/diagrams` | The anatomy library — every condition with its structure marked |
| `/clinician` | Prescriber check: label-grounded interactions, renal/hepatic sections, access, prior-auth draft |
| `/pillpile` | The original patient medication checker this grew out of |
| `/labels` | Printable synthetic bottle labels for props |

## Where it came from

The project began as PillPile, a patient-facing checker that found hidden
duplicate ingredients (Norco + Tylenol → 5,300 mg of acetaminophen a day) by
set intersection over RxNorm identifiers, with a 40-case eval that caught five
real bugs. That engine still powers every medication sentence here. The pivot
was recognising that the same discipline — computed, cited, refusing to guess —
mattered more on the screen a doctor turns toward a patient.

## Limitations

- The condition library is 40 conditions. A diagnosis outside it gets the note's
  own words and a body outline, and the clinician is told so.
- Plain-language mapping is by drug class, corrected by visit context for the
  conditions we cover. It can still be wrong for an off-label use; that is why
  the sentence is editable and shown before the screen turns.
- Free-tier translation (MyMemory) is sentence-at-a-time machine translation.
  Good enough for six-word sentences; not clinically validated.
- Parsing is deterministic and tuned on four note formats. It will miss things
  in unusual layouts, and it says what it skipped rather than guessing.
- Drawings are schematic by design. They show *where*, not surgical detail.

## Data and assets

RxNorm / RxClass (NLM) · openFDA drug labels · MyMemory translation · ElevenLabs
· 3D models from Sketchfab under CC BY (attributed in-app) · Instrument Serif /
Instrument Sans.
