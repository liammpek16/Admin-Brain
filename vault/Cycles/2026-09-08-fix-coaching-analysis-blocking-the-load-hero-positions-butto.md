---
type: cycle
project: Dota Coach
stage: done
status: done
task: Fix coaching analysis blocking the load hero positions button
started: '2026-09-08'
readme_source: 'https://github.com/liammpek16/dota-projects'
branch: auto/fix-coaching-analysis-blocking-the-load-hero-positions-butto
target_path: 'C:/Users/liamm/Scripts'
report: 2026-09-08-fix-coaching-analysis-blocking-the-load-hero-positions-butto
pr: https://github.com/liammpek16/dota-projects/pull/19
verdict: pass
---

> ⑤ **Human review gate** — verify verdict **pass** (live browser: button visible/clickable
> while coaching in flight; positions load + merge; no console errors). Draft **PR #19**
> ready to merge; `main` untouched.

## Task (from SELECT)
Fix coaching analysis blocking the load hero positions button

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
**Investigation first (root cause found):** the "Load hero positions (replay)" button
(`#loadPosBtn`) starts `hidden` and is only revealed at `index.html:1327`, which runs
**after** `await api("/api/coach", …)` in `startCoaching()` resolves. The coaching call is
the slow LLM review ("can take a moment"), so for its whole duration the button is hidden
and unclickable. Not a server problem: the webapp is a `ThreadingHTTPServer`, the
`/positions` handler takes no lock, and `_conv_lock` only wraps a dict write (not the long
`web_start`). So coaching and positions are independent requests — the button is just gated
behind the coaching promise in the UI.

- **First-Principles** — the two operations are independent; the UI serialised them for no
  reason. Reveal the positions button as soon as the fight data exists, not after coaching.
- **Contrarian** — watch the client-state race: `loadPositions()` merges into
  `state.chartsData.fights` *in place*, and `startCoaching` also re-fetches charts. If the
  button is shown before `chartsData` is populated, a click no-ops and a later charts fetch
  clobbers the merge. So reveal only *after* `fetchChartsData()` resolves, and fetch charts
  **once**, up front (not again after coaching).
- **Executor** — small front-end-only change in `startCoaching`; server untouched.
- **Outsider** — parallel requests are fine (threaded server), but keep coaching's own
  "reviewing…" flow intact so nothing regresses.

## Refined task spec
Front-end only (`dota_coach/webapp/index.html`): in `startCoaching()`, load fight data and
reveal `#loadPosBtn` **up front, in parallel** with the coaching call, instead of after it.
- Kick off `fetchChartsData()` immediately when the panel opens; on resolve, reveal the
  positions button (factored into a `revealLoadPosBtn()` helper reused at coaching-end).
- Remove the duplicate post-coaching `fetchChartsData()` so `loadPositions()`' in-place
  hero merge into `state.chartsData` can't be clobbered.
- Button visibility rule unchanged (show only when there are fights and positions aren't
  already loaded), so once positions load it still hides itself.
No server change; `$0`; no new deps.

## Definition of done
- While a coaching analysis is in flight, `#loadPosBtn` is visible and clickable (was
  hidden until coaching returned).
- Clicking it during coaching issues `/positions` concurrently and merges heroes into the
  fight data (server already threaded).
- No client-state race: charts are fetched once up front; a positions merge is not
  overwritten by a later charts fetch.
- Coaching flow itself unchanged (review renders, timestamps hoverable, button hides once
  positions loaded).
- Verified live in the browser against the running webapp.
- Draft PR opened; main untouched.

## Implementation
- branch: `auto/fix-coaching-analysis-blocking-the-load-hero-positions-butto` in `C:/Users/liamm/Scripts` (off `main`) — never touches main
- started: 2026-09-08T22:23

### Checkpoint log
- 2026-09-08T22:23 — branch created; supervised implementation started.
