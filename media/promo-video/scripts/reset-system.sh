#!/usr/bin/env bash
# Starts the Tickets system from scratch for a capture: no data, the demo card gateway on :9099.
set -euo pipefail
app="$(cd "$(dirname "$0")/../app" && pwd)"
# the stack as modux >= 0.6.6 names it (the project id), and the one it had before (the folder's name)
(cd "$app/system" && docker compose down -v --remove-orphans >/dev/null 2>&1 || true)
(cd "$app/system" && docker compose -p system down -v --remove-orphans >/dev/null 2>&1 || true)
rm -f "$app/system/.env"
(cd "$app" && mvn -q modux:deploy -Dmodux.skipBuild=true)
lsof -iTCP:9099 -sTCP:LISTEN >/dev/null 2>&1 || (PAYGATE_DELAY=3 python3 "$app/paygate/paygate.py" >/dev/null 2>&1 &)
until curl -sf -o /dev/null http://localhost:8088/login; do sleep 2; done
sleep 15   # the services finish starting behind the gateway
