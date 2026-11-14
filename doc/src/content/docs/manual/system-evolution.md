---
title: System Evolution
description: How generated systems evolve over time — database migrations, API versioning, and event schema versioning
---

A system that runs in production has to *change* without breaking what is already deployed: the database schema evolves, APIs gain new versions, and event payloads grow new fields. Modux generates the machinery for all three, and follows one rule throughout — **the model is the source of truth, the generated wiring is deterministic, and the parts that can't be derived (data migrations, payload upcasting) are [two-zone hooks](/manual/generating-code/#generated-code-vs-your-code-two-zones) you own**.

## Database schema (Flyway)

Generated services own their schema with [Flyway](https://flywaydb.org/) instead of letting Hibernate mutate it. From the model, Modux emits a baseline migration covering every persisted table — aggregate roots, read models (including flow-materialized ones) and collection entities — with sequences, columns and types derived from the JPA entities.

- `src/main/resources/db/migration/V1__baseline.sql` — the baseline, generated once.
- The production profile runs Flyway and sets `ddl-auto: validate`: Hibernate **validates** that the entities match the migrated schema and never changes it.
- The local profile runs the same migrations against in-memory H2 (in PostgreSQL compatibility mode), so a local boot exercises the real schema.

To keep the migration and the entities in agreement by construction, generated entities carry an explicit `@Table` name and `snake_case` columns matching Spring's physical naming strategy.

### Incremental migrations

After the baseline, Modux **diffs the desired schema against the previous generation** and emits only the delta. It keeps a small schema snapshot under `.modux/schema-{service}.json` and, on each regeneration:

- **New tables and columns** are emitted automatically as `CREATE TABLE` / `ALTER TABLE … ADD COLUMN` in a new `V{n}__model_changes.sql`.
- **Destructive or ambiguous changes** — dropped tables/columns, type changes (a rename is indistinguishable from a drop-plus-add) — are written as commented-out statements at the bottom of the migration for you to review and apply by hand. Modux never drops your data automatically.
- If nothing changed, no migration is produced.

:::note[Migrations are immutable]
A migration that has been applied is never rewritten — Flyway tracks its checksum. Both the baseline and each `V{n}` are therefore write-once; the next change always becomes the next `V{n}`.
:::

Choose the tool with the project's `dbMigrationTool` field: `Flyway` (default), `Liquibase` (not generated yet) or `None` (keep Hibernate `ddl-auto`).

## API versioning

REST endpoints generated from use cases are versioned in the URI: the route is prefixed with `/{apiVersion}` from the use case's `apiVersion` (default `v1`).

```
POST /v1/crear-reserva     # apiVersion unset → v1
POST /v2/crear-estancia    # apiVersion: "v2"
```

To ship a breaking change to an endpoint, add a new use case at the next version; the older one keeps serving `/v1` until you retire it. URI versioning keeps versions explicit and friendly to proxies, caches and observability.

## Event schema versioning

Domain and integration events carry their **schema version in the payload**, so a consumer can tell which version a message was emitted with:

```java
public record EstanciaCreadaEvent(int schemaVersion, String aggregateId, /* … */) {
    public static final int CURRENT_SCHEMA_VERSION = 2;
    // convenience constructor stamps CURRENT_SCHEMA_VERSION, so producers don't change
}
```

The version comes from the event's `schemaVersion` in the model (default 1). Producers are unaffected — a convenience constructor stamps the current version automatically.

### Upcasting older payloads

When an event's `schemaVersion` is greater than 1, Modux scaffolds a **two-zone upcaster hook** — the part that genuinely can't be derived from the model:

| File | Zone | Role |
|---|---|---|
| `{Event}Upcaster` | generated | Port: `Map<String,Object> upcast(Map<String,Object> payload, int fromVersion)` |
| `Default{Event}Upcaster` | **custom (write-once)** | Where you migrate an older payload up to the current shape |

A consumer that receives an older-version message decodes it as a raw map, calls the upcaster to bring it up to the current schema, then maps it to the current event record. The default implementation passes the payload through unchanged until you fill it in.

### Compatibility guidance

- **Additive change** (a new optional field): bump nothing — old and new consumers stay compatible. Give the new field a default in the upcaster if older payloads omit it.
- **Breaking change** (renamed/removed field, changed meaning): increase the event's `schemaVersion` and implement the upcaster to translate older payloads.

## See also

- [Generating Code → two zones](/manual/generating-code/#generated-code-vs-your-code-two-zones)
- [Use Cases](/manual/use-cases/) — `apiVersion` and REST exposure
- [Domain Events](/manual/domain-events/) and [Subscriptions](/manual/subscriptions/)
