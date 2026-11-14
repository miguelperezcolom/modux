---
title: Services
description: Configuring microservices in Modux
---

A **Service** represents a deployable microservice within your project. Each service compiles to its own Spring Boot application with its own `pom.xml`, configuration, and infrastructure settings.

## Creating a service

Add `modux/services/{id}.yaml` with the modules it deploys (`moduleIds`) and its `port`, and list the id in the project's `serviceIds`. Or create it from the palette of the [graphical editor](/manual/graphical-editor-guide/). The fields are listed below and in the model's JSON schema — see [Editing the Model](/getting-started/yaml-editing/).

## Configuration

### Basic

| Field | Description |
|---|---|
| **Name** | Service name (used as Maven module name and artifact ID) |
| **Port** | HTTP port (default: `8080`) |
| **Context path** | Base URL path (e.g. `/api`) |
| **Modules** | The [modules](/manual/modules/#modules) this service deploys — the only link between topology and content |

### Deployment

| Field | Description |
|---|---|
| **Docker image** | Docker image name for this service |
| **Replicas** | Default number of Kubernetes replicas |
| **HPA** | Enable Horizontal Pod Autoscaler |
| **Liveness probe** | Path and settings for liveness health check |
| **Readiness probe** | Path and settings for readiness health check |
| **Startup probe** | Path and settings for startup health check |

### Resilience

| Field | Description |
|---|---|
| **Circuit breaker** | Enable circuit breaker on outgoing calls |
| **Timeouts** | Connection, read, and write timeout settings |

### Database

| Field | Description |
|---|---|
| **Migration tool** | `FLYWAY` or `LIQUIBASE` |
| **Outbox pattern** | Enable transactional outbox for reliable messaging |

### Integration

| Field | Description |
|---|---|
| **BFF** | Add a Backend-for-Frontend layer to this service |
| **ACL** | Add an Anti-Corruption Layer for external integrations |

## What gets generated

For each service, Modux generates:

- `pom.xml` with all required dependencies
- Main `Application.java` class
- `application.yaml` with Spring Boot, JPA, and Kafka configuration
- Docker and Kubernetes manifests (if enabled)
- Database migration scripts skeleton

## Next steps

Create a [Bounded Context](/manual/modules/) and deploy its main module in your service. Each deployed module becomes a Maven submodule of the service's reactor.
