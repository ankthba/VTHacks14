# PillPile

**Photograph the pile of pill bottles on the kitchen table. Get back a plain-language,
read-aloud, translated one-pager that flags duplicate medications, dangerous
combinations and dosing problems — with every flag traced to an FDA label.**

Built at VTHacks 14, September 2026.

---

## Educational demo. Not medical advice.

Read this part first.

- **This is not a medical device and not a clinical decision support system.**
  Every screen and every printout carries the line: *Educational demo. Not medical
  advice. Always confirm with your pharmacist or physician.*
- **The output is a list of questions to ask a pharmacist.** It never says "stop
  taking X" or "your dose is wrong", because it is not in a position to know.
- **No real patient data.** The demo runs on synthetic labels. Do not photograph
  another person's prescriptions to try it.
- **Nothing is stored.** No accounts, no database, no medication histories.
  Uploaded photos are read in memory during a single request and never written to
  disk. Session state lives in React and dies with the tab.
- **Silence is a real answer.** When no FDA label mentions a pair, PillPile
  reports nothing rather than letting a model fill the gap. "Nothing was flagged"
  is shown as *"that is not the same as everything is fine"*.

---

## The problem

A patient goes home with **Norco** for pain. Norco is hydrocodone **plus
acetaminophen**. They keep taking **Tylenol** for breakthrough pain, because
nothing on either bottle says these are the same drug.

Neither label contains the sentence "you are now taking acetaminophen twice."

At the doses printed on those two bottles, that is **5,300 mg of acetaminophen a
day** against a labelled ceiling of 3,000–4,000 mg. The people most exposed to
this are the ones least equipped to catch it: elderly patients, patients with
limited English, patients discharged without a pharmacist consult.

PillPile computes that number and shows the arithmetic.

---

## "Can I take this?"

The app was one-shot: scan, read, close. But the question people actually have
arrives later, standing in an aisle at 11pm holding a box of cold medicine.

So the results page carries a check: type or tap a product and it runs the same
deterministic checks against the medicines already on your table, *before* you
buy it.

**The interesting part is that it refuses to guess.** An OTC brand name is not a
product. Measured: "NyQuil" covers at least four marketed formulations, and
three contain acetaminophen while NyQuil Kids Allergy does not. Worse, RxNorm's
fuzzy matcher resolves these silently and wrongly in the *unsafe* direction —
"DayQuil" matched "DayQuil Cough" (dextromethorphan only, hiding the
acetaminophen), and "Advil PM" matched plain "Advil", dropping the
diphenhydramine. A user on Norco would have been told they were fine.

So formulations are enumerated from openFDA and **the user is asked which box
they are holding**, with the acetaminophen-containing ones marked. If nothing
resolves, the app says so and points at the Drug Facts panel rather than
answering. `npm run eval:otc` guards this path specifically.

---

## Reconciliation means comparing two lists

Analysing the bottles on the table is useful, but it is not what
*reconciliation* means. Clinically, reconciliation is comparing what a patient
was discharged on against what they actually have — and the dominant error in
that comparison is not duplication. It is **omission**: a drug on the discharge
list that never made it into the patient's hands, so nobody notices it is gone.

Photograph the discharge paperwork as well as the bottles and PillPile produces
a side-by-side comparison:

| Status | Meaning |
|---|---|
| **MISSING** | On the discharge list, no bottle for it |
| **CONFLICT** | Same medicine, and the two strengths disagree |
| **EXTRA** | A bottle that is not on the discharge list |
| **OK** | On the list and in the pile |

Matching is by **RxNorm ingredient set**, not by name, so "Hydrocodone
bitartrate and acetaminophen" on the paperwork and "Norco" on the bottle are
recognised as the same medicine. A string comparison would report that as an
omission *and* an extra — two false alarms for zero real problems. `rec-05`
through `rec-07` in the eval set exist to keep that honest.

---

## The architecture claim: the dangerous finding is computed, not generated

