---
title: Architecture Patterns
description: DDD and integration patterns supported by Modux
---

This page describes the architecture patterns Modux supports and how they map to generated code.

## Domain-Driven Design (DDD)

### Aggregate

The aggregate is the central DDD building block. Modux enforces:

- A single **aggregate root** per aggregate (the only entry point for changes)
- All entities and value objects accessed only through their root
- One **repository per aggregate** — no cross-aggregate queries on the write side
- Domain logic encapsulated inside the aggregate class, not in services

### Value Objects

Value objects replace primitive types in the domain model. Modux generates a record class for each value object:

```java
public record BookingId(UUID value) {}
public record Email(String value) {
    public Email { Objects.requireNonNull(value); }
}
```

This eliminates primitive obsession and makes method signatures self-documenting.

### Domain Events

Events are immutable records emitted by aggregates when state changes. They are:

- Named in past tense (`BookingConfirmed`, not `ConfirmBooking`)
- Published to Kafka after the transaction commits
- Consumed by projections and sagas in the same bounded context; consumed across bounded contexts via subscriptions (when promoted to integration events)

---

## CQRS (Command Query Responsibility Segregation)

Modux enforces a soft CQRS split:

| Side | Components | Database access |
|---|---|---|
| **Write** | Use cases, aggregate root, repository | Through the domain model |
| **Read** | Query services, DTOs, rows | Direct SQL / JPA queries |

The write and read sides share the same database by default, but can be separated if needed.

---

## Event Sourcing

When enabled on an aggregate:

- State is stored as a sequence of domain events, not as current state
- The aggregate is rebuilt by replaying events
- Snapshots are taken every N events to speed up rebuilding

```
CommandHandler
  → Load aggregate (replay events)
  → Apply command
  → Emit new event
  → Persist event
  → Publish to Kafka
```

Configure per aggregate:

```yaml
persistenceType: EVENT_SOURCED
snapshotFrequency: 50
```

---

## Saga Pattern

Sagas coordinate long-running business processes across multiple aggregates or services.

### Choreography

Each service reacts to events and emits new ones. No central coordinator.

```
BookingRequested →
  InventoryService: ReserveInventory →
    InventoryReserved →
      PaymentService: ChargePayment →
        PaymentCharged →
          BookingService: ConfirmBooking
```

### Orchestration

A central saga component sends commands and waits for results.

```
BookingConfirmationSaga:
  1. send ReserveInventory → wait for InventoryReserved
  2. send ChargePayment → wait for PaymentCharged
  3. send ConfirmBooking → done
  
  On failure at step N: execute compensations N, N-1, ... 1
```

---

## Outbox Pattern

Ensures domain events are reliably published to Kafka without distributed transactions.

```
Transaction:
  1. Update aggregate in DB
  2. Write event to outbox table (same DB, same transaction)
  
Background process:
  3. Read from outbox table
  4. Publish to Kafka
  5. Delete from outbox table
```

Enable per service:

```yaml
# services/svc-pedidos.yaml
outboxEnabled: true
outboxTableName: modux_outbox   # optional, this is the default
```

What gets generated in the service's `-app` module:

- `infra/out/outbox/Outbox` replaces `StreamOperations`, the one door every generated send goes
  through (use cases, CRUD, sagas, integration publishers). It inserts the event instead of
  sending it, joining the caller's transaction. A use case with a `PublishDomainEvent` step is
  made `@Transactional`, so the aggregate and its event commit or roll back together.
- `infra/out/outbox/OutboxRelay` sends pending rows oldest first and deletes each one once the
  broker accepted it. Rows are taken with `FOR UPDATE SKIP LOCKED`, so several instances can relay
  at once. Tune it with `modux.outbox.relay-delay-ms` (default 500) and `modux.outbox.batch-size`
  (default 100).
- The table and its sequence, in the next Flyway migration.

