---
title: AI Agents, MCP Gateways & RAGs
description: The whole AI layer — internal and external agents, their tools, MCP gateways, knowledge bases and reactive triggers
---

An **AI agent** is a first-class element of the model, at the same level as the
bounded contexts: an *automated consumer* of the system. Agents come in two kinds:

- **Internal agents** — ours. They act through tools, ground on knowledge, delegate
  to other agents, and can be *triggered by events*.
- **External agents** (`external: true`) — someone else's (a partner's copilot, a
  customer-facing assistant). They never touch internal elements directly: they enter
  through an **MCP gateway**, which curates and protects the surface they see.

```
  actor (person) ─────────▶ AI agent            event ──────▶ AI agent (reactive)
                               │
        ┌── tools ────────────┼──────────────────────────────────────┐
        ▼                     ▼                                      ▼
   use case (MCP)    query service · API or operation      external operation · MCP server
                     (real or proxy)                                 │
                              ├── delegates ──▶ another agent
                              └── knowledge ──▶ RAG ◀── read models · external tables ·
                                                        APIs · repos, webs, SharePoint…

  external AI agent ───▶ MCP gateway ───▶ MCP servers · APIs · operations · use cases · RAGs
```

## The connection matrix

| From | To | Declared as | Meaning |
|---|---|---|---|
| Actor | AI agent | `RoleEntity.aiAgentIds` | The person talks to the agent — a chat/supervision UI derives from it |
| Domain/application event | AI agent | `reactsToEventIds` | **Reactive agent**: the event triggers a run of it |
| AI agent | Use case | `allowedUseCaseIds` (flips `exposedAsMcp`) | Action tool, consumed through MCP |
| AI agent | Query service | `allowedQueryServiceIds` | Read tool |
| AI agent | API operation | `allowedApiOperationIds` | A published operation as a tool |
| AI agent | **Whole API — real or [proxy](/manual/graphical-editor/)** | `allowedApiIds` | Every operation of it, present and future, as tools |
| AI agent | External operation | `allowedExternalUseCaseIds` | Partner functionality as a tool |
| AI agent | External MCP server | `allowedMcpServerIds` | A whole external tool surface |
| AI agent | MCP gateway | `mcpGatewayIds` | One curated tool surface |
| AI agent | AI agent | `delegateAgentIds` | Delegation (agent-to-agent) |
| AI agent | RAG | `ragIds` | Knowledge: grounding before acting |
| MCP gateway | MCP server / API / operation / use case / RAG | `mcpServerIds` / `apiIds` / `apiOperationIds` / `useCaseIds` / `ragIds` | What the gateway aggregates and exposes |
| RAG | Read model | `sourceReadModelIds` | The domain projecting itself into an index |
| RAG | External system's table | `sourceExternalTableIds` | Structured legacy content, indexed in place |
| RAG | API — real or proxy | `sourceApiIds` | Content obtained by calling the contract |
| RAG | External system / bounded context | `sourceExternalSystemIds` / `sourceBoundedContextIds` | Coarse source: everything it owns |
| RAG | External content | `contentSources` (type + URI) | Unstructured content the RAG crawls |

## Agents

Create an agent from the context map's palette — **Agente IA** (internal) or
**Agente IA externo** (external, drawn dashed). Then drag its handle onto any tool,
another agent (delegation) or a RAG; every arrow above is a gesture, and Supr on the
arrow removes the link. API **proxies** count as APIs everywhere: dragging the agent
onto a proxy declares the same consumption, through the fronting system.

Deletion is symmetric by policy: **deleting an agent takes its links with it**, and
**deleting a tool** (an API, a proxy, an operation) **unlinks the agents** that
consumed it — never a dangling reference, never a blocked delete.

Lint keeps the layer honest:

- `agent-without-tools` (INFO) — an agent with no tool at all cannot act.
- `external-agent-direct-tools` (WARNING) — an external agent wired to internal
  elements directly; it should consume through an MCP gateway.
- `agent-delegation-cycle` (WARNING) — a delegation loop: the agent ends up
  delegating to itself.

## MCP gateways

An **MCP gateway** is *our platform component* that aggregates tool surfaces and
re-exposes them as one MCP endpoint:

- **aggregates** external MCP servers (published by external systems);
- **exposes** published APIs (whole, or single operations), use cases, and RAGs
  (retrieval as a tool).

It is the front door for external agents — and a convenient single surface for
internal ones. Create it from the palette (plug glyph) and drag its handle onto
whatever it should expose. `mcp-gateway-empty` (INFO) flags a gateway that exposes
nothing. How it is deployed and authenticated is a generation-time decision.

## Reactive agents

Dragging a **domain or application event onto an agent** declares that the event
triggers a run of it (`reactsToEventIds`): the agent stops being a purely passive
tool-holder and becomes an event consumer — triage an incident when `PagoRechazado`
arrives, draft an answer when `ReclamacionCreada` lands. The run's identity and
guardrails are a later decision; the model declares the reaction.

## RAGs

A **RAG** is a knowledge base an agent retrieves from. It declares *what it indexes*;
the pipeline (embeddings, chunking, refresh) is a later decision. Sources come in two
families — **structured** (elements of the map, declared as relations) and
**unstructured** (typed URIs):

| Source | Declared as | Gesture |
|---|---|---|
| **Read models** | `sourceReadModelIds` — the domain projecting itself into an index | Drag the RAG onto a read model |
| **External systems' tables** | `sourceExternalTableIds` — structured legacy content | Drag the RAG onto the table chip |
| **APIs (real or proxy)** | `sourceApiIds` — content obtained by calling the contract | Drag the RAG onto the API or proxy |
| **Whole external systems / contexts** | `sourceExternalSystemIds` / `sourceBoundedContextIds` — coarse: everything they own | Drag the RAG onto the system or the context |
| **External content** | `contentSources` — a typed URI | Select the RAG and use the **＋ Fuente** toolbar (type + URI) |

The curated type catalog for external content: `WEB`, `REPO`, `FTP`, `DATABASE`,
`BUCKET`, `SHAREPOINT`, `CONFLUENCE`, `DRIVE`, `FILESYSTEM`, `TICKETING`, `CRM` — the
field stays free-form in the meta-model on purpose, so an unforeseen kind can be
declared in the model's YAML without waiting for a release. Prefer the structured
relation over a URI whenever the source already exists on the map: the relation
survives renames, feeds the diff, and says *what* is indexed, not just *where*.

Content sources hang from the RAG as small dashed satellites on the context map;
structured sources draw teal «indexa» edges (a table hidden at the coarse level rolls
up to its system). Supr on a satellite or an edge removes that source; deleting the
read model, table, API or proxy unlinks the RAG automatically. Because read models
are kept fresh by [projections](/manual/projections/), a RAG fed from read models
knows exactly which events should refresh its index. A RAG exposed through an MCP
gateway serves retrieval to external agents too.

The `rag-orphan` lint rule flags a knowledge base no agent queries.

## In the EventStorming view

Agents with tools or knowledge join the narrative: agent → the commands it consumes
(MCP), agent → external systems (labelled with the operation or the MCP server), and
agent → RAG ← the read models feeding it.
