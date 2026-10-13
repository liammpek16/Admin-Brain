---
type: cycle
project: Dota Coach
stage: verify
status: done
verdict: pass
merged: 'https://github.com/liammpek16/dota-projects/pull/11'
pr: https://github.com/liammpek16/dota-projects/pull/11
task: >-
  coach has way to much prioritization on vision during fights. The coach should
  analyze if there are wards local to fight, and how much vision each team has
  against the other
started: '2026-09-04'
readme_source: 'https://github.com/liammpek16/dota-projects'
branch: auto/coach-has-way-to-much-prioritization-on-vision-during-fights
target_path: 'C:/Users/liamm/Scripts'
report: 2026-09-04-coach-has-way-to-much-prioritization-on-vision-during-fights
---

## Task (from SELECT)
coach has way to much prioritization on vision during fights. The coach should analyze if there are wards local to fight, and how much vision each team has against the other

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
5-persona council on the gap between the complaint and the goal ("reliable, trustworthy coaching").

- **First-Principles Thinker** — Two distinct defects hide in one complaint. (a) DATA: `Dota_Game_Summary._active_wards` (line 994) returns every ward live during the fight's *time* window anywhere on the map; `your_wards_active`/`enemy_wards_active` (lines 1154-55) are whole-map counts. So "you had 2 wards up" can be true while the team fought in total darkness across the map. The user literally asks for wards *local to the fight* and a *per-team differential*. (b) EMPHASIS: `coaching_agent._SYSTEM` gives vision a dedicated over-weighted paragraph (lines 143-149) and makes per-fight "Vision" a required step (prompt step 4, lines 614). The model dutifully over-prioritizes it. Fix both or the complaint recurs.
- **Contrarian** — Don't rip vision out; the earlier cycle deliberately *added* fight-vision because blind fights lose games. Over-correction (deleting vision coaching) would be its own regression. The ask is *proportionality + accuracy*, not removal.
- **Executor** — Branch-sized if scoped to: (1) add fight-local ward counts + a differential to the existing `fights_vision` data, reusing ward x/y already collected in `_active_wards`; (2) surface local + differential in `_fmt_fight_vision`; (3) rebalance the prompt so vision is one weighed factor, not a mandatory headline. No new data source needed — positions already exist.
- **Outsider** — A player reading "wards live: you 2, enemy 1" during a fight they lost in the enemy jungle finds it useless/misleading. "Neither team had vision on this fight (nearest ward ~4000 units away)" is trustworthy. Locality is what makes it credible.
- **Expansionist (deferred)** — Full vision-uptime-over-the-fight, dewarding-in-the-fight, high-ground vision — out of scope; keep to fight-local presence + differential now.

## Refined task spec
**Make per-fight vision fight-LOCAL and proportional, in the Dota repo (`C:/Users/liamm/Scripts`).**

1. **Data (`Dota_Game_Summary.py`)** — in `_fights_for_map`, derive a fight location (centroid of death positions when the replay provides them, else the centroid of ward markers / fall back to none) and compute, per team, observer wards whose (x,y) lies within a locality radius of that centroid: `your_wards_local`, `enemy_wards_local`, plus a `vision_advantage` (local differential, e.g. `+1` / `0` / `-2`). Keep the existing whole-map `*_wards_active` fields for the map view. Thread the new fields through into the `fights_vision` projection (line ~2901).
2. **Prompt data (`coaching_agent._fmt_fight_vision`)** — report *fight-local* vision and the differential ("you had a vision edge here / both teams fought blind / enemy had vision and you didn't"), not the raw whole-map count. Degrade gracefully to the global count with an explicit "(map-wide, fight location unknown)" label when positions are absent.
3. **Proportionality (`coaching_agent._SYSTEM` + closing prompt)** — demote vision from a dedicated over-weighted paragraph and a *required* per-fight step to one proportional factor: comment on vision when it plausibly affected the fight (blind engage, walked into a warded spot), not as a mandatory headline in every review.

Out of scope (logged follow-ups): continuous vision-uptime through the fight; dewarding-during-fight credit; high-ground/roshan vision.

## Definition of done
- `fights_vision` entries carry `your_wards_local`, `enemy_wards_local`, and `vision_advantage` derived from ward positions **relative to the fight location**, not a whole-map count.
- A fight with wards live but far from the action reports **0 local vision** for that team even though the global count is >0; a fight with a one-sided local ward reports the correct differential.
- When fight position data is unavailable, the fields fall back to the global count and are **labeled** as map-wide (no silent wrong "local" claim).
- The coach prompt presents fight-local vision + differential; vision is no longer a mandatory/over-weighted headline (dedicated paragraph trimmed, required per-fight step demoted to conditional).
- Existing map-view ward markers (`wards`, `*_wards_active`) still populate unchanged.
- Adversarial verify (separate pass) covers: far-away wards → 0 local; one-sided local; no-position fallback labeled; empty/missing logs don't crash; older cached analyses without the new fields still render.

## Implementation
- branch: `auto/coach-has-way-to-much-prioritization-on-vision-during-fights` in `C:/Users/liamm/Scripts` (off `main`) — never touches main
- started: 2026-09-04T18:06

### Checkpoint log
- 2026-09-04T18:06 — branch created; supervised implementation started.
