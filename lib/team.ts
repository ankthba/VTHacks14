/**
 * The people: a name and a college. Edit here; the page reads this. A person
 * without a photo gets their initials in a drawn ring.
 */
export interface Person {
  name: string;
  college: string;
  links: { label: string; href: string }[];
  photo?: string;
}

export const TEAM: Person[] = [
  {
    name: "Aniketh Bandlamudi",
    college: "University of Virginia",
    links: [
      { label: "aniketh.net", href: "https://aniketh.net" },
      { label: "GitHub", href: "https://github.com/ankthba" },
    ],
  },
  {
    name: "Lauren Kim",
    college: "Virginia Tech",
    links: [],
  },
];

export const VALUES: { title: string; text: string }[] = [
  { title: "Plain language first", text: "One sentence a person can repeat back. Clear does not mean simplistic: we keep what matters and take out what gets in the way." },
  { title: "Nothing stored", text: "The note lives in the tab for one request and is gone when the tab closes. No account, no upload, no history." },
  { title: "The library decides", text: "Which drawing and which sentence a diagnosis becomes is curated, not generated. A model, when present, only translates or fills gaps." },
  { title: "Refusal is a feature", text: "A line the parser cannot use is shown under Not used rather than guessed at. A drug name is never translated. A check that finds nothing says exactly what it checked." },
  { title: "Drawn by hand", text: "Every body, bone and organ is our own ink, with the red spot on a real structure. No 3D, no stock illustration." },
  { title: "Designed for the room", text: "People take this in while frightened, hurried or in pain, on a laptop turned toward them. One idea per screen, read aloud, printed to keep." },
];
