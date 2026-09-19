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
  output: isStatic ? "export" : undefined,
  basePath: isStatic ? basePath : undefined,
  trailingSlash: isStatic,
  images: { unoptimized: true },
};

export default nextConfig;
