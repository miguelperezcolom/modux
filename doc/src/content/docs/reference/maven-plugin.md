---
title: Maven Plugin Reference
description: Configuration reference for the modux-maven-plugin
---

The `modux-maven-plugin` lets you trigger Modux code generation from any Maven build — without running the Modux UI. It shares the same generation logic as the UI-driven generator, so any templates added to `model-driven-generator` take effect automatically without any plugin changes.

## Coordinates

```xml
<groupId>io.mateu.modux</groupId>
<artifactId>modux-maven-plugin</artifactId>
<version>0.5.0</version>
```

## Goal: `validate`

**Default phase:** `validate`

Checks the model before anything is generated from it, and fails the build on any error:

- **Dangling references** — an `*Id` / `*Ids` field naming an element that does not exist.
- **Duplicate ids** — the same id on two elements (only an element and its backing model may share one).
- **Declarations that collide once generated** — two aggregates, entities, use cases, events or
  read models of a context that become the same class (case aside: `Pedido` and `PEDIDO` cannot
  live side by side on macOS); two bounded contexts that become the same package; two services
  that become the same project or listen on the same port; a model field named after a Java
  keyword (`class`, `default`…) or declared twice.
- **The semantic rule catalog** — a saga step without compensation, a workflow that can loop
  forever or that nothing starts, a module deployed by two services, and the rest of the lint.

Errors stop the build; warnings are printed and the build goes on.

| Parameter | Property | Default | Description |
|---|---|---|---|
| `modelPath` | `modux.modelPath` | the repository's model directory | Where the model is |
| `ignoredReferences` | `modux.ignoredReferences` | — | Reference fields that legitimately point outside the model |
| `reportOnly` | `modux.validateOnly` | `false` | Report the problems without failing the build |

## Goal: `generate`

**Default phase:** `generate-sources`

Generates the system from the model into the project's `outputPath`. It runs the same checks as
`validate` first and generates nothing when the model has errors: a conflict is reported on the
model element that causes it, not as a compiler error in the generated code.

Everything defaults off the model itself — the project, its output path and its package are
facts the model carries; the parameters only override them.

| Parameter | Property | Default | Description |
|---|---|---|---|
| `modelPath` | `modux.modelPath` | the repository's model directory | Where the model is |
| `projectId` | `modux.projectId` | the model's project | Only for a store that still holds several |
| `outputPath` | `modux.outputPath` | the project's `outputPath` | Where the generated code goes |
| `packageName` | `modux.packageName` | the project's `packageName` | Root Java package |
| `sourceOnly` | `modux.sourceOnly` | `false` | Skip the DevOps/IaC artifacts; Maven projects and Java sources only |
| `skipChecks` | `modux.skipChecks` | `false` | Generate even when the model has errors |

```bash
mvn modux:validate    # check the model
mvn modux:generate    # check it again, then generate
```

## Goal: `ai-complete`

**Default phase:** none (run explicitly, after `generate`)

Implements the pending hooks of the custom zone — use-case steps, aggregate operations — with
your local AI command line, from the intent the model wrote on them. It needs no API key, writes
only under `{service}-custom/src/main/java`, builds the service and retries with the errors (three
attempts); a service that still does not build is left as it was.

### Parameters

| Parameter | Property | Default | Description |
|---|---|---|---|
| `modelPath` | `modux.modelPath` | the repository's model directory | Where the model is |
| `outputPath` | `modux.outputPath` | the project's `outputPath` | The generated system |
| `aiCommand` | `modux.ai.command` | `claude -p --output-format text` | Reads the prompt on stdin, answers on stdout |
| `buildCommand` | `modux.ai.build` | `mvn -q compile -DskipTests` | How a service is checked |
| `timeoutMinutes` | `modux.ai.timeoutMinutes` | `15` | Per AI call |

See [AI-Assisted Code Completion](/manual/ai-completion/) for the full guide.

## Goal: `deploy`

