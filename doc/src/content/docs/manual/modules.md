---
title: Bounded Contexts & Modules
description: Bounded contexts own the meaning; modules are how a context is packaged and deployed
---

A **Bounded Context** is a business subdomain with its own ubiquitous language. It groups related aggregates, events, use cases, and the other domain concepts that share that language — it owns the *meaning*. The strategic [context map](/manual/projects/#context-map) relates bounded contexts to each other.

A **Module** is the buildable, deployable unit *inside* a bounded context — pure packaging. Every bounded context is born with exactly one **main** module; you only reach for more when a context needs to split its distribution (e.g. a write side and a read side deployed separately). See [Modules](#modules) below.

## Creating a bounded context

Add `modux/boundedContexts/{id}.yaml` and its main module, `modux/modules/{id}-main.yaml` (`boundedContextId` pointing back, `main: true`); then add the module id to a service's `moduleIds`, or nothing deploys the context. Or create it from the palette of the [graphical editor](/manual/graphical-editor-guide/). The fields are listed below and in the model's JSON schema — see [Editing the Model](/getting-started/yaml-editing/).

Created from the graphical editor, the context gets its main module (id `<bcId>-main`, named after the context) automatically.

## Configuration

### Basic fields

| Field | Description |
|---|---|
| **Name** | Bounded context name — used as a Java sub-package |
| **Git repository** | Optional separate repository for this context (monorepo vs. multi-repo) |
| **Table name prefix** | Prefix applied to all JPA table names in this context (e.g. `bkg_`) |
| **Auto table name prefix** | Derive the prefix automatically from the context name |
| **Version** | Context version, independent of the service version |
| **LLM system prompt** | System prompt injected when using LLM-assisted generation for this context |

### Contents

A bounded context groups references to all the domain artefacts that belong to it:

| Tab | What it contains |
|---|---|
| **Aggregates** | DDD aggregate roots |
| **Entities** | Shared entities not owned by a single aggregate |
| **Value Objects** | Shared value objects |
| **Use Cases** | Application-layer use cases |
| **Domain Events** | Events emitted by aggregates in this context |
| **Projections** | Event handlers that update Read Models |
| **Read Models** | Denormalized query views (written by projections, read by query services) |
| **Subscriptions** | Message handlers |
| **Sagas** | Multi-step workflows with compensation |
| **Scheduled Triggers** | Cron-based tasks |

### BFF (Backend-for-Frontend)

Each BFF entry exposes a tailored API surface for a specific client type:

| Field | Description |
|---|---|
| **Name** | BFF name |
| **Client type** | Target client (e.g. `WEB`, `MOBILE`, `PARTNER`) |
| **Description** | Purpose of this BFF |
| **Base path** | URL prefix for this BFF's endpoints |
| **Auth required** | Whether requests must be authenticated |
| **Exposed use cases** | Use cases published through this BFF |
| **Exposed read models** | Read models published through this BFF |

### ACL (Anti-Corruption Layer)

Each ACL entry describes a translation boundary with an external system:

| Field | Description |
|---|---|
| **Name** | ACL name |
| **External system** | Name of the external system or bounded context |
| **Description** | What this ACL translates |
| **Direction** | `INBOUND` (external → this context) or `OUTBOUND` (this context → external) |
| **Gateway** | Gateway used for outbound communication |
| **Translated domain events** | Events whose meaning is translated across the boundary |
| **Translated use cases** | Use cases whose input/output is translated |

### Domain Policies

A domain policy links a triggering event to a use case — the context's way of expressing reactive business rules:

| Field | Description |
|---|---|
| **Name** | Policy name |
| **Triggering event** | Domain event that fires this policy |
| **Use case** | Use case invoked when the event is received |
| **Description** | Business rationale for the policy |

### Invariants

Context-level invariants express business rules that span multiple aggregates within the bounded context — rules that cannot be enforced by a single aggregate alone.

| Field | Description |
|---|---|
| **Name** | Invariant name |
| **Conditions** | One or more conditions that must all hold |

Each condition has:

| Field | Description |
|---|---|
| **Expression** | Boolean expression evaluated to check the rule |
| **Custom** | Whether this is a hand-coded condition (not expression-based) |
| **Description** | What the condition checks |
| **Error message** | Message shown when the condition is violated |

### BDD Tests

Executable acceptance scenarios for this bounded context, written in Gherkin:

| Field | Description |
|---|---|
| **Feature** | Feature file name or group |
| **Name** | Scenario name |
| **Tags** | Gherkin tags (e.g. `@smoke`, `@regression`) |
| **Steps** | Given / When / Then steps |

## Modules

Where the bounded context owns the meaning, a **module** owns the packaging: it is the unit a [Service](/manual/services/) deploys. A service's `moduleIds` list is the *only* link between topology and content.

| Field | Description |
|---|---|
| `id` | Module id |
| `name` | Module name — it names the generated Maven submodule |
| `boundedContextId` | The bounded context this module distributes elements of |
| `elementIds` | Elements (aggregates, use cases, events…) explicitly packaged here |
| `main` | Whether this is the context's main module |

Every bounded context has exactly one **main** module, auto-created with it (id `<bcId>-main`, name = the context's name). Elements not explicitly packaged into another module implicitly live in the main one — so for most contexts you never touch modules at all.

A context can split into several modules when its parts must build or deploy separately — a classic case is a CQRS write side and read side:

```yaml
boundedContexts:
  - id: "bc-bookings"
    name: "bookings"
    aggregateIds:
      - "agg-booking"
    readModelIds:
      - "rm-availability"

modules:
  - id: "bc-bookings-main"          # auto-created with the context
    name: "bookings"
    boundedContextId: "bc-bookings"
    main: true
  - id: "mod-bookings-read"
    name: "bookings-read"
    boundedContextId: "bc-bookings"
    elementIds:
      - "rm-availability"

services:
  - id: "svc-write"
    moduleIds:
      - "bc-bookings-main"
  - id: "svc-read"
    moduleIds:
      - "mod-bookings-read"
```

A module deploys in exactly one service — the linter flags a module listed by several services (`module-in-many-services`) and a module no service deploys (`module-not-in-service`). A bounded context, though, may legitimately span services through different modules, as above.

In the graphical editor, a context with only its main module doesn't show a module box — the deploy edge from the service lands on the context itself. Module boxes appear as soon as a second module joins (palette group **Distribución**, label **Módulo**).

## Generated code structure

Each deployed module becomes a Maven submodule of its service's reactor; the module lends its name, its bounded context lends the meaning. For a context with only its main module, the output is a single submodule named after the context:

```
com.example.myservice.
└── bookings/              ← module package
    ├── domain/
    │   ├── aggregates/
    │   └── events/
    ├── application/
    │   ├── usecases/
    │   └── query/
    └── infra/
        ├── in/
        └── out/
```

## Next steps

Add [Aggregates](/manual/aggregates/) to your bounded context.
