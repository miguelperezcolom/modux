---
title: Subscriptions
description: How a bounded context consumes events published by other bounded contexts
---

A **Subscription** is how a bounded context consumes an **integration event** published by another bounded context (or by an external system). It defines:

1. *where* to read from (topic, event, consumer group),
2. *what to do* with each incoming event (one or more **actions**).

This is the **entry point** for cross-context event-driven integration. Within a single bounded context, domain events are consumed in-process — no Subscription needed.

## Creating a subscription

Add `modux/subscriptions/{id}.yaml` and list the id in its bounded context's `subscriptionIds`. Or create it from the palette of the [graphical editor](/manual/graphical-editor-guide/). The fields are listed below and in the model's JSON schema — see [Editing the Model](/getting-started/yaml-editing/).

## Configuration

### Source

| Field | Description |
|---|---|
| **Name** | Subscription name (PascalCase) |
| **Topic** | Kafka topic to consume from |
| **Event name** | Event type expected on the topic |
| **Source service** | Service that publishes this topic |
| **Consumer group** | Kafka consumer group ID |
| **Input model** | Schema of the incoming event payload |

### Filtering

| Field | Description |
|---|---|
| **Filter expression** | Boolean expression to process only matching messages (e.g. `event.type == 'PaymentCharged'`) |

### Batching

| Field | Description |
|---|---|
| **Batch size** | Max number of messages per batch |
| **Batch timeout** | Max time to wait before processing a partial batch |

### Resilience

| Field | Description |
|---|---|
| **Retry count** | Max delivery retries before dead-lettering |
| **Dead-letter topic** | Topic where unprocessable messages are sent |
| **Offset reset strategy** | `EARLIEST` (replay from beginning) or `LATEST` (only new messages) |
| **Consumer timeout** | Max time to process a single message |
| **Scaling strategy** | How consumers scale under load |

### Idempotency

Kafka delivery is **at-least-once**: retries, consumer-group rebalances and dead-letter replays can all redeliver the same message. Without deduplication, a Subscription whose action mutates state (`CallUseCase`, `StartSaga`) would apply that effect more than once. The inbox pattern guards against this.

| Field | Description |
|---|---|
| **Idempotency enabled** | Deduplicate redelivered messages before applying any side effect (inbox pattern). **On by default** for new subscriptions. |
| **Idempotency key field** | Message header carrying a stable, producer-assigned id used as the dedup key (typically the source event id). When empty, the generated consumer falls back to the Kafka record key, then the message id. |

:::tip
For a real at-most-once-*effect* guarantee, point **Idempotency key field** at the source event's own id rather than relying on the transport-level message id, which is not stable across redeliveries. If that id travels in the payload instead of a header, adapt the generated key extraction after deserialization.
:::

## Actions — what the Subscription does with each event

A Subscription has one or more **actions**, each defining how the event is dispatched into your domain logic. The action type decides which integration pattern applies:

| Action type | What it does | Pattern |
|---|---|---|
| `CallUseCase` | Invokes a use case, which executes a command on an **Aggregate** | Subscription + UseCase → Aggregate (the destination has commands/invariants) |
| `UpdateProjection` | Drives a **Projection** that writes to a **ReadModel** | Projection → ReadModel (the destination is read-only) |
| `StartSaga` | Triggers a saga to coordinate a long-running process across services | Saga orchestration |
| `Custom` | Custom handler when none of the above fits | — |

Each action can configure a `ModelMapping` to translate the incoming event payload into the input shape its target expects.

### Choosing between `CallUseCase` and `UpdateProjection`

Use the decisive question: *does the destination need to react to commands?*

- **Yes** → the destination is an **Aggregate** with its own behavior. Use `CallUseCase`.
- **No, only read** → the destination is a **ReadModel**. Use `UpdateProjection`.

See [Projections & Read Models](/manual/projections/) for the read-side pattern and [Aggregates](/manual/aggregates/) for the write-side pattern.

## What gets generated

For a `PaymentChargedSubscription`:

- `PaymentChargedSubscription.java` — Spring Cloud Stream consumer
- Message handler method with deserialization
- An **inbox guard** that extracts the idempotency key and skips already-processed messages before any side effect (when idempotency is enabled), plus a `markProcessed` hook after the effects succeed
- Dispatching code that invokes each configured action
- Filter logic (if configured)
- Retry and dead-letter wiring

## Next steps

- Configure a [Projection](/manual/projections/) if your action is `UpdateProjection`
- Define a [Use Case](/manual/use-cases/) if your action is `CallUseCase`
- Use Subscriptions as saga triggers in [Sagas](/manual/sagas/)
