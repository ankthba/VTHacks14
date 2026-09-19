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

## Three things the spike test changed

Building this surfaced three problems that a plan on paper would not have caught.

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
| `npm run verify:core` | Runs the three demo scenarios plus a negative control through the real pipeline and prints ingredients, findings and schedule |
| `npm run precache` | Walks every scenario and warms `.cache/` |
| `npm run verify:offline` | Re-runs with `PILLPILE_OFFLINE=1`, where a cache miss throws — proves the demo needs no network |

### Demo-day resilience

`.cache/` is **committed on purpose**. Every RxNorm and openFDA response for the
demo set is in the repository, and `npm run verify:offline` proves the whole demo
runs with the network unplugged. Conference wifi fails every year.

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

---

## Data sources

- [RxNorm / RxNav](https://rxnav.nlm.nih.gov/) — U.S. National Library of Medicine
- [RxClass](https://mor.nlm.nih.gov/RxClass/) — ATC, EPC and MOA drug classes
- [openFDA drug labels](https://open.fda.gov/apis/drug/label/) — U.S. Food and Drug Administration
- [DailyMed](https://dailymed.nlm.nih.gov/) — label citations linked from each finding
