---
title: User Manual Overview
description: Overview of the Modux domain model and how to use the generator
---

## The Modux domain model

Modux organises your system as a hierarchy of concepts:

```
Project
├── Bounded Context (owns the meaning)
│   └── Module (packaging — every context has a main one)
│       ├── Aggregate
│       │   ├── Entity
│       │   ├── Value Object
│       │   ├── Operation
│       │   └── Domain Event
│       ├── Saga
│       ├── Projection / Read Model
│       ├── Subscription
│       ├── Scheduled Trigger
│       ├── Role
│       └── Infrastructure adapters
│           ├── Outbound: Gateway
│           └── Inbound (UI): Page, Component, UI Adapter, UI Shell
└── Service (microservice) — deploys Modules
```

A **Bounded Context** owns the meaning: aggregates, use cases, events, invariants. A **Module** is the buildable unit inside a context (each context is born with one main module). A **Service** is the deployable: it deploys modules via `moduleIds` — the only link between topology and content.

In hexagonal architecture the UI is an **inbound (driving) adapter** — it sits in the infrastructure layer alongside outbound adapters like Gateways. Pages, Components, UI Adapters and UI Shells are simply the inbound side of that same adapter layer.

Each level has its own configuration and generates its own code artefacts.

Above these building blocks, a [**Flow**](/manual/flows/) lets you declare a cross-context interaction by intent (e.g. "this event materializes a read model over there") and have Modux derive the events, projections, subscriptions and sagas it implies — so you rarely wire them by hand.

## Where the model lives

The model is a directory of YAML files in your repository — `modux/` (or `.modux/`, the name
the IntelliJ plugin uses) — with one directory per element type and one file per element,
named after its id: `aggregates/agg-book.yaml`, `useCases/uc-withdrawBook.yaml`. Each page of
this manual says which directory its element lives in and what fields it takes; the
authoritative list of fields is the model's JSON schema, `model-driven-store-schema.json`,
written next to the model by `mvn modux:validate`.

Three ways to edit it, all over the same files:

- **By hand**, in any editor, with the schema giving completion — see
  [Editing the Model](/getting-started/yaml-editing/).
- **With an AI agent** that reads and writes the files, guided by the `modux-model` skill.
- **In the [graphical editor](/manual/graphical-editor-guide/)** of the IntelliJ plugin.

## Typical workflow

1. Write the **Project** (`projects/`) with its package name and output path
2. Add one or more **Services** (one per deployable)
3. Add **Bounded Contexts**, each with its main module, and list the modules in a service's `moduleIds`
4. Define **Aggregates** with their models, operations and events
5. Add **Use cases**, **Sagas**, **Projections** and **Gateways** as needed
6. `mvn modux:validate`, then `mvn modux:generate` to produce the Spring Boot projects
7. Implement the generated hooks with your business logic, in the `{service}-custom` module
8. Change the model and regenerate at any time — the custom module is never overwritten

The [Quick Start](/getting-started/quick-start/) walks this loop end to end.

## Pages in this manual

- [Projects](/manual/projects/) — top-level project settings
- [Services](/manual/services/) — microservice configuration
- [Bounded Contexts & Modules](/manual/modules/) — bounded context settings and packaging
- [Flows](/manual/flows/) — declare cross-context interactions by intent
- [Aggregates](/manual/aggregates/) — the core DDD building block
- [Entities & Value Objects](/manual/entities-and-value-objects/) — domain building blocks
- [Operations](/manual/operations/) — commands and queries on aggregates
- [Use Cases](/manual/use-cases/) — application-layer orchestration
- [Model Mappings](/manual/model-mappings/) — field-level transformations between models
- [Business Rules](/manual/business-rules/) — declarative when/then rules for a rules engine
- [Domain Events](/manual/domain-events/) — events emitted by aggregates
- [Sagas](/manual/sagas/) — multi-step workflows with compensation
- [Projections & Read Models](/manual/projections/) — the read-side pattern: projections maintain denormalized read models
- [Gateways](/manual/gateways/) — external service calls
- [Subscriptions](/manual/subscriptions/) — message handlers
- [Scheduled Triggers](/manual/scheduled-triggers/) — cron tasks
- [Roles & Security](/manual/roles/) — RBAC definitions
- [Pages](/manual/pages/) — UI screens (CRUD, form, dashboard, wizard)
- [Components](/manual/components/) — visual data blocks for dashboards
- [UI Adapters](/manual/ui-adapters/) — navigation structure per service
- [UI Shells](/manual/ui-shells/) — frontend deployment targets
- [Generating Code](/manual/generating-code/) — how to run the generator
- [Search](/manual/search/) — finding elements in the model
