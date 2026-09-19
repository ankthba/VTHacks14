import { createHash } from "crypto";
import { promises as fs } from "fs";
import path from "path";
import { setCacheStore } from "./cache";

/**
 * The disk store, installed by importing this module from any server entry
 * (API routes and scripts). Keys are hashed the way they always were, so the
 * committed .cache directory keeps working.
 */
const CACHE_DIR = path.join(process.cwd(), ".cache");
const keyFor = (key: string) => createHash("sha256").update(key).digest("hex").slice(0, 32);

setCacheStore({
  async get(key) {
    try {
      return JSON.parse(await fs.readFile(path.join(CACHE_DIR, `${keyFor(key)}.json`), "utf8"));
    } catch {
      return null;
    }
  },
  async set(key, value) {
    try {
      await fs.mkdir(CACHE_DIR, { recursive: true });
      await fs.writeFile(path.join(CACHE_DIR, `${keyFor(key)}.json`), JSON.stringify(value), "utf8");
    } catch {
      // A read-only filesystem is fine - we just lose the write.
    }
  },
});