```
photo(s)
  │
  ├─► [1] EXTRACT     vision model → structured bottle records
  │                   {drug_text, strength, sig, qty, prescriber, fill_date}
  │                   ↓ human-in-the-loop correction UI
  │
  ├─► [2] NORMALIZE   RxNorm → RxCUI + ingredient set + drug classes
  │                   deterministic, no model
  │
  ├─► [3] ANALYZE     a. duplicate ingredient   ← set intersection
  │                   b. duplicate class        ← curated ATC/EPC grouping
  │                   c. cumulative dose        ← arithmetic
  │                   d. pairwise interaction   ← string search over FDA label
  │                   e. reconciliation         ← ingredient-set comparison
  │                                               against the discharge list
  │
  ├─► [4] EXPLAIN     plain language written FROM the findings above only
  │
  └─► [5] DELIVER     one-pager → translation → read-aloud → print
```

**Checks (a), (b) and (c) are pure set operations and arithmetic over RxNorm
identifiers.** They cannot hallucinate a finding and cannot miss one for
stylistic reasons. The acetaminophen result — the strongest moment in the demo —
is `{161} ∩ {161, 5489} ≠ ∅` followed by `325×1×4 + 500×2×4 = 5300`.

**Check (d) splits detection from phrasing.** Detection is a deterministic string
search over the FDA label text we retrieved, and the quote shown to the user is
lifted verbatim from it. A model, if configured, only rewrites that quote into
plain language. It can change the wording; it cannot change whether a finding
exists.

Each finding card in the UI carries a badge saying which of the two it is.

**Consequence: the app produces every finding with no API keys at all.** A model
is needed to read a photo and to translate. It is never the source of a claim.

---

## The wall we hit, and what it forced

The obvious way to build this is `rxnav.nlm.nih.gov/REST/interaction/`. That API
was **discontinued on 2 January 2024**, with no replacement and no migration
path. DrugBank retired its free interaction checker in March 2026. Most tutorials
— and most language models' training data — still recommend the NLM endpoint.

We confirmed it rather than trusting the docs:

```
$ curl -o /dev/null -w "%{http_code}" \
    "https://rxnav.nlm.nih.gov/REST/interaction/interaction.json?rxcui=341248"
404
```

With no interaction database available, the choice was to ask a model from memory
— which is exactly the failure mode a health app cannot afford — or to retrieve
primary source text and reason only over that. We retrieved. That constraint is
the reason the citation UI exists, and it made the project better.

---

## Measured accuracy

The checks are scored against a ground-truth set rather than asserted to work.

```
$ npm run eval

  ingredient  n=10  precision 100.0%  recall 100.0%  F1 100.0%
  class       n=10  precision 100.0%  recall 100.0%  F1 100.0%
  none        n=12  precision 100.0%  recall 100.0%  F1 100.0%
  overall  32/32 correct  (100.0%)

  ---- discharge-list reconciliation ----
  8/8 correct  (100.0%)
```

**Read that number with the right amount of suspicion.** We wrote both the code
and the labels, the set is 40 cases, and it is not clinically adjudicated. What
it is good for is regression and honesty: the set is weighted toward **hard
negatives** — lisinopril + amlodipine, lisinopril + hydrochlorothiazide,
acetaminophen + ibuprofen, omeprazole + amoxicillin — pairs that are commonly
and *intentionally* co-prescribed. A checker that flags those is worse than
useless, because it teaches the patient to ignore it.

The harness started at **84.4%** and found five real defects, described below.

---

## Five bugs the spike test and the eval set found

Nothing here was predictable from the documentation.

**1. `approximateTerm` returns retired concepts.** "Metformin 500 mg" scores
RxCUI `316256` highest. That concept is obsolete: `/properties` returns `{}` and
`/related` returns empty groups, so the drug silently vanished from every check.
Resolution now walks the candidate list until one actually yields ingredients
(landing on `861007`, metformin hydrochloride). Candidates from the GS and MMSL
vocabularies also carry no `name` field at all, so the canonical name is always
read from `/properties`.

