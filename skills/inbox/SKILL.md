---
name: inbox
description: Generates the Morning Brief and writes it to vault/Daily/<YYYY-MM-DD>.md. Use when the user asks for a "brief", "morning brief", or "what should I focus on today". Reads open inbox items, project statuses, and the latest metric snapshot, then produces a prose brief, a top-3 focus list, and a "needs attention" list of blocked projects and high-urgency captures. Idempotent — re-running the same day overwrites that day's brief.
---

# inbox

Turns the current vault state into an actionable morning brief. It surfaces what
is waiting in the Inbox, which projects are at risk, and what the top three
focuses should be — written into the daily note (`docs/DATA-CONTRACT.md`
section 4).

## When to use

- The HUD "brief" command, or the user asks what to work on today.
- Start of day after running the metrics skill (the brief cites the latest snapshot).

## What it assembles the brief from

- **Open inbox items** — `type: inbox`, `status: open`, sorted by urgency.
- **Project statuses** — active projects (sorted by priority) and their `next`
  action; blocked / health-red projects.
- **Latest metric snapshot** — the most recent `vault/Metrics/*.md` on or before
  the brief date, for the headline numbers.

From these it derives:

- **Morning Brief** (prose): counts of active/open/blocked, portfolio health and
  average progress, which projects need attention, and how many high-urgency
  captures await triage.
- **Focus today** (top 3): high-urgency inbox triage first, then unblocking
  blocked projects, then the highest-priority active projects' next actions.
- **Needs attention**: blocked / health-red projects and high-urgency inbox items.

## Procedure

1. Run the metrics skill first so the latest snapshot reflects today (optional but
   recommended — the brief still works from projects/inbox alone).
2. Run the helper (below). It reuses the vault skill's helper for all reads/writes.
3. It writes `vault/Daily/<date>.md` with `type: daily` and a `brief_generated`
   timestamp. Re-running the same day overwrites it (idempotent).
4. Optionally enrich the `## Notes` section by hand; re-running regenerates the
   Brief/Focus/Needs-attention sections, so add durable notes elsewhere.

## Helper — `inbox.js`

```bash
# From skills/inbox/
node inbox.js                 # brief for today
node inbox.js 2026-08-05      # brief for a specific date
node inbox.js --data          # print assembled source JSON without writing
```

## Usage example

```bash
$ node inbox.js
Created daily brief 2026-08-05
  -> C:\Users\liamm\Admin-Brain\vault\Daily\2026-08-05.md
---
type: daily
date: 2026-08-05
brief_generated: "2026-08-05T18:44"
---

## Morning Brief
Good morning. 2 active project(s), 2 open inbox item(s), 0 blocked. Portfolio
health: 1 green / 1 yellow / 0 red, average progress 45%. ...

## Focus today
- Triage: Parser regression on newest replay format — investigate ...
- Admin Brain: Wire skills to the vault and ship HUD v1
- Dota Analysis: Refresh match-parsing pipeline

## Needs attention
- [inbox·high] Parser regression on newest replay format ... (Dota Analysis)

## Notes
```
