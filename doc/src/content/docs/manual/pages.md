---
title: Pages
description: Defining UI screens in Modux
---

A **Page** is the fundamental unit of UI in Modux. In hexagonal architecture terms it is an **inbound (driving) adapter**: it lives in the infrastructure layer and drives the application through use cases, exactly as an HTTP controller would. Each page has a route and a type that determines what it renders and what extra configuration it accepts.

## Page types

| Type | Description |
|---|---|
| **PAGE** | A generic page: its content decides the look — an inferred viewmodel form, or a [UI-first composition](/manual/graphical-editor/) (a *form* is a component, a *dashboard* is a layout) |
| **CRUD** | List + create + edit screen backed by an aggregate |
| **WIZARD** | A multi-step flow with completion actions |
| **FORM** / **DASHBOARD** *(legacy)* | Older stores keep them and they still generate; new pages express both through PAGE + composition |

## Creating a page

Add `modux/pages/{id}.yaml` with its name, route and type, the type-specific fields and the optional parts (toolbar, triggers, rules, validations, field configs). Or create it from the palette of the [graphical editor](/manual/graphical-editor-guide/). The fields are listed below and in the model's JSON schema — see [Editing the Model](/getting-started/yaml-editing/).

## Configuration

### Basic fields

| Field | Description |
|---|---|
| **Name** | Page name (PascalCase, e.g. `BookingWizard`) |
| **Route** | URL path for this page (e.g. `/bookings`) |
| **Type** | PAGE, CRUD or WIZARD (FORM/DASHBOARD legacy) |

### The four zones

Every page has **header**, **toolbar** (top buttons), **content** and a **bottom
bar** (closing actions) — the designer's mockup shows all four, and the bars are
drop zones: dropping a use case from the Catálogo creates its button in THAT bar,
dropping it on an existing button retargets it (label, bar and mapping survive),
and dropping a **mapping** on a button transforms the viewmodel before the call.

### CRUD targets

A CRUD wires **detalle** (what opens a row) and **nuevo** (the new-record form)
from its orange and teal handles — each reaching a page or an app of any archetype
(a Vista-editor app is the natural detail).

### Wizard steps

A wizard's **steps are first-class**: they exist with a label and an order, and
**map to the page implementing them** (drag the step row's handle to a page, or
drop a page on the row; unmapped steps show ⌁). Steps reorder by dragging — rows
between drop slots on the UI view, or the chips of the mockup's wizard bar — and
deleting a page **unmaps** its steps instead of losing them.

### CRUD pages

| Field | Description |
|---|---|
| **Aggregate** | The aggregate this CRUD manages |
| **Listing data source** | `QUERY_SERVICE` (uses a Read Model) or `GATEWAY` (calls an external service) |
| **Listing query service** | Read Model to use when data source is `QUERY_SERVICE` |
| **Listing gateway** | Gateway to call when data source is `GATEWAY` |

When no listing data source is set, Modux generates a default repository-backed query.

### FORM pages

| Field | Description |
|---|---|
| **Model** | The model (DTO / value object) that backs this form |

### DASHBOARD pages

| Field | Description |
|---|---|
| **Components** | One or more [Components](/manual/components/) to display on the dashboard |

### WIZARD pages

| Field | Description |
|---|---|
| **Wizard steps** | Ordered list of steps. Each step references another Page (expected to be a FORM) and has an optional label override shown in the progress bar |
| **Completion actions** | Buttons rendered on the last step in place of the "Next" button (same structure as toolbar buttons) |

## Toolbar and bottom bar

Every page can define two lists of buttons:

- **Toolbar** — displayed at the top of the page
- **Bottom bar** — displayed at the bottom

Each button has:

| Field | Description |
|---|---|
| **Label** | Button text |
| **Icon** | Optional icon name |
| **Use case** | Use case to invoke on click |
| **Action id** | Alternative: a Mateu action identifier |

## Triggers

Triggers execute an action automatically in response to a lifecycle event.

| Field | Description |
|---|---|
| **Type** | `OnLoad`, `OnSuccess`, `OnError`, `OnValueChange`, `OnCustomEvent`, `OnEnter` |
| **Action id** | Action to run when the trigger fires |
| **Timeout (ms)** | Delay before the action runs (for timed triggers) |
| **Times** | How many times the trigger fires (0 = unlimited) |
| **Condition** | Expression that must be true for the trigger to fire |
| **Called action id** | Secondary action reference |
| **Property name** | Field to watch (for `OnValueChange`) |
| **Event name** | Custom event name (for `OnCustomEvent`) |

## Rules

Rules change field attributes dynamically based on conditions evaluated on every state change.

