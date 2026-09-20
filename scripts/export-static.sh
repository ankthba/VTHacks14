#!/bin/sh
# Static build for GitHub Pages. Server routes and server-only pages are
# moved aside for the duration of the build and restored afterwards, even on
# failure. Run scripts/export-demo.ts first (needs the dev server up).
set -e
cd "$(dirname "$0")/.."

ASIDE=".static-aside"
restore() {
  for d in api; do
    [ -d "$ASIDE/$d" ] && rm -rf "app/$d" && mv "$ASIDE/$d" "app/$d"
  done
  rmdir "$ASIDE" 2>/dev/null || true
}
# Restore on any exit, including an interrupted build, and refuse to leave the
# tree without its routes: an earlier interrupted run lost app/api and the
# loss went into a commit.
trap restore EXIT INT TERM
restore
[ -d app/api ] || { echo "app/api is missing; restore it from git before building" >&2; exit 1; }

mkdir -p "$ASIDE"
for d in api; do
  [ -d "app/$d" ] && mv "app/$d" "$ASIDE/$d"
done

sh scripts/declutter.sh
rm -rf out .next .next.nosync
# VOICE=elevenlabs (the default) ships the recorded clips for the example
# notes; VOICE=browser reads every screen with the browser's own voice.
# BASE_PATH is where the site lives on its host: /aperta under aniketh.net
# (the default), or empty for a domain of its own: BASE_PATH= npm run export:static
NEXT_PUBLIC_VOICE="${VOICE:-elevenlabs}" NEXT_PUBLIC_STATIC=1 NEXT_PUBLIC_BASE_PATH="${BASE_PATH-/aperta}" npx next build
echo
echo "static site in ./out  ($(find out -type f | wc -l | tr -d ' ') files)"
