---
name: modux-model
description: Author a modux domain model by editing its YAML files directly — the metamodel in brief, the JSON schema, the referential rules the schema cannot express, and the validate/generate loop. Use when creating or changing a model in a repo's modux/ directory (aggregates, bounded contexts, use cases, relations, workflows), or when `mvn modux:validate` fails.
---

# Authoring a modux model

A modux model is **a directory of YAML files in the repository**, one file per element,
versioned next to the code it generates. You edit it with Read/Edit/Write like any other
source. There is no server to call and no tool surface in front of the files.

```
mi-proyecto/
├── .modux/                         ← the model. The directory's name is what makes this a
│   │                                 modux project (`mvn modux:*` also accepts `modux/`).
│   ├── model-driven-store-schema.json
│   ├── projects/{id}.yaml
│   ├── boundedContexts/{id}.yaml
│   ├── aggregates/{id}.yaml
│   └── …                           ← one directory per element type
└── src/main/java/                  ← generated + hand-written
```

**One repository is one project.** There is no "current project" to select.

## Start here: the schema is the metamodel

`.modux/model-driven-store-schema.json` defines every element type and every field — what
can be said at all. **Read it before inventing a field**; a field that is not in the schema
does not exist, and the generator will ignore it silently.

Regenerate it after upgrading modux:

```bash
mvn modux:schema
```

## The shape of the metamodel

Three layers that are easy to conflate:

| Concept | What it owns |
|---|---|
| **Bounded context** | **Meaning.** The domain language: aggregates, use cases, domain events. |
| **Module** | **Packaging.** How a context's elements are distributed into buildable units. |
| **Service** | **Deployment.** A service deploys modules; it is what becomes a runnable app. |

A bounded context is born with a **main module** (`{contextId}-main`), and a service deploys
that module. If you add a context by hand, add its main module too, and add the module's id to
a service's `moduleIds` — otherwise the context exists but nothing deploys it.

## The rules the schema cannot express

The schema guards shape. These are the ones that break a model while still validating:

1. **Every id reference must resolve.** Any field ending in `Id` or `Ids` must name an element
   that exists in the model. This is the single most common breakage from a hand edit.
   The one exception is `referencedRepositoryId`, which is legacy and points outside the model —
   see «Referencing another project» below. The schema says so on the field itself.
2. **Back-references are two-way.** An aggregate declares nothing about its context; the
   *context* lists it in `aggregateIds`. Adding `aggregates/agg-x.yaml` without adding `agg-x`
   to its context's `aggregateIds` produces an orphan the editor will not draw.
   The same holds for `useCaseIds`, `valueObjectIds` and `services.moduleIds`.
3. **An aggregate needs its state model.** Aggregates carry `modelId` pointing at a `models/`
   element. The convention is `model-{aggregate id without the `agg-` prefix}`.
4. **Deletion has preconditions.** A bounded context with aggregates, or an aggregate with
   entities, cannot be deleted until those go first.
5. **A module is deployed by exactly one service.** Do not list the same module id under two
   services.
6. **Invariants are nested, and polymorphic.** They live inside their owner's `invariants`
   list, and the owner may be an aggregate, a value object *or* an entity — not in a
   top-level directory.
7. **Sagas and workflows have an execution ceiling per step.** A cycle without a bound is
   rejected: the build refuses workflows that can loop forever.
8. **A workflow must be startable from a bounded context.** It lives outside every context, but
   its generated definition has to end up on some running service's classpath — so it needs a
   trigger (`triggerAggregateId`, `triggerDomainServiceId` or `triggerUseCaseId`) naming
   something a context owns, or at least one step with a `targetUseCaseId`. Without that it
   generates nothing at all. `triggerEvent` alone is NOT enough: it says what starts the
   workflow, not from where.

## Fields that become selectors on a screen

- **A state with fixed values is an enum**: `basicType: false` plus `enumId` naming an `enums/`
  element. The screen shows a select and the domain gets a Java enum. The enum constants come from
  each value's `id`.
- **A field named `{aggregate}Id` picks an instance of that aggregate** (`libroId` is a Libro) when
  the aggregate is in the same context and has CRUD pages. The screen shows a searchable list.
- **`validations` make a field required on screen**: `NotEmpty` for text, `NotNull` otherwise.

## Workflows speak EventConductor's language

