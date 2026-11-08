---
title: Generating Code
description: How to run the Modux code generator — from the UI or from a Maven build
---

Once you have defined your domain model in the Modux UI, you can generate the full Spring Boot project at any time. Generation can be triggered **interactively** from the Modux UI or **automatically** during a Maven build via the Modux Maven plugin.

## From the UI

The fastest way is the **⚙ Generar** button on the app header, next to the
repository · project · model selectors: it generates the CURRENT project to its
configured output path. It shows up as soon as the app context is fully resolved.
The project's detail view keeps its own **Generate Code** button with the same effect.

What generation guarantees:

- **A README, always.** Every project generates `README.md` — name, objective,
  services and contexts, how to build and run locally, how to regenerate. An **empty
  project** generates exactly its folder with that README, nothing else.
- **A default service when none is declared.** A project with contexts but no
  services generates (and [deploys](/manual/deploying/)) through an in-memory service
  named after the project that deploys every context — nothing is persisted into
  your model.
- The output path may use `~` for your home directory.

## From a Maven build (Maven plugin)

Add the plugin to any Maven project that should trigger generation:

```xml
<plugin>
    <groupId>io.mateu.modux</groupId>
    <artifactId>modux-maven-plugin</artifactId>
    <version>0.1.0</version>
    <configuration>
        <projectId>my-project-id</projectId>
        <specFile>${project.basedir}/.dev/data/model-driven-store.yaml</specFile>
        <outputPath>${project.basedir}/generated</outputPath>
        <packageName>com.mycompany</packageName>
    </configuration>
    <executions>
        <execution>
            <goals><goal>generate</goal></goals>
        </execution>
    </executions>
</plugin>
```

Run generation explicitly:

```bash
mvn modux:generate -Dmodux.projectId=my-project-id
```

Or let it run automatically during the `generate-sources` phase:

```bash
mvn generate-sources
```

See the [Maven Plugin Reference](/reference/maven-plugin/) for all configuration parameters.

## From the command line (headless)

The generator can also run headlessly — useful for scripts and CI. Pass the project id (and
optionally an output directory) and it generates and exits:

```bash
mvn spring-boot:run \
  -Dspring-boot.run.arguments="--modux.generate=<projectId> --modux.output=<dir>"
```

Without `--modux.generate`, the application starts normally in UI server mode. When
`--modux.output` is omitted, the project's configured output path is used.

## What happens during generation

For each aggregate, Modux:

1. Processes the aggregate definition and all its fields, operations, events, and invariants
2. Renders each Freemarker template with the aggregate's data model
3. Formats the output using **Google Java Format**
4. Writes each file to the correct location within the output directory

## Generated project structure

```
{output-path}/
├── pom.xml                          # Root Maven POM (multi-module)
└── {service-name}/
    ├── pom.xml
    └── src/
        ├── main/
        │   ├── java/{package}/
        │   │   ├── {Module}Application.java
        │   │   └── {module}/
        │   │       ├── domain/
        │   │       │   └── aggregates/{Aggregate}/
        │   │       │       ├── {Aggregate}.java
        │   │       │       └── vo/
        │   │       ├── application/
        │   │       │   ├── usecases/
        │   │       │   ├── query/
        │   │       │   └── out/
        │   │       └── infra/
        │   │           ├── in/ui/
        │   │           └── out/persistence/
        │   └── resources/
        │       └── application.yaml
        └── test/
            ├── java/{package}/{module}/
            │   ├── domain/aggregates/{Aggregate}/
            │   │   └── {Aggregate}Test.java          # unit test
            │   ├── application/usecases/{aggregate}/
            │   │   ├── create/Create{Aggregate}UseCaseTest.java
            │   │   ├── update/Update{Aggregate}UseCaseTest.java
            │   │   └── delete/Delete{Aggregate}UseCaseTest.java
            │   ├── bdd/
            │   │   ├── CucumberRunner.java
            │   │   └── {Aggregate}Steps.java         # Cucumber step definitions
            │   └── e2e/
            │       ├── BaseE2ETest.java               # Playwright base class
            │       └── {Aggregate}E2ETest.java        # Playwright tests
            └── resources/features/{module}/
                └── {Aggregate}.feature               # Gherkin scenarios
```

