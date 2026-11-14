---
title: Importing Existing Specs
description: Bootstrap your Modux model from OpenAPI, WSDL and AsyncAPI files
---

Instead of defining every gateway, operation, event and subscription by hand, Modux can read existing API contracts and write the model elements for you. The importers are goals of the [Maven plugin](/reference/maven-plugin/), run from the project that holds the model:

| Goal | Source | Creates |
|---|---|---|
| `import-api` | OpenAPI 3.x YAML / JSON, or WSDL 1.1 | A **first-class API** with its operations (+ typed models for OpenAPI) |
| `import-openapi` | OpenAPI 3.x YAML / JSON | A **gateway** + its operations (something the system calls) |
| `import-asyncapi` | AsyncAPI 2.x YAML | Domain events + subscriptions |

All importers use **upsert** semantics with deterministic ids: if an entity with the same id/name/topic already exists it is updated in place; otherwise a new entity is created. You can re-import as the external spec evolves and Modux will keep the model in sync.

## `import-api`: a contract as a first-class API

```bash
mvn modux:import-api -Dmodux.filePath=contracts/payments.yaml
```

The format is detected (a `.wsdl`, or a contract that declares `definitions` and mentions
neither `openapi` nor `swagger`, is a WSDL). The contract **is** the element: it lands as a
**first-class API** on the map (`apis/api-<title>.yaml`, named after the contract's title),
its operations waiting to be **wired to whoever implements them** — a bounded context
(coarse), a use case or a policy (fine). Wire each operation by dragging its handle in the
[graphical editor](/manual/graphical-editor/) (or by setting its target in the YAML);
re-importing an evolved contract updates the operations and **preserves the wiring**. The
`api-operation-unwired` lint rule flags published operations nobody implements.

`-Dmodux.apiId=<id>` lands the operations on an API that already exists instead of creating
one from the title. `-Dmodux.modelPath` points at the model when it is not `modux/` (or
`.modux/`).

:::note
The importers that turned a contract into operations of an **external system**, or into
use-case stubs of a **bounded context** (REST from OpenAPI, plain from WSDL), were part of
the modux web UI and have no Maven goal yet.
:::

## OpenAPI → Gateways

An OpenAPI file describes an external HTTP API your system depends on. Modux maps it to a `Gateway` with one `GatewayOperation` per HTTP method + path combination.

### From the command line

```bash
mvn modux:import-openapi \
  -Dmodux.filePath=/path/to/openapi.yaml \
  -Dmodux.serviceId=my-service-id
```

They write into the project's model: `modux/` (or `.modux/` when there is no `modux/`);
`-Dmodux.modelPath=…` points them elsewhere.

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

Parameters are also editable by hand: each gateway operation has a parameters list in the gateway's YAML, and a re-import preserves it.

### Auth detection

The gateway's `authType` is inferred from the OpenAPI `securitySchemes`:

| OpenAPI security scheme | Modux `authType` |
|---|---|
| `apiKey` | `ApiKey` (header name captured) |
| `http` + `bearer` | `BearerToken` |
| `http` + `basic` | `Basic` |
| `oauth2` (client credentials) | `OAuth2ClientCredentials` (token URL + scopes captured) |

Fill in the actual credentials (keys, tokens, client secret) after import.

### Re-importing

Running the importer again with the same file updates the gateway's operations and the derived models in place. The gateway ID, any credentials you configured, and rate-limit configuration are preserved — the base URL, operations and models are refreshed.

---

## AsyncAPI → Domain Events and Subscriptions

An AsyncAPI file describes the event-driven interface of a service: which events it publishes and which it consumes. Modux maps:

- `publish` channels → **DomainEventEntity** (this service sends the event)
- `subscribe` channels → **SubscriptionEntity** (this service consumes the event)

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
2. Run the importers to seed the model
3. Fill in the missing model references (by hand, with an AI agent or in the graphical editor) until `mvn modux:validate` is clean
4. Run `mvn modux:generate` to generate the full project

```bash
# Import external REST APIs as gateways
mvn modux:import-openapi -Dmodux.filePath=apis/payments.yaml -Dmodux.serviceId=orders-svc
mvn modux:import-openapi -Dmodux.filePath=apis/inventory.yaml -Dmodux.serviceId=orders-svc

# Import the async event contracts
mvn modux:import-asyncapi -Dmodux.filePath=events/orders-events.yaml -Dmodux.boundedContextId=orders-bc

# Generate the full project
mvn modux:generate
```