**Default phase:** none (run explicitly, after `generate`)

Deploys the generated system to an environment of the model: `local` (the compose on your
Docker) or one of the deployment's environments, on the Kubernetes context it names — images
built and loaded (kind) or pushed (any other cluster), manifest applied, rollouts awaited and
the DNS of its hosts pointed at the ingress.

| Parameter | Property | Default | Description |
|---|---|---|---|
| `environment` | `modux.env` | `local` | `local`, `dev`, `staging` or `prod` |
| `tag` | `modux.tag` | the moment of the deploy | Image tag |
| `skipBuild` | `modux.skipBuild` | `false` | Skip `mvn install` of the generated projects |
| `platform` | `modux.platform` | `linux/amd64` | Architecture of pushed images |
| `outputPath` | `modux.outputPath` | the project's `outputPath` | The generated system |

```bash
mvn modux:deploy -Dmodux.env=prod
```

See [Deploying](/manual/deploying/) for environments, URLs and DNS providers.

## Goal: `import-openapi`

**Default phase:** none (run explicitly)

Reads an OpenAPI 3.x YAML or JSON file and upserts `GatewayEntity` + `GatewayOperationEntity` entries into the spec store.

### Parameters

| Parameter | Property | Default | Required | Description |
|---|---|---|---|---|
| `filePath` | `modux.filePath` | — | **Yes** | Path to the OpenAPI YAML or JSON file |
| `specFile` | `modux.specFile` | `${project.basedir}/.dev/data/model-driven-store.yaml` | No | Path to the YAML spec store |
| `serviceId` | `modux.serviceId` | — | No | Service ID to link the imported gateway to |

### Usage

```bash
mvn modux:import-openapi \
  -Dmodux.filePath=apis/payments.yaml \
  -Dmodux.serviceId=my-service-id
```

See [Importing Existing Specs](/manual/importers/) for the full guide.

## Goal: `import-asyncapi`

**Default phase:** none (run explicitly)

Reads an AsyncAPI 2.x YAML file and upserts `DomainEventEntity` (publish channels) and `SubscriptionEntity` (subscribe channels) into the spec store.

### Parameters

| Parameter | Property | Default | Required | Description |
|---|---|---|---|---|
| `filePath` | `modux.filePath` | — | **Yes** | Path to the AsyncAPI YAML file |
| `specFile` | `modux.specFile` | `${project.basedir}/.dev/data/model-driven-store.yaml` | No | Path to the YAML spec store |
| `boundedContextId` | `modux.boundedContextId` | — | No | Bounded context ID that owns these events/subscriptions |

### Usage

```bash
mvn modux:import-asyncapi \
  -Dmodux.filePath=events/orders-events.yaml \
  -Dmodux.boundedContextId=my-context-id
```

See [Importing Existing Specs](/manual/importers/) for the full guide.

## Running from the command line

```bash
# Use defaults from pom.xml configuration
mvn modux:generate

# Override any parameter on the fly
mvn modux:generate \
  -Dmodux.projectId=acme-platform \
  -Dmodux.outputPath=/tmp/generated \
  -Dmodux.packageName=com.acme
```

## How it works

The plugin boots a minimal Spring `AnnotationConfigApplicationContext` containing only two beans:

- `CommonFileRepository` — reads and deserialises the YAML spec file
- `GenerateCodeUseCase` — renders all Freemarker templates and writes the output files

No Spring Boot auto-configuration or embedded server is started. The plugin then calls `GenerateCodeUseCase.handle()` and shuts the context down.

Because all generation logic lives in `model-driven-generator`, **adding new templates or domain concepts never requires changes to the plugin itself**.

## Building the plugin locally

The plugin is part of the Modux monorepo. After cloning:

```bash
# Install model-driven-generator thin JAR to local Maven repo
cd model-driven-generator
mvn install -DskipTests

# Build and install the plugin
cd ../plugin
mvn install
```