| Field | Description |
|---|---|
| **Filter** | Condition expression (e.g. `state['status'] == 'PENDING'`) |
| **Action** | What to do: `SetAttributeValue`, `SetStateValue`, `SetCssClass`, `SetStyle`, `RunAction`, `RunJS`, `SetAppDataValue`, `SetAppStateValue`, `SetDataValue` |
| **Field name** | Target field |
| **Field attribute** | Attribute to modify: `required`, `disabled`, `hidden`, `pattern`, `minValue`, `maxValue`, `minLength`, `maxLength`, `css`, `style`, `theme`, `errorMessage`, `description` |
| **Value** | Literal value to set |
| **Expression** | Expression to evaluate as the value |
| **Result** | `Continue` (keep evaluating other rules) or `Stop` |

## Validations

Field-level and form-level validations that run before save.

| Field | Description |
|---|---|
| **Condition** | Expression that must be true for the validation to fail |
| **Field id** | Field to highlight on failure (leave empty for form-level) |
| **Message** | Error message shown to the user |

## Field configuration overrides

For each field in the assigned model you can override its default presentation.

| Field | Description |
|---|---|
| **Field id** | Name of the field to configure |
| **Stereotype** | Visual stereotype: `regular`, `textarea`, `toggle`, `richText`, `markdown`, `password`, `email`, `combobox`, `select`, `radio`, `checkbox`, `listBox`, `image`, `icon`, `link`, `money`, `color`, `slider`, `stars`, `html`, `grid`, `choice`, `popover`, `button` |
| **Colspan** | Number of columns this field spans in the form grid |
| **Style** | Inline CSS (e.g. `width: 100%;`) |
| **CSS class** | One or more CSS class names |
| **Label** | Override the default field label |
| **Help** | Help text displayed below the field |

## What gets generated

A page with a **designed component tree** (composed in the page designer) wins over its
type: it generates a Mateu `ComponentTreeSupplier` whose `component()` returns the tree
built with the UIDL builders — every layout and Display component of the palette maps to
its Mateu counterpart (`HeroSection`, `Scoreboard`, `Kanban`, `Gantt`, `Timeline`,
`Calendar`, `TabLayout`…), with the same sample content the designer mocks up, so the
deployed page looks like the design.

Data-bound components wire to the model when you connect them in the designer:

- A **form** with an assigned viewmodel becomes a Mateu `Form` whose `FormField`s bind
  to generated page fields — all the model's basic fields, or just the `field` children
  you dropped inside the form (their labels override the defaults). A loose **field**
  bound to a viewmodel field renders as a one-field, headerless form.
- A **listing/CRUD** with an assigned query service operation becomes a nested
  `ListingBackend` bean that calls the generated query service, with columns derived
  from the operation's output model, server-side text filtering and pagination, and an
  `OnLoadTrigger` so data loads on open. The query service is injected as an
  `ObjectProvider`: the app boots (and the listing says what is missing) while your
  implementation is still absent from the custom module.
- A **use case** assigned to a **button** (or FAB) gives it an action; assigned to a
  **form**, it adds a *Guardar* button. Either way the page becomes a Mateu
  `ActionHandler`: the click builds the use case's command from the page's form fields
  and calls the generated use case, toasting the result. With a **mapping** on the node
  (drop one from the catalog onto the button or the form), its rules decide which form
  field feeds each command field — the viewmodel and the use case's input model no
  longer need matching names. Without one, fields match by name; anything unresolved
  travels as `null`. The use case is injected leniently, so the
  app still boots when it lives in another service. After the use case runs, the page
  dispatches a `modux-data-changed` client event and **every wired listing on screen
  re-runs its search** — save a record and the grids refresh themselves.
- A **ficha** (detail page) assigned to a crud/listing — in the component's dialog —
  makes its rows navigable: the grid switches to selectable table mode and selecting a
  row navigates to the ficha's route plus the row's key (a field named `id`, or the
  first one). The ficha gets a `@Route` and, when it is a composed page, an
  `onHydrated()` that reloads the record through the same query operation and pre-fills
  its form fields by name.

Left unconnected, they generate an `EmptyState` that says exactly what to assign.

Otherwise, the page type decides:

- **CRUD** — list view, create form, edit form, delete action; optionally wired to a custom query service or gateway for the listing
- **FORM** — standalone form component bound to the specified model
- **DASHBOARD** — layout composing the selected components
- **WIZARD** — `WizardOrchestrator` subclass with one `WizardStep` field per step and one `@WizardCompletionAction` method per completion action

All pages respect the configured toolbar, bottom bar, triggers, rules, validations and field overrides.

**FORM** and **WIZARD** pages additionally emit an [EventConductor](https://eventconductor.mateu.io/)
form definition (`src/main/resources/forms/<Page>.form.json`) derived from the page's model fields.
EventConductor `USER_TASK` [workflow steps](/manual/workflows/#human-tasks) can
reference these forms by id, so a human task in a workflow renders the same form you designed in
Modux.
