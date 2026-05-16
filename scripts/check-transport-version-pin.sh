#!/usr/bin/env bash
set -euo pipefail

# Phase 4H — Ensures @the9ines/localbolt-browser uses exact version pin (no ^, ~, *, ranges).

PKG_JSON="web/package.json"

SPEC=$(node -e "
  const pkg = require('./$PKG_JSON');
  const v = (pkg.dependencies || {})['@the9ines/localbolt-browser'];
  if (!v) { console.error('FAIL: @the9ines/localbolt-browser not found in $PKG_JSON'); process.exit(1); }
  process.stdout.write(v);
")

if echo "$SPEC" | grep -qE '^[0-9]+\.[0-9]+\.[0-9]+$'; then
  echo "PASS: @the9ines/localbolt-browser pinned to exact version \"$SPEC\""
else
  echo "FAIL: @the9ines/localbolt-browser has non-exact spec \"$SPEC\""
  echo "      Required format: X.Y.Z (no ^, ~, >=, *, latest, file:, git:, workspace:)"
  exit 1
fi
