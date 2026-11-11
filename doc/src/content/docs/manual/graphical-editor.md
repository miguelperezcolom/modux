---
title: Graphical Editor Reference
description: Edit the model on a live canvas — context map, aggregates, flows, workflows, UI, mappings, integrations and EventStorming, on three surfaces (2D, 3D, Yugo), with every change saved to the spec
---

For a task-oriented walkthrough, start with the
[Graphical Editor Guide](/manual/graphical-editor-guide/); this page is the exhaustive
reference.

The **Graphical editor** page is a fully editable canvas over the model. It is not a
drawing tool with a save button: every gesture emits a command that mutates the spec
through the same use cases as the forms, and everything that changes the model is
undoable. Diagram geometry (positions, sizes, edge bends, each sheet's per-element
expansion) lives in the spec's own `diagrams` section — a separate structure that only
*references* elements by id, so coordinates never leak into the authored elements
themselves. Models saved before this section existed kept the geometry in a
`modux-editor-layout.json` file next to the store; it is still read as a fallback and
migrates into `diagrams` on the first change made in the editor. The page carries no
header of its own: the title lives discreetly in the editor toolbar (its tooltip
carries the subtitle) and the canvas takes the space.

## Views

| View | Shows | Extra semantics |
|---|---|---|
| **Mapa del sistema** | The whole landscape on ONE canvas, Archi style: every element is a **free box** (contexts, external systems, APIs, proxies, workflows, IdPs, actors, agents…) folded to a chip by default; the **chevron expands each one** and its children arrive as free boxes ringed around it, tied by a **composition edge** (grey line, filled diamond on the owner's side) — in cascade down to API operations. Strategic relations (solid, DDD abbreviations) and flows (dashed) ride on top | Flow colour = live coherence: green OK, amber missing relation, orange reversed. **Relations never hide**: an edge whose endpoint folded away re-anchors at the nearest visible ancestor (deduped, tooltip says so); edges internal to a folded box fold with it |
| **Distribución** | Its own specialized view (no longer a «level»): services, the modules they deploy and the infrastructure they lean on. A context with only its main module draws no module box (the deploy edge lands on the context itself); with a second module, expanding the context brings its modules AND its unassigned elements as free boxes — drag an element's handle to a module to package it, a service's handle to a module (or its context) to deploy it | Same Archi grammar: composition diamonds, per-element expansion, roll-up |
| **Agregados** | Aggregates coloured by their bounded context's subdomain, entities as satellites, cross-aggregate references | |
| **Flows** | Each flow as a pipeline: trigger aggregate → flow (coloured by archetype) → target | |
| **Workflows** | Each [workflow](/manual/workflows/) folds its steps by default (chevron); expanded, the steps are free boxes owned by it, laid as a dependency DAG: trigger source →(event)→ workflow → steps by dependency depth → completion event; **human steps** amber with their **role and form page orbiting them**; loose **join/split gateways** with their semantics badged | step→step declares the dependency; **actor⇆step** makes the task human; **step⇆page** sets its form; double click a gateway toggles semantics, double click an exclusive branch edits its condition |
| **UI** | The user interface, Mateu-shaped: apps (UiAdapter) as compact boxes whose **chevron unfolds the menu tree** — free rows glued in a stack under the box (order stays visual; the slot-drag reordering works as always), pages floating beside them, and each page's MVVM wiring — its viewmodel (a Model playing that role), the use cases behind its buttons and the query service feeding its listing; actors point at the apps they use | Palette creates apps — plain, **Orquestador** (keeps state and shows nothing of its own, only child pages) and **Maestro-detalle** (a header plus tabs, all of them pages: the first page dropped on it becomes the **header** — a «cabecera» edge, Supr unsets it — and the next ones its tabs) — plus pages, **CRUD** and **Wizard** shortcuts (pages born with that type) and menu entries (pages dropped **on an app** hang from its menu in the same gesture). **Data models** are first-class: every catalog model shows as a chip (the palette creates fresh ones), and wiring one to a page sets its **viewmodel**, to an app its **estado** — the state an orchestrator keeps and shares with its child pages; Supr on the chip deletes the model unlinking everyone (undo re-wires them). Selected nodes also offer **typed handles** (coloured drag points on the top edge): the green one on an app draws its **home** — a page or **another app** — (only plain apps have one: the master-detail is header+tabs and the orchestrator only shows child pages), the blue one on a master-detail (re)draws its **header**, a **CRUD** page offers two more — orange **detalle** (what opens a row) and teal **nuevo** (the new-record form), both reaching a page or an app of any archetype — and a **Vista-editor** app (an orchestrator pairing a read-only detail view with an edit view) offers **vista** and **edición** towards its two pages. A wizard's STEPS are the first-class thing: the palette drops bare steps on the wizard («Paso de wizard»), a page dropped on the wizard body becomes a new mapped step, and each step row **maps to its page by wiring** (drag the row's handle to a page, or drop a page on the row — remapping included; unmapped rows show ⌁). Rows list in numbered order — and the page designer's mockup shows the same steps on its wizard bar, **draggable to reorder them from there too**: **drag one between the drop slots to reorder** (undo puts it back), Supr on a row or on a «paso N» edge removes the step, and deleting a page unmaps its steps instead of losing them; the master-detail's tabs stay menu entries, reorderable the same way; drop a use case on a page for a toolbar button, a query service for the listing, an actor on an app to grant it; Supr on any of those edges undoes the wiring. **Menu entries move by dragging the row itself**: while it flies, **drop slots light up between the options of every app** — release on a slot to land exactly there, on another row's middle to nest under it (the target becomes a grouper), or on an app's end slot for its root — including **another app's** (the subtree travels whole, and undo puts it back in its slot). The connect handle offers the same moves |
| **Mapeados** | Every data model as a node and every **model mapping** as a labeled edge (source → target; field rules stay in its form). The view also derives the **mapping debt**: a page button calling a use case whose request model differs from the page's viewmodel draws an amber dashed «falta mapear» edge — **wire the two models** and the mapping is born (named Source2Target) and the debt disappears; Supr on a mapping edge deletes it (undoable) | Mappings are a constant of the model: screen→use case, event→command, ETL transforms — this is where they all become visible |
| **Page designer** *(inside the UI view)* | Double-click a page: a live **mockup inferred the Mateu way** — fields come from the viewmodel Model, their look from each field's config, the page shows its four zones — **header**, **toolbar** (top buttons), **content** and the **bottom bar** (closing actions, its own «+ botón») — plus a listing stub on CRUD pages. Nothing is drawn by hand: click a field to edit its **declaration** (stereotype, width, label) and the preview re-infers itself; drag fields to reorder (persisted as the fieldConfigs order); «Ficha» opens the page's full form | The designer is WYSIWYG over the MVVM: what you edit is the spec, never pixels. **UI-first composition**: the palette offers Mateu's full layout vocabulary (vertical, horizontal, form, split, tabs, accordion, card, grid, board, dashboard, master-detail, foldout, carousel, app) plus components (form, listing, button, field, text, metric, menu bar) — drop a layout on a frame, drop components inside (a tabLayout comes seeded with two tabs; **click a header to show and select that tab**, double click to configure it, **drag headers to reorder them**, and drops on the body land in the tab being shown — the palette also offers **Pestaña** to add tabs by dropping them on the tabLayout), **click selects** a node (Supr deletes it, subtree included — one undo restores it whole), **double click edits its declaration**, and **dragging the node moves it**: the top half of a component slots it before, the bottom half after (a blue bar opens the gap), a layout's body drops it inside — palette drops honor the same slots, a node never lands in its own subtree, and **dragging works across frames** (the node moves to the other page). **Ctrl+C / Ctrl+V** copies the selected subtree and pastes it under the current selection, on any frame. Catalog drops wire declarations: a **use case on a button** is its action (on the frame, a new toolbar button), a **model on a form or the frame** is the viewmodel (pages also offer a violet **viewmodel handle** on the UI view — draw it to a model; the designer shows the chip with a ✕ to unset, no dropdown), a **query operation on a listing or the frame** is what it lists. Empty content = the page stays fully inferred |
| **Integraciones** | Every **ETL flow** as a container with its pipeline unfolded — sources (pull/consumer) → transforms → writes (API/db/event) — plus the external systems (with their legacy tables), APIs and events it touches | Drop *Flujo ETL* from the palette (in the open it floats; its owner context is set in its ficha); wire a **table or API to the flow** for a source step, an **event to the flow** for a consumer, and **from the flow** outwards for writes |
| **EventStorming** | The whole causal narrative, derived from the model in classic sticky-note notation: actor → **command** (blue) → **aggregate** (yellow) → **event** (orange) → **policy** (lilac: subscription, flow, process, workflow or projection) → **read model** (green), external systems in pink, AI agents with their tools. Each command folds its pipeline steps (chevron); the CODE delegation thread re-anchors at the folded command | A read-only *lens* — you edit from the other views or the forms. Events referenced by name but not declared in the catalog render dashed («EVENTO (sin declarar)»): a built-in gap detector. Auto-layout orders the narrative |
| **Secuencias** | UML sequence diagrams over the catalog: participants as lifelines (actors, pages, API operations, use cases, aggregates, query services, read models, external systems…), numbered messages top to bottom — solid with filled head for **COMMAND**, italic for **QUERY**, open orange head for **EVENT** (async), slate for **EXTERNAL**. Not a canvas scene: its own surface, like the page designer | Two sources: **«Derivar de:»** computes an *ephemeral* read-only sequence from an entry point (a use case, an API operation or an event — steps walked in order, event consumers forked, cycles cut; 📌 *Fijar como secuencia* persists it), or an **authored** sequence you edit by hand: drop participants, drag lifeline → lifeline to draw a message (kind inferred), drag to reorder, double click edits label/guard/kind, Supr deletes. A message with no mechanism behind it shows **⚠ amber dashed**; its **✨ materialize** button creates the backing piece (a `CallUseCase` step, a query call, an emission + TRIGGERS flow, the API operation wiring…). The linter watches both ways: `interaction-message-without-backing` and `interaction-dangling-participant`. **⧉ Mermaid** copies the `sequenceDiagram` for the design doc. Also CRUD-able from *Modelo de dominio › Secuencias* and authorable over MCP (`interactions:` in the YAML) |

Boxes carry an ArchiMate-inspired glyph for their kind: component (contexts, external
systems), diamond (aggregates), class (entities), arrow (flows), chevron (processes),
person / gear (human / automated steps), double circle (events), return arrow
(compensations).

## Editing gestures

- **Drag** a box to move it (persisted per view). **Drag a process step across its
  siblings** to reorder the process — order and position undo together.
- **Click** selects; **double click opens the element's DETAIL** in **mateu's own
  drawer** over the diagram — read-only, no app chrome, no «back to list» (there is
  no listing to go back to). The editor only emits the event; the host page answers
  with a [Drawer](/manual/pages/) whose content is the element's view. Every drawn
  type has one (contexts, aggregates, workflows, pages, apps, actors, services,
  external systems, agents, RAGs, gateways MCP, ETLs, custom code…). Workflow steps
  open their owning workflow; invariants open their aggregate.
- **Strategic relations are 100% computed**: a context→context edge exists exactly
  where a concrete dependency does (use case calls, query calls, flows, aggregate
  references) — nothing is hand-drawn between contexts anymore. Unannotated pairs
  render dashed with a `?`; **double click** picks the DDD pattern (persisted as a
  type annotation in the project's contextMap), and Supr clears the annotation
  while the derived edge remains. The tooltip lists the concrete dependencies the
  relation derives from; annotations whose dependency disappears stop being painted.
- **Supr/Backspace** deletes the selection — relations, empty contexts, empty
  aggregates, domain events, flows, processes and steps. Integrity guards reject
  deleting a bounded context with aggregates or an aggregate with entities (server-checked
  too, shown as a toast).
- **F2** renames inline — on every surface (2D, 3D and Yugo).
- **A blank store bootstraps itself**: the palette opens by itself, and the first
  context dropped materializes the project and a service around it — the topology
  exists from gesture one.
- **Creation lives in the palette (☰, leftmost on the toolbar)** — it opens by
  itself on entering any view that has one (toggle with **P**). The panel has
  **vertical tabs on its right edge**: **Nuevos** (every creatable type — drag a
  new element onto the canvas, or onto its owner for child kinds: an aggregate
  onto its context, an operation onto its API, a step onto its workflow or use
  case) and **Catálogo** (every EXISTING element of the model, grouped by kind:
  drop one on empty canvas to place it, or on a node to connect them — the same
  gesture vocabulary as the handles). **Relations are never picked first**: you
  trace the line and, if the pair admits several typed meanings, it asks at the
  drop point («¿Qué relación es esta línea?»); between two bounded contexts it
  asks for the **DDD pattern** (or retypes a declared one); the unambiguous rest
  resolves as always. And when the pair means nothing to modux, **ArchiMate takes
  the last word**: all eleven relationship types (composition, aggregation,
  assignment, realization, serving, access, influence, association,
  specialization, triggering, flow) can be drawn between ANY two elements as
  documentation intent, rendered with their proper notation (diamonds, hollow
  triangles, open arrowheads, dotted and dashed lines); they also ride along at
  the bottom of every ambiguity picker. Double click opens the menu to **retype**
  one in place OR **↔ invert its direction** (source↔target — for the relations
  that read either way, like serving); Supr deletes it. The specialized views
  without a palette keep their
  toolbar creation: aggregates (with owner
  bounded context, plus a stub state model), flows (archetype, trigger aggregate, event,
  target) and processes; with a process or step selected you can append/insert
  steps (AUTOMATED or HUMAN with role and deadline) and edit the selected step's
  role, deadline and compensation.
- **Notifications & documents**: the palette (Dominio) drops a **Notificación** (pink — an event wired to it fires it, wiring it to an actor adds that role as recipient, the edge wearing the channel) or a **Documento/Informe** (slate — wire a query service/operation to feed a report, or drop a model from the Catálogo for a document template) on their owner context. See [Notifications](/manual/notifications/) and [Documents](/manual/documents/).
- **Identity providers**: the palette (Estratégico) creates an **IdP** (key glyph, amber; federated ones — published by an external system — draw dashed with a «publica» edge). Wire a bounded context to it («valida tokens de»), an ETL flow («identidad de servicio») or, on the UI view, an app («autentica con»); Supr un-trusts, deleting the IdP clears every edge. See [Identity & Security](/manual/identity/).
- **ETL integrators**: the palette (Orquestación) creates a **Flujo ETL** dropped **on the bounded context that owns it** (the consumer-side ACL, or the publisher of an outbound integration) — a teal chip nested in its context, whose data lines roll up to the context at the coarse level. Its steps are drawn by direction: wire an element **INTO the flow** and it becomes a source (a legacy table or an API = *pull*, an event = *consumer*); wire the flow **OUT to an element** and it becomes a write (an API operation, a table = *bd*, an event). Transform steps drop from the palette («Transformación ETL» — mapping or intent in its form), hidden edges roll up to the host system/context, and Supr on a data line removes the step behind it (undoable).
- **Emissions**: only aggregates and domain services emit DOMAIN events (their
  operations declare `emits`); use cases publish APPLICATION events (a
  `PublishApplicationEvent` step). Amber dashed arrows connect each emitter to its
  event, and they are drawn on the canvas: select the emitter and drag from a blue
  handle onto the event. Supr on the arrow removes the emission again.
- **Use case invocations**: drag from a use case onto another (in the same or another
  bounded context) to add a `CallUseCase` step to the caller — drawn as a cyan dashed
  arrow; Supr on the arrow removes the step. Cross-context calls are the seed for a
  gateway/API at generation time. Dragging onto a **query service** instead adds a
  `CallQueryService` step (teal dashed arrow), also across contexts. Query services
  and plain **use cases** are created from the palette like the other children.
- **External systems have a surface too**: give them **use cases** from the palette
  (the external node becomes a container) and drag from one of our use cases onto
  them to record a `CallExternalUseCase` step (slate dashed arrow — the seed of a
  derived gateway/API). Drag from the external system onto one of OUR use cases and
  the call comes in through an **INBOUND ACL** in the target bounded context (violet arrow).
- **External systems nest — subsystems**: a big partner is rarely one box. Drop
  «Sistema externo» from the palette **onto another system** and the newcomer is a
  **subsystem** — a full external system living inside it
  (`parentExternalSystemId`), with its own APIs, use cases and dependencies; the
  back-office form offers the same parent as a picker. **Shift+drag** re-nests an
  existing system onto another; onto empty canvas it un-nests, and nesting in a
  circle is refused with a clear message. Nesting **strips the dependency edges
  between the pair** — both directions, DEPENDS and CQRS — because containment
  replaces dependency; one undo restores parent, position and the stripped edges
  together. Subsystem chips show from the **coarse** form without forcing it (a
  system with only subsystems still folds compact); a subsystem's published APIs and
  proxies nest **inside its chip**, which grows with its content and accepts the
  corner-resize gesture even collapsed (the content sets the minimum), and at the
  operations level its APIs unfold as the parent's boxes do. Supr deletes a
  subsystem with the usual guards — a parent that still has subsystems refuses
  deletion — and dependencies can start or end at a subsystem like at
  any other system.
- **AI agents consume through MCP**: create an **AI agent** from the palette (robot
  glyph, outside every context) and drag it onto a use case — the consumption is
  recorded on the agent and the use case flips `exposedAsMcp: true` (the bounded
  context will expose it as an MCP tool). Removing the arrow clears the exposure
  when no other agent consumes it. An **Agente IA externo** (dashed) is someone
  else's agent: it enters through an **MCP gateway** instead (lint warns otherwise).
- **Events trigger use cases**: dragging a domain or application event onto a use
  case creates a **TRIGGERS flow** (subscription + CallUseCase + mapping derive at
  generation time); the arrow anchors on the event and the use case at the detail
  level.
- **Actors use things**: drag from an actor onto a **use case** or a **query
  service** to allow it (`Role.allowedUseCaseIds` / `allowedQueryServiceIds`, indigo
  arrow) — the seed of a derived UI. Drag onto an **aggregate** and the editor
  creates stub **CRUD use cases** (`Crear/Actualizar/Eliminar<Aggregate>`, with steps
  anchored to the aggregate and `exposedAsUi`) and allows the actor on all three;
  one undo reverts the whole thing.
- **Materializations drawn on the canvas**: at the detail level read models render as
  children too, and dragging a domain OR application event onto another context (or
  one of its read models) creates a **MATERIALIZES flow** — the projection/read
  model/subscription triple stays derived at generation time, per the flows intent
  layer. The trigger (aggregate, domain service, or the publishing use case for
  application events) is taken from the event's emission (the editor asks you to
  declare it first if missing), and the read model name defaults to `<Event>View`
  unless you dropped on an existing read model. At the detail level flow arrows anchor on the
  concrete pieces: the trigger event on the source side and the read model on the
  target side.
- **Policies**: the palette (at the map's detail level) also creates a **Policy** — a
  use case that expresses reaction/automation logic rather than a business case (see
  [Use Cases](/manual/use-cases/)). Policies keep every use-case gesture but wear the
  lilac chip on the map and the lilac POLICY sticky in the EventStorming view.
- **Projections drawn on the canvas**: drag from an **aggregate** onto a read model
  (or onto another context, where a stub read model is born) to declare a **state
  projection** — the aggregate's whole state materializes there, even cross-context
  (teal dashed arrow). The same gesture works from an **external system's operation**
  or from an **external table** — the classic *polling* integrations. See
  [Projections & Read Models](/manual/projections/#alternative-sources).
- **External tables**: external systems can declare the **tables/datasets** they own
  (amber chips inside the external container) — the pollable surface of a legacy
  system.
- **External MCP servers**: an external system can also publish an **MCP server**
  (lilac robot chip, dropped from the palette onto its owner system) — a whole tool
  surface agents consume directly (drag agent → chip) or through a gateway.
- **Published APIs are first-class**: an **API** (usually born from
  [importing a contract](/manual/importers/) with no target) is a top-level container
  with its operations as indigo chips. **Drag an operation onto the use case or
  policy that implements it** (fine wiring), or onto a **bounded context** (coarse) —
  the indigo dashed wire is the published surface mapped onto the domain. Supr on a
  wire unwires (the operation stays published, flagged by `api-operation-unwired`);
  APIs and operations are also creatable from the palette (an API is dropped onto
  the system or context that owns it), renamable and deletable.
- **API → bounded context: implements it or consumes it?**: tracing a line from a
  whole **API** (or a **proxy** fronting one) onto a **bounded context** carries two
  very different meanings, so the canvas asks instead of assuming. The picker offers
  **Implementación** (the context hosts/implements the API — an `api-impl` occurrence
  nests inside it, strangler style) and **Consumo (servidumbre)** (the context calls
  the API — a `serving` relation), on top of the full ArchiMate vocabulary. The
  serving relation always anchors to the **API itself, never its proxy** — even when
  you drew the line from the proxy. When an API is implemented in a context AND a
  proxy fronts it, the proxy's route to that implementation is drawn as a **faint,
  dotted, arrow-less line** — a *derived route*, deliberately distinct from any
  relation you drew, so it never reads as «the proxy serves the context».
- **The agent's whole tool surface is drawn**: drag an agent onto a use case (MCP),
  a **query service** (read tool), an **API operation**, an **external operation**,
  an **external MCP server**, an **MCP gateway** or **another agent** (delegation) —
  each arrow is one entry in the [connection matrix](/manual/ai-agents/#the-connection-matrix).
  Drag a **domain or application event onto an agent** and the event *triggers* it
  (a **reactive agent**, amber dashed arrow); drag an **actor onto an agent** and
  the person talks to it (a chat/supervision UI derives). Deleting an agent unlinks
  it everywhere, and one undo restores the agent *with* every link.
- **MCP gateways**: created from the palette (plug glyph, outside every context) —
  our component that aggregates external MCP servers and exposes APIs, single
  operations, use cases and RAGs as one MCP endpoint. Drag the gateway's handle onto
  whatever it exposes (violet dashed arrows); external agents consume the gateway,
  not the internals. See [AI Agents, MCP Gateways & RAGs](/manual/ai-agents/).
- **RAGs**: created from the palette (lens glyph, outside every context); drag an
  agent onto a RAG (the knowledge it grounds on), drag a RAG onto a **read model**
  to declare it indexes it, and use the **＋ Fuente** toolbar (with the RAG selected)
  to add external content sources — a repo, a web site, an FTP server — drawn as
  small satellites.
- **Workflow editing**: create workflows from their view (trigger aggregate + event);
  with the workflow or a step selected the toolbar adds steps (name, target use
  case, the event the workflow *emits* to start it and the one it *awaits*); drag a
  handle from one step onto another to add a dependency — Supr on the dependency
  arrow removes it, and undo/redo restore steps *with* their dependants' links.
- **Ctrl+Z / Ctrl+Shift+Z** undo and redo — model commands and node moves share one
  history, with composite entries where one gesture caused both.

## Lines

Lines are **orthogonal** — horizontal and vertical segments only, never a diagonal cut
across a corner — and they route **around the node boxes** instead of over them. **✨
Auto-layout** hands the whole view to ELK, which places the nodes AND threads every
edge through the gaps between the boxes so the lines neither overlap nor cross a box;
those routes are kept with the layout. Elsewhere — a line the layout didn't route, an
edge you just drew, a node you dragged — the canvas re-routes on the fly: a line that
would run over a box slides its channel into the nearest gap (above/below or
left/right), recomputed on every render so it follows the drag; a line whose straight
orthogonal path is already clear is drawn as-is. With an edge selected, **dragging it
splits the line** into an adjustable bend point, and from that moment **the edge is
yours**: the router respects the hand's decision and leaves it alone. Bend points drag
freely; **double click (or Supr) removes one**, and removing the LAST bend **pins the
edge straight** — the empty route persists as a decision of its own, so the router
doesn't fall back to automatic detours. Deleting a relation takes its bends with it, so
a recreated relation is born with default routing; **✨ Auto-layout** clears every
hand-placed bend (one undo brings them back), so the whole view re-routes fresh. Where
lines still cross, the one drawn later **hops over with a small bridge arc**, so dense
maps stay readable.

## Layout & navigation

- **✨ Auto-layout** re-lays the current view with ELK's layered algorithm — nodes AND
  their orthogonal edge routes. Maps keep their canonical left→right meaning (driving
  side left, domain centre, driven side right) by feeding ELK one lane per semantic
  rank; flows and processes layer freely along the pipeline. One undo step brings
  everything back. **With a selection it is scoped** — «✨ Auto-layout (N)» rearranges
  only the selected top-level nodes, translated to keep their centroid in place so the
  rest of the sheet stays put; edges straddling the selection re-route live.
- **A sheet nobody has placed opens already laid out.** A model written by hand or from
  a spec carries no geometry; the first time such a view is shown on the canvas, ELK
  arranges it the same way (no overlapping boxes, orthogonal lines, crossings
  minimised) and the result is stored as the view's geometry — in the IDE it is part of
  the document you save. It is not an undo step. Once any box of the view has a stored
  position the sheet is yours: new elements land where the view puts them, and nothing
  else moves until you press ✨ Auto-layout.
- **↻ Líneas** re-routes the edges **without moving any node** — the companion to
  auto-layout for a hand-placed sheet. It drops the stored routes so the canvas redraws
  each line clean and orthogonal on the current positions and keeps them live (they
  follow later drags). A selection scopes it to the lines touching those nodes; undoable.
- **↔ Alinear / ↕ Alinear** (shown with two or more nodes selected) line the selection
  up on a shared axis — «↔» a common Y (a row), «↕» a common X (a column) — snapping to
  the selection's centroid so it moves the least; the moved nodes' lines re-route.
  One undoable step.
- **⌖ Ajustar** fits the diagram to the window; the **minimap** (bottom-right) shows
  the whole scene and recenters on click or drag; **mouse wheel** zooms; **hold
  space** to pan from anywhere.
- **Hover spotlights a node's neighbourhood**: pointing at a node keeps it, the nodes
  one edge away and their connecting lines at full strength and **fades everything
  else back**, so on a dense map you see at a glance what talks to what. A node's
  container and its nested chips ride along. It steps aside during any drag.
- **⛶ (or F) takes the diagram fullscreen** — the whole editor, toolbar and palette
  included, via the browser's Fullscreen API; **Esc** (or F again) comes back.
- **⬦ 3D (or V) tilts the diagram** — the Firefox-Tilt view of the model: the same
  scene rendered as stacked plates where **containment depth becomes height** (a
  bounded context is the base plate, its aggregates, use cases and events float one
  storey above, an API's operations one more). Edges fly **at their nodes' heights**
  — a line between storeys climbs in 3D — with a faint shadow on the floor as the
  depth cue. And it is **interactive**: click selects (same selection as the canvas),
  **double click opens the element's editor**, **dragging a plate moves it** (the
  pointer delta is unprojected onto the floor plane; persisted and undoable), and
  **Supr deletes** with the usual integrity guards. The **connect gesture works in 3D
  too**: the selected plate offers the same blue handles as the canvas — drag one onto
  another plate (a screen-space rubber line follows) and the shell applies the same
  gesture vocabulary; while tracing, the plate under the pointer **reacts**: it grows,
  lifts a storey and rings green (the 2D canvas nodes grow on hover during tracing as
  well). The **palette works in 3D too**: open it with ☰/P and drag a new type or a
  catalog element onto the floor — the drop point is unprojected onto the ground
  plane exactly, and dropping onto a plate connects, same as in 2D. The pointer grammar
  is the same as every surface: **plain background drag lassoes a multi-selection**
  (Supr deletes it, F2 renames a single pick), **alt+drag orbits** (the gesture 3D
  adds, not the one it replaces), shift / space / middle button pan, wheel zooms,
  double click on the background resets the camera. Press V again to come back to
  the 2D canvas. Pure CSS 3D, works on any view and detail level.

- **∿ Yugo (or Y)** renders the current view as a **living organism** — the same
  scene as a radial tree with a spring simulation (springs + repulsion, gentle
  breathing, honoring `prefers-reduced-motion`). **Click selects and unfolds** a
  node (collapsed hubs badge how much they hold), **alt+click isolates** what
  relates to it, hover reveals its **cross-relations as dashed threads** («Hilos»
  pins them all), **double click opens the ficha**, **shift+drag from a node draws
  a relation** (with the active view's meaning), **plain background drag lassoes a
  selection**, **space+drag pans**, Supr deletes, F2 renames with an input riding
  the node, Ctrl+Z undoes. The **search box** flies the camera to any element,
  unfolding the path; the **levels slider** controls the unfold depth — it
  **adjusts itself when the view or detail level changes** (what matters at that
  level goes on stage by itself), and **touching it is a preference for THAT
  view+level only**, restored when you come back; the **motion slider** calms the
  physics; **⊞ Vista…** creates
  a [curated view](/manual/views-and-large-models/) from the selection (or from
  everything unfolded). 2D, 3D and Yugo are **interchangeable surfaces over the
  same view**: the view decides *what* is on stage, the detail level *which theme*,
  the surface only *how it looks*.

The editor follows **mateu's dark mode**: the same `theme="dark"` flag (persisted as
`mateu-theme`), switched live from the top bar — hue-preserving, so a CORE context
stays amber in the dark.

## Keyboard shortcuts

Press **?** anywhere on the canvas for the cheatsheet. The highlights: **P** palette ·
**F** fullscreen · **0** fit · **+/−** zoom · **1** the system map · **2** sequences ·
**4** the distribution view ·
**5/6/7/8/9** the specialized views (flows · processes · workflows · UI · design) ·
**A** the aggregates view · **E** EventStorming · **V** the 3D tilt view · **Y** the Yugo surface · **T** the view's catalog
tree · plus the editing keys (Supr, F2, Ctrl+Z / Ctrl+Y, space+drag, shift for
multi-selection) — the same on every surface. Shortcuts never fire while typing in
a field.

## Selections and views

A **single click** selects one element; **Shift+click** accumulates a
multi-selection; **shift+drag** on the background draws a rubber band. With one or
more elements selected, **⊞ Vista (N)** (N = how many members the selection maps to)
creates a **CURATED view** (see
[Views & Large Models](/manual/views-and-large-models/)) whose members are the
selected catalog elements — a selection that maps to no member (an edge, a note)
makes none. The **Vista:** selector scopes the canvas to one view's
members — relations and flows appear when both endpoints are in, entities follow
their aggregates. **Each vista is a full sheet of its own**: geometry AND
per-element expansion live under the vista's key, seeded from whatever you were
looking at when you activated it; «todo el modelo» keeps the base sheet. Without
a selection, **⊞ Vista** captures everything visible on screen, inheriting the
current sheet.

With a view active, the canvas scopes to the view's members — contexts, external
systems, aggregates, flows, processes, workflows, **and the strategic/AI pieces too**
(actors, AI agents, MCP gateways, RAGs, APIs), so a curated slice does not drag every
agent along. Three ways to maintain the membership, none of which ever deletes the
element from the project:

- **«☰ Árbol»** opens the **catalog tree**: every element of the project grouped by
  kind (aggregates nested under their context), with a **membership checkbox** —
  check to include it in the view, uncheck to take it out. Greyed rows ride in
  implicitly because their container is a member. Membership changes are undoable.
- **«Añadir a la vista…»** searches the same catalog by name and adds one element.
- **Supr on a member asks**: *delete the element from the model, or only take it out
  of this view?* — removing from the view never touches the element itself.

## System and solutions

The **Modelo:** bar above the canvas shows the model being edited — the **system**
(the as-is, badge AS-IS) or a **solution** (a to-be proposal, badge TO-BE) — see
[System & Solutions](/manual/solutions/). **Switching lives in the app header**: the
«Modelo» application context, next to «Repositorio» and «Proyecto», works from every
page. The bar keeps what is editor-specific: «＋ Nueva solución…» branches from the
system, and on a solution the lifecycle actions (Proponer, Actualizar del sistema,
Mergear, Descartar) plus the live **semantic diff** against the system: a dashed
**green ring** marks elements that only exist in the solution, a dashed **amber
ring** the modified ones, and the `＋n ～n −n` badge summarizes the change set
(removed elements are listed in its tooltip).

## Live updates

The server pushes a fingerprint of the store over SSE; when the model changes from
anywhere else — the form editors, the [MCP server](/manual/mcp-authoring/), another
browser — the canvas reloads within a couple of seconds and shows an info toast. The
local undo history is discarded on external changes, since its inverses no longer
describe the model. This reaches across processes too: the backend watches the store
on disk, so a write from an agent's own MCP server, a `git pull` on the checkout or
a hand edit in the IDE reloads the catalog and lands on every open canvas through
the same channel — see [the live store](/manual/mcp-authoring/#the-live-store).

## Under the hood

The editor is a standalone Lit web component (`editor/` in the repo) embedded through
a Mateu `Element` with the `import` attribute; it talks to `/modux/editor` (model
projection in, commands and layout out). The canvas engine is semantics-free — each
view is a pure *model → scene* adapter, so new diagram kinds are small additions.
