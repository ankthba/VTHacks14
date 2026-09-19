import { createHash } from "crypto";
import { promises as fs } from "fs";
import path from "path";

const CACHE_DIR = path.join(process.cwd(), ".cache");

/**
 * Demo-day resilience: every external GET is cached to disk and the cache is
 * committed to the repo. With PILLPILE_OFFLINE=1 a cache miss throws instead of
 * hitting the network, which is how we prove the demo set is fully pre-cached.
 */
export const OFFLINE = process.env.PILLPILE_OFFLINE === "1";

function keyFor(url: string) {
  return createHash("sha256").update(url).digest("hex").slice(0, 32);
}

async function readCache(key: string): Promise<unknown | null> {
  try {
    const raw = await fs.readFile(path.join(CACHE_DIR, `${key}.json`), "utf8");
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

async function writeCache(key: string, value: unknown) {
  try {
    await fs.mkdir(CACHE_DIR, { recursive: true });
    await fs.writeFile(
      path.join(CACHE_DIR, `${key}.json`),
      JSON.stringify(value),
      "utf8",
    );
  } catch {
    // A read-only filesystem (Vercel) is fine - we just lose the write.
  }
}

/** GET JSON with a persistent disk cache. Returns null on any failure. */
export async function cachedGet<T = unknown>(url: string): Promise<T | null> {
  const key = keyFor(url);
  const hit = await readCache(key);
  if (hit !== null) return hit as T;

  if (OFFLINE) {
    throw new Error(`Cache miss in offline mode: ${url}`);
  }

  try {
    const res = await fetch(url, {
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(12_000),
    });
    // openFDA returns 404 for "no matching label", which is a real answer.
    if (res.status === 404) {
      await writeCache(key, { __notFound: true });
      return null;
    }
    if (!res.ok) return null;
    const json = (await res.json()) as T;
    await writeCache(key, json);
    return json;
  } catch {
    return null;
  }
}

/** Unwraps the sentinel we store for 404s. */
export function isNotFound(v: unknown): boolean {
  return !!v && typeof v === "object" && "__notFound" in (v as object);
}
