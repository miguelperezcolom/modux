---
title: Views & Large Models
description: Work with a huge model — a granular store, referential integrity, views (curated and computed), scoped generation and partial loading
---

A real enterprise model has thousands of elements across many bounded contexts. Modux treats the model
as a **catalog** of elements referenced by id (it already is one internally) and lets you cut it into
**views** — named, cross-cutting projections — to navigate, edit, generate and load only the part you
care about. The guiding rule: **a view only references elements, it never owns or copies them**, so
there is a single source of truth.

For the design rationale see the
[catalog-and-views RFC](https://github.com/miguelperezcolom/modux/blob/main/docs/design/catalog-and-views.md).

## Referential integrity

Whatever the size, a dangling reference (an `…Id` pointing at an element that no longer exists) is easy
to introduce. Validate the whole model — handy as a CI gate (exits non-zero when broken):

```bash
mvn spring-boot:run -Dspring-boot.run.arguments=--modux.check
```

## Granular storage

A single store file is convenient at first, but a large model is painful to diff, merge and edit as one
giant YAML. Keep it instead as a **granular tree** — one file per element, grouped by type:

```
model/
├── index.yaml
├── aggregates/{id}.yaml
├── usecases/{id}.yaml
└── …
```

Convert between the two formats; the format is auto-detected on load (a directory → granular, a file →
monolithic), and Modux persists changes in whatever it loaded:

```bash
mvn spring-boot:run -Dspring-boot.run.arguments=--modux.split=./model    # monolith → granular tree
mvn spring-boot:run -Dspring-boot.run.arguments=--modux.merge=./store.yaml  # granular tree → one file
```

Granular storage diffs and merges cleanly — the real lever for working on a huge model with several
people.

## Views

A view is an element in the catalog (in the `views:` list). It can be **curated** — listing its members
— or **computed** — naming a seed and deriving its members:

```yaml
views:
  - id: view-checkin
    name: Check-in
    kind: CURATED
    memberIds: [uc-crearEstancia, reserva]

  - id: view-frontoffice
    name: FrontOffice bounded context
    kind: COMPUTED
    seedId: mod-frontoffice          # the whole bounded context, recomputed as the model changes
```

Because members (and the seed) are plain references, `--modux.check` validates them too. Inspect what a
view actually touches — its **dependency closure**, following every reference transitively (a use case
pulls in its aggregate, gateway, event and input model):

```bash
mvn spring-boot:run -Dspring-boot.run.arguments=--modux.view=view-checkin
```

A **computed** view is the powerful one for a large model: seed it with a bounded context to get the
whole context, with a use case to get the use case plus everything it depends on, with a service to
get everything in it — one uniform mechanism, and it recalculates itself as the model evolves.

## Generating a slice

Generate just a view's closure instead of the whole project — its domain code is emitted inside the
normal project skeleton, so the slice still builds (out-of-scope contexts are simply empty):

```bash
mvn spring-boot:run \
  -Dspring-boot.run.arguments="--modux.generate=<projectId> --modux.view=view-frontoffice"
```

With a huge model you regenerate one bounded context at a time instead of the whole thing.

## Partial (lazy) loading

On a granular store you can load **only a view's closure** into memory — open one bounded context of a
huge model without loading everything. The partial catalog is read-only:

```bash
mvn spring-boot:run -Dspring-boot.run.arguments=--modux.load-view=view-frontoffice
```

:::note[Honest limits]
Partial loading optimizes editing, navigation and *scoped* generation. **Full-project generation still
loads the whole graph** (it resolves cross-context flows and references), as does booting the generator
in UI mode today — so lazy loading does not speed up a full generate. Saving while partially loaded is
disabled (read-only) so a slice can't clobber the rest of the model on disk.
:::

## How it fits the hierarchy

Views sit **on top of** the project → bounded context → module → aggregate hierarchy; they don't replace
it. The hierarchy says where an element lives and who owns it; a view is a curated cross-cut (a saga
spanning three contexts).

## Creating curated views from the canvas

The [Graphical Editor](/manual/graphical-editor/) can create CURATED views directly:
shift+click (or rubber-band) a set of elements on any diagram and press **⊞ View** —
the selection becomes the view's members. The editor's **Vista:** selector then scopes
the canvas to any curated view, which doubles as a quick visual check of what a slice
contains before generating it.

With a view active the canvas scopes to the members — including the strategic/AI
pieces (actors, AI agents, MCP gateways, RAGs, APIs) — and also **maintains** the
view, always editing `memberIds` and never the elements themselves:

- **«☰ Tree»** opens the **catalog tree**: the whole project grouped by kind, with a
  membership checkbox per element (aggregates nested under their context; greyed rows
  ride in implicitly through their container). Checking adds the element to the view,
  unchecking takes it out — the element stays in the project, and both are undoable.
- the **«Añadir a la vista…»** search box offers every catalog element not yet in the
  view (contexts, external systems, aggregates, flows, processes, workflows, actors,
  agents, gateways, RAGs, APIs) — pick one and **＋ Añadir** incorporates it;
- pressing **Del on a member** opens a picker: *Delete …, or only remove it from the
  view?* — the second option only edits the view's `memberIds`, never the
  element itself. Computed views reject member edits (their members derive from the
  seed).
