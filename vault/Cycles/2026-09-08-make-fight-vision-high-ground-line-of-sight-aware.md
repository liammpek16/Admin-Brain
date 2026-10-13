---
type: cycle
project: Dota Coach
stage: done
status: done
task: Make fight vision high-ground/line-of-sight aware
started: '2026-09-08'
readme_source: 'https://github.com/liammpek16/dota-projects'
branch: auto/make-fight-vision-high-ground-line-of-sight-aware
target_path: 'C:/Users/liamm/Scripts'
report: 2026-09-08-make-fight-vision-high-ground-line-of-sight-aware
pr: https://github.com/liammpek16/dota-projects/pull/18
verdict: pass
---

> ⑤ **Human review gate** — verify verdict **pass** (22/22 DoD + 16/16 adversarial,
> end-to-end confirmed). Draft **PR #18** ready to merge; `main` untouched. Rebuild the
> manta binary (`cd tools/manta_positions && go build -o manta-positions.exe .`) to get Z.

## Task (from SELECT)
Make fight vision high-ground/line-of-sight aware

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
**Context (from the Task-1 research report):** `_fight_local_vision` credits any observer
ward within a flat 14-tile Euclidean radius of the fight centroid — no elevation, no
line-of-sight. Real Dota vision does **not** travel up a cliff, and hero positions carry
**no Z** (manta emits only x/y). So "high-ground/LOS-aware" = replace the flat radius with
a terrain-aware credit.

- **First-Principles** — LOS needs elevation. Two sources: (a) a *baked static terrain
  grid* or (b) *real replay Z*. Go 1.26 is installed and cached `.dem`s exist, so (b) is
  ground-truth AND verifiable here — no faked/unverifiable terrain map. Choose (b).
- **Contrarian** — a wrong terrain map makes vision *less* accurate. Deriving elevation
  from the match's own replay (heroes traverse the map) avoids shipping guessed geometry.
- **Executor** — keep it one coherent feature: emit Z (Go) → carry Z onto fight heroes →
  build a per-match elevation grid → gate ward credit by a high-ground + LOS-raycast rule.
- **Expansionist** — expose an honest `los_aware` flag so the coach/webapp can say the
  count accounts for high ground, vs the old flat radius.
- **Outsider (safety)** — MUST degrade to today's exact behavior when Z is absent (old
  binary, OpenDota-only, unparsed): never worse than the current flat-radius count.

## Refined task spec
Make fight-local vision account for high ground and line of sight, using real elevation
derived from the replay:

1. **manta helper** (`tools/manta_positions/main.go`): also read
   `CBodyComponent.m_cellZ`/`m_vecZ` and emit per-hero `z` (omitted when unavailable).
   Rebuild the binary.
2. **`replay.attach_positions`**: carry `z` onto `fight['heroes']`.
3. **Elevation model** (`Dota_Game_Summary`): `_build_elevation_grid(snapshots)` bins hero
   `(x,y)→z` into coarse cells (median per cell) → a lookup with `at(x,y)` (nearest
   non-empty cell) and a `los_blocked(x0,y0,x1,y1, endpoint_z)` grid raycast. Returns None
   when no Z data.
4. **`_fight_local_vision`** takes the grid: fight elevation = median hero `z` present; an
   observer ward is credited only if within radius **and** not below the fight ground
   (`ward_z >= fight_z - margin`) **and** the ward→centroid raycast isn't blocked by higher
   intervening terrain. Adds `los_aware` (True only when Z + grid present). No Z ⇒ old
   behavior, `los_aware:False`.
5. **Thread the grid**: `enrich_fights_with_positions` builds it from `snaps` and returns it
   in `status`; `tools.analyze_match_for_coaching` passes it to
   `_project_fights_vision(fights, elevation=grid)`. `analyze_match`'s pre-enrichment call
   passes nothing (grid=None).
6. **Consumers**: `coaching_agent._fmt_fight_vision` notes when a local count is
   high-ground-aware. Minimal/no webapp change (fields flow through).

$0, deterministic, no new Python deps (Go stdlib only), no external terrain asset.

## Definition of done
- manta emits `z` per hero; rebuilt binary parses a real cached `.dem` and the output
  carries `z`. (Verified by running the binary here.)
- `_build_elevation_grid` returns a working lookup from Z samples, None without Z.
- `_fight_local_vision`: (a) ward below a high-ground fight is **dropped** (was credited);
  (b) ward on equal/near ground within radius is credited; (c) ward blocked by an
  intervening peak is dropped; (d) **no-Z input ⇒ byte-for-byte identical to old counts**,
  `los_aware:False`; (e) radius still enforced.
- End-to-end: `analyze_match_for_coaching` on a cached-replay match yields
  `fights_vision` with `los_aware:True` and sane local counts.
- `coaching_agent` output honestly reflects LOS-awareness.
- Draft PR opened; main untouched.

## Implementation
- branch: `auto/make-fight-vision-high-ground-line-of-sight-aware` in `C:/Users/liamm/Scripts` (off `main`) — never touches main
- started: 2026-09-08T22:09

### Checkpoint log
- 2026-09-08T22:09 — branch created; supervised implementation started.
