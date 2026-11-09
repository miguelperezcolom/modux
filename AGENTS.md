# AGENTS.md — Modux

Guidance for AI coding agents working in this repository.

## Project overview

**Modux** is a model-driven code generation framework for Domain-Driven Design (DDD)
systems. Users define a domain model as YAML (aggregates, entities, value objects,
events, operations, sagas, projections…) and Modux generates a production-ready
Spring Boot application from it: domain/application/infrastructure layers following
Hexagonal Architecture, CRUD UIs for the aggregates a UI consumes (Vaadin / Mateu UIDL), database migrations, and
DevOps artifacts (Dockerfile, docker-compose, Kubernetes manifests, Terraform
skeleton, GitHub Actions workflow, JaCoCo).

Modux itself is a Spring Boot web application (port **8192**) that provides:

- A web UI (Mateu UIDL) for authoring models.
- A graphical model editor (Lit web component, see `editor/`).
- An **MCP server** (both stdio and HTTP at `/mcp`) so AI agents can author models
  and drive generation (`infra/in/mcp`).
- The code generator itself (Freemarker templates + google-java-format).

Supported architecture patterns in generated code: DDD, CQRS, Event Sourcing
(optional per aggregate), Saga (choreography/orchestration), Projections & Read
Models, Outbox, RBAC, Gateways (circuit breakers, rate limiting), Scheduled
Triggers.

- Group / version: `io.mateu.modux` / `0.1.0`, MIT license.
- Docs site: <https://modux.mateu.io> (source in `doc/`).
- **Languages**: code, code comments, `README.md` and the docs site are in
  **English**; design RFCs (`docs/design/`), specs (`docs/specs/`), and ops
  scripts (`Dockerfile`, `install.sh`, `docker/entrypoint.sh`) are in **Spanish**.
  Match the language of the file you are editing.

## Repository layout

There is **no root Maven aggregator POM**; each module is built separately.

