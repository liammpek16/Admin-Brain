---
type: cycle
project: Dota Coach
stage: verify
status: done
verdict: pass
merged: 'https://github.com/liammpek16/dota-projects/pull/15'
task: >-
  Cluster split-fight positions for fight-local vision, and make vision
  high-ground/line-of-sight aware (follow-up to PR #11)
started: '2026-09-04'
readme_source: 'https://github.com/liammpek16/dota-projects'
branch: auto/cluster-split-fight-positions-for-fight-local-vision-and-mak
target_path: 'C:/Users/liamm/Scripts'
report: 2026-09-04-cluster-split-fight-positions-for-fight-local-vision-and-mak
---

## Task (from SELECT)
Cluster split-fight positions for fight-local vision, and make vision high-ground/line-of-sight aware (follow-up to PR #11)

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
Follow-up to PR #11 (fight-local vision). Two sub-items bundled; the council splits them.

- **First-Principles Thinker** — (a) SPLIT-FIGHT CLUSTERING is feasible: `_fight_local_vision` uses a single centroid of all heroes, so a two-cluster skirmish puts the centroid between clusters and under-counts wards covering either front. We have per-hero x/y, so we can cluster and count wards near ANY cluster. (b) HIGH-GROUND / LINE-OF-SIGHT is NOT feasible: a grep finds **no terrain, elevation, or LoS data anywhere** — manta positions are x/y only.
- **Contrarian** — Don't fake high-ground with a hardcoded cliff list; it'd be wrong often and erode the trust PR #11 built. Defer it until a terrain source exists.
- **Executor** — Branch-sized = the clustering half only: if hero positions span more than a threshold, treat as multiple clusters; a ward is local if near any cluster centroid, else the single-centroid path is unchanged.
- **Outsider** — A player in a two-front fight shouldn't be told "you fought blind" when each front had its own ward.
- **Expansionist (deferred)** — high-ground/LoS-aware vision and ward uptime through the fight; both need data we don't have.

## Refined task spec
**Cluster split-fight positions in `_fight_local_vision` (Dota_Game_Summary.py); DEFER high-ground/LoS.**

1. In `_fight_local_vision`, detect one tight group vs several: reuse the pairwise-spacing/scale idea already in `_summarize_fight_for_coaching`. If spread is large, partition hero positions into clusters (simple threshold clustering on existing tile coords) with a centroid each.
2. A team's observer ward is "local" if within the ward-vision radius of **any** cluster centroid. `your/enemy_wards_local` + `vision_advantage` then reflect coverage of the actual fronts.
3. Single-cluster fights behave exactly as today (no regression); `located`/fallback unchanged.

Out of scope (stays on roadmap, needs a terrain/height source): high-ground and LoS-aware vision; ward uptime over the fight.

## Definition of done
- A fight with two well-separated hero clusters credits wards near either cluster (a ward covering only one front counts), where single-centroid code missed both.
- A compact (single-cluster) fight produces identical numbers to the current implementation.
- Fallback when positions absent (`located: False`) unchanged; no crash on 1/2/coincident positions.
- High-ground/LoS explicitly NOT attempted (deferred).
- Adversarial verify: two clusters, one cluster, degenerate/duplicate positions, missing positions, a ward exactly between clusters.

## Implementation
- branch: `auto/cluster-split-fight-positions-for-fight-local-vision-and-mak` in `C:/Users/liamm/Scripts` (off `main`) — never touches main
- started: 2026-09-04T18:45

### Checkpoint log
- 2026-09-04T18:45 — branch created; supervised implementation started.
