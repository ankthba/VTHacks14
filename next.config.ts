import type { NextConfig } from "next";

/**
 * Two builds from one codebase.
 *
 * The full app runs on a server (RxNorm, openFDA, ElevenLabs behind its key).
 * The static build is the demo published at aniketh.net/aperta: the two demo
 * stories prebuilt with their cached audio, the anatomy library, the composer
 * in demo mode. scripts/export-static.sh sets the flag and moves the server
 * routes aside for the duration of the build.
 */
const isStatic = process.env.NEXT_PUBLIC_STATIC === "1";
const basePath = process.env.NEXT_PUBLIC_BASE_PATH || "";

const nextConfig: NextConfig = {
  // ~/Documents is iCloud-synced on the dev Mac. iCloud kept dropping
  // "name 2" duplicates into Turbopack's persistence directory until it
  // refused to open. Anything named *.nosync is left alone by iCloud.
  // With output: "export", Next writes the site INTO distDir - so the static
  // build gets its own directory and dev keeps the cache.
  distDir: isStatic ? "out" : ".next.nosync",
  output: isStatic ? "export" : undefined,
  basePath: isStatic ? basePath : undefined,
  trailingSlash: isStatic,
  images: { unoptimized: true },
};

export default nextConfig;
