---
type: report
project: Dota Coach
task: >-
  Add 3D map terrain (trees, elevation, river, towers, structures) and mouse
  camera control
date: '2026-09-12'
cycle: 2026-09-12-add-3d-map-terrain-trees-elevation-river-towers-structures-a
---

# Verification report — Dota Coach

**Task:** Add 3D map terrain (trees, elevation, river, towers, structures) and mouse camera control
**Branch:** `auto/add-3d-map-terrain-trees-elevation-river-towers-structures-a`

## What was tested
Two passes: (1) **pure-function unit tests** VM-loading the real shipped inline script
(`scratchpad/verify_3d.mjs`, 20/20), and (2) a **live real-browser drive** of the demo webapp
(`localhost:8099`, three.js r128 actually loaded) against real demo fight frames.

**Pure functions (20/20):**
- `terrainHeight`: river-diagonal (x==z) is exactly 0 and lowest; both bases (`±20.8,∓20.8`) are
  high ground (4.42 / 4.78) and higher than the valley; never negative over 500 random samples;
  deterministic; plateau capped ≈ `FA3D_PLATEAU` (4.6)+undulation; valley flat within the river
  half-width; farther-from-river ≥ nearer; survives extreme/NaN input without throwing.
- `pctToXZ`: center maps to origin; Radiant base pct(10,90) → SW world quadrant (x<0,z>0); tower
  sites are the 3 interior vertices of a 5-point lane.
- `faOrbitPos`: returns finite `[x,y,z]`; `|pos−target| == r` exactly; `phi→0` puts the camera
  overhead; `phi=90°` at target height; `theta` rotates around Y (azimuth).

**Live browser (demo fight, real frames):**
- **Scene contents (DoD #2):** built scene has named meshes `terrain` + `river`, `trees` group
  (44), `towers` group (7 = 3 top + 3 bot + 1 mid), `structures` group (3 = 2 Ancients + Roshan).
- **Heroes rest on terrain (DoD #3):** every visible hero model's `position.y` equals
  `terrainHeight(x,z)` at its x/z (6/6 sampled, |Δ|<0.12 incl. the walk bob).
- **Camera (DoD #4):** left-drag `orbit` changes azimuth **and** pitch; pitch clamps at both ends
  under 200× hammering (≥0.2, ≤1.4); `pan` moves the look-at target **without** changing radius,
  and clamps to |x|,|z|≤38, y∈[0,14]; `dolly` clamps to [16,100]; `reset` restores defaults and
  clears `userMoved`; auto-orbit stops after the first interaction (`userMoved` flips true).
- **No regression (DoD #5):** driving the **real** `faMode3d`/`faMode2d` buttons through
  `renderFightAnalysis`: 2D shows an SVG → 3D swaps in a canvas + sets `anim.three` → 2D removes
  the canvas, restores the SVG, and nulls `anim.three` (disposed).
- **Leak-clean:** 12× create→dispose (with control calls each cycle) left no canvas in the wrap,
  no net canvas growth, no exceptions.
- three.js lazy-loaded from cdnjs and rendered; console errors were only my own 400/404 API probes
  (endpoints needing `player_id`), none from the 3D code.

## Findings (weaknesses / what broke)
Nothing broke against the DoD. Honest notes:
1. **Elevation is static/stylized, not real per-match Z** — by design (the webapp payload strips
   the replay elevation grid; that was the #21 fix). The terrain reads as 3D but does not reflect a
   specific match's high ground.
2. **Reset is double-click only** — the on-screen `⤢` reset button belongs to the 2D-zoom control
   and is hidden in 3D; the mode-note text advertises double-click. No dedicated 3D reset button.
3. **Pan uses the previous frame's `cam.matrix`** (one-frame lag on the right/up basis) —
   imperceptible at 25–60 fps, but not a fresh `updateMatrixWorld` before reading the basis.
4. **Idle rAF while paused** — pre-existing from PR #28 (the loop keeps requesting frames when
   `anim.playing` is false); unchanged here.
5. **Trees/towers/structures are procedural placeholders**, deliberately not Valve assets (the
   #24 / feasibility-report IP call).

## Improvements
- **P3 (follow-up cycle):** expose a coarse elevation grid to the client so the terrain can deform
  to the *real* match's high ground (finding 1) — the server already computes `_ElevationGrid`.
- **P4:** add a small dedicated "reset view" button visible in 3D (finding 2).
- **P4:** `cam.updateMatrixWorld()` before reading the right/up basis in `controls.pan` (finding 3).
- **P4:** pause the rAF loop when `!anim.playing` (finding 4) — shared with the PR #28 note.

## Verdict
**pass** — all six DoD criteria verified (pure math 20/20 + live browser: scene contents, heroes
on terrain, full orbit/pan/dolly camera with clamps, 2D↔3D toggle, dispose leak-clean). Findings
are by-design scope boundaries or minor polish, none blocking. Front-end only, no new deps/assets,
server untouched.
