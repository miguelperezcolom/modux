---
title: Event Sourcing
description: How an event-sourced aggregate is generated — event store, event-sourced repository and the two-zone fold hook
---

Mark an aggregate `persistenceType: EVENT_SOURCED` (or set its event-sourcing flag) and Modux generates
an event-sourced persistence model instead of plain JPA CRUD: every change is an **event** appended to an
append-only log (the source of truth), and the aggregate's state is **rebuilt by folding** that log.

For the design and the staged plan see the
[event-sourcing RFC](https://github.com/miguelperezcolom/modux/blob/main/docs/design/event-sourcing.md).

## What gets generated

For an event-sourced aggregate `Account`, in addition to the domain aggregate and the repository **port**
(`AccountRepository`), Modux generates:

| File | Zone | Role |
|---|---|---|
| `AccountEventEntity` | generated | The append-only event log table (`aggregateId`, `sequenceNumber`, `eventType`, `payload` JSON, `occurredAt`), included in the Flyway migration |
| `AccountEventStore` | generated | Spring Data access, ordered by sequence |
| `AccountEventAppender` | generated | Append plumbing: assigns the next sequence, serializes the event, stores it; reads the ordered stream |
| `AccountEventCodec` | generated | Decodes a stored payload back to its **typed** domain event, by the stored event type |
| `AccountEventSourcedRepository` | generated | The repository **port implementation** (replaces the JPA `DBRepository`) |
| `AccountEventSourcing` | generated | The two-zone hook (port) |
| `DefaultAccountEventSourcing` | **custom (write-once)** | Where you implement the hook |

The JPA port keeps a **single implementation** — the event-sourced one — so the CRUD UI, query service
and menu are untouched.

## How it works

- **`save(account)`** appends the change's domain events via the appender (the source of truth) and also
  writes a **current-state snapshot** (the JPA entity), so reads, queries and the CRUD UI keep working.
  When the hook returns no events — the default — it records the **state the aggregate was saved in**
  (`AccountGuardado`), so the history is complete from the first day without writing any code.
- **The history has a screen**: an event-sourced aggregate in an app's menu brings «Historial de …», a
  read-only listing of its event store in order (aggregate, number, what happened, when, who, the
  state), searchable by the aggregate's id. «Who» is the signed-in user (or calling service) that
  recorded it — an audit trail with no code. The payload is stored as `text`: no length limit.
- **`findById(id)`** loads the event stream, decodes it to typed domain events via the codec, and **folds
  it** through the hook to rebuild the aggregate — falling back to the snapshot until the fold is
  implemented.

## The two-zone hook

The two parts that can't be derived from the model are a [two-zone hook](/manual/generating-code/#generated-code-vs-your-code-two-zones)
you implement once in the `{service}-custom` module:

```java
public interface AccountEventSourcing {
    // which domain events the aggregate's latest change produces (appended to the log)
    List<Object> eventsOf(Account aggregate);

    // how the decoded, typed event stream folds back into aggregate state
    Account replay(AccountId id, List<Object> events);
}
```

`replay` receives the events **already decoded to their domain types** (via the codec), so you fold with
`instanceof` over real events instead of parsing JSON. Returning `null` falls back to the snapshot.

## Status and limits

The write side (events as the source of truth) and folded reconstitution are generated and verified end
to end. The current-state **snapshot is kept as the read side** rather than going "pure" (no state table),
because dropping it would force removing the auto-CRUD UI and query service for the aggregate. A pure
projection-backed read side and periodic snapshots are on the roadmap — see the RFC.
