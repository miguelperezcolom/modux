#!/usr/bin/env bash
# The episode's library stack (Compose project `library-zones`, never episode 2's `library`) from
# scratch — an empty database — before re-recording the live shots. The book is added off camera by
# the first shot.
set -euo pipefail
here="$(cd "$(dirname "$0")" && pwd)"
work="$(cd "$here/../../build/03-two-zones/repo" && pwd)"
export COMPOSE_PROJECT_NAME=library-zones
(cd "$work/system" && docker compose -p "$COMPOSE_PROJECT_NAME" down -v --remove-orphans >/dev/null 2>&1 || true)
(cd "$work" && mvn -q modux:deploy -Dmodux.skipBuild=true)
until curl -sf -o /dev/null http://localhost:8091/library; do sleep 2; done
echo "library ready on :8091"
