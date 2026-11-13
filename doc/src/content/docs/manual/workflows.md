---
title: Workflows
description: Cross-context orchestrators — event-driven dependency graphs with human tasks, gateways and compensation
---

A **Workflow** is an orchestrator that lives **outside every bounded context**. It is
started by an event and advances a **dependency graph** of steps; each step starts a
task inside some bounded context — or lands on a person's worklist. The workflow never
calls anything directly: **all workflow ↔ context communication travels as events**.

Workflows absorbed what used to be two separate concepts: **Processes** (human
procedures with roles and deadlines) and **Sagas** (compensation chains) were fused
into workflows — one orchestrator, three capabilities. Old stores migrate with one
click (the **⇪ Migrar** button on the Workflows view) or the
`migrate-processes-to-workflows` / `migrate-sagas-to-workflows` commands; ids are
preserved so references survive.

```
trigger event ──▶ Workflow ──emits──▶ step A ──▶ (awaits completion event)
                     │                                    │
                     └──emits──▶ step B ◀── depends on ───┘
                                   │
                                   ▼
                          onCompletionEventName
```

## Steps

| Field | Description |
|---|---|
| `emittedEventName` | The event the workflow publishes to start the step |
| `targetUseCaseId` | The task: a use case run in its bounded context |
| `completionEventName` | The event that marks the step done |
| `dependsOnStepIds` | The dependency graph — the step starts when ALL its dependencies complete |
| `compensationUseCaseId` | The use case that **undoes** this step when the workflow compensates (the saga side) |
| `handoffWorkflowId` | The step's single outgoing link when it is ANOTHER workflow: a hand-off |

Steps' dependencies must form a **DAG** — the `workflow-dag` lint rule reports cycles.

## Human tasks

A step with a `roleId` is a **HUMAN task**: it lands on that role's worklist instead
of calling a use case. Human steps carry the whole vocabulary of people-work:

| Field | Description |
|---|---|
| `roleId` | The actor whose worklist receives the task (this is what makes the step human) |
| `deadline` | ISO-8601 duration bound, e.g. `PT48H` |
| `escalationRoleId` | Who the task escalates to when the deadline passes |
| `formPageId` | **The form**: the declared [page](/manual/pages/) the forms engine renders when the task is worked |

In the diagram a human step turns amber with a `👤 role · 📋 · PT48H` badge, its
**role orbits it** (dashed amber edge) and so does its **form page** (`📋 FORMULARIO`).
The gestures: **drag an actor onto a step** to make it human (Supr on the role edge
turns it automatic again), **drag the step onto a page** to declare its form (Supr on
the form edge clears it).

## Gateways: join and split

Flow control lives in **loose gateways** — they never declare which workflow they
belong to: **their links say it** (membership is inferred). The grammar is enforced:

- **Join (⨝)** — *n* inputs → **1** output. Semantics: **ALL** (waits for every
  input, the default) or **ANY** (fires with the first).
- **Split (⑃)** — **1** input → *n* outputs. Semantics: **PARALLEL** (opens every
  branch, the default) or **EXCLUSIVE** (picks one branch by condition).

A step or workflow can have only **one outgoing link**; joins accept many inputs,
splits fan out. Links across two different workflows are rejected — except a step
pointing at ANOTHER workflow, which is a **hand-off**.

For an **exclusive split**, each outgoing branch carries a **condition**
(`branchConditions`): **double click the branch edge** to edit its expression
(unguarded branches render dashed with «¿condición?»), or edit them from the
gateway's form — and from the owning workflow's form, which lists every branch of
its inferred splits. **Double click the gateway node** toggles its semantics.

## In the graphical editor

The **Workflows** view draws each workflow as its dependency DAG: trigger source
→(event, dashed)→ workflow → steps by dependency depth → completion event (green),
with roles and form pages orbiting the human steps. From the **palette**: *Workflow*,
*Paso de workflow* (drop it in the open and the only workflow adopts it; on a
workflow or one of its steps to chain it), *Join* and *Split* (born loose). The
gestures:

