# modux video series — how an episode is made

Short narrated episodes (2–4 min), one aspect of modux each, in English and Spanish. The plan, the
rules and the episode list: [`docs/design/video-series/README.md`](../../docs/design/video-series/README.md).
This folder is the machinery and the episodes.

**Rule one: nothing drawn by hand.** Every terminal line is the real output of the command shown,
captured to a file; every file on screen is the real file, referenced by path (`@file:`), never pasted;
every screen of a running system is recorded live with Playwright on that system. If something can't
be recorded, it is broken: fix modux (or say so), don't fake it.

## Setup (once)

```bash
npm install                                   # Playwright + fonts
/opt/homebrew/bin/python3.12 -m venv .venv    # Kokoro needs PyTorch: Python 3.12
.venv/bin/pip install "kokoro>=0.9.4" soundfile "misaki[en]"   # espeak-ng from Homebrew for Spanish
npx playwright install chromium
```

## An episode

```
episodes/NN-slug/
  episode.json     the scenes, in order, with their narration in en/es
  capture.sh       runs the real commands and writes their output into real/ (and starts systems)
  real/            what capture.sh captured — versioned: the episode renders from it
  live/*.mjs       the shots of a running system, one module per live scene
```

```bash
node lib/episode.mjs episodes/02-first-app                 # voice + every scene + assemble
node lib/episode.mjs episodes/02-first-app --only create   # re-render one scene (assembles when all exist)
node lib/episode.mjs episodes/02-first-app --still tree@3  # one frame of a scene, to check layout
```

Output in `build/NN-slug/`: `modux-NN-slug-en.mp4` and `-es.mp4` (1920×1080, 30 fps, H.264, voice
only), `modux-NN-slug-en.srt` / `-es.srt` (one cue per sentence, as voiced) and `thumbnail.jpg`.

### episode.json

```json
{ "number": 2, "slug": "first-app", "title": { "en": "…", "es": "…" }, "thumbnail": { "scene": "list", "at": 6 },
  "scenes": [ { "id": "typo", "kind": "terminal", "command": "mvn modux:validate", "lines": "@lines:real/validate-broken.txt",
                "narration": { "en": "…", "es": "…" } } ] }
```

- **Length comes from the narration.** A scene lasts 0.5 s + the longer of its two voiced narrations +
  0.9 s (or `min`). Both languages share the picture; each has its own voice track and subtitles.
- **Kinds** (`scenes/scene.html`): `title`, `statement`, `spec`, `production`, `terminal` (a command
  typed, then its captured lines), `code` (a real file, `from`/`to`, `emph` line ranges, Java imports
  folded), `split` (two files side by side), `stats`, `cards`, `close` — and `live` (`script`: a module
  that films the running system).
- **Real values:** `@file:path` (a file's content), `@lines:path` (its non-empty lines; arrays of them
  concatenate), `@json:file:key` (a measured number), `{@json:file:key}` inside text.
- **Narration:** short sentences (each one is a subtitle cue). Kokoro mispronounces some words;
  `lib/narrate.py` `SAY_AS` respells them for the voice only (the subtitles keep the real spelling).
  Opt-in is said opt-in; nothing unreleased is shown as available; no customer names.

### Live shots

A live module gets `{ film, hand, page }`:

- `film.play(s)` films `s` seconds; `film.settle(until)` films until a condition holds (the server
  answered); `film.wait(until)` / `film.idle(s)` let page time pass **off camera** (signing in before
  the shot); the scene is padded to its narration.
- `hand.click(locator)`, `hand.fill(locator, text)`, `hand.type(text)`, `hand.press(key)`,
  `hand.moveTo(locator)`, `hand.scroll(dy)`, `hand.hide()`: real Playwright input with a drawn cursor.

How time works (`lib/frames.mjs`): Playwright's clock is installed and paused; every frame advances
it 1/30 s. The CSS timeline is stopped through CDP (`Animation.setPlaybackRate` 0) and every running
animation — in the document **and in every shadow root** (Vaadin/Mateu animate there; an overlay only
closes when its closing animation ends) — is moved forward 1/30 s per frame. So the same shot renders
the same frames. Network answers arrive in real time while the page clock waits; `settle` keeps
filming, so a spinner shows as long as it would.

Things learnt the hard way: a Vaadin date picker commits on Enter (type the date, then Enter); the
Mateu listing searches on Enter, not while typing; `locator.count()` also counts hidden grid cells —
check `isVisible()`; reset the system's data before re-recording (each episode has its reset).

## Systems on this machine

Generated systems publish fixed ports (gateway 8088, PostgreSQL 5432, Kafka 29092, Mailpit 8025,
services 809x), so only one runs at a time: stop the others (`docker compose stop` in their folder)
before deploying one. Until generated systems get their own Compose project name, deploy with
`COMPOSE_PROJECT_NAME=<slug>` so two systems with `outputPath: system` don't share containers and
volumes. Never touch a system that isn't the episode's.

The editor is filmed on an isolated modux server (own `-Dmodux.home`, never `~/.modux`) over a copy
of the episode's model: see `.claude/skills/verify/SKILL.md`.
