---
title: Operations
description: Commands and queries on aggregates
---

**Operations** define the commands and queries that can be performed on an aggregate. They are the primary way to express the behaviour of your domain.

## Types of operations

| Type | Description |
|---|---|
| `CREATE` | Creates a new instance of the aggregate |
| `UPDATE` | Modifies an existing instance |
| `DELETE` | Removes an instance |
| `CUSTOM` | A custom command with domain-specific logic |
| `QUERY` | A read-only operation that returns data |

## Creating an operation

1. Open an aggregate and go to **Operations**
2. Click **New**
3. Configure and save

## Configuration

### Basic

| Field | Description |
|---|---|
| **Name** | Operation name (camelCase, e.g. `confirmBooking`) |
| **Type** | `CREATE`, `UPDATE`, `DELETE`, `CUSTOM`, or `QUERY` |
| **Description** | Human-readable description of what this operation does |

### Input model

Define the fields that the caller must provide:

| Property | Description |
|---|---|
| **Fields** | Input fields with name, type, and constraints |
| **Validations** | Cross-field validation rules |

### Output model

For `QUERY` operations, define what the operation returns:

| Property | Description |
|---|---|
| **Fields** | Output fields |
| **Pagination** | Enable paginated results (page number, page size, total count) |

### Preconditions

Business rules that must hold before the operation can execute. Expressed as boolean conditions referencing the aggregate's current state. If a precondition fails, the operation throws a domain exception.

Example: a `confirmBooking` operation might require `status == PENDING`.

### Side effects

What happens after the operation executes:

| Setting | Description |
|---|---|
| **Field sets** | Which aggregate fields are updated and how |
| **Events emitted** | Domain events fired as a result of this operation |

### Intent (CUSTOM operations)

A `CUSTOM` operation delegates its body to a two-zone hook (`Default{Op}{Aggregate}Operation`, developer-owned). Its **spec is natural language**: fill the operation's `intent` field with what it must do.

```yaml
- id: "crear-habitacion"
  name: "Crear"
  type: "CUSTOM"
  intent: "Da de alta la habitación con su tipo y estado LIBRE, validando que el número no exista ya en la planta"
```

The intent becomes javadoc on the generated hook and scaffold, and [`mvn modux:ai-complete`](/manual/ai-completion/) proposes the `execute()` body from it (mutating state only through the `OperationContext`). The developer — who owns the scaffold — reviews, commits or rewrites the proposal. An operation with an intent also satisfies the `operation-pipeline` lint rule: the NL is its declared effect.

### Non-functional

| Setting | Description |
|---|---|
| **Idempotency key** | Field used to detect duplicate requests |
| **Rate limiting** | Max calls per time window |
| **Transaction** | Transaction propagation and isolation level |

## What gets generated

For a `CUSTOM` operation named `confirmBooking` on a `Booking` aggregate:

- `ConfirmBookingBookingOperation.java` — the operation strategy in the aggregate's domain package (locked, regenerated)
- `BookingOperationContext.java` — context object giving the operation access to the aggregate's state (locked)
- `DefaultConfirmBookingBookingOperation.java` — write-once default implementation scaffolded in the `{service}-custom` module, for you to fill in (see [two zones](/manual/generating-code/#generated-code-vs-your-code-two-zones))

### Its input

The operation's **input model** (`inputModelId`) becomes a record nested in the operation, and the
implementation receives it next to the context:

```java
public interface SalirARepartoEnvioOperation {
    record Input(String transportista) {}
    void execute(EnvioOperationContext context, Input input);
}
```

Without an input model (or with one with no fields) it is `execute(context)`.

### Calling it from a use case

A use case whose steps are `ReadAggregate`, `CallAggregateOperation` and `SaveAggregate` runs the
operation itself — no use-case hook is left to write:

```java
var envio = envioRepository.findById(new EnvioId(Long.valueOf(String.valueOf(command.envioId()))))
        .orElseThrow(() -> BusinessRuleException.notFound("Envio " + command.envioId() + " no existe"));
envio.salirAReparto(salirARepartoEnvioOperation, new SalirARepartoEnvioOperation.Input(command.transportista()));
envioRepository.save(envio);
```

The aggregate is loaded from the command's `id`, or from its `{aggregate}Id` field (which the
generated form shows as a lookup of that aggregate). Each input field is taken from the command
field with its name; when one is missing the step stays a hook, with the operation as its intent.

### Values the system supplies

An input field with a `systemValue` is not taken from the command: the use case fills it.

| `systemValue` | The use case passes |
|---|---|
| `CURRENT_USER` | `currentUser.username()` — who signed in (the identity provider's `preferred_username`), through the generated `CurrentUser` port |
| `NOW` / `TODAY` | `LocalDateTime.now()` / `LocalDate.now()` |
| `SEQUENCE` | The next number of the `{Aggregate}.{field}` series, from the generated `Sequences` port: one row per series, locked while the number is taken, inside the use case's transaction — a use case that fails gives its number back, so there are no gaps |

So «approved by» and «issue number» reach the domain without anyone typing them, and an invariant
can hold «whoever asked for it cannot approve it»:

```java
numero.aprobar(aprobarNumeroOperation, new AprobarNumeroOperation.Input(
        currentUser.username(), java.time.LocalDateTime.now(), Math.toIntExact(sequences.next("Numero.numero"))));
numeroInvariants.check(new NumeroContext(numero));
numeroRepository.save(numero);
```

The aggregate's invariants are checked after the operation, before saving.

`CurrentUser` (in `application/out` of every module) is also there for the custom zone: any hook can
inject it to ask who is running it or whether they have a role.

### An aggregate with operations has no generic update

Once an aggregate has `CUSTOM` operations it changes only through them: the aggregate has no
`update(...)`, its CRUD shows no **Edit** (it keeps create, view and delete), and the generic update
use case — the REST `PUT` included — answers `409 Conflict` naming the operations to use. A generic
update would overwrite the whole state and skip the rules the operations hold. Unless it is declared
`editable` — see [Aggregates](/manual/aggregates/#editable-with-operations).

For `QUERY` operations:

- `{OperationName}Query.java` — query parameters DTO
- `{OperationName}Result.java` — result DTO
- Query method on `{Aggregate}QueryService`

## Example

```
Operation: confirmBooking
Type: CUSTOM
Preconditions:
  - status == PENDING
Side effects:
  - set status = CONFIRMED
  - emit BookingConfirmed event
```

This generates a use case that validates the precondition, updates the aggregate, and publishes the event — all in a single transactional boundary.