Each deployed [module](/manual/modules/#modules) becomes a Maven submodule of its service's reactor — the module lends its name, its bounded context lends the meaning. For a context with only its main module, the output is identical to a context generated whole.

## DevOps & operability artifacts

Beyond application code, Modux emits the operability scaffolding a service needs to run — derived
from the project's and services' configuration:

| Artifact | Location | Driven by |
|---|---|---|
| **Dockerfile** | `{service}/Dockerfile` | multi-stage build; `service.javaVersion`, `service.port` |
| **docker-compose** | `docker-compose.yml` | one entry per service + Postgres + Kafka |
| **Kubernetes manifests** | `{service}/k8s/{service}.yaml` | Deployment + Service + optional HPA; replicas, CPU/memory requests & limits, probes, HPA thresholds |
| **CI workflow** | `.github/workflows/ci.yml` | builds and tests every service |
| **Terraform skeleton** | `terraform/main.tf` | `project.terraformProvider`, `terraformBackendType` |
| **Code coverage** | inherited in every module pom | JaCoCo (prepare-agent + report) |

These follow the same conventions as the rest of the model: configure the fields on your project
and services, and the artifacts reflect them on the next generation.

## Generated code vs. your code (two zones)

A generated project has two zones, so you can regenerate as often as you like without losing work:

| Zone | What it is | On regeneration |
|---|---|---|
| **Generated** | Every structural module (domain, application, infra, app) | Always overwritten — **do not edit** |
| **Custom** | The `{service}-custom` module | **Never overwritten** — it's yours |

Modux never puts business logic you must write inside the generated zone. Instead, where a decision can't be derived from the model, it generates a **hook** (a port interface, with a context that exposes the relevant aggregate state) and scaffolds a **default implementation once** in the `{service}-custom` module. You fill that implementation in; the generated code calls it via Spring. The six business-logic hooks are:

| Hook | Generated when | Interface (locked) | Default impl (yours, write-once) |
|---|---|---|---|
| Aggregate invariants | an aggregate has invariants | `{Aggregate}Invariants` | `Default{Aggregate}Invariants` |
| Custom aggregate operation | an operation is marked `CUSTOM` | `{Operation}{Aggregate}Operation` | `Default{Operation}{Aggregate}Operation` |
| Custom saga step | a saga has a `Custom` step | `{Saga}Steps` | `Default{Saga}Steps` |
| Custom use-case step | a use case has a `Custom` step | `{UseCase}Steps` | `Default{UseCase}Steps` |
| Business-rule logic | an aggregate has business rules | `{Rule}Logic` | `Default{Rule}Logic` |
| Model-mapping custom part | a mapping has a custom part | `{Mapping}CustomMapping` | `Default{Mapping}CustomMapping` |

To keep the generated zone honest, every generated file's hash is recorded in `.modux/generated-manifest.json`. On the next run, a file that was edited by hand is detected, reported and overwritten — a reminder to move that logic into the custom module. Files in the custom module are not tracked and are left untouched.

So: regenerate freely. The structural code stays in sync with the model, and your business logic in the custom module is never touched.

## Building the generated project

After generation:

```bash
cd {output-path}
mvn clean install
```

## Running the generated application

```bash
cd {service-name}
mvn spring-boot:run
```

The application starts at `http://localhost:{port}`. Aggregates a UI consumes (an app's menu, a bound page, a UI shell) get working CRUD pages; the rest are reached through their APIs.

## Re-generating after changes

You can run the generator at any time after modifying your spec. Everything in the `{service}-custom` module is left untouched (see [two zones](#generated-code-vs-your-code-two-zones) above), so your custom business logic is safe; only the generated zone is refreshed from the model.

Recommended workflow:

1. Define aggregates and operations in Modux
2. Generate code
3. Implement business logic by filling in the hook defaults in the `{service}-custom` module
4. If the spec changes, re-generate — only the generated zone is updated; your custom module is untouched

## E2E tests with Playwright

Every module gets a `BaseE2ETest`, and every aggregate with CRUD pages a concrete `{Aggregate}E2ETest` with canned CRUD scenarios. E2E tests are tagged `e2e` and excluded from the normal build — run them explicitly against a live app:

```bash
# Start the app, then in another terminal:
mvn test -Dgroups=e2e -De2e.base-url=http://localhost:8080

# Open browser for visual debugging
mvn test -Dgroups=e2e -De2e.headed=true
```

See [E2E Tests with Playwright](/manual/e2e-tests/) for the full guide.

## AI-assisted completion

The generator produces skeletons with `// TODO` comments in places where domain logic cannot be derived from the spec alone: invariant bodies, operation preconditions, and BDD step implementations.

Run `mvn modux:ai-complete` after generation to get AI-generated proposals for those gaps:

```bash
export ANTHROPIC_API_KEY=sk-ant-...
mvn modux:generate -Dmodux.projectId=my-project-id
mvn modux:ai-complete -Dmodux.projectId=my-project-id
# → generated/proposals/{boundedContext}/AI-PROPOSALS.md
```

See [AI-Assisted Code Completion](/manual/ai-completion/) for the full guide.

## Troubleshooting

**Generated files have compilation errors**

Check that all field types reference valid Java types or other aggregates defined in your spec. Cross-aggregate references must use the other aggregate's ID type.

**Output directory is empty**

Ensure the output path exists and that the Modux process has write permissions to it.

**Fields are missing in the generated code**

Verify the field types are supported. Use `String`, `Integer`, `Long`, `Boolean`, `LocalDate`, `LocalDateTime`, `BigDecimal`, `Enum`, or `ValueObject`.
