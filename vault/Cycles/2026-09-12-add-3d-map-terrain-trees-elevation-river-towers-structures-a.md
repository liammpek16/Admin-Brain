---
type: cycle
project: Dota Coach
stage: verify
status: awaiting-review
task: >-
  Add 3D map terrain (trees, elevation, river, towers, structures) and mouse
  camera control
started: '2026-09-12'
readme_source: 'https://github.com/liammpek16/dota-projects'
branch: auto/add-3d-map-terrain-trees-elevation-river-towers-structures-a
target_path: 'C:/Users/liamm/Scripts'
report: 2026-09-12-add-3d-map-terrain-trees-elevation-river-towers-structures-a
verdict: pass
commit: aae8dc0
pr: 29
---

## Task (from SELECT)
Add 3D map terrain (trees, elevation, river, towers, structures) and mouse camera control

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
_5-persona council: gaps between the task and the project goal._

**Where the code stands (grounding).** The 3D renderer `setupFight3D` (webapp/index.html, PR #28)
already exists and is driven by the same `heroesAt()`/`anim.t` clock as 2D. Today its "terrain"
is only: two flat ground quads (Radiant green SW / Dire grey NE), one straight river plane, and a
`GridHelper`. Its camera already has a **crude** hand-rolled control: left-drag changes azimuth +
camera *height*, wheel dollies radius, and it auto-orbits while playing. So neither goal starts
from zero — goal 1 is almost entirely missing (props), goal 2 is *partially* present but janky.

- **Contrarian:** "Trees, elevations, river, towers, structures" invites Valve-asset cosplay. The
  whole 3D scene is deliberately **stylized placeholder** geometry (the #24 / feasibility-report IP
  call). Terrain must stay the same: simple procedural meshes that *read* as Dota, not ripped
  models or a licensed heightmap. Reject anything that needs new assets or a second CDN dependency.
- **First-Principles Thinker:** "Elevation" has two meanings. Real per-match Z exists server-side
  (`_ElevationGrid`) but is **deliberately stripped** from the webapp payload (that was the #21
  "Failed to fetch" fix) — frames carry x/y only. So dynamic per-match elevation is out of scope
  without a server change. What the user actually wants is the map to *look* three-dimensional:
  **static, stylized high-ground** (Radiant & Dire bases sit on raised terraces, low-ground river
  valley between). Heroes should rest on that terrain height at their x/z so distancing still reads.
- **Expansionist:** Do it once, properly. A single ground **heightfield** (a subdivided plane whose
  vertices are raised by a stylized `terrainHeight(x,z)` — two base plateaus + a low river valley +
  gentle jungle rises) unifies elevation, river bed, and the surface trees/towers stand on. Then
  props (trees, towers, ancients, Roshan) are placed *on* that surface. One coherent system beats
  five disconnected gimmicks.
- **Outsider:** A new viewer won't know Radiant is bottom-left. Anchor recognizability with the
  **diagonal river** (Dota's runs SW↔NE), team-tinted high ground, and tower dots down all three
  lanes — the same landmarks the 2D minimap already uses (`mapBackgroundSVG`). Keep colors matched.
- **Executor:** Both goals edit the **same function** in the same file, so a split into two branches
  would self-conflict — **batch as one branch** (precedent: PR #14, #22). Camera goal = replace the
  crude azimuth-+-height drag with a real **orbit camera**: left-drag = orbit (azimuth + clamped
  pitch), right/shift/middle-drag = **pan** the look-at target, wheel = dolly (keep). Stay
  dependency-free (no OrbitControls CDN) to match the existing hand-rolled pattern; auto-orbit stays
  until first user input (`userMoved` already does this); the toggle/`dispose()` contract is preserved.

## Refined task spec
_A sharpened, branch-sized task._

One branch `auto/3d-terrain-and-camera`, front-end only (`dota_coach/webapp/index.html`), $0 / no
LLM / no new deps / no new assets. Extend `setupFight3D` (+ small helpers) to:

**A. Terrain (goal 1)** — replace the flat quads + grid with a stylized, recognizable Dota terrain:
1. A subdivided ground **heightfield** driven by a pure `terrainHeight(x,z)`: two raised base
   terraces (Radiant SW, Dire NE, team-tinted), a low **diagonal river valley** SW↔NE, gentle
   jungle rises elsewhere. Vertex colors / material echo the 2D minimap palette.
2. **River** rendered as a translucent water strip following the diagonal valley floor.
3. **Trees**: instanced/cloned low-poly conifers (cone + trunk) scattered in jungle bands, kept
   clear of lanes and the river; deterministic placement (seeded) so it's stable across renders.
4. **Towers**: tapered pillar markers at the three-lane tower positions for both teams (team-tinted),
   placed via the same `mapXY`→`fa3dXZ` mapping the heroes use, sitting on the terrain surface.
5. **Structures**: an **Ancient** block on each base terrace + a **Roshan pit** marker in the river,
   using existing landmark coordinates.
6. Heroes and towers **rest on the terrain** — sample `terrainHeight` at their x/z for their base Y
   (heroes keep their walk bob on top). No dependence on per-match Z (not in the payload).

**B. Mouse camera control (goal 2)** — replace the crude drag with a real orbit camera on the
canvas, dependency-free:
1. **Left-drag = orbit**: azimuth (all the way round) + **pitch** via a polar angle clamped to a
   sensible range (never under the map, never fully top-down gimbal-lock).
2. **Right-drag / Shift+left-drag / middle-drag = pan**: translate the look-at *target* in the
   camera's screen plane (clamped to near the map so you can't lose the scene).
3. **Wheel = dolly** (keep existing behavior + clamps).
4. **Auto-orbit** continues only until the first user interaction (keep `userMoved`); a reset
   affordance returns to the default framing.
5. Preserve the `{ dispose }` contract (remove *all* listeners, cancel rAF, dispose geometry/
   materials/renderer) and the 2D↔3D toggle.

**Out of scope (explicit):** real per-match elevation from replay Z (needs a server payload change —
log as follow-up), real Valve models/textures/heightmaps (IP), OrbitControls or any new CDN/dep.

## Definition of done
_Clear, testable completion criteria._

1. `terrainHeight(x,z)` is a **pure** function (unit-testable via VM-load): base terraces higher
   than the river valley; river valley is the lowest band; deterministic.
2. After building the scene, it contains **named/tagged** meshes for each terrain class — heightfield
   ground, river, ≥1 tree group (many trees), tower markers for **both** teams across **three**
   lanes, an Ancient per base, and a Roshan marker — assertable by walking `scene` children.
3. Every hero and every tower **sits on** the terrain: its Y ≈ `terrainHeight` at its x/z (heroes +
   their bob), verified numerically for a sample.
4. **Camera:** a simulated left-drag changes azimuth **and** pitch (pitch stays within clamps for
   extreme drags); a simulated right/shift-drag changes the look-at **target** (pan) without changing
   orbit radius; wheel changes radius within clamps; auto-orbit stops after the first interaction;
   reset restores default framing. All assertable by dispatching pointer/wheel events and reading
   `cam.position`/target.
5. **No regression:** 2D↔3D toggle still swaps renderers; heroes still placed by `heroesAt`/
   `fa3dXZ`; `dispose()` cancels rAF, disconnects observers, removes listeners, and frees WebGL
   (create/dispose ×N leak-clean).
6. three.js still lazy-loads from cdnjs with the existing 2D fallback on load failure; front-end
   only; no new deps/assets; server untouched; `node --test` (if any touched) green.

## Implementation
- branch: `auto/add-3d-map-terrain-trees-elevation-river-towers-structures-a` in `C:/Users/liamm/Scripts` (off `main`) — never touches main
- started: 2026-09-12T15:38

### Checkpoint log
- 2026-09-12T15:38 — branch created; supervised implementation started.