Delivery is at-least-once: a crash between sending and deleting resends the row, which the
consumer's inbox discards. Under the `local` profile there is no broker, so neither bean is
active and events go to the log as before.

---

## Anti-Corruption Layer (ACL)

Protects your domain model from external system models. When consuming events or calling APIs from external systems, the ACL translates between their model and yours.

```
External event → ACL → Domain event
Domain command → ACL → External API call
```

Configured per bounded context. Modux generates a translation layer with a `ModelMapping` for each ACL.

---

## Context Map relationships

Defines how bounded contexts relate to each other. A relation goes from a **source** (upstream, U) to a **target** (downstream, D) bounded context for the asymmetric types; the symmetric types (`PARTNERSHIP`, `SHARED_KERNEL`, `SEPARATE_WAYS`) carry no up/down role.

| Relationship | Description |
|---|---|
| `PARTNERSHIP` | Two contexts succeed or fail together and coordinate as partners |
| `SHARED_KERNEL` | Two contexts share a subset of the domain model |
| `CUSTOMER_SUPPLIER` | Upstream publishes, downstream conforms (with negotiation) |
| `CONFORMIST` | Downstream conforms to upstream with no negotiation |
| `OPEN_HOST_SERVICE` | Upstream publishes a formal protocol for multiple consumers |
| `PUBLISHED_LANGUAGE` | A well-defined exchange language (e.g. event schema) |
| `ANTI_CORRUPTION_LAYER` | Translation layer between two different models |
| `SEPARATE_WAYS` | No integration — contexts evolve independently |

### Subdomain classification

Each bounded context can be classified strategically — it colours the context map and drives investment advice:

| Type | Meaning |
|---|---|
| `CORE` | Differentiating heart of the business — invest the most here |
| `SUPPORTING` | Necessary but not differentiating — keep it simple |
| `GENERIC` | Solved problem (auth, billing, email) — consider off-the-shelf |

### External systems

Systems outside your bounded contexts (channel managers, payment gateways, ERPs) are declared on the project (`externalSystems`: protocol, direction, owner, gateway). They appear as dashed nodes on the context map, give `NOTIFIES` flows a real target, and place the anti-corruption layer correctly.

---

## Aggregate lifecycle (state machine)

Most enterprise aggregates *are* state machines (Booking: `pending → confirmed → checkedIn → checkedOut / cancelled`). Declaring `lifecycle` on the aggregate (states, initial state, transitions bound to operations, guards) makes the machine explicit: illegal transitions become domain errors, each transition can emit its event, and the UI can adapt to the current state. The linter validates coherence (unknown states, unreachable states, transitions referencing missing operations).

---

## Business processes

