# AGENTS.md — Modux

Guidance for AI coding agents working in this repository.

## Project overview

**Modux** is a model-driven code generation framework for Domain-Driven Design (DDD)
systems. Users define a domain model as a directory of YAML files in their own repository
(`modux/` or `.modux/`, one file per element: aggregates, entities, value objects,
events, operations, sagas, projections…) and Modux generates a production-ready
Spring Boot application from it: domain/application/infrastructure layers following
Hexagonal Architecture, CRUD UIs for the aggregates a UI consumes (Vaadin / Mateu UIDL), database migrations, and
DevOps artifacts (Dockerfile, docker-compose, Kubernetes manifests, Terraform
skeleton, GitHub Actions workflow, JaCoCo).

How people use it — there is no admin UI, no MCP server and no «solutions» any more
(removed in `d00f0241`; rationale in `docs/design/ide-plugin.md`):

- **The model is files.** Edited by hand, by an AI agent following the skill
  `.claude/skills/modux-model/SKILL.md` (the authoritative description of the model), or
  in the graphical editor. The JSON schema written next to the model is the metamodel.
- **`modux-maven-plugin`** (`plugin/`) reads the model and does everything else:
  `validate`, `generate`, `hla`, `schema`, `ai-complete`, `deploy`, `import-api`,
  `import-openapi`, `import-asyncapi`.
- **The graphical editor** (Lit web component, `editor/`) is hosted by the **IntelliJ
  plugin** (`intellij-plugin/`) over the repository's model files, and by the modux
  server as the static bundle `/modux-editor/modux-editor.js` (`<modux-editor-connected>`)
  against its REST API `/modux/editor/*`.
- **The modux server** (`model-driven-generator/`, Spring Boot, port **8192**) is now only
  that web host of the editor plus the generator's headless CLI (`--modux.generate`,
  `--modux.check`, `--modux.lint`…). The generator itself (Freemarker templates +
  google-java-format) lives here and is what the Maven plugin embeds.

Supported architecture patterns in generated code: DDD, CQRS, Event Sourcing
(optional per aggregate), Saga (choreography/orchestration), Projections & Read
Models, Outbox, RBAC, Gateways (circuit breakers, rate limiting), Scheduled
Triggers.

- Group / version: `io.mateu.modux` / `0.6.5`, MIT license.
- Docs site: <https://modux.mateu.io> (source in `doc/`).
- **Languages**: code, code comments, `README.md` and the docs site are in
  **English**; design RFCs (`docs/design/`), specs (`docs/specs/`), and ops
  scripts (`Dockerfile`, `install.sh`, `docker/entrypoint.sh`) are in **Spanish**.
  Match the language of the file you are editing.

## Repository layout

There is **no root Maven aggregator POM**; each module is built separately.

