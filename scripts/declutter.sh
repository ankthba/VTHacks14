#!/bin/sh
# ~/Documents is iCloud-synced on the dev Mac, and iCloud periodically leaves
# "<name> 2.ts" conflict copies inside .next. TypeScript then sees duplicate
# declarations and the build fails for a reason unrelated to the code.
find . -path ./node_modules -prune -o \( -name "* 2.*" -o -name "* 3.*" \) -delete 2>/dev/null
exit 0
