---
name: trends
description: Detects trends across the series of metric snapshots in vault/Metrics/*.md and writes a report to vault/Trends/<YYYY-MM-DD>-<metric>.md. Use when the user asks about a "trend", "is X going up or down", or momentum over time for a metric. Computes direction (up/down/flat) and change_pct over a window (default 14 days) for a chosen metric (default avg_progress). Reports flat with an insufficient-data note when fewer than two snapshots fall in the window.
---

# trends

Reads the time series of daily metric snapshots and reports whether a metric is
rising, falling, or flat over a window. Output matches `docs/DATA-CONTRACT.md`
section 5.

## When to use

- The HUD "trends" command, or the user asks about momentum on a metric.
- After several days of metric snapshots exist and you want direction + magnitude.

## What it computes (dependency-free time-series math)

For a metric and a window of N days ending on the report date:

1. Collect snapshots whose `date` is within `[asOf - N, asOf]` and have the
   metric (checks `metrics` then `custom`).
2. `first` = earliest in window, `last` = latest in window.
3. `change_pct = round((last - first) / |first| * 100)`. If `first == 0`:
   0 when `last == 0`, else ±100.
4. `direction`: `flat` when `|change_pct| < 2`, else `up` / `down` by sign.
5. Fewer than 2 in-window points → `direction: flat` plus a prose
   "insufficient data" note (graceful, not an error).

## Procedure

1. Make sure metric snapshots exist for the window (run the metrics skill daily).
2. Run the helper with the metric and window you care about (below). It reuses the
   vault skill's helper for reading the series.
3. It writes `vault/Trends/<date>-<metric>.md` with `type: trend`, `direction`,
   and `change_pct`, plus prose analysis. Re-running updates that file.

## Helper — `trends.js`

```bash
# From skills/trends/
node trends.js                          # avg_progress over 14 days
node trends.js inbox_count 7            # metric + window (days)
node trends.js avg_progress 14 --dry    # compute, print JSON, don't write
```

## Usage example (seeded vault has one snapshot → insufficient data)

```bash
$ node trends.js
Created trend 2026-08-05-avg_progress
  -> C:\Users\liamm\Admin-Brain\vault\Trends\2026-08-05-avg_progress.md
  direction=flat change_pct=0 points=1 (insufficient data)
  Insufficient data: only 1 snapshot(s) fall within the 14-day window ending
  2026-08-05, so no trend can be established yet. ...
```

With two snapshots (avg_progress 30 → 45) it reports `direction=up`,
`change_pct=50`.
