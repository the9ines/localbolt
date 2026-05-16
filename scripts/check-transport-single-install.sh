#!/usr/bin/env bash
set -euo pipefail

# Phase 4H — Ensures exactly one instance of @the9ines/bolt-transport-web is installed
# and its version matches .transport-web-version.

VERSION_FILE=".transport-web-version"
PKG="@the9ines/bolt-transport-web"

if [ ! -f "$VERSION_FILE" ]; then
  echo "FAIL: $VERSION_FILE not found"
  exit 1
fi

EXPECTED=$(tr -d '[:space:]' < "$VERSION_FILE")

PATHS=$(npm ls "$PKG" --parseable --prefix web 2>/dev/null || true)
COUNT=$(printf '%s\n' "$PATHS" | sed '/^$/d' | sort -u | wc -l | tr -d '[:space:]')

INSTALLED="NONE"
if [ "$COUNT" -gt 0 ]; then
  INSTALLED=$(node -e "console.log(require('./web/node_modules/$PKG/package.json').version)")
fi

EXIT=0

if [ "$COUNT" -eq 0 ]; then
  echo "FAIL: $PKG not found in node_modules"
  EXIT=1
elif [ "$COUNT" -gt 1 ]; then
  echo "FAIL: $COUNT instances of $PKG found (expected 1)"
  printf '%s\n' "$PATHS"
  EXIT=1
else
  echo "PASS: single instance of $PKG installed"
fi

if [ "$INSTALLED" != "$EXPECTED" ]; then
  echo "FAIL: installed version \"$INSTALLED\" != expected \"$EXPECTED\" (from $VERSION_FILE)"
  EXIT=1
else
  echo "PASS: version $INSTALLED matches $VERSION_FILE"
fi

exit "$EXIT"
