---
type: cycle
project: Dota Coach
stage: done
status: done
task: >-
  generate the spike example as a real feature on the webapp. This spike should
  be an additional loading option in the fight breakdown screen to replace the
  current 2D visualization
started: '2026-09-11'
readme_source: 'https://github.com/liammpek16/dota-projects'
branch: auto/generate-the-spike-example-as-a-real-feature-on-the-webapp-t
target_path: 'C:/Users/liamm/Scripts'
report: 2026-09-11-generate-the-spike-example-as-a-real-feature-on-the-webapp-t
---

## Task (from SELECT)
generate the spike example as a real feature on the webapp. This spike should be an additional loading option in the fight breakdown screen to replace the current 2D visualization

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
_5-persona council: gaps between the task ("ship the 3D spike as a real fight-breakdown playback option that swaps the 2D view in-flight") and the goal._

- **First-Principles** — the spike proved the *render pipeline* but ran on **synthesized** tracks. The feature's real work is wiring the 3D view to the **same real frame data the 2D view already uses** — `heroesAt(t, frames)` over `f.frames` (per-hero `x/y`, `z` elevation, `hp`, `alive`, `hero`, `is_yours`, `hero_img`) — plus a clean toggle and a correct WebGL **lifecycle**. If it's not driven by the real parse, it's a toy, not a feature.
- **Contrarian** — do NOT fork playback state. The existing `setupFightAnim` owns `anim.t` + the `#faPlay`/`#faScrub`/`#faClock` controls; the 3D renderer must **share that same clock** so the two modes can't desync and switching preserves the current time. And don't bloat first load — three.js must be **lazy-loaded** only when 3D is first selected.
- **Executor** — reuse the spike's procedural humanoid + walk/idle/cast/death logic, but map positions through the same tile→plane transform as `mapXY` so 3D and 2D agree on where heroes are, and drive casts/deaths from the real `flattenFightEvents` / `alive` data. The real new risk is **teardown**: a WebGL context leaks across fights/tab-switches unless disposed — `stopFightAnim` (already called on tab-leave) must also stop the 3D loop and dispose the renderer.
- **Outsider** — a coached player clicks "3D" on their fight and sees *their* heroes moving as they did; it must degrade gracefully when positions aren't loaded (same "load hero positions" story as 2D).
- **Legal (carried from the feasibility cycle)** — models stay **procedural placeholders**, NOT extracted Valve assets (the #24-class IP risk). The UI should be honest that the figures are stylized stand-ins.

## Refined task spec
_Branch-sized, front-end only (`webapp/index.html`). Builds on `dota_coach/docs/fight_3d_spike.html`._

1. **Toggle** — add a **2D / 3D** control to the fight playback `fa-controls` row (default **2D**). Toggling swaps the renderer inside `#faMapWrap` **in place**, preserving the current playback time; the shared `#faPlay`/`#faScrub`/`#faClock` drive whichever renderer is active.
2. **Real-data 3D renderer** — a `setupFight3D(f, frames, anim)` that renders a three.js scene into `#faMapWrap`, reading the **same** `heroesAt(anim.t, frames)` output as 2D: hero at the tile→plane-mapped position (reuse the `mapXY` bounds; use `z` elevation when present), **facing from velocity**, procedural walk/idle, **cast** effects from `flattenFightEvents`, **death** fell/fade when `alive===false`, team-colored figures + name labels, a ground echoing the minimap (Radiant/Dire/river), and an orbit/drag camera. The 2D zoom buttons are hidden or repurposed to camera dolly in 3D.
3. **Lazy load + fallback** — load three.js (cdnjs UMD, pinned) only on first 3D activation, with a brief loading state; if it fails (offline) fall back to 2D with a visible note. No positions/frames → 3D shows the same prompt/snapshot as 2D.
4. **Lifecycle** — extend `stopFightAnim` (and mode-switch / fight-change) to stop the 3D loop and **dispose** the renderer/geometries so repeatedly opening fights or leaving the tab doesn't leak WebGL contexts.

Out of scope: extracting/shipping Valve models, spell VFX beyond the spike's cast pop, changing the 2D renderer's behaviour, server/agent changes.

## Definition of done
- A **2D/3D toggle** is present in the fight playback controls; default 2D; switching swaps the renderer inside `#faMapWrap` **without** re-rendering the whole screen, and **preserves the current time** (scrub position carries over both ways).
- The 3D view is driven by the **real** fight frames (same `heroesAt` data as 2D): heroes sit at positions consistent with the 2D map, face their direction of travel, fall/fade at their real death time, and show a cast effect on real cast events.
- **One shared clock**: `#faPlay`/`#faScrub`/`#faClock` control whichever mode is active; play state and time stay in sync across a toggle.
- three.js is **lazy-loaded** on first 3D use only; a load failure falls back to 2D with a clear message (no crash); no frames → same behaviour as 2D today.
- **No leak**: leaving the Fight tab, switching fights, or toggling back to 2D stops the 3D loop and disposes the renderer (verify no growth in WebGL contexts / no console warnings after repeated open/close).
- 2D path is **unchanged** when 3D is never activated; no new console errors; figures are procedural placeholders (no Valve assets shipped), and the UI says so.

## Implementation
- branch: `auto/generate-the-spike-example-as-a-real-feature-on-the-webapp-t` in `C:/Users/liamm/Scripts` (off `main`) — never touches main
- started: 2026-09-11T20:03

### Checkpoint log
- 2026-09-11T20:03 — branch created; supervised implementation started.
- 2026-09-11 — implemented (front-end only): 2D/3D toggle in `fa-controls`; `setupFight3D` renders three.js off the same `heroesAt(anim.t, frames)` data (mapXY-consistent positions, velocity facing, walk/idle, casts from `flattenFightEvents`, death fall/fade); three.js lazy-loaded from cdnjs with 2D fallback; `stopFightAnim` now clears the `setInterval` (pre-existing leak) + disposes the WebGL context; procedural placeholder models (not Valve assets), UI says so. Verified live in `--demo`: toggle swaps in place on a real fight, 3D shows real heroes/positions with the shared running clock, back-to-2D restores the SVG + removes the canvas; isolated `setupFight3D` test (build + advance + dispose) clean; no console errors. Committed, pushed, draft PR #28.
- 2026-09-11 — stage ④ VERIFY: adversarial pass (live real-fight 3D drive; 12× create/dispose leak test → no WebGL context-loss / 0 canvases left; empty frames + null coords + double-dispose all safe). Verdict **pass-with-notes**: DoD met + no leak; notes are the deliberate placeholder models, `z` elevation unused (spec deviation), and the 3D rAF running while paused (idle nit). Report: [[2026-09-11-generate-the-spike-example-as-a-real-feature-on-the-webapp-t]].
- 2026-09-11 — stage ⑤ REVIEW: PR #28 squash-merged to `main` (`9c64813`); branch deleted; roadmap goal ticked. Cycle complete.
