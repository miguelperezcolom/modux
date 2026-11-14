---
title: Graphical Editor Guide
description: A hands-on walkthrough of the graphical editor — get around the canvas, add and wire elements, tidy the diagram, and carve focused views. Task by task, with links to the full reference.
---

This is a **task-oriented walkthrough** of the graphical editor: how to actually get
things done on the canvas. It is the friendly companion to the
[Graphical Editor reference](/manual/graphical-editor/), which documents every view
and gesture exhaustively — reach for that when you want the fine print.

The one idea to keep in mind: **the canvas edits the spec, not a drawing.** Every
gesture emits the same command a form would, so everything is validated and
**undoable**, and the positions live apart from your elements (in the spec's
`diagrams` section) — you never dirty the model just by tidying a diagram.

## Open the editor

Open the **Graphical editor** page. It fills the window — no header of its own; the
title sits in the toolbar. On first open you land on the **radial explorer**; switch
to a canvas with the **view selector** at the top-left (see [Pick a view](#pick-a-view)).

## Find your way around

- **Zoom** with the mouse wheel; **pan** by holding **space** and dragging (or drag
  the background where a view allows it).
- **⌖ Fit** fits the whole diagram to the window.
- The **minimap** (bottom-right) shows the entire scene — click or drag it to recenter.
- **⛶ (or `F`)** takes the diagram fullscreen; **Esc** (or `F` again) leaves.
- **Hover a node** to spotlight its neighbourhood: the node, everything one edge away
  and their connecting lines stay lit while the rest fades — the fastest way to read
  a dense map. The hover tooltip also shows the element's **description** (the free-text
  field you edit in its ficha), so you can read what a box means without opening it.

### Three surfaces

The same scene renders three ways; toggle them from the toolbar:

- **2D** — the flat canvas (the default), where all editing happens.
- **⬦ 3D (or `V`)** — the diagram tilted into stacked plates, height = containment
  depth. Interactive: click selects, double-click opens an element, drag moves a plate.
- **∿ Yugo** — the model as a foldable tree.

## Pick a view

The **view selector** (top-left) switches what the canvas draws. Each view is a lens
on the same model:

| To work on… | Choose |
|---|---|
| The whole landscape, contexts and their relations | **System map** |
| Services, modules and infrastructure | **Distribution** |
| Aggregates, entities and references | **Aggregates** |
| A flow's pipeline | **Flows** |
| A [workflow](/manual/workflows/) and its steps | **Workflows** |
| Apps, pages and their wiring | **UI** |
| Data models and their [mappings](/manual/model-mappings/) | **Mappings** |
| ETL integrations | **Integraciones** |
| The causal narrative (read-only) | **EventStorming** |
| UML sequences | **Sequences** |

Each view keeps **its own sheet** — positions and per-element expansion are
remembered per view. See the [reference](/manual/graphical-editor/#views) for exactly
what each one shows.

## Read the system map

On **System map** every element starts as a **chip**. Click its **chevron** to
expand it: its children arrive as free boxes tied back by a grey **composition edge**
(filled diamond on the owner's side), cascading down to API operations. Strategic
relations are solid lines with DDD abbreviations; flows are dashed. A relation whose
endpoint you fold away **re-anchors to the nearest visible ancestor** rather than
vanishing. Flow colour reads live **coherence** — green OK, amber a missing relation,
orange a reversed one.

## Add and wire elements

This is the heart of the editor. A few gestures cover most editing:

- **Add an element** — drag it from the **palette** onto the canvas. Dropping it *on*
  another element nests it where that makes sense (a page dropped on an app hangs from
  its menu, an aggregate on a context belongs to it).
- **Connect two elements** — select a node and drag its **blue handle** onto
  the target; on the map you then **pick the relation type**. Many nodes offer extra,
  colour-coded handles for typed links (an app's *home*, a CRUD page's *detail*/*new*…).
- **Rename** — press **`F2`** (or double-click the label on views where that edits text).
- **Retype a relation** — **double-click its label** to change the relation type.
- **Delete** — select and press **`Del`**. It removes the relation, or the empty
  element, with the usual integrity guards; deleting never silently loses wiring.
- **Undo / redo** — **`Ctrl+Z`** / **`Ctrl+Shift+Z`**, or the **Undo / Redo**
  buttons. Model changes and node moves share one history.

Press **`?`** at any time for the full shortcut list; the toolbar's footer also spells
out the gestures for the current view.

## Tidy the diagram

- **✨ Auto-layout** re-lays the current view with a proper graph algorithm — it places
  the nodes AND routes the lines **orthogonally** (horizontal/vertical) around the
  boxes, so the diagram reads like a wiring schematic. One **undo** brings back your
  previous arrangement.
- **Select first to scope it**: with elements selected, **✨ Auto-layout (N)** rearranges
  *only those* — kept where they are (their centroid doesn't move) so the rest of the
  diagram stays put. With nothing selected it re-lays the whole view.
- **A model with no geometry yet** (written by hand, or from a spec) needs none of this:
  the first time you open a view of it, it comes already laid out the same way.
- **↻ Lines** re-routes the **lines only**, on the current node positions — the
  companion for when you've placed the nodes yourself and just the lines look stale
  (e.g. after dragging a box). It moves nothing; it redraws each edge clean and
  orthogonal, and leaves them *live* so they follow later drags. A selection scopes it
  to that node's lines.
- **↔ Align / ↕ Align** line up the selected nodes (two or more): **↔** puts them
  on a shared row (same height), **↕** on a shared column (same vertical). They snap to
  the selection's centre so the group moves the least, and their lines re-route clean.
- Lines route around the boxes on their own as you drag; a line you **drag** splits into
  an adjustable bend point and becomes yours (the auto-router then leaves it alone).
- Node positions and bends are saved to the view's sheet automatically — no save button.

## Focus on a slice: curated views from a selection

Big models get busy. Carve a **curated view** that scopes the canvas to just the pieces
you care about:

1. **Select** what the view should contain — a **single click** picks one element,
   **Shift+click** adds more, or **shift+drag** the background to rubber-band a region.
2. A **⊞ View (N)** button appears in the toolbar — N is how many catalog members your
   selection maps to (a pure edge or note maps to none, and makes no view).
3. Type a **name** and press **Enter** (or click the button). The view is created and
   **opened**, seeded with the sheet you were looking at.

With no selection at all, **⊞ View** captures everything currently on screen instead.

Switch views with the **Vista:** selector; «todo el modelo» returns to the full model.
A view scopes the canvas to its members — relations and flows show when both endpoints
are in, entities follow their aggregates. Maintain membership from the **☰ Tree**
(tick elements in/out — it never deletes anything). Full details in
[Views & Large Models](/manual/views-and-large-models/).

## Design a page

On the **UI** view, **double-click a page** to open the **page designer**: a live
mockup inferred from the page's viewmodel. You edit *declarations* (a field's
stereotype, width, label; the layout), never pixels — the preview re-infers itself.
Drop layouts and components from the palette, wire a use case onto a button for its
action, a model for the viewmodel, a query for the listing. See [Pages](/manual/pages/).

## Trace a scenario

The **Sequences** view draws UML sequence diagrams over the catalog. Either **derive**
an ephemeral one from an entry point (a use case, API operation or event) and 📌 pin it,
or author one by hand: drop participants and drag lifeline → lifeline to draw messages.
A message with no mechanism behind it shows an amber warning with a **✨ materialize**
button that creates the backing piece. **⧉ Mermaid** copies it for a design doc.

## Everything is the spec

Nothing on the canvas is throw-away pixels. Elements and their wiring are real spec
changes (validated, undoable, visible in the forms and the YAML). Geometry — positions,
sizes, edge bends, each sheet's expansion — lives in the spec's `diagrams` section,
which only *references* elements by id, so coordinates never leak into the elements
themselves. Delete a diagram sheet and you lose only the layout, never the model.

---

**Next:** the [Graphical Editor reference](/manual/graphical-editor/) for the exhaustive
per-view details, or [Views & Large Models](/manual/views-and-large-models/) to go
deeper on curated views.
