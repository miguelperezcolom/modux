#!/usr/bin/env bash
# Episode 3, captured for real: the `library` example (media/video-series/02-first-app) as it is —
# Book with the CUSTOM operation `withdraw` and its intent — in a scratch git repo under build/,
# with no generated system yet, then every step the episode shows, its output into real/:
#   model/*                      the model files the episode shows
#   generate.txt                 the first generation
#   zones/*                      the generated hook (WithdrawBookOperation) and the scaffolded default
#                                (DefaultWithdrawBookOperation, the intent and a pending exception)
#   (the rule itself is the example's committed custom zone: 02-first-app/system/library/library-custom)
#   change-model.diff, change-generate.txt, change-stat.txt, change-custom.txt
#                                a new field; generate again; what changed, and what didn't
#   handedit.diff, handedit-generate.txt, handedit-status.txt
#                                a generated file edited by hand, reported and restored by generate
#   deploy.txt                   the system started in Docker (left running for the live shots)
# STAGE=ai runs `mvn modux:ai-complete` once, on a copy with the custom zone as scaffolded:
#   aicomplete.txt, ai/DefaultWithdrawBookOperation.java
# It calls the developer's local AI command line (`claude -p`), so it is run once, by hand.
# Not in the episode: modux 0.6.6 does not see an English scaffold as pending ("library has no pending
# hooks."), fixed in HookImplementer after 0.6.6; capture it again once that is released.
set -euo pipefail
here="$(cd "$(dirname "$0")" && pwd)"
src="$(cd "$here/../../02-first-app" && pwd)"
mkdir -p "$here/../../build/03-two-zones"; build="$(cd "$here/../../build/03-two-zones" && pwd)"
work="$build/repo"
out="$here/real"
custom=system/library/library-custom/src/main/java/com/example/library/custom
book=system/library/catalog/src/main/java/com/example/library/catalog/domain/aggregates/book
mkdir -p "$out/model" "$out/zones"
git_() { git -c user.name=video -c user.email=video@localhost "$@"; }
modux_lines() { grep -E '^\[(INFO|WARNING|ERROR)\] (Modux|BUILD|Total time|Generated file)' | sed -E "s#$work/?##g; s#$build/ai/?##g" || true; }
# the stack of this episode, apart from episode 2's (`library`): same system, its own containers and volumes
export COMPOSE_PROJECT_NAME=library-zones

fresh() {   # the example's model, nothing generated yet
  rm -rf "$1" && mkdir -p "$1"
  cp -R "$src/pom.xml" "$src/modux" "$src/.mvn" "$1/"
  (cd "$1" && printf 'target/\n' > .gitignore && git init -q && git add -A && git_ commit -qm "the model")
}

if [ "${STAGE:-main}" = ai ]; then
  fresh "$build/ai"
  cd "$build/ai"
  mvn -q modux:generate
  git add -A && git_ commit -qm generated
  mkdir -p "$out/ai"
  mvn modux:ai-complete 2>&1 | modux_lines > "$out/aicomplete.txt"
  cp "$custom/DefaultWithdrawBookOperation.java" "$out/ai/"
  git status --short > "$out/ai/status.txt"
  cat "$out/aicomplete.txt" "$out/ai/DefaultWithdrawBookOperation.java"
  exit 0
fi

fresh "$work"
cd "$work"
cp modux/aggregates/agg-book.yaml modux/useCases/uc-withdrawBook.yaml "$out/model/"

# 1. generate: the hook in the generated zone, its default scaffolded once in the custom zone
mvn modux:generate 2>&1 | modux_lines > "$out/generate.txt"
cp "$book/WithdrawBookOperation.java" "$custom/DefaultWithdrawBookOperation.java" "$out/zones/"
git add -A && git_ commit -qm generated

# 2. the rule, written in the custom zone: the example's committed implementation
cp "$src/$custom/DefaultWithdrawBookOperation.java" "$custom/"
git add -A && git_ commit -qm "the rule"

# 3. the model changes (a new field); generate again: the generated zone follows, the custom zone doesn't
python3 - modux/models/model-book.yaml <<'PY'
import sys
p = sys.argv[1]; s = open(p).read()
add = "  - id: f-book-language\n    name: language\n    basicType: true\n    type: string\n"
s = s.replace("  - id: f-book-status\n", add + "  - id: f-book-status\n", 1); open(p, 'w').write(s)
PY
git diff -U1 -- modux > "$out/change-model.diff"
mvn modux:generate 2>&1 | modux_lines > "$out/change-generate.txt"
git add -A
git diff --cached --stat=88 -- system ':!system/.modux' | sed -E 's#^ +# #' > "$out/change-stat.txt"
git diff --cached --name-only -- system/library/library-custom > "$out/change-custom.txt"
git_ commit -qm language

# 4. a generated file edited by hand (the rule put in the aggregate): reported, and overwritten
python3 - "$book/Book.java" <<'PY'
import sys
p = sys.argv[1]; s = open(p).read()
s = s.replace("  private void checkWithdrawPreconditions() {}\n",
              "  private void checkWithdrawPreconditions() {\n"
              "    if (status == Status.WITHDRAWN) {\n"
              "      throw new IllegalStateException(\"The book is already withdrawn\");\n"
              "    }\n"
              "  }\n", 1)
open(p, 'w').write(s)
PY
git diff -U1 -- system > "$out/handedit.diff"
mvn modux:generate 2>&1 | modux_lines > "$out/handedit-generate.txt"
git status > "$out/handedit-status.txt"

# 5. deploy, from scratch (an empty database): the episode's own stack. The other systems on this
#    machine publish the same ports: stop them first (docker compose -p <name> stop, in their folder).
(cd system && docker compose -p "$COMPOSE_PROJECT_NAME" down -v --remove-orphans >/dev/null 2>&1 || true)
mvn modux:deploy 2>&1 | modux_lines > "$out/deploy.txt"
cat "$out/generate.txt" "$out/change-stat.txt" "$out/change-custom.txt" "$out/handedit-generate.txt" "$out/handedit-status.txt" "$out/deploy.txt"
