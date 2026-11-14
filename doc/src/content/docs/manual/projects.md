---
title: Projects
description: Creating and configuring a Modux project
---

A **Project** is the top-level container for your entire system. It holds global configuration that applies to all generated services and bounded contexts.

## Creating a project

A repository holds exactly one project: `modux/projects/{id}.yaml`, with `packageName`, `outputPath` and the `serviceIds` it is made of. Or create it from the palette of the [graphical editor](/manual/graphical-editor-guide/). The fields are listed below and in the model's JSON schema — see [Editing the Model](/getting-started/yaml-editing/).

## Configuration

### Basic

| Field | Description |
|---|---|
| **Name** | Display name for the project |
| **Package** | Base Java package (e.g. `com.example.booking`) |
| **Output path** | Filesystem path where generated code will be written |
| **Git repository** | Optional remote repository URL |
| **Version** | Project version (e.g. `0.1.0-SNAPSHOT`) |

### Environments

You can define one entry per environment (`DEV`, `STAGING`, `PROD`). Each entry holds all the environment-specific connection values while provider and type choices (IAM provider, cache type, etc.) remain global at the project level.

| Field | Description |
|---|---|
| **Environment** | `DEV`, `STAGING`, or `PROD` |
| **Kubernetes cluster URL** | API server URL for the target cluster |
| **Kubernetes namespace** | Namespace where the service is deployed |
| **Kubernetes context** | kubectl context name |
| **Kubernetes token** | Service account token |
| **Kubernetes certificate authority data** | Base64-encoded CA certificate |
| **Terraform backend bucket** | S3/GCS bucket for remote state |
| **Terraform backend region** | Region of the state bucket |
| **Terraform backend key** | State file key/path |
| **Terraform workspace** | Workspace name (e.g. `dev`, `prod`) |
| **IAM server URL** | Identity provider base URL |
| **IAM realm** | Realm / tenant identifier |
| **IAM client ID** | OAuth2 client ID |
| **IAM client secret** | OAuth2 client secret |
| **IAM audience** | JWT audience claim |
| **Message broker URL** | Kafka / RabbitMQ bootstrap address |
| **Message broker username** | Broker username |
| **Message broker password** | Broker password |
| **Tracing endpoint** | OTLP / Jaeger / Zipkin endpoint |
| **Metrics endpoint** | Prometheus / OTLP metrics endpoint |
| **Logging endpoint** | Log aggregation endpoint (Loki, Splunk, etc.) |
| **LLM API URL** | Base URL for the LLM provider |
| **LLM API key** | API key for the LLM provider |
| **LLM model** | Model identifier (e.g. `gpt-4o`) |
| **Cache URL** | Redis / Hazelcast connection URL |
| **Cache username** | Cache username |
| **Cache password** | Cache password |
| **File storage bucket** | S3/GCS/Azure blob bucket name |
| **File storage region** | Region of the bucket |
| **File storage access key** | Access key ID |
| **File storage secret key** | Secret access key |
| **File storage endpoint** | Custom endpoint (for MinIO, Cloudflare R2, etc.) |
| **Email host** | SMTP host |
| **Email port** | SMTP port |
| **Email username** | SMTP username |
| **Email password** | SMTP password |
| **Email from** | Default sender address |
| **Secrets endpoint** | Vault / AWS Secrets Manager endpoint |
| **Secrets token** | Authentication token for the secrets backend |
| **Ingress domain** | Public domain for ingress rules |
| **Ingress TLS enabled** | Whether TLS termination is configured |
| **Ingress class name** | Ingress controller class (e.g. `nginx`) |

### Infrastructure

| Setting | Description |
|---|---|
| **Kubernetes** | Enable Kubernetes manifest generation |
| **Terraform** | Enable Terraform configuration generation |
| **CI/CD** | Enable GitHub Actions pipeline generation |
| **Cache** | Configure distributed cache settings |
| **Logging** | Log aggregation configuration |
| **Tracing** | Distributed tracing provider (Jaeger, Zipkin, etc.) |
| **IAM** | External identity provider (e.g. Keycloak) |

### Context Map

The context map defines how bounded contexts in your project relate to each other. A relation goes from a **source** to a **target** bounded context; for the asymmetric types the source is the **upstream** (U) context and the target is the **downstream** (D) context. Supported relationship types:

| Type | Description |
|---|---|
| `PARTNERSHIP` | Two contexts succeed or fail together and coordinate as partners |
| `SHARED_KERNEL` | Two contexts share (and jointly own) a common model |
| `CUSTOMER_SUPPLIER` | Upstream/downstream with a negotiated interface |
| `CONFORMIST` | Downstream conforms to upstream model with no negotiation |
| `OPEN_HOST_SERVICE` | A service exposed to multiple consumers |
| `ANTI_CORRUPTION_LAYER` | Translation layer isolating downstream from the upstream model |
| `PUBLISHED_LANGUAGE` | A well-defined shared exchange language (e.g. an event schema) |
| `SEPARATE_WAYS` | Contexts evolve independently, no integration |

## What gets generated

At the project level, Modux generates:

- Root `pom.xml` with multi-module structure
- Per-environment `application.yaml` files
- CI/CD pipeline files (if enabled)
- Kubernetes and Terraform stubs (if enabled)
- Main application entrypoint

## Next steps

Add one or more [Services](/manual/services/) to your project.
