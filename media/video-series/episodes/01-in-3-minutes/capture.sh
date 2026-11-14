#!/usr/bin/env bash
# The real terminal output episode 1 shows, refreshed from the Tickets app of the promo
# (media/promo-video/app): generate, deploy, the counts and a five-line model change. ai-complete
# is captured once by hand (it calls the local AI CLI; see the promo's README).
set -euo pipefail
here="$(cd "$(dirname "$0")" && pwd)"
promo="$here/../../../promo-video"
bash "$promo/scripts/capture-terminal.sh"
cp "$promo"/build/out/{generate.txt,deploy.txt,counts.json,change-stat.txt,change-services.txt,change-model.diff,change-migration.sql,change-generate.txt} "$here/real/"
