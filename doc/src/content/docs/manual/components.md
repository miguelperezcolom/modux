---
title: Components
description: Visual data components for dashboard pages in Modux
---

A **Component** is a self-contained visual block that fetches its own data and renders it in a chosen presentation style. Components are used as building blocks for [DASHBOARD pages](/manual/pages/).

## Creating a component

Add `modux/components/{id}.yaml` with its name, data source and presentation type. Or create it from the palette of the [graphical editor](/manual/graphical-editor-guide/). The fields are listed below and in the model's JSON schema — see [Editing the Model](/getting-started/yaml-editing/).

## Configuration

| Field | Description |
|---|---|
| **Name** | Component name (PascalCase, e.g. `RevenueChart`) |
| **Data source type** | Where the component fetches its data: `QUERY_SERVICE` or `GATEWAY` |
| **Query service** | Read Model to use when data source is `QUERY_SERVICE` |
| **Gateway** | Gateway to call when data source is `GATEWAY` |
| **Presentation type** | How the data is rendered: `CHART`, `LIST`, or `CARD` |

## Presentation types

| Type | Description |
|---|---|
| **CHART** | Renders data as a chart (bar, line, pie, etc.) |
| **LIST** | Renders data as a tabular or item list |
| **CARD** | Renders a single record or KPI as a card |

## Using components on a dashboard

Assign one or more components to a DASHBOARD page via the **Components** field. Modux places them in the order listed and generates the layout automatically.

## What gets generated

For each component Modux generates:

- A data-fetching service wired to the configured query service or gateway
- A UI component class with the chosen presentation type
- Binding code connecting data to the visual renderer
