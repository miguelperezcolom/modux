#!/usr/bin/env bash
# Episode 13, captured for real: the Tickets system (media/promo-video/app) as it is, in a scratch git
# repo under build/, and `mvn modux:hla` on it. Into real/:
#   hla.txt                  the command's output
#   HLA.generated.md         the document it writes, as written
#   hla.html                 that document rendered (render/render.mjs: marked + mermaid in Chromium,
#                            what a Markdown viewer with Mermaid shows), filmed by the live shots
#   change-model.diff        the model changes: a decision (ADR) recorded, the outbox turned on in
#                            Catalog's service — the risk the document itself points out
#   change-hla.txt, change-hla.diff
#                            hla again, and what changed in the document
#   change-generate.txt, change-stat.txt
#                            generate again: the same change, in the code
# Nothing to deploy: no Docker.
set -euo pipefail
here="$(cd "$(dirname "$0")" && pwd)"
src="$(cd "$here/../../../promo-video/app" && pwd)"
mkdir -p "$here/../../build/13-documentation"; build="$(cd "$here/../../build/13-documentation" && pwd)"
work="$build/repo"
out="$here/real"
mkdir -p "$out"
git_() { git -c user.name=video -c user.email=video@localhost "$@"; }
modux_lines() { grep -E '^\[(INFO|WARNING|ERROR)\] (Modux|BUILD|Total time|Generated file)' | sed -E "s#$work/?##g" || true; }
(cd "$here/render" && [ -d node_modules ] || npm ci --no-audit --no-fund >/dev/null)
render() { node "$here/render/render.mjs" "$1" "$2" HLA.generated.md >/dev/null; }

# the example's model, with its system generated (so the last step can show what changes in the code)
rm -rf "$work" && mkdir -p "$work"
cp -R "$src/pom.xml" "$src/modux" "$src/.mvn" "$work/"
cd "$work"
printf 'target/\n' > .gitignore
git init -q && git add -A && git_ commit -qm "the model"
mvn -q modux:generate >/dev/null 2>&1
git add -A && git_ commit -qm generated

# 1. the document
mvn modux:hla 2>&1 | modux_lines > "$out/hla.txt"
cp HLA.generated.md "$out/HLA.generated.md"
render "$out/HLA.generated.md" "$out/hla.html"
git add -A && git_ commit -qm hla

# 2. the model changes: the team takes up the risk the document lists under Outbox
mkdir -p modux/decisions
cat > modux/decisions/adr-1.yaml <<'YAML'
---
id: "adr-1"
name: "Outbox for Catalog"
decision: "Catalog stores its events in an outbox, like Sales and Payments."
rationale: "Sales keeps its own view of the concerts: a lost event leaves it selling on stale data."
status: "ACCEPTED"
projectId: "tickets"
YAML
python3 - modux/services/svc-catalog.yaml <<'PY'
import sys
p = sys.argv[1]; s = open(p).read()
s = s.replace('port: 8091\n', 'port: 8091\noutboxEnabled: true\n', 1); open(p, 'w').write(s)
PY
git add -N modux/decisions/adr-1.yaml
git diff -U1 -- modux > "$out/change-model.diff"
mvn -q modux:validate >/dev/null 2>&1

# 3. the document again
mvn modux:hla 2>&1 | modux_lines > "$out/change-hla.txt"
git diff -U1 -- HLA.generated.md > "$out/change-hla.diff"

# 4. the code, from the same change
mvn modux:generate 2>&1 | modux_lines > "$out/change-generate.txt"
git add -A
git diff --cached --stat=72 -- system ':!system/.modux' | sed -E 's#^ +# #' > "$out/change-stat.txt"
git_ commit -qm "outbox for catalog"

cat "$out/hla.txt" "$out/change-model.diff" "$out/change-hla.txt" "$out/change-hla.diff" "$out/change-generate.txt" "$out/change-stat.txt"
