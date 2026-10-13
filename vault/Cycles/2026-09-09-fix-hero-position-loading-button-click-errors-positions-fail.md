---
type: cycle
project: Dota Coach
stage: done
status: done
task: >-
  Fix hero position loading (button click errors 'positions failed: Failed to
  fetch')
started: '2026-09-09'
readme_source: 'https://github.com/liammpek16/dota-projects'
branch: auto/fix-hero-position-loading-button-click-errors-positions-fail
target_path: 'C:/Users/liamm/Scripts'
report: 2026-09-09-fix-hero-position-loading-button-click-errors-positions-fail
pr: https://github.com/liammpek16/dota-projects/pull/20
verdict: pass-with-notes
---

## Task (from SELECT)
Fix hero position loading (button click errors 'positions failed: Failed to fetch')

## Project goal — source: https://github.com/liammpek16/dota-projects
```
# dota-projects

A collection of personal Dota 2 analysis and coaching projects.

## Contents

| Path | Description |
|------|-------------|
| `dota_coach/` | Dota 2 coaching app — replay parsing, coaching/research agents, telemetry, dashboard, and a web app. |
| `Dota_Game_Summary.py` | Generates a summary report for a Dota match. |
| `dota_knowledge.py`, `dota_knowledge_ext.py` | Static Dota knowledge bases (heroes, items, mechanics). |
| `report_html.py` | Builds HTML match reports. |
| `run-webapp.ps1` | Launches the coaching web app. |
| `tools/manta_positions/` | Go tool for extracting positional data from replays. |

## Notes

Large or regenerable files are intentionally **not** tracked in git (see `.gitignore`):
Dota replay files (`*.dem`), per-match data dumps, the local `coach.db`, compiled
binaries, and Python caches. Reference data (`dota_coach/data/constants/`) is kept.

## Setup

```bash
# Python projects
cd dota_coach
pip install -r requirements.txt

# Go tool
cd tools/manta_positions
go build ./...
```

## Validation

`dota_coach/validate_constants.py` guards the knowledge layer the coaching interface relies
on, with two checks:

1. **Constants vs upstream** — diffs `data/constants/heroes.json` & `items.json` against the
   live OpenDota `/constants` (same upstream: `odota/dotaconstants`) over a bounded subset
   (hero name/roles/attack_type/primary_attr, item name/cost).
2. **Knowledge referential integrity** (local, no network) — every hero name used as a key in
   `dota_knowledge.py` / `dota_knowledge_ext.py` must exist in `heroes.json`. A stale or
   misspelled key is *silently skipped* by the coaching analysis, so this catches heroes whose
   coaching data quietly drops out (e.g. a rename mismatch).

Exit 0 = clean, 1 = discrepancies.

```bash
cd dota_coach
python validate_constants.py                 # both checks (constants needs network)
python validate_constants.py --knowledge     # only the local knowledge check (no network)
python validate_constants.py --offline       # skip upstream; knowledge only
python validate_constants.py --json          # machine-readable report
python validate_constants.py --upstream-dir DIR   # compare constants vs a pinned copy
python validate_constants.py --insecure      # workaround for broken local TLS chains
```

### Constants note

Two hero `localized_name`s in `data/constants/heroes.json` are **hand-corrected** to their
current in-game names — `Outworld Destroyer` (was the stale `Outworld Devourer`) and
`Ringmaster` (was `Ring Master`). The upstream `odota/dotaconstants` snapshot still carried the
old names, which silently dropped both heroes' coaching data (their knowledge keys use the
current names). If `heroes.json` is ever regenerated from a stale upstream, these can revert —
`python validate_constants.py --knowledge` is the regression net that catches it (exit 1 on any
dangling hero reference).
```

## Council refinement
**Grounding (from code):** the error text is `loadPositions()`'s catch (`index.html`
"Positions failed: " + e.message) and "Failed to fetch" is the browser's native fetch
rejection (`api()` `fetch(path)`), i.e. **no HTTP response was ever received**. The server
handler `_handle_positions` (`webapp/server.py`) already converts every server-side failure
into a `502` + JSON, so a real handler error would read "Could not load positions…", not
"Failed to fetch". The endpoint runs the whole heavy pipeline **synchronously in one GET**:
`tools.match_positions` → `replay.enrich_fights_with_positions` → `download_replay`
(`timeout=180`, 30–120 MB) + `parse_positions` manta subprocess (`timeout=900`). One request
can therefore be held open **up to ~18 minutes**.

- **First-Principles** — A bare "Failed to fetch" means the connection was torn down before a
  response. The only thing that holds this connection for minutes is the synchronous
  download+parse. Root cause = **long synchronous request**, not a bug in the handler.
- **Contrarian** — Don't just theorise: an unbuilt manta binary or expired replay also fails
  — but those raise fast and surface as a **502 with a message**, not "Failed to fetch"; and
  `ThreadingHTTPServer` isolates a thread crash. A dropped connection on a multi-minute
  request is the only fit. Still: IMPLEMENT must **reproduce** before claiming the fix.
