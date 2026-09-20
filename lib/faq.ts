/** Questions, answered plainly. Edit here; the page reads this. */
export const FAQ: { q: string; a: string }[] = [
  {
    q: "What is Aperta?",
    a: "A tool for the moment a clinician turns their screen toward a patient. Paste the note you already wrote and it becomes what the patient still understands at home: where on their body, one plain sentence, each medicine and how to take it, what to do next and how to do it, read aloud in their language and printed on one sheet.",
  },
  {
    q: "Is this medical advice?",
    a: "No. Aperta is an educational demo. It rewrites what a clinician has already decided into plainer words and pictures, and the clinician reviews every sentence before the screen turns. Medication changes, treatment decisions and questions about symptoms belong with your pharmacist or physician.",
  },
  {
    q: "Does it store the note I paste?",
    a: "No. The note lives in your browser tab for one request and is gone when you close the tab. There is no account, nothing is uploaded to us, and the published site has no server at all: the parsing happens in the page.",
  },
  {
    q: "Who is it for?",
    a: "Clinicians first: doctors, dentists, nurses and pharmacists explaining a diagnosis, a prescription or a procedure. The screen it produces is for the patient, and for whoever helps them at home.",
  },
  {
    q: "Does it use AI?",
    a: "Only at the edges. The parser, the condition library and the drug-class sentences are deterministic code and curated data grounded in RxNorm and the FDA label; the demo runs with no model key at all. When a key is present, a model can read a photographed page, translate a card in one batch and fill gaps in unstructured prose, and everything it returns goes through the same library match as everything else. Nothing clinical is generated.",
  },
  {
    q: "Can I rely on every sentence?",
    a: "Treat it the way the clinician does: as a draft they check. What a medicine is for comes from its drug class, corrected for the visit where we cover it, and can still be wrong for an off-label use, which is why every sentence is editable and shown before the screen turns. Anything the parser could not use is listed under Not used rather than guessed at.",
  },
  {
    q: "Which languages does it speak?",
    a: "English, Spanish, Vietnamese, Chinese (Simplified) and Arabic, read aloud by the browser's own voice. Drug names are never translated, because the patient has to match them to the bottle.",
  },
  {
    q: "Where do the drawings come from?",
    a: "We drew them. Every body, bone and organ, and every walkthrough picture, is our own ink, and the red spot always sits on a real structure. There is no 3D and no stock illustration, because a photographic organ is the last thing a frightened person needs to see.",
  },
  {
    q: "What does the prescriber check look at?",
    a: "One medicine against the rest of the list: duplicate ingredients and classes, labelled interactions, the boxed warning, specific populations, dosing, contraindications and whether a generic exists. Every section is lifted from the FDA label with a link back to it. When it finds nothing it says exactly what it checked, not that a drug is safe.",
  },
  {
    q: "How can I reach the team?",
    a: "Open an issue on the GitHub repository.",
  },
];
