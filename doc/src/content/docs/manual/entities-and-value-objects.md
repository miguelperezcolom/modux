---
title: Entities & Value Objects
description: Domain entities and value objects in Modux
---

## Entities

An **Entity** is a domain object with a distinct identity that belongs to an aggregate. Unlike the aggregate root, entities are only accessible through their aggregate root and cannot be persisted independently.

### Creating an entity

Add `modux/entities/{id}.yaml` with its `parentAggregateId` and `modelId`, and list the id in its bounded context's `entityIds`. Or create it from the palette of the [graphical editor](/manual/graphical-editor-guide/). The fields are listed below and in the model's JSON schema — see [Editing the Model](/getting-started/yaml-editing/).

### Entity configuration

| Field | Description |
|---|---|
| **Name** | Entity name (PascalCase) |
| **Identity field** | The field that uniquely identifies this entity within its aggregate |
| **Fields** | List of fields with name, type, and constraints |

### What gets generated

For each entity:

- `{Entity}.java` — domain entity class
- `{Entity}Id.java` — typed identity value object
- Foreign key constraint script for the entity's database table

---

## Value Objects

A **Value Object** is an immutable object defined entirely by its attributes. Value objects have no independent identity — two value objects with the same attributes are considered equal.

### Creating a value object

Value objects are defined in two ways in Modux:

**Inline (as a field type):** When you define a field on an aggregate or entity with type `ValueObject`, Modux automatically generates a strongly-typed wrapper class.

**Standalone:** Via the **Value Objects** section of a bounded context for shared value objects used across multiple aggregates.

### Value object configuration

| Field | Description |
|---|---|
| **Name** | Name of the value object (PascalCase) |
| **Primitive type** | Underlying Java type: `String`, `Integer`, `Long`, `BigDecimal`, etc. |
| **Validation** | Optional validation rule (e.g. regex, min/max, not blank) |

### What gets generated

```java
public record Email(String value) {
    public Email {
        if (value == null || value.isBlank())
            throw new IllegalArgumentException("email is required");
    }
}
```

The internal accessor is always named `value`, regardless of the field name. This ensures consistency across all generated value objects.

### ID value objects

Every aggregate automatically gets an ID value object:

```java
public record BookingId(UUID value) {}
```

These are used throughout the generated code to avoid primitive obsession and make the domain model type-safe.

### Name value objects

If an aggregate has a `name` field, Modux also generates:

```java
public record BookingName(String value) {}
```

---

## When to use each

| Concept | Has identity | Mutable | Use when |
|---|---|---|---|
| **Aggregate** | Yes (own lifecycle) | Yes | Core business concept with its own lifecycle |
| **Entity** | Yes (within aggregate) | Yes | Part of an aggregate with its own identity |
| **Value Object** | No | No | Descriptive concept defined by its attributes |
