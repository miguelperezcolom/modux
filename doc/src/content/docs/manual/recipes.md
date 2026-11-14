---
title: Starter Recipes
description: Parameterized templates that emit intent-layer elements — start from a 5-line intent, not from six structural pieces
---

Modux's intent layer (flows, processes) already lets you declare *what* you want and have the structure derived. **Starter recipes** take the next step: for the most common architectural moves, a recipe asks only for the parameters and emits the intent element for you. The expanders derive the structure at generation time, and the linter walks you through whatever the recipe deliberately left open (roles, use cases…).

## The built-in recipes

### `materialized-read-model` — Read model kept by a projection

An event in a source context materializes a denormalized read model in a target context.

| Parameter | | |
|---|---|---|
| `id` | required | Id of the new flow (kebab-case) |
| `name` | required | Display name |
| `triggerAggregateId` | required | Source aggregate emitting the event |
| `triggerEvent` | required | Domain event name (e.g. `ReservaCreada`) |
| `targetBoundedContextId` | required | Bounded context that owns the read model |
| `readModelName` | required | Name of the materialized read model |
| `materializedFields` | optional | Comma-separated fields to materialize |

Emits one `MATERIALIZES` flow; the projection, subscription and read model are derived.

### `human-approval-process` — Process with a human approval step

A long-running process started by a domain event: a human approves (with deadline, default `PT48H`, and optional escalation), then an automated step applies the outcome.

| Parameter | | |
|---|---|---|
| `id`, `name` | required | Process identity |
| `triggerAggregateId`, `triggerEvent` | required | What starts the process |
| `ownerBoundedContextId` | required | Bounded context that owns the process |
| `approverRoleId` | optional | Role that approves — linted if missing |
| `deadline` | optional | ISO-8601 duration (default `PT48H`) |
| `escalationRoleId` | optional | Role escalated to on deadline |
| `applyUseCaseId` | optional | Use case applying the approved outcome |

Emits one Process; saga, worklist and deadline watchers are derived.

### `external-notification` — Notify an external system on an event

| Parameter | | |
|---|---|---|
| `id`, `name` | required | Flow identity |
| `triggerAggregateId`, `triggerEvent` | required | Source of the notification |
| `targetBoundedContextId` | required | Bounded context that owns the outbound adapter |

Emits one `NOTIFIES` flow; the subscription and the outbound call are derived.

## Applying a recipe

A recipe used to be applied through the MCP authoring server, which is gone: the model is
now a directory of YAML files that you (or an AI agent) edit directly. What a recipe
*emits* is unchanged and small enough to write by hand — one `flows/{id}.yaml`
(`MATERIALIZES` or `NOTIFIES`, with the parameters above as its fields) or one
`processes/{id}.yaml` for the approval process. The expanders derive the structure from
it at generation time exactly as before, and `mvn modux:validate` reports what is still
open.

The linter is part of the recipe by design: a `human-approval-process` without `approverRoleId` generates a `process-human-role` finding pointing exactly at what to fill in — the recipe gets you a valid skeleton in one move, the linter turns the remaining blanks into a to-do list.
