---
title: Importing Existing Specs
description: Bootstrap your Modux spec store from OpenAPI, WSDL and AsyncAPI files
---

Instead of defining every gateway, operation, event and subscription by hand, Modux can read existing API contracts and populate the spec store automatically:

| Importer | Source | Creates |
|---|---|---|
| OpenAPI (outbound) | OpenAPI 3.x YAML / JSON | Gateways + operations |
| OpenAPI (inbound) | OpenAPI 3.x YAML / JSON | REST-exposed **use-case stubs** on a bounded context + typed models |
| OpenAPI (partner) | OpenAPI 3.x YAML / JSON | **Operations on an external system** |
| WSDL | WSDL 1.1 | **Operations on an external system**, or SOAP **use-case stubs** on a bounded context |
| AsyncAPI | AsyncAPI 2.x YAML | Domain events + subscriptions |

All importers use **upsert** semantics with deterministic ids: if an entity with the same id/name/topic already exists it is updated in place; otherwise a new entity is created. You can re-import as the external spec evolves and Modux will keep the store in sync.

## One door: Import API contract

**Organización › Import API contract (OpenAPI / WSDL)** handles both formats and both
directions with a single form: the file's format is detected, and the **target** decides
the meaning —

- **No target** — the contract **is** the element: it lands as a **first-class API**
  on the map (named after the contract's title), its operations waiting to be **wired
  to whoever implements them** — a bounded context (coarse), a use case or a policy
  (fine). Drag each operation's handle on the canvas to wire it; re-importing an
  evolved contract updates the operations and **preserves the wiring**. The
  `api-operation-unwired` lint rule flags published operations nobody implements.
- **External system id** — the contract describes what a *partner* offers: every
  operation lands as an operation of the external system (`xuc-<system>-<operation>`),
  ready to be called by use cases (`CallExternalUseCase`), consumed by
  [AI agents](/manual/ai-agents/), or polled by
  [projections](/manual/projections/#alternative-sources). For WSDL, the
  `portType.operation` and its `documentation` travel as the description.
- **Bounded context id** — the contract is something *we* must expose: OpenAPI operations
  become REST-exposed use-case stubs (method, path, typed models); WSDL operations become
  plain use-case stubs (the exposure — SOAP shim, REST — is the developer's call).

At most one target. Context-targeted imports never hijack a use-case id owned by
another bounded context: the id is scoped (`uc-<context>-<operation>`) instead of silently
overwriting.

## OpenAPI → Gateways

An OpenAPI file describes an external HTTP API your system depends on. Modux maps it to a `Gateway` with one `GatewayOperation` per HTTP method + path combination.

### From the UI

1. Open the Modux UI and navigate to **Import OpenAPI spec**
2. Fill in:
   - **Service ID** — the service that owns this gateway (optional; links the gateway to the service)
   - **File path** — absolute path to the `.yaml` or `.json` OpenAPI file on disk
3. Click **Import OpenAPI**

### From the command line

```bash
mvn modux:import-openapi \
  -Dmodux.filePath=/path/to/openapi.yaml \
  -Dmodux.serviceId=my-service-id
```

`serviceId` is optional. When provided, the gateway is automatically added to the service's `gatewayIds` list.
The gateway is written to the repository's model (`modux/`, or `.modux/` when there is no
`modux/`), like every other goal; `-Dmodux.modelPath` points it elsewhere.

### What gets created

Given this OpenAPI fragment:

```yaml
info:
  title: Payment API
servers:
  - url: https://api.payments.example.com
paths:
  /payments:
    post:
      operationId: createPayment
  /payments/{id}:
    get:
      operationId: getPayment
    delete:
      operationId: deletePayment
```

Modux creates:

- One `Gateway` named **PaymentApi** (the title turned into a valid identifier) with `baseUrl = https://api.payments.example.com`
- Three `GatewayOperation` entries: `createPayment`, `getPayment`, `deletePayment`
- One **typed `Model`** per schema in `components.schemas`, with a field per property (primitives mapped to Modux field types; `$ref` properties become references to the corresponding model)

### Typed request/response models

Each operation's `inputModelId` and `outputModelId` are wired to the models derived from its request body and `2xx` response schema (a `$ref`, or an array of `$ref` for list responses). The generated gateway adapter then exposes **typed methods** instead of untyped stubs.

### Path and query parameters

OpenAPI `path`, `query`, `header` and `cookie` parameters are captured per operation and become typed method arguments. The generated adapter binds them automatically: path placeholders (e.g. `/pets/{petId}`) and query parameters are expanded from the call's arguments, header parameters are set on the request headers, and cookie parameters are added to the `Cookie` header. Parameter names that aren't valid Java identifiers (e.g. `X-Trace-Id`) are turned into camelCase arguments while the original name is used on the wire.

Parameters are also editable in the Modux UI: each gateway operation has a parameters list where you can add, edit or remove them, and they are preserved when you save.

### Auth detection

The gateway's `authType` is inferred from the OpenAPI `securitySchemes`:

| OpenAPI security scheme | Modux `authType` |
|---|---|
| `apiKey` | `ApiKey` (header name captured) |
| `http` + `bearer` | `BearerToken` |
| `http` + `basic` | `Basic` |
| `oauth2` (client credentials) | `OAuth2ClientCredentials` (token URL + scopes captured) |

Fill in the actual credentials (keys, tokens, client secret) in the UI after import.

### Re-importing

Running the importer again with the same file updates the gateway's operations and the derived models in place. The gateway ID, any credentials you configured, and rate-limit configuration are preserved — the base URL, operations and models are refreshed.

---

## AsyncAPI → Domain Events and Subscriptions

An AsyncAPI file describes the event-driven interface of a service: which events it publishes and which it consumes. Modux maps:

- `publish` channels → **DomainEventEntity** (this service sends the event)
- `subscribe` channels → **SubscriptionEntity** (this service consumes the event)

### From the UI

1. Navigate to **Import AsyncAPI spec**
2. Fill in:
   - **Bounded context ID** — the bounded context that owns these events/subscriptions
   - **File path** — absolute path to the AsyncAPI YAML file
3. Click **Import AsyncAPI**

### From the command line

```bash
mvn modux:import-asyncapi \
  -Dmodux.filePath=/path/to/asyncapi.yaml \
  -Dmodux.boundedContextId=my-context-id
```

Like `import-openapi`, it writes to the repository's model (`-Dmodux.modelPath` to change it).

### What gets created

Given this AsyncAPI fragment:

```yaml
asyncapi: "2.6.0"
info:
  title: Order Service
channels:
  order.created:
    publish:
      operationId: publishOrderCreated
      message:
        name: OrderCreated
  order.shipped:
    subscribe:
      operationId: onOrderShipped
      message:
        name: OrderShipped
```

Modux creates:

- One `DomainEvent` named **OrderCreated** with `topicName = order.created`
- One `Subscription` named **onOrderShipped** with `topicName = order.shipped`

The `modelId` and `inputModelId` fields are left blank — fill them in once the corresponding models are defined.

### Re-importing

Running the importer again matches existing entities by `topicName`. If a matching entity is found it is updated (name refreshed); otherwise a new one is created.

---

## Typical bootstrap workflow

1. Collect the OpenAPI / AsyncAPI files from the teams or services you integrate with
2. Run the importers to seed the spec store
3. Open the UI to fill in the missing model references
4. Run `mvn modux:generate` to generate the full project

```bash
# Import external REST APIs as gateways
mvn modux:import-openapi -Dmodux.filePath=apis/payments.yaml -Dmodux.serviceId=orders-svc
mvn modux:import-openapi -Dmodux.filePath=apis/inventory.yaml -Dmodux.serviceId=orders-svc

# Import the async event contracts
mvn modux:import-asyncapi -Dmodux.filePath=events/orders-events.yaml -Dmodux.boundedContextId=orders-bc

# Generate the full project
mvn modux:generate -Dmodux.projectId=acme-platform
```
