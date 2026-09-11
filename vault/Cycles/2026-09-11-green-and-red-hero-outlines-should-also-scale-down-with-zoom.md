---
type: cycle
project: Dota Coach
stage: done
status: merged
task: green and red hero outlines should also scale down with zoom like hero icons
started: '2026-09-11'
readme_source: 'https://github.com/liammpek16/dota-projects'
branch: auto/green-and-red-hero-outlines-should-also-scale-down-with-zoom
target_path: 'C:/Users/liamm/Scripts'
report: 2026-09-11-green-and-red-hero-outlines-should-also-scale-down-with-zoom
---

## Task (from SELECT)
green and red hero outlines should also scale down with zoom like hero icons

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
_5-persona council: gaps between the task ("green/red hero outlines should scale down with zoom like hero icons") and the goal._

- **First-Principles** — root cause is precise and local. In `renderSceneSVG` the hero portrait radius is `4.4*hs` (scales with zoom, `hs = view.side/100`), but the team-colored ring is drawn inside `imgMarker` (`webapp/index.html:1045`) with a **hardcoded `stroke-width="1.1"` in world units**. When zoomed in the icon shrinks in world units but the outline doesn't, so the ring balloons over the portrait. The ward icons (also `imgMarker`) share the identical bug.
- **Contrarian** — don't "scale the outline" loosely; make it track the icon *exactly* (same `hs`/`k` factor) so it stays a thin proportional ring at every zoom. Also fold in the dead-hero dashed ring's `stroke-dasharray="2 1.5"` (world units) so dashes don't grow either — otherwise the fix looks half-done at 5×.
- **Executor** — smallest correct change: add a `strokeWidth` (and optional dash) parameter to `imgMarker` and pass a zoom-scaled value from the hero and ward call sites. The dead-ring and no-image fallback circle already scale (`0.9*hs`, `0.5*hs`), so leave those.
- **Outsider** — at high zoom (the whole point of #24's zoom), a fat outline reads as a rendering bug and undercuts the "distancing is readable" win.

## Refined task spec
_Branch-sized. Front-end only (`webapp/index.html`, `renderSceneSVG` + `imgMarker`)._

1. Parameterize `imgMarker(px, py, r, href, ringColor, opacity, dashed, strokeWidth)` — the ring's `stroke-width` becomes the passed value instead of the literal `1.1`. Default to `1.1` so any other caller is unchanged.
2. Hero call site (radius `4.4*hs`): pass a stroke that scales with the icon, i.e. `1.1*hs` (equivalently the world-scale `k`), so the outline keeps constant on-screen thickness.
3. Ward call site (radius `2.0*k`): pass a proportionally scaled stroke on the same factor.
4. Scale the dead-hero dashed ring's `stroke-dasharray` by `hs`/`k` for consistency (its stroke-width already uses `0.9*hs`).
5. No change to icon radii, HP/mana bars, casts, damage numbers, or the disable badges.

Out of scope: any change to marker sizes themselves; the `fightMapSVG` static card renders at side=100 so its `imgMarker` stroke is unaffected by design.

## Definition of done
- **Zoom 1× byte-identical:** at `view.side === 100` (`hs === 1`, `k === 1`) the emitted SVG is unchanged from today (`stroke-width` resolves to `1.1`) — regression guard.
- **Scales with zoom:** for hero and ward markers, the ratio of ring `stroke-width` to marker radius is constant across zoom levels (assert at 1×, 3×, 5×) — the outline no longer balloons.
- **Dead-hero ring** dashed stroke + dash pattern scale on the same factor.
- Visual check at 3× and 5×: green/red outlines are thin proportional rings, consistent with the hero icon.
- No change to HP/mana bars, cast rings/icons, damage numbers, or disable badges.

## Implementation
- branch: `auto/green-and-red-hero-outlines-should-also-scale-down-with-zoom` in `C:/Users/liamm/Scripts` (off `main`) — never touches main
- started: 2026-09-11T18:54

### Checkpoint log
- 2026-09-11T18:54 — branch created; supervised implementation started.
- 2026-09-11 — implemented: `imgMarker` gains `strokeWidth` (default 1.1); hero passes `1.1*hs`, ward `1.1*k`; dead-ring dash scales by `hs`; `svgNum` keeps 1× byte-identical. Verified 1×-identical + constant stroke/radius ratio across zoom. Committed `2efeb89`, pushed, draft PR #25.
- 2026-09-11 — stage ④ VERIFY: adversarial pass (1×/static byte-identity, ratio invariance 1×→8×, dead-dash scaling, degenerate inputs). Verdict **pass**; two trivial notes (unreachable NaN path, sub-pixel rounding drift). Report: [[2026-09-11-green-and-red-hero-outlines-should-also-scale-down-with-zoom]].
- 2026-09-11 — stage ⑤ REVIEW: PR #25 squash-merged to `main` (`0c26203`); branch deleted; roadmap goal ticked. Cycle complete.
