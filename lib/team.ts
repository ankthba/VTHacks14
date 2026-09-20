/**
 * The people: a name, a college and an ink portrait. Edit here; the page
 * reads this.
 */
export interface Person {
  name: string;
  college: string;
  links: { label: string; href: string }[];
  /** An ink portrait in public/anatomy, drawn like everything else. */
  portrait: string;
}

export const TEAM: Person[] = [
  {
    name: "Aniketh Bandlamudi",
    college: "CS & Applied Math @ UVA",
    links: [
      { label: "aniketh.net", href: "https://aniketh.net" },
      { label: "LinkedIn", href: "https://www.linkedin.com/in/anikethb/" },
    ],
    portrait: "/anatomy/portrait-aniketh.png",
  },
  {
    name: "Lauren Kim",
    college: "Mechanical Engineering & Math @ Virginia Tech",
    links: [{ label: "LinkedIn", href: "https://www.linkedin.com/in/lauren-kim-554ba02bb/" }],
    portrait: "/anatomy/portrait-lauren.png",
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
