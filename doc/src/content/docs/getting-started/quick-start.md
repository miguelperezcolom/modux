---
title: Quick Start
description: From an empty Maven project to a running app — a model of one aggregate, validated, generated, deployed, extended with business logic and regenerated
---

This guide builds a small **library catalog**: one bounded context (`Catalog`) with one
aggregate (`Book`). You write the model as YAML files, the Maven plugin turns it into a
Spring Boot application, and Docker runs it. The finished example lives in the modux
repository under
[`media/video-series/02-first-app/`](https://github.com/miguelperezcolom/modux/tree/main/media/video-series/02-first-app).

You need **Java 21+**, **Maven 3.9+** and, to run the app, **Docker** (see
[Installation](/getting-started/installation/)).

## 1. A Maven project with the plugin

The model lives in a Maven project. It needs no Java sources — just a `pom.xml` with the
plugin:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<project xmlns="http://maven.apache.org/POM/4.0.0">
  <modelVersion>4.0.0</modelVersion>
  <groupId>com.example</groupId>
  <artifactId>library-model</artifactId>
  <version>0.1.0</version>
  <packaging>pom</packaging>
  <build>
    <plugins>
      <plugin>
        <groupId>io.mateu.modux</groupId>
        <artifactId>modux-maven-plugin</artifactId>
        <version>0.6.5</version>
      </plugin>
    </plugins>
  </build>
</project>
```

The generated Java is formatted with google-java-format, which needs a few JVM options on
the Maven that runs the plugin. Put them in `.mvn/jvm.config` (one line):

```
--add-exports jdk.compiler/com.sun.tools.javac.api=ALL-UNNAMED --add-exports jdk.compiler/com.sun.tools.javac.code=ALL-UNNAMED --add-exports jdk.compiler/com.sun.tools.javac.file=ALL-UNNAMED --add-exports jdk.compiler/com.sun.tools.javac.main=ALL-UNNAMED --add-exports jdk.compiler/com.sun.tools.javac.parser=ALL-UNNAMED --add-exports jdk.compiler/com.sun.tools.javac.tree=ALL-UNNAMED --add-exports jdk.compiler/com.sun.tools.javac.util=ALL-UNNAMED
```

Without it everything still works; the generated code just comes out unformatted.

## 2. The model

The model is a directory, `modux/`, with **one YAML file per element**, grouped in one
directory per element type. The file name is the element's id. Elements point at each
other by id, and a container lists what it holds (a bounded context lists its aggregates).

```
library/
├── pom.xml
├── .mvn/jvm.config
└── modux/
    ├── projects/library.yaml
    ├── services/svc-library.yaml
    ├── boundedContexts/bc-catalog.yaml
    ├── modules/bc-catalog-main.yaml
    ├── aggregates/agg-book.yaml
    ├── models/model-book.yaml
    ├── enums/enum-book-status.yaml
    └── uiAdapters/ui-library.yaml
```

You can write these files by hand, have an AI agent write them (see
[Editing the Model](/getting-started/yaml-editing/#authoring-with-an-ai-agent)), or draw
them in the [graphical editor](/manual/graphical-editor-guide/).

### The project

A repository holds **one project**: the system, its Java package, where the generated code
goes, and the services it is made of.

```yaml
# modux/projects/library.yaml
id: library
name: Library
packageName: com.example.library
outputPath: system
serviceIds:
  - svc-library
objective: A small library keeps the catalog of its books and how many copies it owns.
```

`outputPath` is relative to the directory you run Maven from.

### The service

A **service** is a deployable: it becomes one Spring Boot application, listening on its
`port`, and deploys **modules**.

```yaml
# modux/services/svc-library.yaml
id: svc-library
name: Library
port: 8091
moduleIds:
  - bc-catalog-main
projectId: library
```

### The bounded context and its main module

A **bounded context** owns the meaning — aggregates, use cases, events. Its **main
module** is the unit a service deploys; every context has one, named `{context id}-main`.

```yaml
# modux/boundedContexts/bc-catalog.yaml
id: bc-catalog
name: Catalog
aggregateIds:
  - agg-book
projectId: library
```

```yaml
# modux/modules/bc-catalog-main.yaml
id: bc-catalog-main
name: Catalog
boundedContextId: bc-catalog
main: true
projectId: library
```

### The aggregate and its model

The **aggregate** is the consistency boundary; its state is a **model** — the fields.

```yaml
# modux/aggregates/agg-book.yaml
id: agg-book
name: Book
title: Books
modelId: model-book
projectId: library
```

```yaml
# modux/models/model-book.yaml
id: model-book
name: Book
fields:
  - id: f-book-title
    name: title
    basicType: true
    type: string
    validations:
      - id: v-book-title
        type: NotEmpty
  - id: f-book-author
    name: author
    basicType: true
    type: string
  - id: f-book-isbn
    name: isbn
    basicType: true
    type: string
  - id: f-book-published
    name: published
    basicType: true
    type: date
  - id: f-book-copies
    name: copies
    basicType: true
    type: integer
  - id: f-book-price
    name: price
    basicType: true
    type: money
  - id: f-book-status
    name: status
    enumId: enum-book-status
projectId: library
```

A field with fixed values is an **enum** — a select on screen, a Java enum in the domain:

```yaml
# modux/enums/enum-book-status.yaml
id: enum-book-status
values:
  - id: AVAILABLE
    name: AVAILABLE
  - id: WITHDRAWN
    name: WITHDRAWN
projectId: library
```

### A screen for it

An aggregate gets CRUD pages **only if a UI consumes it**. A **UI adapter** is an app of the
service with a menu; a menu entry pointing at the aggregate gives it its list, create, edit
and delete pages:

```yaml
# modux/uiAdapters/ui-library.yaml
id: ui-library
name: Library
serviceId: svc-library
title: Library
path: /library
appType: APP
menuItems:
  - id: ui-library-books
    label: Books
    aggregateId: agg-book
projectId: library
```

## 3. Validate

```bash
mvn modux:validate
```

```
[INFO] Modux: model is consistent, no dangling references.
[INFO] Modux: model checked — 0 error(s), 0 warning(s)
```

`validate` checks every id reference, duplicate ids, declarations that would collide once
generated, and the architectural lint rules. It also writes the model's JSON schema,
`modux/model-driven-store-schema.json`, which gives your editor completion and validation
over the YAML. Break something on purpose — misspell `agg-book` in the context's
`aggregateIds` — and run it again to see how it reports.

## 4. Generate

```bash
mvn modux:generate
```

`generate` checks the model again and writes the system into `system/`:

```
system/
├── README.md
├── docker-compose.yml        # the service + PostgreSQL + Kafka
├── up.sh / down.sh           # the same, without compose
├── deploy/ k8s/ terraform/   # DevOps artifacts
├── e2e/                      # Playwright suite
└── library/                  # the service, a multi-module Maven project
    ├── catalog/              # the bounded context: domain, application, infrastructure
    ├── library-app/          # the Spring Boot application
    └── library-custom/       # YOUR code — scaffolded once, never overwritten
```

Build it like any Maven project:

```bash
cd system/library
mvn -q package -DskipTests
```

## 5. Deploy and open the app

```bash
mvn modux:deploy
```

With no arguments `deploy` targets `local`: it builds the generated projects and starts
`system/docker-compose.yml` on your Docker — the service, PostgreSQL and Kafka. Once the
service has started (a few seconds after the command returns), open
**http://localhost:8091/library** — the service's port and the app's path — and **Books**
is in the menu, with its list and its create, edit and delete forms.

:::caution
`deploy` prints `http://localhost:8088`, the address of the gateway a system with a
UI shell gets. This system has none, so the app is on its own port, as above.
:::

To stop it: `docker compose -f system/docker-compose.yml down`. Without Docker you can run
the service on an in-memory H2 database instead, as the generated `system/README.md` says:

```bash
cd system/library
mvn install -DskipTests
mvn spring-boot:run -pl library-app -Dspring-boot.run.profiles=local
```

## 6. Add business logic

Withdrawing a book is a rule, not a field edit: an available book becomes `WITHDRAWN` and
its copies drop to 0; withdrawing it twice is an error. In the model it is an **operation**
of the aggregate, with its rule written as its `intent`:

```yaml
# modux/aggregates/agg-book.yaml
id: agg-book
name: Book
title: Books
modelId: model-book
operations:
  - id: op-withdraw
    name: withdraw
    type: CUSTOM
    intent: >-
      An AVAILABLE book becomes WITHDRAWN and its copies drop to 0. A book that is
      already WITHDRAWN is rejected with «The book is already withdrawn».
projectId: library
```

and a **use case** that people can run from the app — read the book, call the operation,
save it:

```yaml
# modux/useCases/uc-withdrawBook.yaml
id: uc-withdrawBook
name: WithdrawBook
title: Withdraw a book
exposedAsUi: true
inputModelId: model-withdraw-book
steps:
  - id: step-read
    name: readBook
    type: ReadAggregate
    aggregateId: agg-book
  - id: step-withdraw
    name: withdraw
    type: CallAggregateOperation
    aggregateId: agg-book
    operationId: op-withdraw
  - id: step-save
    name: saveBook
    type: SaveAggregate
    aggregateId: agg-book
projectId: library
```

```yaml
# modux/models/model-withdraw-book.yaml
id: model-withdraw-book
name: WithdrawBookInput
fields:
  - id: f-withdraw-bookId
    name: bookId
    basicType: true
    type: string
    validations:
      - id: v-withdraw-bookId
        type: NotEmpty
projectId: library
```

A field named `bookId` picks a Book on screen. Register the use case in its context and give
it a menu entry:

```yaml
# modux/boundedContexts/bc-catalog.yaml
id: bc-catalog
name: Catalog
aggregateIds:
  - agg-book
useCaseIds:
  - uc-withdrawBook
projectId: library
```

```yaml
# modux/uiAdapters/ui-library.yaml — one more menu item
  - id: ui-library-withdraw
    label: Withdraw a book
    useCaseId: uc-withdrawBook
```

Validate and generate again. The rule itself is not something the generator can write, so
it becomes a **hook**: an interface in the generated zone, `WithdrawBookOperation`, and a
class that implements it in `library-custom`, scaffolded once and never overwritten:

```
system/library/library-custom/src/main/java/com/example/library/custom/DefaultWithdrawBookOperation.java
```

It starts out throwing `UnsupportedOperationException` with the intent as its message.
Implement it — the aggregate has no setters; its state changes only through the
operation's context:

```java
package com.example.library.custom;

import com.example.library.application.BusinessRuleException;
import com.example.library.catalog.domain.aggregates.book.BookOperationContext;
import com.example.library.catalog.domain.aggregates.book.WithdrawBookOperation;
import com.example.library.catalog.domain.aggregates.book.vo.Status;
import org.springframework.stereotype.Component;

@Component
public class DefaultWithdrawBookOperation implements WithdrawBookOperation {

  @Override
  public void execute(BookOperationContext context) {
    if (context.status() == Status.WITHDRAWN) {
      throw BusinessRuleException.invalid("The book is already withdrawn");
    }
    context.status(Status.WITHDRAWN);
    context.copies(0);
  }
}
```

`BusinessRuleException.invalid` reaches the user as a 400 with that message. Rather than
writing it yourself, `mvn modux:ai-complete` can implement pending hooks from their intents
with your local AI command line (see [AI-Assisted Completion](/manual/ai-completion/)).

## 7. Change the model, regenerate

The model is the source; the generated zone is output. Add a field to the book:

```yaml
# modux/models/model-book.yaml — one more field
  - id: f-book-pages
    name: pages
    basicType: true
    type: integer
```

```bash
mvn modux:validate
mvn modux:generate
mvn modux:deploy
```

The aggregate, its persistence and its pages are regenerated with `pages`;
`DefaultWithdrawBookOperation` is untouched. Never edit the generated zone — the next
`generate` overwrites it. If you want different generated code, change the model.

## Versioning

Commit the model, the `pom.xml`, `.mvn/` and the `*-custom` modules; the rest of `system/`
is reproducible from them. The example's `.gitignore`:

```
**/target/
system/*
!system/*/
system/*/*
!system/*/*-custom/
```

## Next steps

- [Editing the Model](/getting-started/yaml-editing/) — the rules the schema cannot express, and authoring with an AI agent
- [The Authoring Path](/getting-started/authoring-path/) — what to model next, in what order
- [Aggregates](/manual/aggregates/), [Operations](/manual/operations/), [Use Cases](/manual/use-cases/) in depth
- [Deploying](/manual/deploying/) to Kubernetes