A workflow is run by [EventConductor](https://eventconductor.mateu.io/), and modux generates its
definition — so the engine's vocabulary is the one the model uses. A step's `type` is one of
EventConductor's own:

`START` · `ACTION` · `JOIN` · `FORK` · `END` · `USER_TASK` · `PROCESS` · `TIMER` ·
`WAIT_FOR_MESSAGE` · `SEND_MESSAGE` · `RULE`

Two things follow that are easy to get wrong by hand:

- **A step with a `roleId` or a `formPageId` is a `USER_TASK`**, not an `ACTION`. Leave `type`
  out and it is inferred from exactly that; write `ACTION` on a step with a role and you have
  told the engine a person's task is automated work.
- **modux says `dependsOnStepIds`, the engine says preconditions.** Same edge; the translation
  happens at generation, so declare dependencies the modux way.

An older model saying `TASK` or `SPLIT` is migrated on load (`SPLIT` → `FORK`). The schemas
themselves live in `model-driven-generator/src/main/resources/eventconductor/`, copied from
EventConductor — when the two disagree, the one that is wrong is modux.

## Referencing another project

A repository holds one project, so referencing another project is referencing another repository.
It appears in this model as an `externalSystems/` element carrying two different things, and the
difference is the whole point:

- a **snapshot** — the other project's name and its exposed use cases, copied in. This is what
  generation reads, which is why a build never needs the other repository present. Do not
  hand-maintain it; it is refreshed from the source.
- a **coordinate**, `referencedProject`, saying where that source is:

```yaml
referencedProject:
  gitUrl: git@github.com:acme/checkin.git   # the identity — means the same to everyone
  branch: main                              # optional
  path: ../../checkin/modux                 # optional: only when the checkout is not a sibling
```

Prefer `gitUrl` alone. A sibling checkout is found from it with no network and nothing configured,
and unlike a path it does not encode where *your* machine keeps things. `path` is an override.

`referencedRepositoryId` on the same element is the old form — an id into `~/.modux/repositories.yaml`,
a file that lived on one machine. Never write it. A model still carrying it is migrated on load
where that registry survives; where it does not, the snapshot still stands and only refreshing is
lost.

## The loop

Always, after editing:

```bash
mvn modux:validate     # referential integrity — catches rules 1 and 2 above
mvn modux:generate     # generates into the project's declared outputPath
mvn -q test            # the generated code has to build
```

`modux:validate` reports every dangling reference with the element and field that carries it.
Fix the model, not the generated code.

## Use cases: what becomes code, what becomes a hook

A step the generator can write for real is generated (publish an event, the CRUD of an aggregate).
Anything that needs a business decision becomes a **hook** in `{service}-custom`: a `Custom` step
(its `intent` is the spec), and also an aggregate operation, saving an aggregate nothing loaded, or
calling another use case. Reject from a hook with `BusinessRuleException.invalid/notFound/conflict`
(400/404/409 with that message).

**CRUD pages exist only if a UI consumes the aggregate**: an app with it in its menu
(`menuItems[].aggregateId`), a page bound to it, or a UI shell federating its service. With no
consumer there are no pages, menu or Home, and the aggregate is reached through its APIs (a use
case an external system calls through an inbound ACL gets `POST /v1/{name}`).

`mvn modux:ai-complete` implements the pending hooks of the custom zone from each step's `intent`, with the local `claude` CLI. Write intents that say the rule, the outcome and where each value comes from.

`mvn modux:hla` writes `HLA.generated.md`, the design document derived from the model; declare
the project's `objective` so its first section says what the system is for.

## Do not edit generated code

Generation has two zones (see `docs/design/two-zone-codegen.md`):

- **Generated zone** — overwritten on every run. Never edit it; the change is lost on the next
  `modux:generate`.
- **Custom zone** (`{service}-custom`) — scaffolded once, never overwritten. Business logic
  goes here, implementing the hooks the generated zone declares.

If you want different generated code, change the model or the template — not the output.

## Conventions that keep diffs small

- **File names come from ids**, sanitized (`[^A-Za-z0-9._-]` → `_`). Two ids differing only by
  a special character collide in one file.
- **The store never writes empty values**: no nulls, no empty strings, no empty lists, and
  `false` booleans are omitted. Do not add `aggregateIds: []` — leave the field out.
- **Element order inside a type is not meaningful.** Files load alphabetically. Order *within*
  an element (a use case's steps) is meaningful and preserved.
- Ids are conventionally prefixed by type: `bc-`, `agg-`, `ent-`, `vo-`, `uc-`, `model-`.

## Worked examples

`sample/patterns/` in the modux repository holds hand-authored didactic models, one per
pattern — BFF, ACL, CQRS, event-driven, saga, event sourcing, human process. Read the one that
matches the shape you are building before writing from scratch.
`sample/hla-booking/` is a full realistic model.

## When the editor is the better tool

Geometry (`diagrams/`) is written by the graphical editor in the IntelliJ plugin. You can edit
it by hand, but positions you invent will look arbitrary — prefer leaving the diagram alone and
letting auto-layout place new elements.