**2. Intersecting raw ATC sets fails in both directions.** Lisinopril is `C09AA`
and losartan is `C09CA` — an ACE inhibitor stacked on an ARB, which is worth
asking about, yet they share no ATC code, no EPC and no MOA. They meet only at
the three-character level, `C09`. Meanwhile RxClass maps classes at the
ingredient level across every formulation a drug has ever had, so ibuprofen
carries "cardiac preparations", "vaginal antiinflammatories" and "throat
preparations" alongside the NSAID code — ibuprofen and naproxen share *three*
codes, and naive intersection would emit three findings for one issue.
`lib/classgroups.ts` handles this with curated groups first, then exact EPC, then
route-filtered ATC, returning at most one match per pair.

**3. `limit=1` on openFDA returns the wrong label.** Searching "ibuprofen"
returns an OTC monograph with *no* `drug_interactions` section, while the
prescription label has 3.7 KB of it. Searching "lisinopril" returns
`LISINOPRIL AND HYDROCHLOROTHIAZIDE` — a different product. Retrieval now
requests `_exists_:drug_interactions`, fetches five candidates and scores them
against the ingredient set.

**4. Combination products contaminate every drug's class list.** RxClass maps
classes at the ingredient level, so a single-ingredient drug inherits the ATC
code of every combination it has ever appeared in. Amlodipine carries
`C09XA "Renin-inhibitors"` — from aliskiren/amlodipine — and so looked like
duplicate therapy beside lisinopril. Acetaminophen carries
`N02AJ "Opioids in combination with non-opioid analgesics"` and so looked like
an opioid beside ibuprofen. Four of the five eval failures were this one bug.

The fix is structural rather than a regex over class names: every RxClass record
carries a `minConcept` saying **which concept the mapping came from**, so
mappings are kept only when they originate from the drug's own ingredient-level
concepts. Note this must *exclude* MIN — `related.json?tty=MIN` returns every
combination *containing* the ingredient, which would re-admit exactly the
mappings being rejected.

**5. Withdrawn brands did not resolve at all.** Every `approximateTerm`
candidate for "Vicodin 5-300 mg" is a retired RxCUI: `/properties` and
`/related` both return empty, so a bottle of hydrocodone/acetaminophen produced
**no findings whatsoever**. That is exactly this project's user — the old bottle
at the back of the cabinet. `historystatus` retains the full definition of a
retired concept, including ingredient RxCUIs, per-ingredient strengths and a
pointer to the current generic equivalent. Vicodin now resolves, is labelled
discontinued in the UI, and its acetaminophen counts toward the daily total.

---

## Running it

```bash
npm install
npm run dev
```

Open http://localhost:3000 and pick a prepared example — **no API key is needed**
for the demo scenarios.

To use your own photos, copy `.env.example` to `.env.local` and set
`GEMINI_API_KEY`. Everything else is optional.

| Script | What it does |
|---|---|
| `npm run dev` | Dev server |
| `npm run eval` | Scores every model-free check against the 40-case ground-truth set and exits non-zero on any regression |
| `npm run eval:otc` | Checks over-the-counter resolution — that acetaminophen-containing formulations are found, and that ambiguous brands surface every variant instead of picking one |
| `npm run verify:core` | Runs the demo scenarios plus a negative control through the real pipeline and prints ingredients, findings and schedule |
| `npm run precache` | Walks every scenario and warms `.cache/` |
| `npm run verify:offline` | Re-runs with `PILLPILE_OFFLINE=1`, where a cache miss throws — proves the demo needs no network |

### Demo-day resilience

`.cache/` is **committed on purpose**. Every RxNorm and openFDA response for the
demo set is in the repository, and `npm run verify:offline` proves the whole demo
runs with the network unplugged. Conference wifi fails every year.

---

## iOS app

