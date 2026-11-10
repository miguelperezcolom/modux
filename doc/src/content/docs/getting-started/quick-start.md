---
title: Quick Start
description: Generate your first project with Modux in minutes
---

This guide walks you through creating a simple booking domain from scratch.

## 1. Start the generator

```bash
./install.sh   # once: builds the jar and installs the `modux` launcher
modux
```

Open `http://localhost:8192` in your browser (see
[Installation](/getting-started/installation/) for Docker and Helm).

## 2. Choose where to work

Modux works on ONE repository + ONE project + ONE model at a time, and everything
else needs them: **until a repository is open, the menu folds down to «Inicio» and
«Repositorios»**. Inicio lists the `~/.modux` catalog — or invites you to create
the first repository (a local folder, a git remote or a database) — and opening
one settles the project too (the current one, the first one, or a fresh default
with its service when the store is empty) and lands you on the graphical editor.
The header selectors (Repositorio / Proyecto / Modelo) remain the quick way to
switch once inside — and once the three are resolved, the **⚙ Generar** action appears
right next to them (see [Generating Code](/manual/generating-code/)). Deploying is
`mvn modux:deploy` (see [Deploying](/manual/deploying/)).

## 3. Create a Project

A **Project** is the top-level container for your entire system.

1. Click **Organization → Projects** in the sidebar
2. Click **New**
3. Fill in:
   - **Name**: `booking-system`
   - **Package**: `com.example.booking`
   - **Output path**: `/path/to/output/dir`
4. Save

## 4. Create a Service

A **Service** represents a microservice or deployable unit.

1. Open your project and go to **Services**
2. Click **New**
3. Name it `booking-service`
4. Save

## 5. Create a Bounded Context

A **Bounded Context** is a business subdomain with its own language. It is born with a **main module** — the unit your service deploys.

1. Go to **Organization → Bounded Contexts**
2. Click **New**
3. Name it `bookings`
4. Save
5. Open the service and add the context's main module (`bookings-main`) to its **Modules**

## 6. Create an Aggregate

An **Aggregate** is the core DDD building block.

1. Open the bounded context and go to **Aggregates**
2. Click **New**
3. Fill in:
   - **Name**: `Booking`
   - **ID type**: `UUID`
4. Add fields:
   | Name | Type |
   |---|---|
   | reference | String |
   | customer | String |
   | startDate | LocalDate |
   | endDate | LocalDate |
5. Save

## 7. Generate code

1. Go back to your **Project**
2. Click **Generate Code**
3. The generated project will be written to the output path you configured

## 8. Build and run the generated project

```bash
cd /path/to/output/dir/booking-system
mvn spring-boot:run
```

Your application starts at `http://localhost:8080` with a working CRUD interface for your `Booking` aggregate.

## 9. Add your business logic

The generated code is designed to be extended. Implement the generated interfaces in a separate Maven module with your custom logic:

```java
@Service
public class BookingDomainService implements CreateBookingUseCase {
    @Override
    public void execute(CreateBookingCommand command) {
        // your business rules here
    }
}
```

## Next steps

- Read the [User Manual](/manual/overview/) for all available concepts
- Learn about [Aggregates](/manual/aggregates/) in depth
- Set up [Domain Events](/manual/domain-events/) and [Sagas](/manual/sagas/)
