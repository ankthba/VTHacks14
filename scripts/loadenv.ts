import { readFileSync } from "fs";
import path from "path";

/**
 * Loads .env.local for standalone scripts.
 *
 * Next.js loads .env.local automatically; `tsx` does not. Without this, a
 * script reports "no provider configured" even when the key is sitting in the
 * file, which is a confusing way to lose ten minutes.
 *
 * Real environment variables win, so `GEMINI_API_KEY=... npm run ...` still
 * overrides the file.
 */
export function loadEnvLocal(file = ".env.local") {
  let raw: string;
  try {
    raw = readFileSync(path.join(process.cwd(), file), "utf8");
  } catch {
    return;
  }

  for (const line of raw.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;

    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;

    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();

    // Strip one layer of matching quotes.
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (key && process.env[key] === undefined) process.env[key] = value;
  }
}