A `process` declares a long-running business procedure by intent — the rung above `flows`: ordered steps that are `AUTOMATED` (run a use case, with optional compensation) or `HUMAN` (a task lands on a role's worklist, optionally deadline-bounded with escalation), an end-to-end SLA, and a completion event. It desugars into a saga + trigger subscription + a task worklist read model + scheduled deadline watches. See `docs/design/process-intent-layer.md`.

---

## Workflows (cross-context orchestration)

A [`workflow`](/manual/workflows/) orchestrates **between** bounded contexts, owned by none of them: started by an event, it advances a dependency **DAG** of steps, each starting a task (a use case) in some context — and all workflow↔context communication travels as events. Where a process is one context's procedure, a workflow is neutral ground. The linter guarantees the DAG (`workflow-dag`) and the wiring (`workflow-trigger`, `workflow-step-target`, `workflow-depends-scope`).

---

## Policies (the lilac sticky)

A **policy** is reaction/automation logic with the *shape* of a use case (`policy: true`) that expresses no business case — EventStorming's lilac sticky as a first-class element. Policies keep the whole use-case machinery (steps, RBAC, idempotency) but stay out of business catalogs and UI derivations; they exist to be invoked by event reactions. Linted: a policy nothing triggers never runs (`policy-without-trigger`); a policy should not derive a UI (`policy-exposed-as-ui`).

---

## Projections from state and legacy sources

Besides folding events, a [projection](/manual/projections/#alternative-sources) can declare an **alternative source**: an aggregate's whole state (`sourceAggregateId` — even cross-context), an **external operation to poll** (`sourceExternalUseCaseId`) or a **legacy table to poll** (`sourceExternalTableId` — external systems declare their tables). Four ways of saying *this materializes there* — event, state, operation, table — each awaiting its generation semantics. A projection with no source at all is linted (`projection-source`).

---

## Published APIs (contract-first, wired to the domain)

A published API is a **product**, often fronting several bounded contexts — so it lives on the map as a first-class element, not as an implementation detail of one context. Import its contract ([OpenAPI or WSDL](/manual/importers/), no target) and wire each operation to its implementer: a context (coarse) or a use case / policy (fine). The wiring is architecture information — the published surface mapped onto the domain — it survives re-imports of the evolving contract, and `api-operation-unwired` flags broken promises.

---

## AI agents and RAGs

An [AI agent](/manual/ai-agents/) is an automated consumer at the level of the bounded contexts. Its **tools** are use cases (consumed through MCP — the context exposes them as MCP tools), query services (read tools), API operations, external-system operations and external MCP servers; it **delegates** to other agents, **grounds** on **RAGs** — knowledge bases fed from read models (the domain projecting itself into an index) and external content (repos, webs, FTP) — and actors talk to it (a chat/supervision UI derives). Linted: agents without tools (`agent-without-tools`), delegation loops (`agent-delegation-cycle`), knowledge bases nobody queries (`rag-orphan`).

---

## MCP gateways (the front door for external agents)

Agents are two-sided: ours consume the world, and the world's agents consume US. An **external AI agent** (someone else's copilot) never touches internal elements: it enters through an [MCP gateway](/manual/ai-agents/#mcp-gateways) — our platform component that **aggregates** external MCP servers and **exposes** published APIs, single operations, use cases and RAGs as one curated MCP endpoint. The gateway is where the exposed surface is decided, secured and audited. Linted: external agents wired to internals directly (`external-agent-direct-tools`), gateways that expose nothing (`mcp-gateway-empty`).

---

## Reactive agents (event → agent)

Beyond answering when called, an agent can **react**: dragging a domain or application event onto it declares that the event triggers a run (`reactsToEventIds`) — triage the incident when `PagoRechazado` arrives, draft the reply when `ReclamacionCreada` lands. The same event-driven backbone that feeds projections and sagas now feeds agents; identity and guardrails of the run are a generation-time decision.

---

## Authorization: roles and access policies

Use cases carry RBAC (`allowedRoles` / `allowedScopes`). For *data-scoped* authorization — which rows a subject may see — bounded contexts declare **access policies** (ABAC-lite): a boolean expression over `subject.*` (token claims) and `resource.*` (row fields), e.g. `subject.hotelId == resource.hotelId`. This is the row-level security that enterprise apps otherwise hand-roll.

---

## Compliance: PII, audit, tenancy

- **PII**: model fields carry a `piiClassification` (`PII`, `SENSITIVE`) and an `anonymizationStrategy` (`MASK`, `HASH`, `ERASE`, `CRYPTO_SHRED` — the event-sourcing-safe one: encrypt per subject, forget by destroying the key). The linter warns when PII crosses a context boundary through a flow.
- **Audit**: aggregates can be marked `audited` (who/what/when trail). Tip: with event sourcing, the event log *is* the audit trail.
- **Multi-tenancy**: the project declares a `tenancyStrategy` (`NONE`, `SHARED_SCHEMA`, `SCHEMA_PER_TENANT`, `DATABASE_PER_TENANT`) so the tenant dimension is a generation concern instead of a painful retrofit.

---

## KPIs

Bounded contexts declare business metrics by intent: a `measure` (`COUNT`, `SUM`, `AVG`, `MIN`, `MAX`) over a stream of domain events, sliced by `dimensionFields` and bucketed by a `timeGrain`. Example: occupancy per hotel per day from `CheckInCompleted` events. Non-`COUNT` measures require a `valueField` (linted).

---

## Decisions (ADRs) and traceability

Architecture decisions are first-class: a `Decision` records what was decided, why (`rationale`), its status (`PROPOSED`, `ACCEPTED`, `DEPRECATED`, `SUPERSEDED`) and its source document. Model elements link to them through `decisionIds`, so design-doc → spec traceability lives *in* the model (referentially checked) instead of in comments. `PROPOSED` decisions are the open points of the design and surface in `mvn modux:validate`'s lint.

---

## The design document, generated

The HLA/design document the team receives is generated **from** the model (`mvn modux:hla`, which writes `HLA.generated.md`): context and objective (`project.objective`), the ADR table, the structural view, one sequence diagram per business process, one state diagram per aggregate lifecycle (all mermaid), transversal concerns derived from the declared flags, exposed contracts, and open points. It cannot drift from the spec because it is a report of it.

---

## As-is and to-be: branches of the model

The model is files in the repository, so a to-be proposal is a git branch: `main` holds the
system as it is, a branch holds only the proposed change, and reviewing it is a pull request —
one file per element makes `git diff` readable element by element. Decisions (ADRs) that justify
the proposal are elements of the model and travel in the branch with it. The discipline that
keeps it honest: **what already exists goes to `main`, a proposal branch holds only its
proposal** — pre-existing elements discovered mid-design are added on `main` and brought in by
merging `main` into the branch. (The design rationale is in `docs/design/ide-plugin.md` §4.8.)

---

## Model mappings

Models are the axis of the system: one model can be an aggregate's state, an entity, a use-case command, a screen, a listing row, an API request/response or an event payload — and the system's essence is passing, enriching and **mapping** models between those stations. The *Mapeados* view shows, per model, every role it plays and the mapping edges that connect it to the next model.

---

## Deriving use cases (screen-first, API-first)

Use cases are derived from the surfaces that need them: sketch a **page** (buttons, CRUD over an aggregate, listing) and *Derive use cases* creates the wired stubs (plus a query service for the listing); import an **OpenAPI** contract inbound and each operation becomes a REST-exposed use-case stub. Both are idempotent.

---

## Consuming another subdomain

A use case consumes functionality — another use case or a query service — in the same or another subdomain (step types `CallUseCase` / `CallQueryService`). The transport derives from deployment topology: same service → in-process interface; contexts whose modules are distributed into different services → the call crosses a process boundary, which **requires an API** (the provider is exposed as gRPC — *Derive APIs* does it by convention). Reaching into a foreign aggregate directly is linted (`cross-context-data-access`): consume the owner's API or materialize a projection.

---

## Model health (the linter)

The model validates itself before any code is generated — the core payoff of being model-driven. Two layers: referential integrity (dangling ids are errors) and a semantic rule catalog (lifecycle coherence, subscription idempotency, DLQs, projection rebuild strategies, saga compensation, orphan use cases, PII exposure, human steps without roles, unclassified subdomains…). `mvn modux:validate` prints the full report and fails the build on its errors. It doubles as the feedback loop for AI-authored specs: generate → lint → fix → regenerate.

---

## Resilience patterns

### Circuit Breaker

Applied on gateway calls. If the downstream service fails repeatedly, the circuit opens and calls fail fast without waiting for a timeout.

### Retry with backoff

Configurable on subscriptions, gateway calls, and saga steps. Supports fixed and exponential backoff.

### Idempotency

Operations and subscriptions support idempotency keys. Duplicate requests are detected and ignored.

### Rate Limiting

Applied on use cases and gateway calls to protect downstream services from overload.
