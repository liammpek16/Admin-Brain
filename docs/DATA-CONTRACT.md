# Admin Brain — Data Contract

**This file is the shared agreement between the vault, the skills, and the HUD.**
Every component reads and writes notes in these exact shapes. Do not change a field
name or enum value without updating this file and every consumer.

All notes are Markdown with YAML frontmatter. Dates are ISO `YYYY-MM-DD`.
Datetimes are ISO 8601 `YYYY-MM-DDTHH:mm` (local). Enums are lowercase.

---

## 1. Project note — `vault/Projects/<Name>.md`

One file per project. This is the heart of the system.

```yaml
---
type: project
name: Admin Brain            # human name (should match filename)
status: active               # active | paused | blocked | done | archived
health: green                # green | yellow | red
progress: 40                 # integer 0–100 (percent complete)
priority: high               # low | med | high
tags: [dev, tooling]         # freeform list
started: 2026-08-01
updated: 2026-08-05           # last time this note was touched
next: "Ship HUD v1"          # single next action, one line
owner: me
links: []                    # related URLs / repos
---

## Summary
Short prose description.

## Now
- current focus bullets

## Blockers
- anything blocking (drives health=red/blocked)

## Log
- 2026-08-05 — note of what changed
```

**HUD reads:** `name, status, health, progress, priority, next, updated`.
**Skills write:** any field; must bump `updated` on every change.

---

## 2. Metric snapshot — `vault/Metrics/<YYYY-MM-DD>.md`

Append-only daily numeric snapshot. One file per day. The metrics skill writes it;
the trends skill reads the series across files.

```yaml
---
type: metric-snapshot
date: 2026-08-05
metrics:
  projects_active: 4
  projects_blocked: 1
  avg_progress: 37          # mean progress across active projects
  inbox_count: 6            # unresolved inbox items
  tasks_done_today: 3
  health_green: 2
  health_yellow: 1
  health_red: 1
# `custom` holds any project-specific numbers, keyed freely:
custom:
  revenue_mtd: 0
---
```

**Contract:** keys under `metrics` are stable and always present (0 if unknown).
`custom` is open-ended. Trends skill treats every numeric key as a time series.

---

## 3. Inbox item — `vault/Inbox/<slug>.md`

Quick captures awaiting triage. The inbox skill surfaces these in the morning brief.

```yaml
---
type: inbox
created: 2026-08-05T08:14
status: open                 # open | triaged | done
project: ""                  # optional link to a project name
urgency: normal              # low | normal | high
---
Raw captured text goes here.
```

---

## 4. Daily note / morning brief — `vault/Daily/<YYYY-MM-DD>.md`

```yaml
---
type: daily
date: 2026-08-05
brief_generated: 2026-08-05T07:00
---

## Morning Brief
(generated prose — produced by the inbox skill)

## Focus today
- top 3

## Notes
```

---

## 5. Trend report — `vault/Trends/<YYYY-MM-DD>-<metric>.md`

```yaml
---
type: trend
date: 2026-08-05
metric: avg_progress
window_days: 14
direction: up                # up | down | flat
change_pct: 12
---
Prose analysis of the trend.
```

---

## 6. Plan — `vault/Plans/<slug>.md`

```yaml
---
type: plan
created: 2026-08-05
project: "Admin Brain"
horizon: week                # day | week | month | quarter
status: draft                # draft | active | done
---

## Goal

## Steps
- [ ] step one
- [ ] step two

## Risks
```

---

## HUD live-data endpoint contract

The HUD reads the vault. It expects a JSON shape (produced by a vault reader — a
small Node script the HUD track owns, or the vault skill) like:

```json
{
  "generated": "2026-08-05T07:00:00",
  "projects": [
    { "name": "Admin Brain", "status": "active", "health": "green",
      "progress": 40, "priority": "high", "next": "Ship HUD v1",
      "updated": "2026-08-05" }
  ],
  "metrics": { "projects_active": 4, "avg_progress": 37, "inbox_count": 6 },
  "inbox": [ { "text": "…", "urgency": "high", "created": "2026-08-05T08:14" } ]
}
```

Field names here mirror the frontmatter above exactly. Keep them in sync.
