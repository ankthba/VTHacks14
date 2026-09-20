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
trap restore EXIT

mkdir -p "$ASIDE"
for d in api; do
  [ -d "app/$d" ] && mv "app/$d" "$ASIDE/$d"
done

sh scripts/declutter.sh
rm -rf out .next .next.nosync
# VOICE=browser (the default for now) reads every screen with the browser's
# own voice. Build with VOICE=elevenlabs to ship the recorded clips again.
# BASE_PATH is where the site lives on its host: /aperta under aniketh.net
# (the default), or empty for a domain of its own: BASE_PATH= npm run export:static
NEXT_PUBLIC_VOICE="${VOICE:-browser}" NEXT_PUBLIC_STATIC=1 NEXT_PUBLIC_BASE_PATH="${BASE_PATH-/aperta}" npx next build
echo
echo "static site in ./out  ($(find out -type f | wc -l | tr -d ' ') files)"
