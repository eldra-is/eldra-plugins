#!/usr/bin/env bash
# Runs every test in the repository.
set -euo pipefail
cd "$(dirname "$0")/.."
shopt -s nullglob
node --test tests/*.test.mjs
for t in tests/*.test.sh; do
  echo "== $t"
  bash "$t"
done
