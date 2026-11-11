---
title: Use Cases
description: Defining application-layer use cases in Modux
---

A **Use Case** is the primary unit of application behaviour in Modux. It sits in the application layer and orchestrates domain objects to fulfil a single business intent — create a booking, approve an order, send a notification. In hexagonal architecture terms it is the entry point driven by any inbound adapter (REST controller, UI page, message consumer, scheduler).

## Creating a use case

1. Open **Behaviour → Use Cases**
2. Click **New**
3. Set the name, input/output models and exposure options
4. Add steps to describe the orchestration logic

## Configuration

### Basic fields

| Field | Description |
|---|---|
| **Name** | Use case name (PascalCase, e.g. `CreateBooking`, `ApproveOrder`) |
| **Input model** | The model (DTO / value object) received as input |
| **Output model** | The model returned as output (optional) |
| **API version** | Version string for this use case's API contract |
| **Timeout (ms)** | Maximum execution time before the use case is aborted |
| **Transaction boundary** | `LOCAL` (single DB), `DISTRIBUTED` (2PC / XA), `SAGA` (compensating transactions) |
| **Policy** | `policy: true` marks reaction/automation logic that has the *shape* of a use case but expresses no business case — the lilac sticky of an EventStorming. Policies stay out of business catalogs and UI derivations; they exist to be invoked by event reactions (subscriptions, flows, processes, workflows). The linter warns when a policy has no trigger (`policy-without-trigger`) or derives a UI (`policy-exposed-as-ui`) |

### Exposure

A use case can be exposed through one or more inbound adapters simultaneously:

| Flag | Description |
|---|---|
| **Exposed as REST** | Generates a Spring MVC `@RestController` endpoint |
| **Exposed as gRPC** | Generates a gRPC service stub |
| **Exposed as MCP** | Exposes as an MCP tool for LLM agents |
| **Exposed as async** | Consumed from a message broker topic |
| **Exposed as UI** | Available for invocation from UI pages (toolbar buttons, wizard actions) |

#### REST options

| Field | Description |
|---|---|
| **HTTP method** | `GET`, `POST`, `PUT`, `DELETE`, or `PATCH` |
| **REST path** | URL path (e.g. `/bookings/{id}/approve`) |

#### gRPC options

| Field | Description |
|---|---|
| **gRPC service name** | Proto service name |
| **gRPC method name** | Proto method name |

#### MCP options

| Field | Description |
|---|---|
| **MCP description** | Human-readable description of the tool shown to LLM agents |

#### Async options

| Field | Description |
|---|---|
| **Topic name** | Message broker topic to consume from |
| **Consumer group** | Consumer group identifier |
| **Retry count** | Number of retries on processing failure |
| **Dead letter queue** | Topic for messages that exceed the retry limit |
| **Ordering key** | Field used to preserve message ordering |

### Performance

| Field | Description |
|---|---|
| **Cacheable** | Whether the result can be cached |
| **Cache TTL (seconds)** | How long the cached result is valid |

### Reliability

| Field | Description |
|---|---|
| **Idempotency enabled** | Deduplicate repeated calls with the same key |
| **Idempotency key field** | Input field used as the idempotency key |
| **Rate limit enabled** | Throttle incoming calls |
| **Rate limit (req/s)** | Maximum allowed requests per second |

### Security

| Field | Description |
|---|---|
| **Allowed roles** | RBAC roles permitted to invoke this use case |
| **Allowed scopes** | OAuth2 scopes required to invoke this use case |

## Steps

Steps describe the orchestration logic of the use case. They are executed in order and can be mixed freely:

| Type | Description |
|---|---|
| **Custom** | Hand-written logic (generates a `{Name}Steps` hook you implement in the `{service}-custom` module) |
| **ReadAggregate** | Load an aggregate root by ID from its repository |
| **CallAggregateOperation** | Invoke a named operation on an aggregate |
| **SaveAggregate** | Persist an aggregate root via its repository |
| **CallGateway** | Call an outbound gateway operation |
| **PublishDomainEvent** | Publish a domain event to the message broker |
| **CallUseCase** | Delegate to another use case |
| **CallQueryService** | Read from a query service operation |
| **ApplyModelMapping** | Transform data between two models via a mapping definition |

### From the graphical editor