- **step → step** — declares the dependency (*B waits for A*).
- **actor ⇆ step** — the task becomes human (the role gets its worklist).
- **step ⇆ page** — the human task's **form**.
- **step/gateway links** — drawn like any line; the grammar validates them.
- **step → another workflow** — the hand-off.
- **Supr** deletes steps, dependencies, links, roles and forms (each edge knows what
  its deletion means); **F2** renames; everything is undoable.

## On the context map

Workflows are strategic elements too: the context map shows each one as a lilac
dashed node with derived edges — violet **«orquesta»** to every use case its steps
target, and amber **«dispara el workflow»** from its trigger event. Drag an event
onto the workflow to set its trigger; **workflow → workflow** chains them (A's
completion event becomes B's trigger). They also appear in the
[EventStorming view](/manual/graphical-editor/#views) as lilac policies.

## Runtime

The generator emits an **[EventConductor](https://eventconductor.mateu.io/) workflow
definition** per workflow — the engine drives the orchestration: events in, state
transitions, worklists, deadlines and compensations out. FORM and WIZARD pages also
emit an **EventConductor form definition**, which is how a human step's `formPageId`
becomes the form the task presents. The distribution level of the context map shows
both engines as infrastructure the deployed services lean on.

### Running them

When the model has workflows, the generated system runs them on **EventConductor's
orchestrator, as is** — a `procesos` service in `docker-compose.yml` (image
`miguelperezcolom/orchestrator-standalone-app`, pinned to the release modux targets;
`EC_ORCHESTRATOR_IMAGE` runs another build). Modux generates what the model says and
mounts it:

- `procesos/workflows/*.workflow.json` — the definitions, imported at start.
- `procesos/config/application.yaml` — the topic of every event a workflow starts on or
  waits for, and a connection to every service whose use cases its steps run.

The definition is translated so it runs on its own:

| In the model | In the engine |
|---|---|
| `triggerEvent` (+ `triggerCondition`, a JEXL expression over the event, its payload as `data`) | A **trigger** on the event's topic; the business key is the event's id field (`reservaId`) |
| A step with `targetUseCaseId` | An **HTTP_CALL** to the use case's REST endpoint (it gets one), as the system identity |
| A step with a `completionEventName` and nothing to run | A **WAIT_FOR_MESSAGE** on that event, correlated by the same id |
| `deadline` | A duration (`PT2H`) or a moment from the process data (`${fechaLimite}`) |
| `timeoutStepId` | Where the flow goes when the step runs out of time, instead of failing |

The engine calls the services as user **`sistema`** with role **`SISTEMA`**: a use case a
workflow runs lists `SISTEMA` among its roles. Its password comes from
`MODUX_SYSTEM_PASSWORD` (the services only create that user when it is set). Kafka
subscriptions and scheduled triggers act as the same identity.

A **business key** names the workflow and the thing the event is about
(`prepago-${data.reservaId}`): the engine keeps keys unique across workflows, and the same
thing can run again once its last run ended (`businessKeyPolicy: allowAfterFinished`).

**Exclusive splits** become the condition of each branch, checked right after the split's
source (a JEXL expression over the process variables — what a person submitted in a form
among them). A branch whose condition does not hold never starts; when nothing is left to
run, the process completes.

### People's tasks

A human step (a `roleId`) becomes a **USER_TASK**:

- `assignment.candidateGroups` is its role: the task lands on the worklist of everyone with it;
- with a `deadline` and an `escalationRoleId`, it is offered to that role too once the
  deadline passes;
- its `formPageId` is the form: the page's model, as an EventConductor form — what the
  person submits becomes process variables, named as the fields.

The system then also runs EventConductor's **forms app** (`formularios`, image
`forms-standalone-app`, `EC_FORMS_IMAGE`), with the forms generated into `procesos/forms`. It
is reached only through the gateway, at `/_forms` — the shell shows it as **Tareas** — and the
gateway tells it who is signed in: it verifies the system's login cookie and forwards that user
and their roles as a token (`IdentityBridge`), dropping whatever the browser sent.

A reply that arrives before a wait is armed is lost (the engine does not buffer messages). When
what is awaited happens outside the workflow, give the wait a `timeoutStepId` that **checks
the current state** (a use case) and branch on it, rather than acting directly on the timeout.

The engine's console answers at http://localhost:8105 (user `admin`, password
`EC_ADMIN_PASSWORD`): every process, its steps, its variables and its history.
