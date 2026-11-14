---
title: Examples Catalog
description: The worked example models that ship with Modux, and what each one teaches
---

Every example is a complete, generatable model. The ones under `model-driven-generator/src/test/resources/examples/` double as the generator's own regression suite, so they are always up to date with the metamodel. Copy the one closest to your problem and evolve it — or point your AI agent at it as a reference of idiomatic modux.

| Example | Where | What it teaches |
|---|---|---|
| **Library** | `media/video-series/02-first-app/` | The [Quick Start](/getting-started/quick-start/) model: one context, one aggregate with an enum and a money field, one custom operation implemented in the custom zone. The smallest thing that generates a running app. |
| **Pattern stores** | `sample/patterns/{bff,acl,cqrs,event-driven,saga,event-sourcing,proceso-humano,integraciones}/` | One minimal, commented model per enterprise pattern (comments in Spanish) — read the one that matches the shape you are building before writing from scratch. |
| **HLA booking** | `sample/hla-booking/model-driven-store.yaml` | An enterprise write-side modeled from a real high-level architecture: first-class **decisions (ADRs)** with traceability, external systems, strangler-fig legacy integration, orchestrated saga, outbox, BFF. Includes the generated HLA document. |
| **Biblioteca** | `sample/biblioteca/` | A system built end to end with the IntelliJ plugin: the model in `.modux/`, a view document, two services and the custom zone (the generated code is not versioned). |
| **Tickets** | `media/promo-video/app/` | Four contexts, a payment flow against an external system, projections, a dashboard and a UI shell — the system of the promo video. |
| **E-commerce** | `model-driven-generator/src/test/resources/examples/ecommerce-store.yaml` | Order fulfillment: **saga with compensation** orchestrating external services through **gateways**, business rules, invariants, integration events, money fields. |
| **Support / helpdesk** | `model-driven-generator/src/test/resources/examples/support-store.yaml` | The read side hardened: projections with several handlers, paginated **query services**, read models, subscriptions **with actions**, scheduled triggers. |
| **Ledger** | `model-driven-generator/src/test/resources/examples/ledger-store.yaml` | An **event-sourced** aggregate: event store generation, appender, snapshots, Flyway event-log table. |

Some are a model directory (one file per element), others a single `model-driven-store.yaml` —
the older, monolithic format, which the plugin still reads.

## How to open one

From any Maven project with the plugin (see the [Quick Start](/getting-started/quick-start/)),
point the goals at the example:

```bash
mvn modux:validate -Dmodux.modelPath=path/to/sample/hla-booking/model-driven-store.yaml
mvn modux:generate -Dmodux.modelPath=path/to/sample/hla-booking/model-driven-store.yaml \
                   -Dmodux.outputPath=/tmp/hla-booking
```

or copy it as the `modux/` directory of a project of your own and evolve it from there.

## Which one to start from

- Building a **transactional core** (reservations, orders, accounts)? Start from **HLA booking** — it shows decisions-first modeling and legacy coexistence.
- Building **screens over data** with some workflow? Start from **Library**, then **Tickets**.
- Read-heavy dashboards/queries? **Support**.
- Money movements with audit trail? **Ledger** (event sourcing).
- Talking to third parties with failure handling? **E-commerce** (sagas + gateways).
