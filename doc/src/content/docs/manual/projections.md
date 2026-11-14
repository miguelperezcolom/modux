---
title: Projections & Read Models
description: The CQRS read side in Modux — two roles, one pattern
---

The **read side** of CQRS in Modux is built from two roles that work together:

- A **ReadModel** — the denormalized table or document the UI reads from.
- A **Projection** — the process that keeps a ReadModel up to date by consuming domain events.

They are **two roles of the same pattern**, not rival concepts. A Projection without a ReadModel has nothing to write to; a ReadModel without a Projection is an empty table.

```
DomainEvent → IntegrationEvent → Projection → ReadModel → QueryService → UI
                                  └── writes ──┘  └── reads ──┘
```

## When to use this pattern

When data needed in one bounded context originated in another, and the destination is **read-only** — no commands, no domain invariants, no behavior.

If the destination needs commands or invariants, it is an **Aggregate**, not a ReadModel. Use **Subscription + UseCase → Aggregate** instead (see [Subscriptions](/manual/subscriptions/)).

| Destination has commands / invariants? | Pattern |
|---|---|
| **Yes** | Subscription + UseCase → Aggregate |
| **No, only read** | Projection → ReadModel |

The decisive question: *does the destination need to react to commands?* If not, it's a ReadModel.

---

## ReadModel

A ReadModel is a denormalized view designed for a specific query or screen. It can join data from multiple aggregates, across bounded contexts.

### Properties

- **No commands.** It exposes no operations or use cases.
- **No invariants.** Truth is whatever the events say.
- **Optimized for read.** Schema follows the query shape, not the domain.
- **Owned by the consuming bounded context.** It lives where it is read, not where the source data originates.

### Creating a ReadModel

Add `modux/readModels/{id}.yaml` and list the id in its bounded context's `readModelIds`. Or create it from the palette of the [graphical editor](/manual/graphical-editor-guide/). The fields are listed below and in the model's JSON schema — see [Editing the Model](/getting-started/yaml-editing/).

### Configuration

| Field | Description |
|---|---|
| **Name** | ReadModel name (PascalCase) |
| **Model** | Data model that defines the ReadModel's schema |
| **Consistency** | `Eventual` (asynchronous, via projection) or `Strong` (synchronous with the producing transaction) |
| **Storage type** | `Document`, `Relational`, `KeyValue`, or `InMemory` |

### What gets generated

- A persistence entity for the ReadModel table/document
- A repository for read access
- A **QueryService** wired to expose the data to the UI

---

## Projection

A Projection is the **event handler** that keeps a ReadModel up to date. When a configured event arrives, the projection writes to the target ReadModel.

### Creating a Projection

Add `modux/projections/{id}.yaml` and list the id in its bounded context's `projectionIds`. Or create it from the palette of the [graphical editor](/manual/graphical-editor-guide/). The fields are listed below and in the model's JSON schema — see [Editing the Model](/getting-started/yaml-editing/).

### Configuration

| Field | Description |
|---|---|
| **Name** | Projection name (PascalCase) |
| **Target ReadModel** | The ReadModel this projection writes to |
| **Event handlers** | For each domain event handled: handler type (`Create`, `Update`, `Delete`, `Upsert`, `Custom`) and an optional `ModelMapping` to translate the event payload into the ReadModel shape |
| **Error handling strategy** | What to do when an event cannot be processed |
| **Max retries** | Maximum delivery attempts before giving up / dead-lettering |
| **Rebuild strategy** | How to rebuild the ReadModel from scratch (see below) |
| **Snapshot enabled** | Whether snapshots are persisted to speed up rebuilds |
| **Snapshot frequency** | Take a snapshot every N events |

### What gets generated

- `<Name>Projection.java` — event handler class
- Handler methods for each configured event type
- Write logic against the target ReadModel's repository

### Rebuilding

If the projection logic changes, you can rebuild the target ReadModel by replaying past events:

| Strategy | Description |
|---|---|
| `REPLAY` | Process all events from offset 0 |
| `SNAPSHOT` | Restore from a snapshot, then replay only newer events |
| `FULL_REBUILD` | Drop the ReadModel data, then replay from scratch |

---

## Alternative sources

