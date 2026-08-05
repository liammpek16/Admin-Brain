---
name: metrics
description: Computes today's metric snapshot from the current vault state and writes it to vault/Metrics/<YYYY-MM-DD>.md. Use when the user asks for "metrics", a daily numbers pull, or a portfolio snapshot, or before running trends. Counts active and blocked projects, average progress across active projects, open inbox items, health green/yellow/red, and a best-effort tasks-done-today. Idempotent — re-running the same day updates that day's snapshot instead of duplicating it.
---

# metrics

Pulls the numbers. Reads every project and inbox note, computes the daily metric
snapshot defined in `docs/DATA-CONTRACT.md` (section 2), and writes one file per
day under `vault/Metrics/`. The trends skill later reads the series of these
files.

## When to use

- The HUD "metrics" command or the user asks for today's numbers.
- Start of day, or any time project/inbox state changed and you want a fresh snapshot.
- Immediately before running the trends skill (trends needs snapshots to exist).

## What it computes (all keys always present, 0 if unknown)

- `projects_active` — projects with `status: active`.
- `projects_blocked` — projects with `status: blocked`.
- `avg_progress` — mean `progress` across active projects, rounded to an integer.
- `inbox_count` — inbox notes with `status: open`.
- `tasks_done_today` — **best-effort**: count of `## Log` bullet lines across all
  project notes whose leading date equals the snapshot date (a line like
  `- 2026-08-05 — did the thing`). This is the documented heuristic; there is no
  separate task store in the vault, so completed work is inferred from project
  Log entries dated today.
- `health_green` / `health_yellow` / `health_red` — counts of each `health` value
  across all live projects (status not `done`/`archived`).

The existing `custom:` block (e.g. `revenue_mtd`) is preserved across re-runs.

## Procedure

1. Ensure project and inbox notes are current.
2. Run the helper (below). It uses the vault skill's helper for all reads/writes.
3. It writes/updates `vault/Metrics/<date>.md`. Re-running the same day updates in
   place (idempotent) — no duplicate files.
4. Inspect the printed JSON to confirm the numbers look right.

## Helper — `metrics.js`

```bash
# From skills/metrics/
node metrics.js                 # snapshot for today (local date)
node metrics.js 2026-08-05      # snapshot for a specific date
node metrics.js --dry           # print computed metrics without writing
```

## Usage example

```bash
$ node metrics.js
Updated snapshot 2026-08-05
  -> C:\Users\liamm\Admin-Brain\vault\Metrics\2026-08-05.md
{
  "projects_active": 2,
  "projects_blocked": 0,
  "avg_progress": 45,
  "inbox_count": 2,
  "tasks_done_today": 1,
  "health_green": 1,
  "health_yellow": 1,
  "health_red": 0
}
```
