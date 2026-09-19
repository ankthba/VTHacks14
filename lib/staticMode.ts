/**
 * Demo mode for the static build (GitHub Pages has no server).
 *
 * The two demo notes are prebuilt - parse result, the card in each language,
 * and the audio clip for every slide that had one - into public/demo by
 * scripts/export-demo.ts. The composer reads those instead of calling /api.
 * Anything else is honestly out of scope for the static site and says so.
 */
export const IS_STATIC = process.env.NEXT_PUBLIC_STATIC === "1";
export const BASE = process.env.NEXT_PUBLIC_BASE_PATH || "";

export function asset(path: string) {
  return `${BASE}/${path.replace(/^\//, "")}`;
}

export interface DemoBundle {
  notes: {
    id: string;
    title: string;
    note: string;
    parse: Record<string, unknown> & { conditionId: string | null; conditionLabel: string | null; conditionPlain: string | null };
    cards: Record<string, unknown>;
  }[];
  languages: string[];
}

let cached: Promise<DemoBundle> | null = null;
export function loadDemoBundle(): Promise<DemoBundle> {
  if (!cached) cached = fetch(asset("demo/index.json")).then((r) => r.json());
  return cached;
}
