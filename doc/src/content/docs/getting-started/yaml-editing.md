---
title: Editing the Model
description: The model is a directory of YAML files in your repository — its layout, the JSON schema that gives your IDE completion, the rules the schema cannot express, and authoring it with an AI agent
---

A Modux model is **a directory of YAML files in the repository**, one file per element,
versioned next to the code it generates. You edit it like any other source — by hand, with an
AI agent, or in the [graphical editor](/manual/graphical-editor-guide/), which writes the same
files.

## Layout

```
my-project/
├── pom.xml                          # declares modux-maven-plugin
└── modux/                           # the model (the IntelliJ plugin names it .modux/)
    ├── model-driven-store-schema.json
    ├── projects/{id}.yaml           # exactly one: a repository is one project
    ├── services/{id}.yaml
    ├── boundedContexts/{id}.yaml
    ├── modules/{id}.yaml
    ├── aggregates/{id}.yaml
    ├── models/{id}.yaml
    ├── useCases/{id}.yaml
    └── …                            # one directory per element type
```

The Maven plugin reads `modux/` by default and falls back to `.modux/` when that is what
exists; `-Dmodux.modelPath` points it anywhere else.

- **File names come from ids**, sanitized (`[^A-Za-z0-9._-]` → `_`). Two ids that differ only
  by a special character collide in one file.
