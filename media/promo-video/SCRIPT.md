# modux promo — script

1:54 (114.5 s): a 6-second opening ([`scenes/opening.html`](scenes/opening.html)) and the main timeline
([`scenes/index.html`](scenes/index.html), 108.5 s), 1920×1080, 30 fps. It is made to be watched **muted**:
everything that matters is on screen. This script adds a **voice-over** for a narrated cut (YouTube,
talks). Where a line runs long, cut the words in *italics* first.

On-screen text lives in [`strings.json`](strings.json). To make another language, copy it
(`strings.es.json`), translate the values and render with
`node scripts/render-animated.mjs --strings strings.es.json`.

The system on screen is **Tickets** ([`app/`](app)): a promoter sells concert tickets; four bounded
contexts, four services, event sourcing, an outbox, projections, an external card gateway and a
cached public API. It is the `entradas` spec of the modux test suite, translated.

| # | On screen | Voice-over |
|---|---|---|
| 0 | opening, 6 s — the logo, **modux**, "Enterprise systems, model first." — then the hook: "How much of your system / is actually the business?" | How much of your system is actually the business? |
| 1 | The spec, as a card: *A promoter sells concert tickets.* Four rules light up: a purchase counts only when the payment confirms it · a failed payment puts the tickets back on sale · every purchase keeps its history · a sales dashboard per concert. | A promoter sells concert tickets. A purchase only counts once the payment confirms it; if the payment fails, the tickets go back on sale. Every purchase keeps its history, and management wants a dashboard. That is the business. |
| 2 | The rules shrink to a corner; around them, the production chips fill the screen: REST APIs, database migrations, Kafka topics, an outbox, projections, a gateway, single sign-on, roles, screens, Docker, Kubernetes, CI, tests… "Production adds the rest." | Then production adds the rest. APIs, migrations, messaging that must not lose an event, read models, a gateway, single sign-on, screens, containers, pipelines, tests. *Weeks of it, before the first business rule runs.* |
| 3 | The real editor over the model: actors, the four contexts, the card gateway, the flows between them. Then the Purchase aggregate's YAML: `EVENT_SOURCED`, the operations with their intent. "Model the business. In YAML, in your repo." | With modux you model the business. Contexts, aggregates, the rules they keep, how they talk. It is YAML in your repository, and the editor draws it. |
| 4 | `mvn modux:generate`, real output: 0 errors, 0 warnings, under 3 seconds. Then the count: **1,739 lines of model → 398 files, 16,943 lines**; what they are: four services, the API gateway, the federated UI, migrations, Kafka + outbox, Docker · Kubernetes, CI + tests. | One command generates the system. Seventeen hundred lines of model become seventeen thousand lines of code: services, gateway, screens, migrations, containers and pipelines. Generated, not scaffolded — and the same output every time. |
| 5 | Two zones: `mvn modux:ai-complete` reports each service compiling on the first attempt (14 files, 1:52); the generated `ChargeSteps` interface on the left, the `DefaultChargeSteps` it wrote on the right, from the intent in the model. "The business logic is the only code that is yours." | The business logic is the only code that is yours. It lives in its own module that generation never touches — and `ai-complete` can write it from the intent in the model. |
| 6 | `mvn modux:deploy`: the containers come up — PostgreSQL, Kafka, Keycloak, mail, the gateway, four services, the shell. | Deploy it. Locally, or to Kubernetes with its DNS. |
| 7 | The running system (real screenshots): the promoter creates a concert; a customer buys three tickets — PENDING, then CONFIRMED when the payment goes through; a card the bank declines leaves the purchase REJECTED with its reason; the purchase's history; the confirmation email; the sales dashboard. | And it runs. A customer buys three tickets: pending, then confirmed when the payment goes through. A declined card leaves the purchase rejected, with the bank's reason, and the tickets back on sale. Every step is in the purchase's history; the email goes out; the dashboard adds it up. |
| 8 | A change: five lines of YAML (a `genre` field on Concert) → `modux:generate` → **30 files changed** across catalog, sales and analytics (the read models that project a concert carry it too), and the migration modux wrote: `ALTER TABLE concert_entity ADD COLUMN …`. | When the business changes, you change the model. The code follows — every layer, every service that needs it. |
| 9 | modux · *Model first. Everything else is generated.* · modux.mateu.io · github.com/miguelperezcolom/modux · MIT | modux. Model first; everything else is generated. Open source, MIT. Start at modux.mateu.io. |

## YouTube chapters

```
0:00 How much of your system is actually the business?
0:06 The spec: concert tickets
0:15 Production adds the rest
0:23 Model the business
0:37 One command generates the system
0:48 Two zones: the business logic is yours
1:00 Deploy
1:07 It runs: a purchase, a declined card, its history, the dashboard
1:36 Change the model, the code follows
```

## What is real and what is illustrated

- **Real**: the editor (scene 3) is the modux editor component over [`app/modux`](app/modux); every
  terminal line (scenes 4–6, 8) is real output of `mvn modux:*` on [`app/`](app)
  (`scripts/capture-terminal.sh`), trimmed to the lines modux prints (Maven's own JVM warnings and the absolute paths dropped); the counts are measured on the
  generated tree; the code in scene 5 is the generated interface and the hook `ai-complete` wrote;
  every screen of scene 7 is a screenshot of the system that `mvn modux:deploy` started, the email is
  the one Mailpit received.
- **Animated over real**: the camera, the cursor, highlights and callouts.
- **Animated**: the spec card, the production chips, the outro.
- **Simulated**: the card gateway is a 40-line mock ([`app/paygate/paygate.py`](app/paygate/paygate.py))
  that declines cards ending in 0000.
