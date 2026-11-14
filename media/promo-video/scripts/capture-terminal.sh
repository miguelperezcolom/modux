#!/usr/bin/env bash
# Real terminal output for the video, into build/out/:
#   generate.txt   mvn modux:generate on app/ — the lines modux prints, as printed
#   counts.json    lines of model; files and lines of the generated system (the same measure as the README)
#   deploy.txt     mvn modux:deploy on app/
#   change.*       a field added to the Concert model in a scratch copy under git: the model diff, the
#                  generate output, the files it touched per service and the migration it wrote
# ai-complete is captured once, by hand, because it calls the local AI CLI (see README):
#   build/out/aicomplete.txt
# Maven's own JVM warnings (WARNING: …, not [WARNING]) are dropped: they are not modux.
set -euo pipefail
here="$(cd "$(dirname "$0")/.." && pwd)"
app="$here/app"
out="$here/build/out"
mkdir -p "$out"
modux_lines() { grep -E '^\[(INFO|WARNING|ERROR)\] (Modux|BUILD|Total time)' | sed -E "s#from [^ ]*/(modux) →#from \1 →#" || true; }

(cd "$app" && mvn modux:generate 2>&1) | modux_lines > "$out/generate.txt"

model_lines=$(find "$app/modux" -name '*.yaml' -not -path '*/diagrams/*' -exec cat {} + | wc -l | tr -d ' ')
files=$(cd "$app/system" && find . -type f -not -path '*/target/*' -not -path './.modux/*' -not -path '*-custom/*' | wc -l | tr -d ' ')
lines=$(cd "$app/system" && find . -type f -not -path '*/target/*' -not -path './.modux/*' -not -path '*-custom/*' -exec cat {} + | wc -l | tr -d ' ')
java_lines=$(cd "$app/system" && find . -name '*.java' -not -path '*/target/*' -not -path '*-custom/*' -exec cat {} + | wc -l | tr -d ' ')
custom_files=$(cd "$app/system" && find . -path '*-custom/src/main/java/*' -name 'Default*.java' | wc -l | tr -d ' ')
printf '{ "modelLines": %s, "files": %s, "lines": %s, "javaLines": %s, "customFiles": %s }\n' \
  "$model_lines" "$files" "$lines" "$java_lines" "$custom_files" > "$out/counts.json"

(cd "$app" && mvn modux:deploy 2>&1) | modux_lines > "$out/deploy.txt"

# The change: five lines of model, in a copy so app/ stays as it is.
tmp="$(mktemp -d)"
cp -R "$app/pom.xml" "$app/.mvn" "$app/modux" "$tmp/"
(cd "$tmp" && mvn -q modux:generate >/dev/null 2>&1 && git init -q && git add -A && git -c user.name=video -c user.email=video@localhost commit -qm base)
python3 - "$tmp/modux/models/model-concert.yaml" <<'EOF'
import sys
p = sys.argv[1]; s = open(p).read()
anchor = '- id: "f-model-concert-venue"'
add = '- id: "f-model-concert-genre"\n  name: "genre"\n  basicType: true\n  type: "string"\n  label: "Genre"\n'
open(p, 'w').write(s.replace(anchor, add + anchor, 1))
EOF
(cd "$tmp" && git diff -U1 -- modux) > "$out/change-model.diff"
(cd "$tmp" && mvn modux:generate 2>&1) | modux_lines > "$out/change-generate.txt"
(cd "$tmp" && git add -A -- system && git diff --cached --shortstat -- system ':!system/.modux') > "$out/change-stat.txt"
(cd "$tmp" && git diff --cached --name-only -- system ':!system/.modux' | awk -F/ '{print $2}' | sort | uniq -c) > "$out/change-services.txt"
(cd "$tmp" && git diff --cached --name-only -- system ':!system/.modux' | sed -E 's#.*/##' | sort -u) > "$out/change-files.txt"
(cd "$tmp" && cat "$(git diff --cached --name-only -- system | grep 'catalog/.*V2__model_changes.sql' | head -1)") > "$out/change-migration.sql"
rm -rf "$tmp"
ls -la "$out"
cat "$out/counts.json" "$out/change-stat.txt"
