---
title: Business Rules
description: Defining declarative business rules for a rules engine in Modux
---

A **Business Rule** defines a declarative rule in `when → then` form for evaluation by a rules engine (Drools, Easy Rules, RuleBook, etc.). Rules are evaluated against a fact model and fire their actions when all conditions hold.

## Creating a business rule

Add `modux/businessRules/{id}.yaml`: the fact model (`modelId`), priority and group, then its conditions and actions. Or create it from the palette of the [graphical editor](/manual/graphical-editor-guide/). The fields are listed below and in the model's JSON schema — see [Editing the Model](/getting-started/yaml-editing/).

## Configuration

### Basic fields

| Field | Description |
|---|---|
| **Name** | Rule name (e.g. `ApplyEarlyBirdDiscount`) |
| **Description** | What this rule does |
| **Model** | The fact model the rule is evaluated against |
| **Priority** | Salience / execution order (higher fires first) |
| **Enabled** | Whether the rule is active |
| **Rule group** | Agenda group for grouping and controlling which rules fire together |

### Conditions (when)

Each condition is a boolean expression that must be true for the rule to fire. All conditions are ANDed together.

| Field | Description |
|---|---|
| **Expression** | Boolean expression evaluated against the fact (e.g. `booking.daysInAdvance > 30`) |
| **Description** | Human-readable explanation of what the condition checks |

### Actions (then)

Actions are executed in order when all conditions pass.

| Field | Description |
|---|---|
| **Type** | What the action does (see below) |
| **Description** | Human-readable explanation of the action |

#### Action types

| Type | Description | Extra fields |
|---|---|---|
| **SET_FIELD_VALUE** | Write a computed value to a field on the fact | **Field id** — target field name; **Expression** — value expression (e.g. `booking.basePrice * 0.8`) |
| **CALL_USE_CASE** | Invoke a use case as a side effect | **Use case** — the use case to invoke |
| **PUBLISH_EVENT** | Publish a domain event | **Domain event** — the event to publish |
| **CUSTOM** | Hand-written action, implemented in the rule's logic hook | — |

A rule is associated with an aggregate through its **fact model**: the rule's model id is matched to the aggregate whose `modelId` is the same, and the rule is evaluated against that aggregate root.

## What gets generated

Modux generates a small, dependency-free rules subsystem per aggregate that has rules. The structural wiring is generated and locked; the condition and action logic — the free-text part that can't be derived from the model — is a [two-zone hook](/manual/generating-code/#generated-code-vs-your-code-two-zones) you implement in the `{service}-custom` module.

For an aggregate `Reserva` with rules:

| File | Zone | Description |
|---|---|---|
| `application/rules/ReservaRule.java` | generated | Port interface (`priority`, `enabled`, `matches`, `apply`) all rules of this aggregate implement |
| `application/rules/ReservaRulesEvaluator.java` | generated | `@Component` that runs every enabled rule against a fact, highest priority first |
| `application/rules/{Rule}Rule.java` | generated | One `@Component` per rule — holds priority/enabled, delegates `matches`/`apply` to the logic hook |
| `application/rules/{Rule}Logic.java` | generated | The hook interface; its Javadoc lists the rule's conditions and actions |
| `custom/Default{Rule}Logic.java` | **custom (write-once)** | Where you implement the conditions and actions |

The generated `Default{Rule}Logic.matches()` returns `false` until you implement it, so a rule never fires by accident.

## Usage in the domain

Business rules are evaluated explicitly — they do not fire automatically. Inject the `{Aggregate}RulesEvaluator` where they should run (typically a use-case `Custom` step or an aggregate operation) and call `evaluate(fact)`.
