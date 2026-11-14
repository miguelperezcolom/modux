#!/usr/bin/env bash
# Episode 2, captured for real: the `library` example (media/video-series/02-first-app) taken back to
# its first state — one aggregate, no `pages` field, no operation (those come in episodes 2 and 3) —
# in a scratch git repo under build/, then every step the episode shows, its output into real/:
#   model/*            the files the episode shows, as they are at that point
#   validate-broken.txt / validate.txt   a typo in an id caught, then the clean model
#   generate.txt, tree.txt               the generation and what it wrote
#   deploy.txt                           the system started in Docker (left running for the live shots)
#   change-model.diff, change-generate.txt, change-stat.txt, change-migration.sql   the `pages` field
#   deploy2.txt                          the redeploy with the new field (left running)
# STAGE=before|after picks how far to go (the live shots happen in between).
set -euo pipefail
here="$(cd "$(dirname "$0")" && pwd)"
src="$here/../../02-first-app"
mkdir -p "$here/../../build/02-first-app"; work="$(cd "$here/../../build/02-first-app" && pwd)/repo"
out="$here/real"
mkdir -p "$out/model"
modux_lines() { grep -E '^\[(INFO|WARNING|ERROR)\] (Modux|BUILD|Total time)' | grep -v "^\[INFO\] *$" | sed -E "s#$work/?##g" || true; }

if [ "${STAGE:-before}" = before ]; then
  rm -rf "$work" && mkdir -p "$work"
  cp -R "$src/pom.xml" "$src/modux" "$work/"
  [ -d "$src/.mvn" ] && cp -R "$src/.mvn" "$work/"
  python3 - "$work/modux" <<'PY'
import sys, os, re
m = sys.argv[1]
def drop_block(path, field_id):
    s = open(path).read()
    s = re.sub(r'(?ms)^  - id: ' + re.escape(field_id) + r'\n(?:    .*\n)*', '', s)
    open(path, 'w').write(s)
drop_block(f'{m}/models/model-book.yaml', 'f-book-pages')
for f in ['useCases/uc-withdrawBook.yaml', 'models/model-withdraw-book.yaml']:
    os.remove(f'{m}/{f}')
s = open(f'{m}/aggregates/agg-book.yaml').read()
s = re.sub(r'(?ms)^operations:\n(?:  .*\n)*', '', s); open(f'{m}/aggregates/agg-book.yaml', 'w').write(s)
s = open(f'{m}/boundedContexts/bc-catalog.yaml').read()
s = re.sub(r'(?m)^useCaseIds:\n  - uc-withdrawBook\n', '', s); open(f'{m}/boundedContexts/bc-catalog.yaml', 'w').write(s)
s = open(f'{m}/uiAdapters/ui-library.yaml').read()
s = re.sub(r'(?ms)^  - id: ui-library-withdraw\n(?:    .*\n)*', '', s); open(f'{m}/uiAdapters/ui-library.yaml', 'w').write(s)
PY
  cd "$work"
  printf 'target/\n' > .gitignore   # build output is not what generation wrote
  git init -q && git add -A && git -c user.name=video -c user.email=video@localhost commit -qm "the model"
  for f in projects/library.yaml services/svc-library.yaml boundedContexts/bc-catalog.yaml aggregates/agg-book.yaml models/model-book.yaml enums/enum-book-status.yaml uiAdapters/ui-library.yaml; do
    cp "modux/$f" "$out/model/$(basename "$f")"
  done
  cp pom.xml "$out/model/pom.xml"
  # a typo in an id, caught by validate
  sed -i '' 's/^modelId: model-book$/modelId: model-bok/' modux/aggregates/agg-book.yaml
  (mvn modux:validate 2>&1 || true) | modux_lines > "$out/validate-broken.txt"
  git diff -U0 -- modux > "$out/typo.diff"
  git checkout -q -- modux
  mvn modux:validate 2>&1 | modux_lines > "$out/validate.txt"
  mvn modux:generate 2>&1 | modux_lines > "$out/generate.txt"
  (cd system && find . -type f -not -path '*/target/*' -not -path './.modux/*' | sort) > "$out/files.txt"
  (cd system && find . -type d -not -path '*/target*' -not -path './.modux*' -not -path '*/test/*' | awk -F/ 'NF<=9' | sort) > "$out/tree.txt"
  printf '{ "files": %s, "lines": %s }\n' "$(wc -l < "$out/files.txt" | tr -d ' ')" \
    "$(cd system && find . -type f -not -path '*/target/*' -not -path './.modux/*' -exec cat {} + | wc -l | tr -d ' ')" > "$out/counts.json"
  git add -A && git -c user.name=video -c user.email=video@localhost commit -qm generated
  mvn modux:deploy 2>&1 | modux_lines > "$out/deploy.txt"
  cat "$out/validate-broken.txt" "$out/generate.txt" "$out/deploy.txt" "$out/counts.json"
else
  cd "$work"
  python3 - modux/models/model-book.yaml <<'PY'
import sys
p = sys.argv[1]; s = open(p).read()
add = "  - id: f-book-pages\n    name: pages\n    basicType: true\n    type: integer\n"
s = s.replace("  - id: f-book-status\n", add + "  - id: f-book-status\n", 1); open(p, 'w').write(s)
PY
  git diff -U1 -- modux > "$out/change-model.diff"
  mvn modux:generate 2>&1 | modux_lines > "$out/change-generate.txt"
  git add -A -- system && git diff --cached --shortstat -- system ':!system/.modux' ':(exclude,glob)**/target/**' > "$out/change-stat.txt"
  git diff --cached --name-only -- system ':!system/.modux' ':(exclude,glob)**/target/**' | sed -E 's#.*/##' | sort -u > "$out/change-files.txt"
  cat "$(git diff --cached --name-only -- system | grep 'V2__.*\.sql' | head -1)" > "$out/change-migration.sql"
  git -c user.name=video -c user.email=video@localhost commit -qm pages
  mvn modux:deploy 2>&1 | modux_lines > "$out/deploy2.txt"
  cat "$out/change-stat.txt" "$out/change-migration.sql" "$out/deploy2.txt"
fi
