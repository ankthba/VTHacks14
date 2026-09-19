/**
 * Every external GET goes through here, with a cache in front of it.
 *
 * The cache is a pluggable store. In the browser (the published site parses
 * and builds in the page itself) it is a Map for the life of the tab. On the
 * server, lib/cache.node.ts installs a disk store under .cache that is
 * committed to the repo, so the demo set works with the wifi down. With
 * PILLPILE_OFFLINE=1 a miss throws instead of hitting the network, which is
 * how we prove the demo set is fully pre-cached.
 */
export interface CacheStore {
  get(key: string): Promise<unknown | null>;
  set(key: string, value: unknown): Promise<void>;
}

const memory = new Map<string, unknown>();
let store: CacheStore = {
  async get(key) { return memory.has(key) ? (memory.get(key) as unknown) : null; },
  async set(key, value) { memory.set(key, value); },
};

export function setCacheStore(s: CacheStore) { store = s; }

export const OFFLINE = process.env.PILLPILE_OFFLINE === "1";

/** Read any cached value by key. */
export async function cacheGet<T = unknown>(key: string): Promise<T | null> {
  return (await store.get(key)) as T | null;
}
/** Remember any value by key. */
export async function cacheSet(key: string, value: unknown): Promise<void> {
  await store.set(key, value);
}

/** GET JSON with a cache in front. Returns null on any failure. */
export async function cachedGet<T = unknown>(url: string): Promise<T | null> {
  const hit = await store.get(url);
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
      await store.set(url, { __notFound: true });
      return null;
    }
    if (!res.ok) return null;
    const json = (await res.json()) as T;
    await store.set(url, json);
    return json;
  } catch {
    return null;
  }
}

/** Unwraps the sentinel we store for 404s. */
export function isNotFound(v: unknown): boolean {
  return !!v && typeof v === "object" && "__notFound" in (v as object);
}
