---
title: Domain Events
description: Events emitted by aggregates in Modux
---

**Domain Events** represent something that happened in the domain. They are facts — immutable records of a state change that already occurred.

A domain event can be consumed in two ways:

- **Inside the same bounded context** — by **Projections** (which write to ReadModels) and **Sagas** (which coordinate long-running processes). No Subscription is needed for in-context consumers.
- **From another bounded context or external system** — only after the event is promoted to an **integration event** (see below). Cross-context consumers receive it through a [Subscription](/manual/subscriptions/), which then dispatches it to a use case, projection or saga via its configured action.

## Creating a domain event

Add `modux/domainEvents/{id}.yaml` with its payload model (`modelId`) and list the id in its bounded context's `domainEventIds`. Or create it from the palette of the [graphical editor](/manual/graphical-editor-guide/). The fields are listed below and in the model's JSON schema — see [Editing the Model](/getting-started/yaml-editing/).

## Configuration

| Field | Description |
|---|---|
| **Name** | Event name in past tense (e.g. `BookingConfirmed`, `PaymentFailed`) |
| **Aggregate** | The aggregate that emits this event |
| **Fields** | Data captured in the event payload |
| **Version** | Event schema version (used for evolution) |

### Fields

Event fields capture the relevant state at the time the event occurred. Common fields include:

- The aggregate ID
- Key attributes that changed
- Timestamp (usually added automatically)
- Actor or user who triggered the change

## What gets generated

For a `BookingConfirmed` event:

```java
public record BookingConfirmed(
    BookingId bookingId,
    String reference,
    String customer,
    Instant occurredOn
) {}
```

Events are plain Java records — immutable and serialisable.

## How events flow

```
Aggregate operation
    → domain event emitted
        → in-context: consumed by Projections / Sagas in the same bounded context
        → cross-context (if promoted to IntegrationEvent):
              → published to Kafka topic
                  → Subscription in the consuming bounded context
                      → CallUseCase | UpdateProjection | StartSaga
```

If the **Outbox Pattern** is enabled on the service (`outboxEnabled: true`), events are written to an outbox table in the same transaction as the aggregate state change, and then published to Kafka by a background relay. This guarantees at-least-once delivery without distributed transactions. Without it, events are sent directly: a crash between saving and sending loses the event. See [Outbox Pattern](/reference/patterns/#outbox-pattern).

## Integration events

A domain event lives inside its bounded context. When you need to notify **other domains or external systems**, you can promote a domain event to an **integration event** — an event designed to cross domain boundaries.

To mark a domain event as an integration event, enable the **Publish as integration event** toggle. This unlocks a set of additional fields that control how the event is published to the message broker.

### Why separate domain events from integration events?

Domain events are internal implementation details — they drive projections, sagas, and invariant checks within the same bounded context. Integration events are part of your public API: once published, other teams or services depend on their schema and semantics. Keeping them separate lets you:

- Evolve the internal domain model without breaking external consumers.
- Choose an explicit integration model (a dedicated DTO) that hides domain internals.
- Apply different reliability settings (retries, DLQ) to cross-domain communication.

### Integration event configuration

| Field | Description |
|---|---|
| **Publish as integration event** | Enables publishing this event to the message broker for external consumers |
| **Integration model** | DTO model used as the event payload. If different from the domain event's own model, a mapping is applied before publishing |
| **Topic name** | Kafka topic where the event is published (e.g. `booking.confirmed`) |
| **Partitions** | Number of Kafka partitions for the topic |
| **Retention (ms)** | How long messages are kept in the topic |
| **Serialization format** | Payload format: `JSON`, `AVRO`, or `PROTOBUF` |
| **Compression type** | Message compression: `NONE`, `SNAPPY`, `LZ4`, or `ZSTD` |
| **Dead letter queue** | Enable a DLQ to capture messages that fail to be processed |
| **Dead letter queue name** | Name of the DLQ topic |
| **Max delivery attempts** | Number of delivery retries before a message is sent to the DLQ |
| **Schema version** | Explicit version tag for the integration event schema |
| **Routing key field** | Event field used as the Kafka message key (controls partition routing) |
| **Replayable** | Whether consumers can request a replay of past events from this topic |

### Example

```
BookingConfirmed (domain event)
    publishAsIntegrationEvent = true
    integrationModel          = BookingConfirmedEvent   ← public DTO
    topicName                 = booking.confirmed
    partitions                = 3
    serializationFormat       = JSON
    deadLetterQueueEnabled    = true
    deadLetterQueueName       = booking.confirmed.dlq
    maxDeliveryAttempts       = 3
    routingKeyField           = bookingId
    replayable                = true
```

In this setup, when a `BookingConfirmed` domain event is raised, Modux maps it to the `BookingConfirmedEvent` DTO and publishes it to the `booking.confirmed` Kafka topic. Failed deliveries go to `booking.confirmed.dlq` after 3 attempts.

## Event versioning

When you change an event's structure, increment the **version** field. Modux will generate separate classes for each version, allowing consumers to handle old and new event formats during migration.

## Next steps

- Use events to trigger [Sagas](/manual/sagas/)
- Build [Projections](/manual/projections/) that listen to events
- Configure [Subscriptions](/manual/subscriptions/) to react to events in other services
