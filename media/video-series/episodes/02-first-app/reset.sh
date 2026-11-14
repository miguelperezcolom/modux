#!/usr/bin/env bash
# The library system from scratch (an empty database) before re-recording the live shots.
set -euo pipefail
here="$(cd "$(dirname "$0")" && pwd)"
work="$(cd "$here/../../build/02-first-app/repo" && pwd)"
(cd "$work/system" && docker compose -p library down -v --remove-orphans >/dev/null 2>&1 || true)
(cd "$work" && mvn -q modux:deploy -Dmodux.skipBuild=true)
until curl -sf -o /dev/null http://localhost:8091/library; do sleep 2; done
echo "library ready on :8091"
