#!/usr/bin/env bash
# Back to the baseline before re-recording: the model files as committed by setup.sh; the server's
# store watcher reloads them, and we wait until it reports the baseline fingerprint again.
set -euo pipefail
here="$(cd "$(dirname "$0")" && pwd)"
work="$(cd "$here/../../build/04-editor" && pwd)"
port="${PORT:-8194}"
git -C "$work/model" checkout -q -- . && git -C "$work/model" clean -fdq
want="$(cat "$work/baseline-version")"
for _ in $(seq 1 60); do
  got=$(curl -sf "http://localhost:$port/modux/editor/version" | sed -E 's/.*"version":"([^"]+)".*/\1/')
  [ "$got" = "$want" ] && exit 0
  sleep 0.5
done
echo "the server did not come back to the baseline ($want)" >&2; exit 1
