---
title: Search
description: Finding any element of the model — by name in the graphical editor, by any line of its YAML in your IDE
---

The model is a directory of YAML files, one per element, so finding something in it is
finding text in your repository.

## By name: the editor's explorer

The graphical editor opens on the **radial explorer**, whose search box («Search the
model…») matches element **names** as you type — accents and case aside, two characters
at least — and offers up to eight hits, each with the path that disambiguates it
(«Catalog › Book»). Pick one and the explorer expands the path to it and flies there.

## By content: your IDE or `grep`

To find an element by **anything it says** — its id, a field name, an invariant, a step
intent, a description — search the model directory the way you search code:

```bash
grep -rn "withdrawn" modux/
```

or *Find in Files* in the IDE, scoped to the model directory. A hit's file name is the
element's id (`aggregates/agg-book.yaml`) and its directory is the element's type, so the
result already says *what* matched as well as *why*.

The same goes for AI agents: they search the model with the tools they already use on the
code, which is why the [authoring skill](/getting-started/yaml-editing/#authoring-with-an-ai-agent)
needs no search tool of its own.
