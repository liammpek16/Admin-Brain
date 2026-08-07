# Admin Brain — Data Contract

The shared schema every component agrees on. All notes are Markdown + YAML frontmatter.
Dates are ISO `YYYY-MM-DD`. Enums are lowercase. **Human-owned fields are few; the rest
is derived** (per `plan.md` §2).

## Project note — `vault/Projects/<Name>.md`

```yaml
---
type: project
name: Dota Coach          # display name (should match filename)
status: active            # active | planned | paused | blocked | done | archived
health: green             # green | yellow | red | gray   (HUMAN)
priority: high            # high | med | low                (HUMAN)
next: "one-line next action"                                # (HUMAN)
started: 2026-08-06       # optional
updated: 2026-08-06       # bumped on edit; also derivable
tags: [gaming]            # freeform
repo: ""                  # optional git path/URL → enables git-derived recency
---
```

- **Human sets:** `health`, `priority`, `next` (and `status` for now).
- **Derived:** `lastActivity` / `daysSince` — from the note's file mtime, or from the
  last commit in `repo` when set (via `simple-git`). `updated` is a display fallback.

## Derived project object (what the accessor returns)

`skills/vault/vault.js#getProjects()` returns, per project:

```js
{ name, status, health, priority, next, updated, repo,
  activitySource: "git" | "note",   // where recency came from
  lastActivity: "YYYY-MM-DD",
  daysSince: <integer> }
```

The `brief` command renders this. Later components (metrics/trends/inbox/plan) will add
their own note types to this contract — those schemas are defined when built (Phase 2+).