Steps are also born on the context map (detail level). Drag **«Paso de caso de uso»**
from the palette onto a use case to add a `Custom` step — its *intent* is then stated
in the form. Steps with a counterpart on the map are created by drawing the relation
from the use case instead, and the relation types the step: another use case
(`CallUseCase`), a query service (`CallQueryService`), an application event
(`PublishApplicationEvent`), an external operation (`CallExternalUseCase`) or an
**aggregate** (`CallAggregateOperation` — when the aggregate has exactly one
operation it wires itself; otherwise the operation is picked in the form). The
use-case→aggregate relation draws an amber «opera sobre» edge, and Supr on any of
those edges removes the step behind it.

A call to a use case is placed **before** the first custom step (or the first publication):
it brings what the decision needs. When the called use case runs in **another service**, the
call goes over REST with nothing else to declare: the callee answers at `/v1/{use-case}`, the
caller gets a client (`application/out/remote/{UseCase}Client`, at `{SERVICE}_URL`), and the
custom steps after the call receive its answer as a parameter:

```java
ComprarResult comprar(ComprarCommand command, ConsultarPrecioClient.Response consultarPrecio);
```

A call to an **external system's operation** (`CallExternalUseCase`, drawn from the use case to
the operation) is the same kind of call, to a real process: `POST {path}` (default `/{name}`) at
`{SYSTEM}_URL`, whose default is the system's `baseUrl`. The operation declares what it receives
and answers (`inputModelId`, `outputModelId`; without an input model the use case's own input
travels), and its answer reaches the steps after it. The compose file passes `{SYSTEM}_URL` on,
pointing a `localhost` default at the host (`host.docker.internal`), since the partner is not part
of the compose network.

Either way, when the other side says no (a 4xx), the caller rejects with the same
`BusinessRuleException` and the message the other side gave, not an unexpected error.

### The pipeline shape

Every operation of an information system has the same shape: **gather data → transform it → write it somewhere or return it**. Each step type plays one of those roles:

| Phase | Step types | Role |
|---|---|---|
| **Gather** | `ReadAggregate`, `CallQueryService` | bring data in |
| **Transform** | `ApplyModelMapping` | reshape it (declaratively; use `Custom` when the logic deserves code) |
| **Custom** | `Custom` + `intent` | logic that deserves code: state the *intent* in natural language — it becomes javadoc in the scaffold and [`ai-complete`](/manual/ai-completion/) proposes the implementation |
| **Write** | `CallAggregateOperation`, `SaveAggregate`, `PublishDomainEvent`, `CallGateway` | produce an effect |
| **Return** | the use case's **output model** | give data back to the caller |
| — | `CallUseCase` | compose another pipeline |

If a use case doesn't fit *gather → transform → write/return*, that is usually a sign it is two use cases. The linter asks the pipeline questions for you: `use-case-pipeline` flags use cases whose steps only gather/transform with no output model, and `operation-pipeline` flags aggregate operations that neither set state, emit events nor return.

Each step has:

| Field | Description |
|---|---|
| **Name** | Step label (used in generated code and tracing) |
| **Type** | One of the types above |
| **Aggregate** | Target aggregate (for `ReadAggregate`, `CallAggregateOperation`, `SaveAggregate`) |
| **Operation** | Aggregate operation to invoke (for `CallAggregateOperation`) |
| **Gateway** | Target gateway (for `CallGateway`) |
| **Gateway operation** | Gateway method to call (for `CallGateway`) |
| **Domain event** | Event to publish (for `PublishDomainEvent`) |
| **Use case** | Nested use case to invoke (for `CallUseCase`) |
| **Model mapping** | Mapping definition to apply (for `ApplyModelMapping`) |

## What gets generated

For each use case Modux generates:

- `{Name}UseCase.java` — concrete Spring `@Service` (locked, regenerated) that runs every step; non-`Custom` steps are fully generated
- For each `Custom` step: a `{Name}Steps` interface (the hook, in the generated module) plus a write-once `Default{Name}Steps` `@Component` scaffolded in the `{service}-custom` module. The use case calls the hook via Spring; you fill in the body. See [Generating code → two zones](/manual/generating-code/#generated-code-vs-your-code-two-zones)
- `{Name}Command.java` — the command/request record
- REST controller, gRPC stub, MCP tool registration, or async consumer — depending on exposure flags
- Security annotations (`@PreAuthorize`) based on allowed roles and scopes
- Caching annotations (`@Cacheable`) if cacheable is enabled