| Path | What it is |
|---|---|
| `model-driven-generator/` | The main Spring Boot app — the modux product itself (Java 21, Maven). |
| `editor/` | `@modux/editor` — standalone Lit/TypeScript graphical model editor (Vite + Vitest). Bundled into the Spring app's static resources. |
| `plugin/` | `modux-maven-plugin` — Maven plugin over the generator jar: `generate`, `validate`, `schema`. |
| `intellij-plugin/` | IntelliJ plugin (Gradle) hosting the editor over the repo's model files. See `docs/design/ide-plugin.md`. |
| `figma-maven-plugin/` | Maven plugin generating Mateu views (Java/C#/Python) from Figma files. |
| `sample/hla-booking/` | Hand-authored example spec (`model-driven-store.yaml` + JSON schema). Versioned. |
| `sample/patterns/` | Hand-authored didactic pattern stores (BFF, ACL, CQRS, event-driven, saga, event sourcing, human process). Versioned; seeded to `~/.modux/examples` by `install.sh`. |
| `sample/biblioteca/` | A system built end to end with the IntelliJ plugin (model in `.modux/`, view, custom zone; two services). Versioned without its generated code. |
| `sample/hotel-checkin/` | Generated sample application (multi-module). **Not versioned** — `sample/*` is git-ignored except `sample/hla-booking/`, `sample/patterns/` and `sample/biblioteca/`. |
| `doc/` | Astro Starlight documentation site (npm). |
| `docs/design/` | Design RFCs (Spanish), e.g. `two-zone-codegen.md`, `storage-ports.md`. |
| `docs/specs/` | Business specs used as examples (Spanish). |
| `deploy/chart/modux/` | Helm chart (modux + Bitnami PostgreSQL subchart). |
| `Dockerfile`, `docker/entrypoint.sh`, `install.sh` | Runtime image and local installer (see Deployment). |
| `.dev/` | Local scratch/dev data (git-ignored). |

## Tech stack

- **Java 21**, **Maven**, **Spring Boot 4.0.4** (`spring-boot-starter-webmvc`).
- **Lombok** (annotation processor, excluded from the exec jar), Java records for
  DTOs and persistence entities.
- **Freemarker** templates (`model-driven-generator/src/main/resources/templates/*.ftl`)
  for code generation; generated code is formatted with **google-java-format**.
- **Jackson (YAML)** for model serialization; **victools jsonschema-generator** for
  the store JSON schema; **swagger-parser** for OpenAPI import.
- **Mateu** (`io.mateu:*`, from Maven Central): the UI layer of the *generated* applications.
- Persistence: file+git on local disk, or JDBC (**H2 / PostgreSQL**) for the
  `DATABASE` repository type.
- Editor: **Lit 3**, **d3-zoom**, **elkjs**, **Vite 6**, **Vitest**, TypeScript 5.7.
- Tests: **JUnit 5**, **Testcontainers** (PostgreSQL, Kafka) for e2e.

### Mateu is a dependency of the generated code, not of modux

Modux itself does not depend on Mateu: it emits source code that runs on it. Generated projects
use the release pinned in the `*pom*.ftl` templates, resolved from Maven Central. When bumping it,
compile a generated project with a UI: Mateu's API moves between betas.

## Build and run commands

```bash
# Build the main app (jar lands in model-driven-generator/target/*-exec.jar)
mvn -f model-driven-generator/pom.xml package -DskipTests

# Run the app from sources (serves http://localhost:8192)
cd model-driven-generator && mvn spring-boot:run

# Or install a `modux` launcher into ~/.local/bin (works against ~/.modux)
./install.sh            # local jar mode
./install.sh --docker   # container mode, ~/.modux mounted as home
```

Runtime knobs: `MODUX_PORT` (default 8192), `MODUX_HOME` (default `~/.modux`).
The same binary also runs as an MCP stdio server with `--modux.mcp` (no web server;
stdout is reserved for JSON-RPC, so never log to console in that mode — see
`ModelDrivenGeneratorApplication.main`).

### Editor (TypeScript)

```bash
cd editor
npm install
npm run dev    # standalone demo on http://localhost:5197
npm run build  # tsc --noEmit && vitest run && vite build
npm test       # vitest run
npm run copy   # build + copy bundle into model-driven-generator static resources
```

After changing the editor you must run `npm run copy` and restart the modux server.

### Docs site

```bash
cd doc && npm install
npm run dev    # astro dev
npm run build  # astro build
```

## Testing instructions

- Unit/integration tests (default build, e2e **excluded** via surefire
  `<excludedGroups>e2e</excludedGroups>`):

  ```bash
  mvn -f model-driven-generator/pom.xml test
  ```

- End-to-end tests are tagged `@Tag("e2e")` and live in
  `model-driven-generator/src/test/java/.../e2e/`. They generate full projects from
  example stores (`src/test/resources/examples/*.yaml`), compile them with Maven,
  and boot them against real PostgreSQL + Kafka via Testcontainers — they are slow
  and need Docker. Run with:

  ```bash
  mvn -f model-driven-generator/pom.xml test -Pe2e
  ```

- Editor tests: `cd editor && npm test` (Vitest). Note `npm run build` also runs
  the tests and type-checking, so a build failure may be a test failure.
- `plugin/` and `figma-maven-plugin/` have their own JUnit tests
  (`mvn test` in each directory).
- When changing generation behavior, prefer extending an existing e2e test or
  example store YAML over adding ad-hoc fixtures.

## Code organization (model-driven-generator)

The app follows **Hexagonal Architecture** (the same pattern it generates), under
`io.mateu.modux.modeldrivengenerator`:

- `domain/aggregates/{type}/` — one package per model element type (~35 of them:
  `aggregate`, `boundedcontext`, `saga`, `flow`, `process`, `projection`,
  `readmodel`, `gateway`, `subscription`, `role`, `page`, `service`, `model`,
  `project`, `interaction`…). Domain types are records with value objects in `vo/`.
- `application/usecases/{type}/{create,save,delete,...}/` — one use case per
  operation per element type. Notable extras: `project/generatecode`
  (`GenerateCodeUseCase`, the generator entry point), `project/importopenapi`,
  `project/importasyncapi`, `project/importwsdl`, `project/importfigma`,
  `project/aicomplete`, `project/generatehla`, `model/{check,lint,topology,view}`,
  `flow/coherence`, `process/expand`, `interaction/{derive,shared}` (sequence
  scenarios: ephemeral derivation + message-backing resolution).
- `application/out/` — ports: `repositories/`, `query/` (+ `dtos/`), `store/`
  (`ModelStore`, `WorkspaceStore`), `shared/`.
- `infra/in/` — inbound adapters:
  - `ui/` — Mateu pages/shell (`ModelDrivenGeneratorHome`, `pages/`, `menu/`).
  - `rest/` — `EditorApiController` and `SolutionApiController` (base
    `/modux/editor`) backing the graphical editor.
  - `mcp/` — MCP server: `McpHttpController` (HTTP `/mcp`), `McpStdioServer` +
    `McpCliRunner` (stdio), `ModelMcpTools` (tool surface for AI agents).
  - `cli/` — `GenerationCliRunner` (headless generation).
- `infra/out/` — outbound adapters:
  - `persistence/` — file-based repositories (`*FileRepository`,
    `*FileQueryService`, `file/*Entity` records); all persistence funnels through
    one choke-point class (`CommonFileRepository`).
  - `git/` — `GitWorkspaceStore`, solution diff/merge (`SolutionDiffService`,
    `SolutionMergeService`).
  - `db/` — `JdbcModelDatabase` + `DbWorkspaceStore` (DATABASE repository type).
  - `store/` — `WorkspaceStoreRouter` routes to the right store per repository type.
  - `ai/` — AI completion adapter.

Key architectural concepts to respect:

- **Storage ports** (`docs/design/storage-ports.md`): the model is a catalog of
  elements keyed by `(type, id)`; file+git and JDBC are interchangeable adapters
  behind `ModelStore`/`WorkspaceStore`. New persistence concerns go behind those
  ports, not into the use cases.
- **Two-zone code generation** (`docs/design/two-zone-codegen.md`): generated code
  is always overwritten (hash-protected manifest); business logic holes become
  interface hooks implemented in a separate `{service}-custom` module that is
  scaffolded once and never overwritten. Do not emit `// TODO` business logic into
  generated files — add a hook instead.
- **YAML store round-trip fidelity**: several UI saves carry over fields the domain
  records do not model yet so a UI save never wipes what was authored in YAML (see
  the "carry over" comments in use cases). Preserve that behavior when editing
  save use cases.
- **Editor contract**: `editor/` renders a pure `Scene` from a model projection and
  emits commands; the server applies them via `EditorApiController`. Geometry
  (layout) is stored outside the YAML model. Specialized surfaces that are not a
  `Scene` (the page designer, `<modux-sequence>` for sequence scenarios) follow the
  same command contract.

## Code style guidelines

- Java 21, Lombok where it removes boilerplate, records for immutable data.
- Generated code (and only that) is formatted with **google-java-format** at
  generation time; there is no formatter enforced on modux's own sources — match
  the surrounding file's style.
- google-java-format needs `--add-exports jdk.compiler/...` JVM flags; these are
  already configured in the surefire and spring-boot plugin `argLine`s — keep them
  when touching the POM.
- Naming mirrors the hexagonal layers: `*UseCase`, `*FileRepository`,
  `*FileQueryService`, `*Entity` (persistence record), `vo/*` value objects.
- Templates: one Freemarker `.ftl` per generated artifact in
  `src/main/resources/templates/`; generation logic lives in
  `application/usecases/project/generatecode/`.
- Comments in English for Java; Spanish in ops scripts/design docs (match the file).

## Deployment

- **Local**: `./install.sh` builds the jar and drops a `modux` launcher in
  `~/.local/bin` (home: `~/.modux`, repositories of type LOCAL/GIT on disk).
- **Docker**: `Dockerfile` is runtime-only (`eclipse-temurin:21-jre`); build the
  jar on the host first, then `docker build -t modux:dev .`. `docker/entrypoint.sh`
  seeds a `DATABASE` repository when `MODUX_BOOTSTRAP_DB` (+ `MODUX_DB_USER` /
  `MODUX_DB_PASSWORD`) is set and no `repositories.yaml` exists yet; otherwise the
  container works against the `/data` volume. `git` is installed in the image
  because GIT repositories are cloned inside the container.
- **Kubernetes**: Helm chart at `deploy/chart/modux` (Bitnami PostgreSQL subchart
  enabled by default; disable with `--set postgresql.enabled=false` and set
  `externalDatabase.jdbcUrl` for an external DB). Full instructions in
  `deploy/README.md` (Spanish).
- There is **no CI configuration in this repo** (`.github` does not exist); the
  generated projects include their own GitHub Actions workflow
  (`templates/ci-workflow.ftl`).
- Publishing to Maven Central is wired in the POM (`central-publishing-maven-plugin`
  + GPG signing at `verify`), intended for releases only.

## Security considerations

- The in-app chat uses `io.mateu:agent-cli`, which **bridges the developer's local
  `claude`/`gemini` CLI with no API key** and gives it access to the app's own MCP
  tools (`mateu.agent.cli.*` in `application.properties`). This is a local-dev
  convenience — an exposed server must point `@AI` at a real agent instead.
- The MCP endpoint (`/mcp`) exposes model-mutating tools; the stdio mode
  (`--modux.mcp`) is the intended integration for local agents.
- DB credentials are passed only via environment (`MODUX_DB_USER`,
  `MODUX_DB_PASSWORD`) or embedded in the JDBC URL — never commit them. The Helm
  chart ships default `modux/modux` PostgreSQL credentials; override them for real
  deployments.
- GIT-type repositories are cloned from arbitrary URLs and, in Docker, inside the
  container — treat repository URLs as untrusted input.
- Do not read or copy files outside the working directory; `~/.modux` and `~/.m2`
  are the app's runtime data, not project sources.
