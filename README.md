# Aperta

**Explain it once, properly.**

A clinician pastes the note they already wrote. Aperta turns it into what the
patient still understands at home: where on their body, one plain sentence,
each medicine and how to take it, what to do next, and how to actually do it.
In their language, read aloud, one idea per screen, and printed on one sheet
for the fridge. Then the clinician turns the screen around.

Built at VTHacks 14, September 2026, for the Impiricus track: *build the next
HCP engagement tool.*

**Live demo:** https://aniketh.net/aperta/

Paste any note there. The parser, the card builder and the prescriber check
are deterministic code that run in the page itself against RxNorm, the FDA
label and the translator, so the published site needs no server. Photographing
a page and the prior-authorisation draft need the full app with a model key.

---

## Educational demo. Not medical advice.

Every screen and every printout carries that line. Nothing is stored; the note
lives in the tab for one request and is gone when the tab closes. No real
patient data was used; the demo notes are synthetic. The clinician is the
author: every generated sentence is shown to them and is editable before the
screen is turned toward the patient.

---

## Why this is an HCP engagement tool

The most valuable screen in medicine is the one a doctor turns toward a
patient, and nobody owns it. A rep is never in that room. Patient education is
approved-content territory, adherence is the shared interest, and being useful
in that exact moment is *"be the answer, not the ad."*

Underneath is a real problem. Patients forget most of what they are told in a
visit and misremember much of the rest. The evidence-based fix is teach-back,
where the patient says it back in their own words, which a fifteen-minute slot
does not allow. So the explanation becomes an artifact instead, built in the
seconds the clinician already spends explaining, from the note they already
wrote.

---

## What it does

### 1. Start from the note

Paste a discharge summary, an after-visit summary, a clinic note in prose, or
an EHR export that leads with ICD-10 codes. Two example notes sit above the
box. In the full app you can photograph a printed page instead.

While the note is read, the red spot searches the two drawn figures in the
preview, then lands on the place.

### 2. Check what they will hear

Everything the parser found is laid out for review, and everything it could
not use is listed under **Not used** so the clinician sees what was skipped
rather than wondering.

- **What happened.** The diagnosis resolves to one of 205 conditions in 21
  categories, each with a plain sentence, the words a real note uses for it
  and its ICD-10 codes. Search by name, clinical term or code, or browse the
  categories. Hovering a condition previews its drawing and sentence.
- **Medicines.** Each medicine gets a sentence for what it is for and a
  sentence for how to take it, rewritten from the order ("PO TID x 7d" becomes
  "One pill, three times a day. Take it with food. For 7 days."). Both are
  editable.
- **Before you prescribe.** Pick one medicine from the list, or name another,
  and it is checked against the rest: duplicate ingredients and classes,
  labelled interactions, the boxed warning, specific populations, dosing,
  contraindications, and whether a generic exists. Every section is lifted
  from the FDA label with a link back to it. The full app adds a
  prior-authorisation draft assembled from the same evidence.
- **What to do.** Instructions and follow-up, with common ones a click away.
- **How to do it.** Instructions that name a procedure attach a walkthrough:
  rinsing a tooth socket with the syringe, an inhaler with a spacer, crutches,
  eye drops, a sling, a dressing change, an injection pen, ice and elevation,
  looking after a splint or cast.
- **Language.** English, Spanish, Vietnamese, Chinese (Simplified), Arabic.
  Arabic renders right to left. Drug names are never translated, because the
  patient has to match them to the bottle.

### 3. Turn the screen around

The clinician's page swings away and the patient's page swings in. The story
is short on purpose: one picture, one screen per medicine, one screen of what
to do, one screen per walkthrough with its steps numbered on it, and an end. A
typical visit is six to nine screens.

- The picture opens on a whole body, hers or his, with a red spot on the
  place, holds a beat, then zooms into the drawing of the part with the
  structure marked. Tap to zoom back out.
- Each screen is read aloud and advances when the reading finishes. Space
  pauses, arrows move, the strokes along the top jump to a screen.
- Type is sized to the amount of text on the screen, so a long thought sets
  smaller and the whole screen fits without scrolling.
- **Print this** produces a one-sheet handout: the drawing beside the
  sentence, medicines in rows, a tick-box list of what to do, each walkthrough
  numbered, the disclaimer at the foot.

### The anatomy

