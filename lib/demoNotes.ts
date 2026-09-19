/**
 * The two demo notes. Their audio is pre-generated in English and Spanish
 * (.cache/tts, committed), so on stage nothing is fetched - which also means
 * these are the ones to demo with, since the free ElevenLabs budget is spent.
 */
export const DEMO_NOTES: { id: string; title: string; note: string }[] = [
  {
    id: "wrist",
    title: "Broken wrist - discharge summary",
    note: `DISCHARGE SUMMARY
Discharge Diagnosis: Distal radius fracture, left, nondisplaced
Discharge Medications:
1. Ibuprofen 600 mg PO TID with food x 7 days
2. Acetaminophen 500 mg 1-2 tabs PO q6h PRN pain
Discharge Instructions:
- Keep splint clean and dry
- Elevate arm above heart when possible
Follow-up:
- Orthopedics clinic in 2 weeks for repeat X-ray
- Return to ED for numbness, blue fingers, or uncontrolled pain`,
  },
  {
    id: "wisdom",
    title: "Wisdom teeth out - post-op instructions",
    note: `Post-op instructions after wisdom tooth extraction
Dx: impacted third molars s/p extraction
Rx: ibuprofen 600 mg q6h prn pain
Instructions:
- Starting day 3, irrigate the sockets with the syringe after meals and at bedtime
- Ice 20 min on / 20 off for 48 hours
- Soft foods for one week. No straws, no smoking.
Follow-up: return in 1 week for check; call if fever or severe pain`,
  },
];
