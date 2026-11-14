---
title: Introduction
description: What is Modux and why use it
---

## What is Modux?

<div style="max-width: 920px; margin: 1.5rem 0; aspect-ratio: 16 / 9; border-radius: 14px; overflow: hidden;">
  <iframe src="https://www.youtube-nocookie.com/embed/36YZd8HI0bk?rel=0" title="modux in 3 minutes" loading="lazy" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" referrerpolicy="strict-origin-when-cross-origin" allowfullscreen style="width: 100%; height: 100%; border: 0; display: block;"></iframe>
</div>

*modux in 3 minutes* — a system from its model to running, and changed through it. [En español](https://youtu.be/bhxzFJl-W58) · [The whole series: modux in N minutes](https://www.youtube.com/playlist?list=PLUJRhYAO8b3U)

Modux is a **model-driven code generation framework** for building **enterprise information systems** in Java, using Domain-Driven Design (DDD). It targets the long-lived, business-critical systems made of several bounded contexts that must hold invariants, run business processes, and integrate with each other — not just forms over tables. Instead of writing the same structural boilerplate over and over, you describe your domain as a model — a directory of YAML files versioned in your repository, one per element — and let Modux generate the code for you.

For *why* Modux ships the patterns it does — derived from what an enterprise system actually requires — see [Enterprise Information Systems](/getting-started/enterprise-systems/). For *where AI fits* — and why Modux uses it to author the model but not to generate production code — see [Spec-Driven Development](/getting-started/spec-driven-development/).

The generated code follows **Hexagonal Architecture** (also known as Ports & Adapters), with a clear separation between:

- **Domain layer** — aggregate roots, entities, value objects, domain events
- **Application layer** — use cases, query services, DTOs
- **Infrastructure layer** — outbound adapters (JPA persistence, messaging, external gateways) and inbound adapters (auto-generated UI pages, REST controllers)

## Why Modux?

Building a proper DDD application from scratch involves a lot of repetitive work: creating aggregate roots, wiring up repositories, writing use cases, setting up JPA entities, building CRUD interfaces... Modux automates all of that so you can focus on what actually matters: your business logic.

### What you write

A model: one YAML file per element, in a `modux/` directory of your repository. The state of a
`Book` aggregate, for instance:

```yaml
# modux/models/model-book.yaml
id: model-book
name: Book
fields:
  - id: f-book-title
    name: title
    basicType: true
    type: string
  - id: f-book-published
    name: published
    basicType: true
    type: date
  - id: f-book-price
    name: price
    basicType: true
    type: money
  - id: f-book-status
    name: status
    enumId: enum-book-status
```

You write it by hand, with an AI agent, or in the graphical editor of the IntelliJ plugin;
`mvn modux:validate` checks it and `mvn modux:generate` turns it into code.

### What Modux generates

- `Book.java` — aggregate root with identity, fields, and business methods
- `BookId.java`, `Status.java` — strongly-typed identity and enum
- `CreateBookUseCase.java`, `UpdateBookUseCase.java`, `DeleteBookUseCase.java`
- `BookRepository.java` — port interface
- `BookEntity.java` — JPA entity
- `BookEntityRepository.java` — Spring Data repository
- `BookDBRepository.java` — repository implementation
- `BookCrudAdapter.java` — UI adapter
- Plus DTOs, query services, and more

## What patterns does Modux support?

Modux implements the patterns an enterprise information system requires — DDD aggregates and invariants, CQRS, hexagonal ports & adapters, the outbox pattern, sagas, projections, gateways, RBAC, scheduled triggers and more. Rather than list them flat, the [Enterprise Information Systems](/getting-started/enterprise-systems/) page derives each pattern from the requirement it answers and links to its building block.

## Tech stack

Generated applications use:

- **Java 21** + **Spring Boot 4**
- **Spring Data JPA** + **Hibernate** (PostgreSQL / H2)
- **Spring Cloud Stream** + **Apache Kafka**
- **Flyway** or **Liquibase** for migrations
- **Vaadin / Mateu UIDL** for UI

## Next steps

- [Install](/getting-started/installation/) the Maven plugin (and, optionally, the IntelliJ plugin)
- Follow the [Quick Start](/getting-started/quick-start/) to generate your first project
- Read the [User Manual](/manual/overview/) for full documentation
