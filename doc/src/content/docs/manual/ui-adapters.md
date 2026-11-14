---
title: UI Adapters
description: Defining the navigation structure of a frontend application in Modux
---

A **UI Adapter** defines the navigation structure of a frontend application for a specific service. Like [Pages](/manual/pages/), it is an **inbound infrastructure adapter** — it wires the user-facing shell to the application's use cases through its menu items and routes.

One service can have multiple UI adapters, for example to provide different navigation trees for different user roles or devices.

## Archetypes

Beyond its menu layout (`UiAppVariant`), an app has an **archetype** (`UiAppType`) that says what it IS:

| Archetype | Meaning | Extra wiring |
|---|---|---|
| **APP** | A regular application | **home** — the page (or **another app**) it opens first, drawn from the green handle |
| **ORCHESTRATOR** | Keeps state and shows nothing of its own — only child pages | its **estado**: a data model wired to the app («estado» edge); no home |
| **MASTER_DETAIL** | A header plus tabs — all of them pages | **cabecera** (blue handle, or the first page dropped on it); the tabs are its menu pages, reorderable with the drop slots; no home |
| **VIEW_EDITOR** | An orchestrator pairing a read-only detail view with an edit view | **vista** and **edición** handles towards its two pages |

All four are created from the [graphical editor](/manual/graphical-editor/)'s palette
(UI view); every wiring above is a drawn line, Supr un-draws it, and everything is
undoable. An app also declares which [identity provider](/manual/identity/) its users
authenticate against («autentica con»).

## Creating a UI adapter

Add `modux/uiAdapters/{id}.yaml` with its `serviceId`, layout variant and `menuItems`. Or create it from the palette of the [graphical editor](/manual/graphical-editor-guide/). The fields are listed below and in the model's JSON schema — see [Editing the Model](/getting-started/yaml-editing/).

## Configuration

### Basic fields

| Field | Description |
|---|---|
| **Name** | Adapter name (PascalCase, e.g. `AdminUiAdapter`) |
| **Service** | The service this adapter belongs to |
| **Title** | Application title shown in the shell header |
| **Path** | Base URL path for this adapter (e.g. `/admin`) |
| **App variant** | Navigation layout (see below) |

### App variants

| Variant | Description |
|---|---|
| **AUTO** | Let the framework choose based on screen size |
| **HAMBURGUER_MENU** | Collapsible sidebar with a hamburger toggle |
| **MENU_ON_LEFT** | Persistent sidebar on the left |
| **MENU_ON_TOP** | Horizontal top navigation bar |
| **TABS** | Tab-based navigation |

### Menu items

Each menu item links to a page route:

| Field | Description |
|---|---|
| **Label** | Menu item text |
| **Icon** | Optional icon name |
| **Description** | Optional tooltip or subtitle |
| **Route** | URL route of the target [Page](/manual/pages/) |

## What gets generated

For each UI adapter Modux generates:

- An application class annotated with `@UI` and the chosen layout variant
- Menu item declarations pointing to the configured routes
- Navigation wiring to the corresponding page components