| Path | What it is |
|---|---|
| `model-driven-generator/` | The generator (domain, use cases, templates) and the optional Spring Boot server hosting the web editor (Java 21, Maven). |
| `editor/` | `@modux/editor` — standalone Lit/TypeScript graphical model editor (Vite + Vitest). Bundled into the IntelliJ plugin and into the server's static `/modux-editor`. |
| `plugin/` | `modux-maven-plugin` — the main way to use modux: `validate`, `generate`, `hla`, `schema`, `ai-complete`, `deploy` (local Docker or a Kubernetes environment of the model, with DNS), `import-api`, `import-openapi`, `import-asyncapi`. |
| `intellij-plugin/` | IntelliJ plugin (Gradle) hosting the editor over the repo's model files. See `docs/design/ide-plugin.md`. |
| `figma-maven-plugin/` | Maven plugin generating Mateu views (Java/C#/Python) from Figma files. |
| `sample/hla-booking/` | Hand-authored example spec (`model-driven-store.yaml` + JSON schema). Versioned. |
| `sample/patterns/` | Hand-authored didactic pattern stores (BFF, ACL, CQRS, event-driven, saga, event sourcing, human process, integrations). Versioned; seeded to `~/.modux/examples` by `install.sh`. |
| `media/` | Example systems behind the videos (`promo-video/`, `video-series/`): model + pom + custom zones; generated code git-ignored. |
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
- Persistence of the model: YAML files (granular — one per element — or the legacy single
  file), or JDBC (**H2 / PostgreSQL**) for the server's `DATABASE` store backend.
- Editor: **Lit 3**, **d3-zoom**, **elkjs**, **Vite 6**, **Vitest**, TypeScript 5.7.
- Tests: **JUnit 5**, **Testcontainers** (PostgreSQL, Kafka) for e2e.

### Mateu is a dependency of the generated code, not of modux

Modux itself does not depend on Mateu: it emits source code that runs on it. Generated projects
use the release pinned in the `*pom*.ftl` templates, resolved from Maven Central. When bumping it,
compile a generated project with a UI: Mateu's API moves between betas.

## Build and run commands

```bash
# Install the generator (thin jar) and the Maven plugin into ~/.m2 — what users run
mvn -f model-driven-generator/pom.xml install -DskipTests
mvn -f plugin/pom.xml install

# In a project with the plugin and a modux/ model:
mvn modux:validate && mvn modux:generate

# The optional server (editor web host + REST API); exec jar in model-driven-generator/target/
cd model-driven-generator && mvn spring-boot:run     # http://localhost:8192
./install.sh            # or a `modux` launcher in ~/.local/bin (local jar mode)
./install.sh --docker   # container mode, ~/.modux mounted as home
```

Server runtime knobs: `MODUX_PORT` (default 8192), `MODUX_HOME` (default `~/.modux`),
`--modux.model-file=<dir or file>`.

### Editor (TypeScript)

```bash
cd editor
npm install
npm run dev    # standalone demo on http://localhost:5197
npm run build  # tsc --noEmit && vitest run && vite build
npm test       # vitest run
npm run copy   # build + copy bundle into model-driven-generator static resources
```

After changing the editor, run `npm run copy` (and restart the modux server) for the web
host; the IntelliJ plugin's gradle build rebuilds the bundle from `editor/` itself.

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
  `project/importasyncapi`, `project/importapi`, `project/importwsdl`,
  `project/importfigma`, `project/generatehla`, `model/{check,lint,topology,view}`,
  `flow/coherence`, `process/expand`, `interaction/{derive,shared}` (sequence
  scenarios: ephemeral derivation + message-backing resolution). The Maven plugin
  (`plugin/`) calls these use cases directly; `ai-complete` lives in the plugin
  (`HookImplementer`).
- `application/out/` — ports: `repositories/`, `query/` (+ `dtos/`), `store/`
  (`ModelStore`), `shared/`.
- `infra/in/` — inbound adapters (no Mateu UI and no MCP server any more):
  - `rest/` — `EditorApiController` (base `/modux/editor`: `model`, `version`,
    `commands`, `layout`) backing the web host of the graphical editor.
  - `cli/` — `GenerationCliRunner` (headless `--modux.generate`, `--modux.check`,
    `--modux.lint [--modux.watch]`, `--modux.split/merge`, `--modux.view`).
- `infra/out/` — outbound adapters:
  - `persistence/` — file-based repositories (`*FileRepository`,
    `*FileQueryService`, `file/*Entity` records); all persistence funnels through
    one choke-point class (`file/CommonFileRepository`), which reads and writes the
    granular or monolithic YAML formats. `home/` is the server's `~/.modux`
    (last-opened model, legacy repository registry).
  - `db/` — `JdbcModelDatabase` (the `DATABASE` store backend).

Key architectural concepts to respect:

- **Storage ports** (`docs/design/storage-ports.md`): the model is a catalog of
  elements keyed by `(type, id)`; YAML files and JDBC are interchangeable adapters
  behind `ModelStore`. New persistence concerns go behind that port, not into the
  use cases. Java only *reads* the model in the plugin path; the editor writes it
  (`docs/design/ide-plugin.md` §1.1).
- **Two-zone code generation** (`docs/design/two-zone-codegen.md`): generated code
  is always overwritten (hash-protected manifest); business logic holes become
  interface hooks implemented in a separate `{service}-custom` module that is
  scaffolded once and never overwritten. Do not emit `// TODO` business logic into
  generated files — add a hook instead.
- **YAML store round-trip fidelity**: several saves carry over fields the domain
  records do not model yet so an editor save never wipes what was authored in YAML (see
  the "carry over" comments in use cases). Preserve that behavior when editing
  save use cases.
- **Editor contract**: `editor/` renders a pure `Scene` from a model projection and
  emits commands; the host applies them — the IntelliJ plugin on the files, the web
  host via `EditorApiController`. Geometry (layout) lives in `diagrams/`, apart from
  the elements. Specialized surfaces that are not a
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
- `.github/workflows/ci.yml` builds and tests the editor, the generator and the Maven plugin on
  every PR and push to `main` (e2e excluded).
- `.github/workflows/release.yml` publishes a version when a `vX.Y.Z` tag is pushed (see the file for the secrets each channel needs); the
  generated projects include their own GitHub Actions workflow
  (`templates/ci-workflow.ftl`).
- Publishing to Maven Central is wired in the POM (`central-publishing-maven-plugin`
  + GPG signing at `verify`), intended for releases only.

## Security considerations

- AI agents author the model by editing its files (skill
  `.claude/skills/modux-model/SKILL.md`); modux exposes no MCP server or in-app chat.
  `mvn modux:ai-complete` runs the developer's local `claude` CLI (no API key) and writes
  only under `{service}-custom/src/main/java`.
- The server's REST API (`/modux/editor/commands`) mutates the model and has no
  authentication: it is a local-dev host for the editor, not something to expose.
- DB credentials are passed only via environment (`MODUX_DB_USER`,
  `MODUX_DB_PASSWORD`) or embedded in the JDBC URL — never commit them. The Helm
  chart ships default `modux/modux` PostgreSQL credentials; override them for real
  deployments.
- GIT-type repositories are cloned from arbitrary URLs and, in Docker, inside the
  container — treat repository URLs as untrusted input.
- Do not read or copy files outside the working directory; `~/.modux` and `~/.m2`
  are the app's runtime data, not project sources.
