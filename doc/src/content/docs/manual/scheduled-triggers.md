---
title: Scheduled Triggers
description: Cron-based tasks in Modux
---

A **Scheduled Trigger** defines a task that runs automatically on a schedule, like a cron job. Use them for recurring background work: sending reminders, expiring stale records, generating reports, cleaning up data.

## Creating a scheduled trigger

Add `modux/scheduledTriggers/{id}.yaml` and list the id in its bounded context's `scheduledTriggerIds`. The fields are listed below and in the model's JSON schema — see [Editing the Model](/getting-started/yaml-editing/).

Or on the [context map](/manual/graphical-editor/): drag **Trigger programado** from
the palette onto a bounded context (it starts with a daily cron), then **drag the
trigger's handle onto the use case or policy it fires** — an amber dashed edge
labelled with the cron shows the wiring at the detail level. Supr on the edge
unpoints it, Supr on the chip deletes the trigger; both undoable.

## Configuration

| Field | Description |
|---|---|
| **Name** | Trigger name (PascalCase, e.g. `ExpireBookingsTrigger`) |
| **Cron expression** | Standard cron expression (e.g. `0 0 * * *` for daily at midnight) |
| **Description** | What this trigger does |
| **Max execution time** | Maximum allowed runtime before the task is considered hung |
| **Retry policy** | Max retries and backoff if the task fails |
| **Misfire policy** | What to do if a scheduled execution is missed: `FIRE_ONCE`, `DO_NOTHING`, `FIRE_ALL` |

## Cron expression format

Modux uses standard five-field cron syntax:

```
┌─────────── minute (0–59)
│ ┌─────────── hour (0–23)
│ │ ┌─────────── day of month (1–31)
│ │ │ ┌─────────── month (1–12)
│ │ │ │ ┌─────────── day of week (0–7, 0 and 7 = Sunday)
│ │ │ │ │
* * * * *
```

Examples:

| Expression | Meaning |
|---|---|
| `0 * * * *` | Every hour |
| `0 9 * * 1-5` | Every weekday at 9:00 |
| `0 0 1 * *` | First day of every month at midnight |
| `*/15 * * * *` | Every 15 minutes |

## What gets generated

For an `ExpireBookingsTrigger`:

- `ExpireBookingsTrigger.java` — Spring `@Scheduled` component
- Configuration in `application.yaml` for the cron expression
- Retry configuration

## Implementing the task

The generated class provides a hook method to implement:

```java
@Component
public class ExpireBookingsTrigger {
    @Scheduled(cron = "${triggers.expire-bookings.cron}")
    public void execute() {
        // find and expire stale bookings
    }
}
```

## Next steps

- Emit [Domain Events](/manual/domain-events/) from a scheduled trigger to notify other parts of the system
- Use [Sagas](/manual/sagas/) for multi-step scheduled workflows
