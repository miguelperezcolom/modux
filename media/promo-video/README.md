# modux promo video

A 1:54 promo (1920×1080, 30 fps, no audio track) for YouTube and the home page of the docs site:
a 6-second opening, then a system built with modux from its model to running —
**Tickets**, the `entradas` spec of the test suite in English. Script, voice-over and chapters:
[SCRIPT.md](SCRIPT.md). On-screen text: [strings.json](strings.json).

Everything on screen comes from the real thing: the editor over [`app/modux`](app/modux), the real
output of `mvn modux:*`, the generated code and the hooks `ai-complete` wrote, and screenshots of the
system `mvn modux:deploy` started. Nothing under `build/` is versioned.

## What is in here

| Path | What |
|---|---|
| `app/modux/` | The model: 1,739 lines of YAML (plus the editor's layout in `diagrams/`) |
| `app/system/*/*-custom/` | The custom zones: the business logic, written by `mvn modux:ai-complete` (one touch by hand: the receipt shows money with two decimals). The rest of `app/system/` is generated and not versioned |
| `app/paygate/paygate.py` | A toy card gateway on `:9099`: declines cards ending in 0000; `PAYGATE_DELAY` makes it answer as slowly as a bank, so a purchase is seen PENDING first |
| `scenes/opening.html`, `scenes/index.html` | The timeline: `window.render(t)` draws the frame at `t`; nothing animates on its own |
| `scripts/` | The pipeline below |

## Making it

Needs Docker, Maven, Node and ffmpeg. `npm install` once.

```bash
# 1. The system: generate (the custom zones are already in place) and start it from scratch
(cd app && mvn modux:generate)
bash scripts/reset-system.sh                # compose down -v, mvn modux:deploy, the gateway mock

# 2. Captures → build/real, build/out
node scripts/capture-real.mjs                # the running system, 2x, + element boxes
bash scripts/capture-terminal.sh             # generate / deploy output, counts, the model change
# the editor: a modux server over app/modux on :8193, with its own home so ~/.modux is not touched
#   repositories.yaml → a LOCAL repository at app/modux; then
#   (cd ../../model-driven-generator && JAVA_TOOL_OPTIONS="-Dserver.port=8193 -Dmodux.home=<that home>" mvn spring-boot:run)
node scripts/capture-editor.mjs
# ai-complete, once (it calls the local AI CLI): on a copy of app/ with fresh custom zones
#   mvn modux:generate && mvn modux:ai-complete 2>&1 | grep -E '^\[(INFO|WARNING|ERROR)\] (Modux|BUILD|Total time)' > build/out/aicomplete.txt

# 3. Render and encode
node scripts/render-animated.mjs --page scenes/opening.html --out build/opening.mp4
node scripts/render-animated.mjs             # build/master.mp4 (--stills 12,40 for single frames)
bash scripts/assemble.sh                     # build/modux-promo-1080p.mp4 + thumbnail
```

`capture-real.mjs` runs the story against an empty system, so run `reset-system.sh` before it.
