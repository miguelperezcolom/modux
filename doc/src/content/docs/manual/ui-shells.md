---
title: UI Shells
description: Configuring frontend deployment targets in Modux
---

A **UI Shell** represents a deployable frontend application. It bundles one or more services' UI adapters into a single shell and declares where and how that shell is deployed.

## Creating a UI shell

Add `modux/uiShells/{id}.yaml` with the services it federates (`serviceIds`), the public URL and the deployment target. Or create it from the palette of the [graphical editor](/manual/graphical-editor-guide/). The fields are listed below and in the model's JSON schema — see [Editing the Model](/getting-started/yaml-editing/).

## Configuration

### Basic fields

| Field | Description |
|---|---|
| **Name** | Shell name (PascalCase, e.g. `AdminShell`) |
| **Title** | Application title shown in the browser tab |
| **App variant** | Default navigation variant for the shell (overridden per adapter) |
| **Design system** | UI component library to use (see below) |
| **Services** | Services whose UI adapters are bundled into this shell |
| **URL** | Public URL where the shell will be served (e.g. `https://app.example.com`) |

### Design systems

Mateu supports multiple frontend design systems. Choosing one determines which component library is included as a Maven dependency in the generated project.

| Value | Library | Notes |
|---|---|---|
| **VAADIN** | [Vaadin](https://vaadin.com) | Clean and simple; the original Mateu frontend |
| **SAP_FIORI** | [SAP Fiori](https://experience.sap.com/fiori-design-web/) | Enterprise look; requires a valid SAP license for Fiori components |
| **SAP_UI5** | [SAP UI5](https://openui5.org) | Open-source alternative to SAP Fiori; no license required |
| **RED_HAT** | [Red Hat Design System](https://ux.redhat.com) | Good balance of clarity and aesthetics |
| **ORACLE_REDWOOD** | [Oracle Redwood](https://www.oracle.com/webfolder/ux/middleware/alta/index.html) | Modern Oracle design language |
| **SALESFORCE_SLDS** | [Salesforce Lightning (SLDS)](https://www.lightningdesignsystem.com) | Integrates with existing Salesforce UIs |
| **CUSTOM** | Bring your own | Use a custom component library |

All frontends are implemented as web components, so any shell can be embedded in an existing enterprise portal regardless of the design system chosen.

### Deployment type

| Type | Description |
|---|---|
| **CDN** | Deploy to a CDN provider (e.g. Netlify, Cloudflare Pages) |
| **BUCKET** | Deploy to an object storage bucket (e.g. AWS S3, GCS) |
| **MICROSERVICE** | Deploy as a Spring Boot microservice |

### CDN deployment

| Field | Description |
|---|---|
| **CDN provider** | Provider name (e.g. `netlify`, `cloudflare`) |
| **CDN site id** | Site identifier in the CDN provider |

### Bucket deployment

| Field | Description |
|---|---|
| **Bucket provider** | Cloud provider (e.g. `aws`, `gcp`, `azure`) |
| **Bucket name** | Name of the storage bucket |
| **Bucket region** | Cloud region where the bucket lives |

### Microservice deployment

| Field | Description |
|---|---|
| **Deployment service** | The service that will host and serve the frontend assets |

## What gets generated

Depending on the deployment type, Modux generates:

- **CDN / Bucket** — build and deploy scripts configured for the chosen provider, with the public URL baked in
- **Microservice** — a Spring Boot application that serves the frontend as static assets, wired to the selected service

All deployment types include environment-specific configuration for the public URL.