`ios/` holds a native SwiftUI client. It is a **thin client**: every check runs
server-side and comes back as JSON, so there is exactly one implementation of
the acetaminophen arithmetic and the phone can never disagree with the web app
about a finding.

What it adds over the browser: the real camera, and **offline read-aloud** via
`AVSpeechSynthesizer` — no API key, no network, so the accessibility feature
cannot be taken out by conference wifi. See [ios/README.md](ios/README.md).

---

## Stack

Next.js 16 (App Router) · TypeScript · Tailwind v4 · `zod` on every model
response, with one retry on parse failure · no database.

| Concern | Where |
|---|---|
| RxNorm client | `lib/rxnorm.ts` |
| openFDA retrieval + scoring | `lib/openfda.ts` |
| Class grouping | `lib/classgroups.ts` |
| Deterministic checks | `lib/analyze.ts` |
| Discharge-list reconciliation | `lib/reconcile.ts` |
| OTC resolution + "can I take this?" | `lib/otc.ts`, `lib/checkAddition.ts` |
| Ground-truth eval set | `eval/cases.ts`, `eval/reconcile-cases.ts` |
| Dose parsing | `lib/strength.ts` |
| Label-grounded interactions | `lib/interactions.ts` |
| Model adapters (Gemini / Anthropic) | `lib/llm.ts` |
| Disk cache + offline guard | `lib/cache.ts` |

### Accessibility

Read-aloud uses ElevenLabs when a key is set and falls back to the browser's
speech synthesis otherwise — the feature never simply disappears. The one-pager
targets a 6th-grade reading level, translates to Spanish, Vietnamese, Chinese and
Arabic, and prints to a single sheet for the fridge. The UI is light-only and
high-contrast by choice: the reader may be elderly or low-vision, and the demo
runs on a projector.

---

## Limitations

Stated plainly, because a health project that does not name its limits should not
be trusted.

- **Interactions are label-derived only.** If the FDA label does not mention the
  other drug or its class, PillPile says nothing. This is not a complete
  interaction database, and real interaction databases are not free.
- **No pharmacokinetic modelling.** No CYP450 pathways, no renal or hepatic dose
  adjustment, no age or weight adjustment.
- **English labels only.** The output translates; the source labels do not.
- **Dose totals assume the sig is followed at its maximum.** "As needed" is
  counted at the ceiling, which is the number worth knowing but not necessarily
  what the patient takes.
- **Sig parsing is regex-based** and covers common English patterns. An
  unparseable schedule is reported as unparseable rather than guessed.
- **Duplicate-class grouping is curated**, so it is accurate on the groups it
  covers and silent outside them. The list is in `lib/classgroups.ts` and is
  deliberately short and auditable.
- **OCR can misread a label.** That is why the correction step exists, and why
  anything the model was unsure about is flagged for confirmation before use.
- **A medication that cannot be matched to RxNorm is excluded from every check**,
  and the UI says so explicitly rather than quietly dropping it.
- **Reconciliation matches on ingredient set alone.** Two products with the same
  ingredients but different release profiles — metoprolol tartrate versus
  metoprolol succinate ER — are not distinguished, and a modified-release
  mismatch is a real clinical difference we would currently call a match.
- **"Can I take this?" does not check dose limits for the new product.** Per-dose
  mg is not reliably parseable from an OTC brand name, so it reports shared
  ingredients and classes but will not tell you the combined daily total.
- **It is not yet on iOS.** The feature is web-only for now.
- **Our reported accuracy is self-scored.** We wrote the code and the labels,
  and 40 cases is a small set. Treat it as a regression guard, not a validation.

---

## Data sources

- [RxNorm / RxNav](https://rxnav.nlm.nih.gov/) — U.S. National Library of Medicine
- [RxClass](https://mor.nlm.nih.gov/RxClass/) — ATC, EPC and MOA drug classes
- [openFDA drug labels](https://open.fda.gov/apis/drug/label/) — U.S. Food and Drug Administration
- [DailyMed](https://dailymed.nlm.nih.gov/) — label citations linked from each finding