- **Element order within a type is not meaningful** — files load alphabetically. Order
  *inside* an element (a use case's steps) is meaningful and preserved.
- **Leave empty values out**: no nulls, empty strings or empty lists, and omit `false`
  booleans. Modux never writes them, so the diffs stay small.
- Ids are conventionally prefixed by type: `bc-`, `agg-`, `ent-`, `vo-`, `uc-`, `model-`.

The [Quick Start](/getting-started/quick-start/#2-the-model) shows a complete small model.

## The schema is the metamodel

`modux/model-driven-store-schema.json` defines every element type and every field — what can
be said at all. A field that is not in the schema does not exist, and the generator ignores it
silently, so look a field up there before inventing it. `mvn modux:validate` and
`mvn modux:generate` (re)write it; `mvn modux:schema` does only that — run it after upgrading
the plugin.

The schema also encodes authoring rules the IDE checks while you type: `id` is required on
every addressable element, id-shaped fields (`id`, `*Id`, `*Ids`) reject spaces and exotic
characters, and reference fields carry hover documentation.

### In IntelliJ IDEA

*Settings → Languages & Frameworks → Schemas and DTDs → JSON Schema Mappings*, **+**:

| Field | Value |
|---|---|
| Name | `Modux model` |
| Schema file or URL | `modux/model-driven-store-schema.json` |
| Schema version | `JSON Schema version 7` *(the IDE treats Draft 2020-12 as v7+)* |
| Mapping | directory `modux` |

You get completion (**Ctrl+Space**), the field's description on **Ctrl+Q**, and red
underlines for unknown fields and type mismatches.

The schema describes the **whole store** — one top-level key per element type
(`aggregates`, `useCases`…) holding a list — while each file holds **one element**. Map it
to the files as the definition of their type, or put a `# yaml-language-server: $schema=…`
comment pointing at `…/model-driven-store-schema.json#/$defs/AggregateEntity` (or the type's
own definition) at the top of a file to get per-element completion.

### In Visual Studio Code

Install **YAML** by Red Hat (`ext install redhat.vscode-yaml`) and map the schema in
`.vscode/settings.json`:

```json
{
  "yaml.schemas": {
    "modux/model-driven-store-schema.json#/$defs/AggregateEntity": "modux/aggregates/*.yaml",
    "modux/model-driven-store-schema.json#/$defs/UseCaseEntity": "modux/useCases/*.yaml"
  }
}
```

One line per element type you edit by hand; the definition names are under `$defs` in the
schema.

## The rules the schema cannot express

The schema guards shape. These break a model while still matching it — and they are what
`mvn modux:validate` reports, with the element and field that carries each problem:

1. **Every id reference must resolve.** Any field ending in `Id` or `Ids` must name an
   element that exists. This is the most common breakage from a hand edit.
2. **Back-references are two-way.** An aggregate declares nothing about its context; the
   *context* lists it in `aggregateIds`. A new `aggregates/agg-x.yaml` not listed in a
   context is an orphan the editor will not draw. The same holds for `useCaseIds`,
   `valueObjectIds` and a service's `moduleIds`.
3. **A bounded context needs its main module** (`{contextId}-main`, `main: true`), and a
   service has to list that module in `moduleIds` — otherwise nothing deploys the context.
   A module is deployed by exactly one service.
4. **An aggregate needs its state model**: `modelId`, conventionally `model-{name}`.
5. **Invariants are nested** inside their owner's `invariants` list (aggregate, value object
   or entity), not in a top-level directory.
6. **Deletion has preconditions.** A context with aggregates, or an aggregate with entities,
   cannot go until those go first.

The full list — lifecycles, workflows, system-supplied values, events — is in the
`modux-model` skill below. Then generate:

```bash
mvn modux:validate     # references, duplicate ids, generation conflicts and the lint catalog
mvn modux:generate     # checks again, then generates
```

Fix the model, not the generated code: the generated zone is overwritten on every run, and
business logic belongs in the `{service}-custom` module (see
[Generating Code](/manual/generating-code/#generated-code-vs-your-code-two-zones)).

## Authoring with an AI agent

An agent edits the model the way it edits code: it reads and writes the files and runs
`mvn modux:validate`. There is no server and no tool surface in front of the files. What the
agent needs is knowledge, and the modux repository ships it as a skill:
[`.claude/skills/modux-model/SKILL.md`](https://github.com/miguelperezcolom/modux/blob/main/.claude/skills/modux-model/SKILL.md)
— the metamodel in brief, the referential rules above and the ones not listed here, the
validate/generate loop and the two-zone rule. Copy it into your repository's
`.claude/skills/` for Claude Code, or hand it to any other agent as instructions. The JSON
schema next to the model gives every agent the shape.

For a denser summary of the idioms that carry the architecture, point the agent at the
[compact authoring reference](/modux-ai-compact.md) — it exists because we measured what a
first-time agent spends discovering them (see the [case study](/reference/case-study-booking/)).
Worked models to imitate are in `sample/patterns/` (one per pattern) and
`sample/hla-booking/` (see the [Examples Catalog](/reference/examples/)).

## Versioning the model with git

Because the model is files in the repository, git does what a model needs from version
control:

- **A to-be proposal is a branch.** `main` holds the system as it is; a branch holds only the
  proposed change. Elements that already existed but were never modelled go to `main`, and
  reach the branch by merging `main` into it — so the branch's diff is exactly the proposal.
- **Reviewing it is a pull request**: one file per element makes `git diff` readable element
  by element, and the [HLA document](/reference/maven-plugin/#goal-hla) regenerated on the
  branch is its narrative companion.
- **A textual conflict means the same element changed on both sides** — exactly the
  granularity at which to resolve it.
- **History of one element**: `git log -- modux/aggregates/agg-book.yaml`.

Diagram geometry lives in `diagrams/`, apart from the elements, so tidying a diagram never
dirties them.

## Views of a large model

A **view** is a named, cross-cutting slice of the model — "check-in", "the reservations
context". It only *references* elements by id, so there is a single source of truth:

```yaml
# modux/views/view-checkin.yaml
id: view-checkin
name: Check-in
kind: CURATED
memberIds:
  - uc-crearEstancia
  - reserva
```

A **computed** view names a *seed* instead of listing members and recalculates itself as the
model changes — seeding with a bounded context gives the whole context:

```yaml
# modux/views/view-frontoffice.yaml
id: view-frontoffice
name: FrontOffice bounded context
kind: COMPUTED
seedId: mod-frontoffice
```

Members and seeds are references, so `mvn modux:validate` checks them too. See
[Views & Large Models](/manual/views-and-large-models/).

## Older models: the single-file store

Models created before the granular layout are one `model-driven-store.yaml` with a top-level
list per type. The Maven plugin still reads them (`-Dmodux.modelPath=…/model-driven-store.yaml`).
To split one into a directory — and back — use the generator's command line from the modux
sources:

```bash
cd model-driven-generator
# split a single-file store into a directory of files
mvn spring-boot:run -Dspring-boot.run.arguments="--modux.model-file=/path/to/model-driven-store.yaml --modux.split=/path/to/modux"
# merge a directory back into one file
mvn spring-boot:run -Dspring-boot.run.arguments="--modux.model-file=/path/to/modux --modux.merge=/path/to/model-driven-store.yaml"
```
