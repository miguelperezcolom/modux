---
title: Generating Code
description: How to run the Modux code generator — the Maven plugin, from the project that holds the model
---

Generation is a goal of the [Maven plugin](/reference/maven-plugin/), run from the project
that holds the model:

```bash
mvn modux:validate    # check the model
mvn modux:generate    # check it again, then generate
```

`generate` reads the model directory (`modux/`, or `.modux/`), refuses to generate while the
model has errors — reported on the element that causes them, not as compiler errors in the
output — and writes the system to the project's `outputPath`. The project, its output path and
its package come from the model; `-Dmodux.outputPath`, `-Dmodux.packageName` and
`-Dmodux.sourceOnly=true` (Maven projects and Java only, no DevOps artifacts) override them.

To regenerate on every build, bind it to `generate-sources`:

```xml
<plugin>
    <groupId>io.mateu.modux</groupId>
    <artifactId>modux-maven-plugin</artifactId>
    <version>0.6.6</version>
    <executions>
        <execution>
            <goals><goal>generate</goal></goals>
        </execution>
    </executions>
</plugin>
```

What generation guarantees:

- **A README, always.** Every project generates `README.md` — name, objective,
  services and contexts, how to build and run locally, how to regenerate. An **empty
  project** generates exactly its folder with that README, nothing else.
- **A default service when none is declared.** A project with contexts but no
  services generates (and [deploys](/manual/deploying/)) through an in-memory service
  named after the project that deploys every context — nothing is persisted into
  your model.
- The output path may use `~` for your home directory; a relative one is resolved from
  the directory Maven runs in.

## What happens during generation

For each aggregate, Modux:

1. Processes the aggregate definition and all its fields, operations, events, and invariants
2. Renders each Freemarker template with the aggregate's data model
3. Formats the output using **Google Java Format**
4. Writes each file to the correct location within the output directory

## Generated project structure

```
{output-path}/
├── README.md
├── docker-compose.yml               # every service + PostgreSQL + Kafka
├── up.sh / down.sh                  # the same, without compose
├── deploy/targets.json              # what mvn modux:deploy can target
├── terraform/main.tf
├── e2e/                             # Playwright suite over the running apps
└── {service}/                       # one Maven reactor per service
    ├── pom.xml
    ├── Dockerfile
    ├── k8s/{service}.yaml
    ├── {module}/                    # one per deployed module
    │   └── src/
    │       ├── main/java/{package}/{module}/
    │       │   ├── domain/aggregates/{aggregate}/
    │       │   │   ├── {Aggregate}.java
    │       │   │   └── vo/
    │       │   ├── application/
    │       │   │   ├── usecases/
    │       │   │   ├── query/
    │       │   │   └── out/
    │       │   └── infra/
    │       │       ├── in/ui/
    │       │       └── out/persistence/
    │       └── test/java/{package}/{module}/
    │           ├── domain/aggregates/{aggregate}/{Aggregate}Test.java
    │           ├── application/usecases/…           # one test per use case
    │           ├── bdd/                              # Cucumber runner + steps
    │           └── e2e/                              # Playwright tests
    ├── {service}-app/               # the Spring Boot application (+ application.yaml)
    └── {service}-custom/            # yours: hook implementations, never overwritten
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

## Building and running the generated project

```bash
cd {output-path}/{service}
mvn install -DskipTests
mvn spring-boot:run -pl {service}-app -Dspring-boot.run.profiles=local   # in-memory H2
```

or run the whole system on Docker with `mvn modux:deploy` from the model's project (see
[Deploying](/manual/deploying/)). A service listens on its `port`. Aggregates a UI consumes
(an app's menu, a bound page, a UI shell) get working CRUD pages under the app's path; the
rest are reached through their APIs.

## Re-generating after changes

Run the generator at any time after changing the model. Everything in the `{service}-custom` module is left untouched (see [two zones](#generated-code-vs-your-code-two-zones) above), so your custom business logic is safe; only the generated zone is refreshed from the model.

Recommended workflow:

1. Change the model (aggregates, operations, use cases…)
2. `mvn modux:validate`, then `mvn modux:generate`
3. Implement business logic by filling in the hook defaults in the `{service}-custom` module
4. When the model changes again, re-generate — only the generated zone is updated; your custom module is untouched

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

`mvn modux:ai-complete` implements the hooks still pending in the custom zone, from the intent the model wrote on them, using your local AI command line (no API key):

```bash
mvn modux:generate
mvn modux:ai-complete
```

See [AI-Assisted Code Completion](/manual/ai-completion/) for the full guide.

## Troubleshooting

**Generated files have compilation errors**

Run `mvn modux:validate` first: `generate` refuses a model with errors unless `-Dmodux.skipChecks=true`. Cross-aggregate references must use the other aggregate's ID type.

**Output directory is empty**

Check the project's `outputPath` (a relative one is resolved from where Maven runs) and that Maven can write there.

**Fields are missing in the generated code**

A field that is not in the JSON schema does not exist and is ignored silently. Check the field's `type` (`string`, `integer`, `date`, `money`…) and, for an enum, `enumId`, against `model-driven-store-schema.json`.