Folding domain events (the `handlers` above) is the default source, but a projection
can also declare that it materializes something else entirely.

| Source field | Meaning | Canvas gesture |
|---|---|---|
| `sourceAggregateId` | Project an **aggregate's whole state** into the read model — even into another bounded context | Drag the aggregate onto a read model or a context |
| `sourceExternalUseCaseId` | **Poll an external system's operation** — the classic scheduled pull | Drag the external operation onto a read model or a context |
| `sourceExternalTableId` | **Poll a legacy system's table** (external systems declare their [tables](/manual/graphical-editor/)) | Drag the external table onto a read model or a context |

### An aggregate's state, in one line

A projection whose source is an **aggregate** (and that declares no handlers of its own)
is generated end to end, in any context — draw the aggregate onto the read model, or onto
the context that should keep the copy:

- the aggregate's repository publishes its whole state on **every** save
  (`{Aggregate}Estado`, topic `{aggregate}estado`) and its id on every delete
  (`{Aggregate}Borrado`) — whatever saved it: the CRUD screen, a use case, an operation;
  event-sourced aggregates too. With an [outbox](/manual/services/) the send is part of the
  transaction;
- the projection gets an upsert handler for the first and a delete handler for the second;
- the read model takes the aggregate's fields (enums as text, the model's labels kept) unless
  it declares its own shape.

The read model is then a plain read side of that context: its query service is what its use
cases read (`mvn modux:ai-complete` is told so), and a menu entry on a query whose output is
the aggregate's model lists it, labels and amounts formatted. A projection added later catches
up by itself: its consumer group is new, so it reads the topic from the beginning.

It also gives that context's forms a **picker**. An input field named after the aggregate —
`concertId` in a Sales use case, Concert living in Catalog — is shown as a lookup over the read
model Sales keeps of it, each concert by its first text field (its artist), instead of an id to
type. Inside the aggregate's own context the same field is a lookup of the aggregate itself.

### An external operation or a legacy table, polled

A projection whose source is an **external system's operation** or one of its **tables** is a
mirror, refreshed every `modux.poll.interval` (one minute by default, `PT30S` style): it reads
all the rows, upserts them by their `id` and drops the ones that are gone. Columns and JSON
properties match the read model's fields by name, ignoring case and underscores
(`aforo_maximo` is `aforoMaximo`). When the source is down it keeps what it has and tries again.
The poller bean answers `lastSuccess()` (when the source last answered — the «data as of» a screen
shows) and `lastError()`; the custom zone can inject it.

| Source | How it reads | Where, from the environment |
|---|---|---|
| Operation (`sourceExternalUseCaseId`) | `GET {path}` (default `/{name}`): a JSON array, or an object carrying it as `items`, `content` or `data` | `{SYSTEM}_URL`, default the system's `baseUrl` |
| Table (`sourceExternalTableId`) | `SELECT * FROM {table}` over JDBC | `{SYSTEM}_JDBC_URL`, `_USER`, `_PASSWORD` (the driver of another database goes in the service's pom) |

The compose file passes those variables through (`LEGADO_JDBC_URL=… mvn modux:deploy`); on
Kubernetes they come from the optional secret `{project}-external`.

### Panels: a grouped query

A query operation with `groupBy` lists **one row per value** of that field, with how many rows it
stands for and the sum of every numeric field; `filter` keeps only the rows that match
(`field=value`, several joined by `,`):

```yaml
operations:
- id: "qs-panel-compras"
  name: "compras"
  outputModelId: "model-compra"
  groupBy: "conciertoId"
  filter: "estado=CONFIRMADA"
```

When the key names another aggregate (`conciertoId`) and the same service keeps a view of it (one
more line: that aggregate onto a read model of this context), the row shows its name instead of
the id.

Exactly **one** source is allowed per projection (handlers, aggregate, operation or
table). Dropping on a context (instead of an existing read model) creates a stub read
model there — named `<Source>View`, shaped after the aggregate's state model when the
source is an aggregate. The linter's `projection-source` rule warns when a projection
has no source at all: its read model would never be fed.

---

## Next steps

- Use [Subscriptions](/manual/subscriptions/) when the destination is an aggregate (not a ReadModel)
- Set up [Domain Events](/manual/domain-events/) — projections need events to consume
