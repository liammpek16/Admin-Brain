---
type: dashboard
updated: 2026-08-06
---

# 📊 Projects Dashboard (Dataview)

> Renders once the **Dataview** community plugin is installed & enabled.
> If you prefer a no-plugin option, use `Projects.base` (core Obsidian Bases) instead.

## All projects

```dataview
TABLE status, health, priority, next, updated
FROM "Projects"
WHERE type = "project"
SORT priority ASC, updated DESC
```

## Needs attention (active, not green)

```dataview
TABLE health, priority, next
FROM "Projects"
WHERE type = "project" AND status = "active" AND health != "green"
```

## Not started yet

```dataview
LIST next
FROM "Projects"
WHERE type = "project" AND status = "planned"
```
