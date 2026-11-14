---
title: Installation
description: What you need to work with Modux — the Maven plugin, optionally the IntelliJ plugin, and the optional modux server that hosts the web editor
---

There is nothing to install to *run* Modux: the model is a directory of YAML files in your
repository, and the [Maven plugin](/reference/maven-plugin/) reads it and generates the code.
Everything else is optional tooling around those files.

| Piece | What it does | Needed? |
|---|---|---|
| **`modux-maven-plugin`** | Validates the model, generates the system, deploys it, imports contracts | **Yes** |
| **IntelliJ plugin** | The graphical editor, over the repository's model files | Optional |
| **An AI agent** + the `modux-model` skill | Authors the model by editing its files | Optional |
| **The modux server** | Hosts the web build of the graphical editor and its REST API | Optional |

## Requirements

- **Java 21** or later and **Maven 3.9+**
- **Docker**, to run the generated system locally (`mvn modux:deploy`)
- `kubectl` (and `kind` for a local cluster), only to deploy to Kubernetes

## The Maven plugin

Declare it in the `pom.xml` of the project that holds the model — see the
[Quick Start](/getting-started/quick-start/#1-a-maven-project-with-the-plugin):

```xml
<plugin>
  <groupId>io.mateu.modux</groupId>
  <artifactId>modux-maven-plugin</artifactId>
  <version>0.6.5</version>
</plugin>
```

Maven resolves it like any other plugin. To use a version that is not published, or a
build of your own, install it from the sources into your local Maven repository:

```bash
git clone https://github.com/miguelperezcolom/modux.git
cd modux
mvn -f model-driven-generator/pom.xml install -DskipTests
mvn -f plugin/pom.xml install
```

## The IntelliJ plugin

The plugin (`Modux`) hosts the [graphical editor](/manual/graphical-editor-guide/) inside
IntelliJ IDEA 2025.1 or later, over the model files of the open repository. Its zip is
attached to each [GitHub release](https://github.com/miguelperezcolom/modux/releases):
*Settings → Plugins → ⚙ → Install Plugin from Disk…*. To build it yourself:
`cd intellij-plugin && ./gradlew buildPlugin` (the zip lands in `build/distributions/`).

Then *New → Modux Model* initialises the model directory of a repository (`.modux/`) and
*New → Modux View* creates a view document (`*.modux-view.yaml`); opening a view document
opens the editor. The plugin only edits files: generation is still `mvn modux:generate`,
which reads `.modux/` as well as `modux/`.

## Authoring with an AI agent

An agent edits the model the way it edits code — reading and writing the files. The modux
repository ships a skill for it, `.claude/skills/modux-model/SKILL.md`: the metamodel in
brief, the referential rules the JSON schema cannot express, and the validate → generate
loop. Copy it into your repository's `.claude/skills/` (or point any other agent at it).
See [Editing the Model](/getting-started/yaml-editing/#authoring-with-an-ai-agent).

## The modux server (optional)

The server is a Spring Boot application that serves the web build of the editor and the
REST API it talks to. It has no UI of its own: the bundle `/modux-editor/modux-editor.js`
defines `<modux-editor-connected base="/modux/editor">`, which you embed in a page served
from the same origin. Most people do not need it — the IntelliJ plugin does not use it.

```bash
git clone https://github.com/miguelperezcolom/modux.git
cd modux
./install.sh            # builds the jar and drops a `modux` launcher in ~/.local/bin
modux                   # → http://localhost:8192
```

`MODUX_PORT` and `MODUX_HOME` vary the port and the home directory (`~/.modux`, where the
server remembers which model it opened last, and reopens it). The first time, point it at a
model with `--modux.model-file=<path>` — a directory is read as one file per element, a file
as the older single-file store.
`./install.sh --docker` builds the runtime image instead and the launcher runs the container
with `~/.modux` mounted as home. From the sources: `cd model-driven-generator && mvn
spring-boot:run` (same port).

### Against a database

The server can also keep the model in PostgreSQL (or H2) instead of on disk — the
`DATABASE` store backend, interchangeable with files behind the same port (see
`docs/design/storage-ports.md` in the repository). The Docker image seeds that on its first
boot:

```bash
mvn -f model-driven-generator/pom.xml package -DskipTests
docker build -t modux:dev .

# against the filesystem:
docker run -p 8192:8192 -v ~/.modux:/data/modux-home modux:dev

# against a database:
docker run -p 8192:8192 \
  -e MODUX_BOOTSTRAP_DB='jdbc:postgresql://host:5432/modux' \
  -e MODUX_DB_USER=modux -e MODUX_DB_PASSWORD=… modux:dev
```

A Helm chart for modux plus PostgreSQL lives at
[`deploy/chart/modux`](https://github.com/miguelperezcolom/modux/tree/main/deploy/chart/modux):

```bash
cd deploy/chart/modux
helm dependency update
helm install modux . --namespace modux --create-namespace
```

For an external database: `--set postgresql.enabled=false
--set externalDatabase.jdbcUrl=jdbc:postgresql://…`. The image must be visible to the
cluster (push it to your registry and `--set image.repository=…`; on a local k3s,
`docker save modux:dev | sudo k3s ctr images import -` also works). The chart ships default
`modux/modux` database credentials: override them for anything real.

## The modux repository

```
modux/
├── model-driven-generator/   # The generator (and the optional server that hosts the web editor)
├── plugin/                   # modux-maven-plugin
├── editor/                   # The graphical editor (Lit web component)
├── intellij-plugin/          # The IntelliJ plugin hosting the editor
├── deploy/chart/modux/       # Helm chart for the server (+ Bitnami PostgreSQL)
├── sample/                   # Example models
├── media/                    # Example systems behind the videos
└── doc/                      # This documentation site
```

## Next steps

Follow the [Quick Start](/getting-started/quick-start/) to generate your first app.
