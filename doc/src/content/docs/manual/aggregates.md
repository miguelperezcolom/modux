---
title: Aggregates
description: Defining DDD aggregate roots in Modux
---

An **Aggregate** is the central DDD building block in Modux. It represents an aggregate root — a cluster of domain objects that are treated as a single unit for the purposes of data changes.

## Creating an aggregate

Add `modux/aggregates/{id}.yaml` and list the id in its bounded context's `aggregateIds`. An aggregate carries `modelId`, the `models/` element holding its state (by convention `model-{name}`). Or create it from the palette of the [graphical editor](/manual/graphical-editor-guide/). The fields are listed below and in the model's JSON schema — see [Editing the Model](/getting-started/yaml-editing/).

## Configuration

### Identity

| Field | Description |
|---|---|
| **Name** | Aggregate name (PascalCase, e.g. `Booking`) |
| **ID type** | Type of the aggregate identifier: `UUID`, `ULID`, `Long`, `String` |

### Fields

Fields define the data held by the aggregate. Each field has:

| Property | Description |
|---|---|
| **Name** | Field name (camelCase) |
| **Type** | Java type: `String`, `Integer`, `Long`, `Boolean`, `LocalDate`, `LocalDateTime`, `BigDecimal`, `Enum`, `ValueObject`, or another aggregate ID |
| **Required** | Whether the field is mandatory |
| **Constraints** | Validation rules (e.g. min length, max length, regex, range) |
| **Stereotype** | How Mateu shows it: `richText`, `html`, `markdown`, `textarea`… A formatted text is edited with an editor, shown rendered, and stored as `text` (no length limit) |
| **Read-only** (`readOnly`) | Kept by the system, not typed by a person — a state, a number assigned on publishing, who asked for it. The form shows it read-only and the generic edit keeps the stored value whatever the command says |
| **System value** (`systemValue`) | On an operation's input: the value comes from the system, not from the caller — `CURRENT_USER` (who runs the use case), `NOW`, `TODAY` or `SEQUENCE` (the next correlative number of that field, without gaps). See [Operations](/manual/operations/#values-the-system-supplies) |

### Persistence

| Field | Description |
|---|---|
| **Persistence type** | `JPA` (default) or `EVENT_SOURCED` |
| **Optimistic locking** | Enable `@Version` field for optimistic concurrency control |
| **Event sourcing** | Store state as a sequence of events instead of current state |
| **Snapshot frequency** | How often to take aggregate snapshots (for event-sourced aggregates) |
| **Schema name** | Custom database schema |
| **Table name** | Custom database table name |

### Operations

See [Operations](/manual/operations/) for details on defining commands and queries on an aggregate.

### Invariants

Invariants are the business rules that must always hold for the aggregate — **its
very reason to exist**: if there is no invariant to protect, the element probably
wants to be a plain model, not an aggregate (that is what the `aggregate-invariants`
lint finding asks). Each invariant has a name (the rule, stated for humans) and
conditions — boolean expressions over the aggregate's fields that the generator
turns into guard assertions.

Invariants are first-class in the **graphical editor**: the aggregate's chip counts
them (`⚖n`) on the context map, they **orbit the aggregate** in the Agregados view,
and you declare one by dropping **«Invariante»** from the palette onto the
aggregate. Supr retires it, F2 renames it, and double click opens the aggregate's
form, where the conditions are detailed.

### State machine (lifecycle)

If your aggregate has a state field, declare its lifecycle and the generator enforces it:

```yaml
lifecycle:
  stateField: estado          # the model field that holds the state (default: status)
  initialState: BORRADOR      # where every new one is born
  states: [BORRADOR, EN_REVISION, RECHAZADA, PUBLICADA, RETIRADA]
  editableStates: [BORRADOR, RECHAZADA]   # see «editable» below
  transitions:
    - { fromState: BORRADOR, toState: EN_REVISION, operationId: op-solicitar }
    - { fromState: RECHAZADA, toState: EN_REVISION, operationId: op-solicitar }
    - { fromState: EN_REVISION, toState: PUBLICADA, operationId: op-aprobar }
```

- A new aggregate starts in `initialState`.
- Each operation runs only from the states its transitions leave — from any other it answers
  `409 Conflict` («No se puede aprobar en estado BORRADOR») — and, once it has run, the aggregate is
  in the transition's `toState`. The operation's own code never moves the state.
- Mark the state field `readOnly`: nobody types it.

### Editable, with operations

An aggregate with operations changes only through them ([see why](/manual/operations/#an-aggregate-with-operations-has-no-generic-update)).
A document that is written freely and then moves on — a draft that is requested, approved,
published — needs both: set `editable: true`. Its form keeps **Edit**, and with
`lifecycle.editableStates` the edit is accepted only in those states (a request in review is
locked). Read-only fields keep their stored value on every edit.

## What gets generated

For each aggregate, Modux generates:

### Domain layer
- `{Aggregate}.java` — aggregate root class
- `vo/{Aggregate}Id.java` — strongly-typed ID value object
- `vo/{Field}.java` — value object for each field of type `ValueObject`
- `events/` — domain event classes

### Application layer
- `usecases/Create{Aggregate}UseCase.java`
- `usecases/Update{Aggregate}UseCase.java`
- `usecases/Delete{Aggregate}UseCase.java`
- `query/{Aggregate}QueryService.java`
- `query/{Aggregate}Dto.java`
- `query/{Aggregate}Row.java`
- `out/{Aggregate}Repository.java` (port interface)

### Infrastructure layer
- `infra/out/persistence/{Aggregate}Entity.java` — JPA entity
- `infra/out/persistence/{Aggregate}EntityRepository.java` — Spring Data repo
- `infra/out/persistence/{Aggregate}DBRepository.java` — port implementation
- `infra/out/persistence/{Aggregate}DBQueryService.java`

For an **event-sourced** aggregate (`persistenceType: EVENT_SOURCED`), the repository is event-sourced:
the JPA port implementation is replaced by `{Aggregate}EventSourcedRepository`, backed by an append-only
event store (`{Aggregate}EventEntity` + `{Aggregate}EventStore` + `{Aggregate}EventAppender`). Saving
appends the change's domain events (the source of truth) and keeps a current-state snapshot for reads;
loading folds the event stream back into state. The two un-derivable parts — which events an operation
produces and how the stream folds into state — are a [two-zone hook](/manual/generating-code/#generated-code-vs-your-code-two-zones)
`{Aggregate}EventSourcing` you implement. See the
[event sourcing design](https://github.com/miguelperezcolom/modux/blob/main/docs/design/event-sourcing.md).

### UI layer

Only when a UI consumes the aggregate: an app has it in its menu, a page is bound to it, or a UI
shell federates its service. With no UI consumer the aggregate has no pages and is reached through
its APIs.

- `infra/in/ui/{Aggregate}CrudAdapter.java`
- `infra/in/ui/{Aggregate}CrudOrchestrator.java`
- `infra/in/ui/{Aggregate}ViewModel.java`
- `infra/in/ui/{Aggregate}IdOptionsSupplier.java`
- `infra/in/ui/{Aggregate}IdLabelSupplier.java`

## Example

A `Booking` aggregate with fields `reference`, `customer`, `startDate`, `endDate`, and a `status` enum generates all of the above artefacts, giving you a fully working CRUD application ready to customise.

## Next steps

- Add [Operations](/manual/operations/) for custom commands and queries
- Define [Domain Events](/manual/domain-events/) emitted by this aggregate
- Add [Entities & Value Objects](/manual/entities-and-value-objects/) for richer modelling
