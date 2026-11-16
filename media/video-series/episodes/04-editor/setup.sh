#!/usr/bin/env bash
# Episode 4 films the real editor (<modux-editor-connected>) against an isolated modux server over a
# COPY of the Tickets model (media/promo-video/app/modux) kept in a scratch git repo, so `git status`
# and `git diff` show exactly what the editor wrote. Never ~/.modux: the server gets its own home.
#
#   MODUX_JAR=…/model-driven-generator-<v>-exec.jar ./setup.sh     # starts the server on :${PORT:-8194}
#
# The repo's baseline is the model as the editor writes it (the Tickets files carry a `projectId` on
# their context-map relations that the store does not model: the first save drops it), so the
# episode's diff shows the gesture and nothing else.
set -euo pipefail
here="$(cd "$(dirname "$0")" && pwd)"
port="${PORT:-8194}"
: "${MODUX_JAR:?point MODUX_JAR at a modux exec jar}"
mkdir -p "$here/../../build/04-editor"; work="$(cd "$here/../../build/04-editor" && pwd)"
pid=$(lsof -tiTCP:"$port" -sTCP:LISTEN || true)
if [ -n "$pid" ]; then echo "port $port is busy (pid $pid): stop it first" >&2; exit 1; fi

rm -rf "$work/model" "$work/home" && mkdir -p "$work/model" "$work/home"
cp -R "$here/../../../promo-video/app/modux" "$work/model/"
rm -f "$work/model/modux/model-driven-store-schema.json"
printf 'model-driven-store-schema.json\n' > "$work/model/.gitignore"
cat > "$work/home/repositories.yaml" <<YAML
repositories:
  - id: "tickets"
    name: "tickets"
    type: "LOCAL"
    folder: "$work/model/modux"
YAML
printf 'repositoryId: "tickets"\nprojectId: "tickets"\n' > "$work/home/current.yaml"

cd "$work"
nohup java \
  --add-exports jdk.compiler/com.sun.tools.javac.api=ALL-UNNAMED \
  --add-exports jdk.compiler/com.sun.tools.javac.code=ALL-UNNAMED \
  --add-exports jdk.compiler/com.sun.tools.javac.file=ALL-UNNAMED \
  --add-exports jdk.compiler/com.sun.tools.javac.parser=ALL-UNNAMED \
  --add-exports jdk.compiler/com.sun.tools.javac.tree=ALL-UNNAMED \
  --add-exports jdk.compiler/com.sun.tools.javac.util=ALL-UNNAMED \
  -Dserver.port="$port" -Dmodux.home="$work/home" -jar "$MODUX_JAR" > "$work/server.log" 2>&1 &
until curl -sf -o /dev/null "http://localhost:$port/modux/editor/version"; do sleep 0.5; done

# the baseline: one save through the server, then commit
curl -sf "http://localhost:$port/modux/editor/layout" -o "$work/layout.json"
curl -sf -X PUT -H 'Content-Type: application/json' --data @"$work/layout.json" "http://localhost:$port/modux/editor/layout"
sleep 3   # the store watcher settles
cd "$work/model"
git init -q && git add -A
git -c user.name=modux -c user.email=modux@example.com commit -qm "Tickets, as the editor writes it"
curl -sf "http://localhost:$port/modux/editor/version" | sed -E 's/.*"version":"([^"]+)".*/\1/' > "$work/baseline-version"
echo "modux editor server on :$port over $work/model (baseline $(cat "$work/baseline-version"))"
