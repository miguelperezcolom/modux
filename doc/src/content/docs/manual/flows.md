---
title: Flows
description: Declare cross-context interactions by intent and let Modux derive the building blocks
---

A **flow** lets you declare a cross-context interaction by its **intent** instead of wiring every
structural piece by hand. You say *what* should happen — for example, *"recording a booking in the
Bookings context materializes the locator and holder in the FrontOffice context"* — and Modux
**derives** the domain event, integration event, read model, projection and subscription that make
it happen, applying sensible conventions.

Flows are the **single source of truth**: the structural pieces are produced at generation time and
never have to be kept in sync by hand. When a convention doesn't fit, an `overrides` escape hatch
lets you tune any derived piece without giving up the inference.

## Why flows

Without flows, a single cross-context interaction means declaring — and keeping consistent — a
domain event, an integration event (topic, partitions, serialization, DLQ, schema version…), a
payload model, a read model, a projection and a subscription, all cross-referenced by id. That hides
the intent behind a dozen moving parts. A flow expresses the same thing in a few lines and lets the
generator fill in the rest.

## Archetypes

Every flow has an **archetype** that determines which pieces it derives:

| Archetype | Intent | Derives |
|---|---|---|
| **`materializes`** | An event in one context materializes a read model in another | Domain event · integration event · payload model · read model · projection · subscription |
| **`triggers`** | An event in one context invokes a use case in another (choreography) | Domain event · integration event · payload model · model mapping · subscription (CallUseCase) |
| **`notifies`** | An event is published outbound for an external system to consume | Domain event · integration event |
| **`orchestrates`** | An event starts a multi-step process with compensation | Domain event · integration event · saga (as an [EventConductor](https://eventconductor.mateu.io/) workflow) · subscription (StartSaga) |

## Defining a flow

A flow is an element of its own, `modux/flows/{id}.yaml` (or drawn on the context map of the [graphical editor](/manual/graphical-editor/)). A flow has:

- **Name** and optional description.
- **Archetype** — one of the four above.
- **Trigger** — the aggregate and the event that starts the flow (the source context is the
  aggregate's bounded context).
- **Target bounded context** — the context the flow acts on.
- Archetype-specific fields: a **read model name** and the **fields** that cross the boundary
  (`materializes`), or the **target use case** (`triggers`).
- **Overrides** — optional `scope.property=value` lines to tune derived pieces.

### Example — materializes

> *Recording a booking materializes locator + holder in FrontOffice.*

- Archetype: `materializes`
- Trigger: aggregate `Booking`, event `BookingRecorded`
- Target bounded context: `FrontOffice`
- Read model: `BookingSummary`
- Fields: `locator`, `holder`

From this, Modux derives a `BookingRecorded` domain event published as an integration event on the
`booking.bookings.booking-recorded` topic (JSON, DLQ, replayable), a `BookingSummary` read model in
FrontOffice, a projection that upserts it on the event, and an idempotent subscription that drives
the projection.

### Example — triggers

> *Recording a booking creates a stay in FrontOffice.*

- Archetype: `triggers`
- Trigger: aggregate `Booking`, event `BookingRecorded`
- Target bounded context: `FrontOffice`
- Target use case: `CreateStay`

Modux derives the event and integration event, an identity model mapping from the event payload to
the use case input, and a subscription whose `CallUseCase` action invokes `CreateStay` with that
mapping.

## Conventions

Derived pieces follow conventions you can rely on (and override):

- **Topic** — `project.service.event` in kebab-case (e.g. `hotel.reservas.reserva-creada`).
- **Integration event** — JSON, schema version `v1`, replayable, dead-letter queue enabled.
- **Read model** — relational storage, eventual consistency.
- **Projection** — upserts the read model on the event, retry on error.
- **Subscription** — consumes from the source service into the target context, idempotent.

## Overrides

List only the knobs that deviate from the convention, as `scope.property=value` lines — for example
`integrationEvent.partitions=6` or `subscription.idempotencyKeyField=bookingId`.

## How it fits together

At generation time Modux desugars every flow into its structural pieces and feeds them to the same
generators that handle hand-declared concepts — so a flow produces exactly the same code you would
have written by hand, without the bookkeeping. A derived piece that matches one you already declared
by hand is skipped in favour of yours.

See [End-to-End Flows](/reference/flows/) for how these pieces cooperate at runtime, and
[Enterprise Information Systems](/getting-started/enterprise-systems/) for the requirements each
pattern answers.