Every drawing is our own ink: the body figures, head, eye, ear, mouth, neck,
shoulder, elbow, wrist and hand, heart, lungs, abdomen, kidneys and bladder,
spine, hip, knee, ankle and foot, skin. Eighteen views. The drawings are
rendered as masks over the page's ink colour, so the same files are black on
paper and beige on the dark board. The red spot is a real structure every
time: for a broken wrist it sits on the lower end of the radius, for a torn
meniscus on the joint line, for wisdom teeth on the back molars.

The anatomy library at `/diagrams` shows every view and every condition with
its spot, grouped by category, with a one-line explanation of each part on
hover.

---

## What it refuses to do

This is the part we would put on a poster.

- **It never invents a medication.** A line under *Medications* is a drug only
  if it reads as a drug order. A note with `Headache (QOD)` in that section
  once became an aspirin and caffeine headache powder, because RxNorm's fuzzy
  matcher will resolve almost anything to *something*. A resolution is trusted
  only if the printed name shares a word with the canonical one or carried a
  dose. Everything else goes under **Not used**.
- **It never says "ask your pharmacist."** The doctor is in the room. Ninety
  drug classes have a curated sentence; a visit-context layer wins where the
  class is misleading (topiramate for a migraine patient is *"taken every day
  to make migraines happen less often"*, not *"prevents seizures"*); the
  label's own indication is the next fallback; and the clinician can reword
  anything.
- **It never translates a drug name.**
- **It never shows a specimen.** No 3D, no stock illustration. A drawing of the
  part with a spot on it answers *"where on me"*, and it prints.
- **The model, when present, only translates or fills parsing gaps.** Which
  drawing and which sentence a diagnosis becomes is decided by the library.
  Nothing clinical is generated.
- **The prescriber check reports what it checked, not a clearance.** "No
  duplicate ingredient, duplicate class, or labelled interaction found" is
  stated as exactly that.

---

## How it works

```
paste the note (or photograph it)
  │
  ├─► PARSE       diagnoses, medications and directions, instructions, follow-up
  │               deterministic first: section headers, ICD-10 codes, dose
  │               patterns, prose cues; a model fills gaps only if configured
  │
  ├─► MATCH       diagnosis → the condition library
  │               an ICD-10 code outranks any phrase; the longest synonym wins;
  │               a diagnosis with a specific drawing beats a whole-body one
  │
  ├─► EXPLAIN     one plain sentence per medicine from a class map (~90 classes)
  │               plus a visit-context layer; directions rewritten in words
  │
  ├─► CHECK       one medicine against the rest: RxNorm identities, class
  │               groups, openFDA label sections, NDC counts for access
  │
  ├─► HOW-TO      instructions that name a procedure attach a walkthrough
  │
  ├─► TRANSLATE   MyMemory, sentence by sentence, cached; a model if configured
  │
  └─► TURN THE SCREEN
```

**Deterministic first.** The library decides. A model, when a key is present,
is used for three things only: reading a photographed page, translating a
whole card in one batch, and filling gaps in unstructured prose. Its output
goes through the same schema and the same library match as everything else.

**Cache.** Every external GET goes through one pluggable cache. In the browser
it is a map for the life of the tab. On the server it is a disk store under
`.cache`, committed to the repo, so the demo set works with the wifi
unplugged. `PILLPILE_OFFLINE=1` makes a cache miss throw, which is how we prove
the demo set is fully pre-cached.

**Static site.** GitHub Pages has no server, so the published site runs the
same code in the page. Server routes are moved aside for the build, and the
two example notes ship with pre-built cards so they work identically.

---

## Design

The whole interface is built for one moment: a laptop turned toward a person
who is frightened, may not read well, and may not speak English.

- **A document, not an app.** Warm paper, Lora for headlines and Figtree for
  text, hairlines instead of boxes, no shadows, no pills.
- **Drawn in the same ink as the anatomy.** The headline underline, the ring
  around the current step, the check marks, the progress strokes and every
  rule on the page are hand-drawn strokes, and they draw themselves in front
  of you. Buttons are soft, slightly uneven shapes that lift on hover and
  settle when pressed.
- **The screen turns.** Because that is what is physically happening.
- **Paper and Evergreen.** A dark mode that is only ever on by the button,
  never by the system setting: a near-black green board with beige ink and
  beige buttons. The choice is remembered in that browser.
- **Accessible as a baseline.** Every colour pairing clears WCAG AA, the flow
  works from the keyboard, every picture carries a description, motion honours
  the reduced-motion setting, Arabic reads right to left, every screen is read
  aloud, and the story prints on one sheet.

---

## Running it

```bash
npm install
npm run dev          # http://localhost:3000
```

No API key is needed for anything except photographing a page and the
prior-auth draft. Keys go in `.env.local`.

| Variable | What it does |
|---|---|
| `ELEVENLABS_API_KEY` | Natural read-aloud. The free tier is 10,000 characters; clips are cached to `.cache/tts` by text hash. Without it, the browser voice reads. |
| `ELEVENLABS_VOICE_ID`, `ELEVENLABS_MODEL` | Override the premade voice (Sarah) and the multilingual model. |
| `GEMINI_API_KEY` or `ANTHROPIC_API_KEY` | Photographing a printed note, one-batch translation, gap-filling on unstructured prose, the prior-auth letter. `LLM_PROVIDER` picks one when both are set. |
| `OPENFDA_API_KEY` | Optional. Raises the openFDA rate limit. |
| `NEXT_PUBLIC_VOICE=browser` | Reads every screen with the browser's own voice, no recorded or generated audio. Set while rehearsing so nothing costs characters. |
| `TTS_DISABLED=1` | The server never calls ElevenLabs. Cached clips still play. |
| `PILLPILE_OFFLINE=1` | A cache miss throws instead of hitting the network. |

### Scripts

```bash
npm run typecheck      # tsc
npm run verify         # typecheck + the note-parsing regression (7 note formats)
npm run verify:explain # just the regression
npm run precache:tts   # generate the demo audio through the real pipeline
npm run export:demo    # prebuild the demo bundle into public/demo (dev server must be up)
npm run export:static  # static site for /aperta into ./out
```

`export:static` builds with `basePath: /aperta`, the server routes moved
aside, and the browser voice unless you pass `VOICE=elevenlabs`. Copy `out/`
to `aperta/` in the site repo. The site root needs a `.nojekyll` file, or
Pages silently drops the `_next/` directory and the page arrives unstyled.
Pages only honours a `404.html` at the site root, so that file hands
`/aperta/` misses to Aperta's own not-found page.

### Where things are

```
app/page.tsx              the composer and the turn
app/diagrams/page.tsx     the anatomy library
app/api/                  explain, parse-note, prescribe, prior-auth, tts
components/PatientStory   the patient screen, read-aloud, the print sheet
components/BodyLocator    the body figure, the spot, the zoom into the part
components/Diagram        a drawing with its spots (or line art where none exists)
components/Ink            the hand-drawn interface marks
lib/anatomy/conditions    the 205 conditions, synonyms, ICD-10, matching
lib/anatomy/art           every drawing and where each spot sits on it
lib/anatomy/views         one-line explanations of each view
lib/parseNote             deterministic note parsing
lib/explain               the card: sentences, how-tos, translation
lib/plainPurpose          the drug-class sentence map and the context layer
lib/prescribeCheck        the prescriber check
lib/rxnorm, openfda       the public data sources, through the cache
public/anatomy/           the drawings, as transparent PNGs used as masks
```

---

## Data and assets

RxNorm and RxClass from the National Library of Medicine, openFDA drug labels
and the NDC directory, MyMemory for translation, ElevenLabs for the voice when
enabled, Lora and Figtree from Google Fonts. The anatomy drawings and the
interface marks are our own.

## Where it came from

The project began as PillPile, a patient-facing checker that found hidden
duplicate ingredients (Norco plus Tylenol is 5,300 mg of acetaminophen a day)
by set intersection over RxNorm identifiers. That engine still powers every
medication sentence here and the prescriber check. The pivot was recognising
that the same discipline, computed, cited, refusing to guess, mattered more on
the screen a doctor turns toward a patient.

## Limitations

- A diagnosis outside the 205 conditions gets the note's own words and a body
  outline, and the clinician is told so.
- Plain-language mapping is by drug class, corrected by visit context for the
  conditions we cover. It can still be wrong for an off-label use, which is
  why the sentence is editable and shown before the screen turns.
- Free translation is sentence-at-a-time machine translation. Good enough for
  short sentences; not clinically validated.
- Parsing is deterministic and tuned on a handful of note formats. It will
  miss things in unusual layouts, and it says what it skipped rather than
  guessing.
- The drawings show *where*, not surgical detail.
- Plan formularies and prior-authorisation status are not in any free dataset
  and are not guessed at. Access is counted from the NDC directory only.