- **Executor** — The app already has the right pattern: `/api/parse` **kicks off a job and
  the browser polls** `GET /api/parse` until done. Reuse it for positions so no request is
  ever held open for minutes.
- **Expansionist** — While polling, show honest progress (downloading → parsing → matching)
  and preserve the existing `replay_status` fallback (positions-unavailable ⇒ ward vision).
- **Outsider (safety)** — Must degrade cleanly: DEMO stays instant; a genuine failure
  (no manta, expired replay, download error) must surface as a clear message, **never an
  infinite spinner**; a second click / a concurrent `/api/coach` call must not double-launch
  or corrupt state; polling must terminate on ok **and** on error.

## Refined task spec
Convert hero-position loading from a synchronous long-held request into a **background job
with polling**, mirroring the existing `/api/parse` pattern, so the connection is never held
open long enough to be reset.

1. **Server** (`webapp/server.py`, small in-process job registry, no new deps):
   - A module-level positions-job registry `dict` keyed by `f"{match_id}:{player_id}"`, guarded
     by a `threading.Lock`, holding `{status: running|ok|error, data?, error?, started}`.
   - `_handle_positions` becomes **idempotent start-or-poll**: DEMO returns instantly as today;
     otherwise, if no job exists (or the last one errored) spawn a **daemon thread** that runs
     `tools.match_positions(match_id, account_id=player_id)` and stores its result/exception,
     then **return immediately** with `{status:"running"}`; if a job exists, return its current
     status (`{status:"ok", match_id, fights, replay_status}` when done, `{status:"error",
     error}` on failure). Either branch returns in well under a second — the connection is
     never held for the parse. (Single-GET start-or-poll = smallest diff; POST-to-start is the
     `/api/parse` convention but not required here.)
   - Keep the existing 400s (bad id / missing player_id).
2. **Front-end** (`webapp/index.html` `loadPositions`):
   - Fire the GET to start the job, then **poll** the same endpoint every ~3s; reflect
     `status` in the button label; on `status:"ok"` run the existing in-place hero merge into
     `state.chartsData` + re-render (unchanged merge logic + `replay_status` handling for the
     positions-unavailable/ward-vision path); on `status:"error"` show the message and restore
     the button. Guard against double-launch (button disabled while a job is in flight) and
     stop polling on ok/error.
3. $0, deterministic, no new deps; the heavy work and `replay_status` semantics are unchanged —
   only the transport becomes asynchronous.

## Definition of done
- Clicking "Load hero positions (replay)" no longer yields "Failed to fetch": the kickoff GET
  returns in <1s and the browser polls until the job resolves.
- A slow parse (minutes) completes with **no single HTTP request held open more than a few
  seconds**; positions render when the job finishes.
- Server-side failures (no manta binary, expired replay, download/parse error) surface as a
  clear message via the job's `error` / `replay_status` — never a bare fetch failure and never
  an infinite spinner.
- DEMO mode still returns positions instantly (no regression).
- A concurrent `/api/coach` call and a positions job run without interfering; a second
  positions click while one is in flight does **not** launch a duplicate parse.
- The no-positions case still degrades to ward vision with the existing message.
- **Reproduction:** demonstrate the failing/long-held behaviour of the old path and the new
  async path succeeding — verified by running the webapp locally (DEMO acceptable where a live
  replay isn't reachable) plus deterministic checks that the poll goes running→ok/error and
  the handler never blocks.
- Draft PR opened; `main` untouched.

## Implementation
- branch: `auto/fix-hero-position-loading-button-click-errors-positions-fail` in `C:/Users/liamm/Scripts` (off `main`) — never touches main
- started: 2026-09-09T12:29

### Checkpoint log
- 2026-09-09T12:29 — branch created; supervised implementation started.
- 2026-09-09 — `def1e89` server: `_positions_jobs` locked registry + `_run_positions_job`
  background worker; `_handle_positions` is now idempotent start-or-poll (returns
  running/ok/error immediately). DEMO stays instant. 400/404 preserved.
- 2026-09-09 — `3db71c3` front-end: `loadPositions()` starts the job then polls every 3s
  (running→ok merge / error message), tolerating transient poll blips; button disabled
  while in flight (no duplicate poll loop). Merge + ward-vision fallback unchanged.
- 2026-09-09 — Implement-level checks (webapp on :8091 demo / :8092 live):
  DEMO status:ok+4 fights instant; bad-id 400, missing player_id 400, unknown demo 404;
  live FRESH first-call **18ms** returning status:running (was up to ~18 min); poll →
  status:ok; re-click idempotent (same job); 5 concurrent first-calls safe; stubbed
  error path → status:error with a clear message; stubbed ok path → status:ok + data.
