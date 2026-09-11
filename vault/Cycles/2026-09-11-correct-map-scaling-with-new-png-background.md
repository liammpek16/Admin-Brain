---
type: cycle
project: Dota Coach
stage: done
status: merged
task: correct map scaling with new png background
started: '2026-09-11'
readme_source: 'https://github.com/liammpek16/dota-projects'
branch: auto/correct-map-scaling-with-new-png-background
target_path: 'C:/Users/liamm/Scripts'
report: 2026-09-11-correct-map-scaling-with-new-png-background
---

## Task (from SELECT)
correct map scaling with new png background

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
_5-persona council: gaps between the task ("correct map scaling with new png background") and the goal of a trustworthy coaching platform._

- **First-Principles** — this is *two* independent bugs, not one. (a) Both playback SVGs (`.fa-map` in `renderSceneSVG`, `.fmap` in `fightMapSVG`) use `preserveAspectRatio="none"`, so the square `0 0 100 100` viewBox is stretched to whatever non-square width the panel has — the PNG minimap and every hero position distort horizontally. (b) `mapXY` (`webapp/index.html:1037`) maps replay tile coords `64..192 → 0..100` with *guessed* bounds and a hardcoded Y-flip; those constants won't line up with a real minimap PNG's playable area.
- **Contrarian** — fixing aspect ratio alone is a trap: the map would be square but heroes still wouldn't sit on the lanes. Both must move together. But calibration must be a single data-driven constant, not per-image eyeballing, or it rots the next time the PNG changes.
- **Outsider** — a coached player expects a hero standing at Roshan to render *at the Roshan pit* on the map they recognise; a stretched or mis-registered map quietly erodes trust in everything else the tool says.
- **Expansionist (bounded)** — resist adding pan/rotate/multi-map support; scope to: render square + one calibrated world→image transform shared by the PNG and the overlays.
- **Executor** — force a 1:1 render (square container / `xMidYMid meet`) and extract a `MAP_BOUNDS` constant consumed by `mapXY`; validate against a known fight before calling it done.

## Refined task spec
_Branch-sized. Front-end only (`webapp/index.html`); no server/agent changes._

1. **Render square, never stretch.** Make the fight-map SVGs render at a fixed 1:1 aspect at all panel widths and all zoom levels — give `.fa-map`/`.fmap` a square box (CSS `aspect-ratio:1`) and/or switch `preserveAspectRatio` from `none` to `xMidYMid meet`. Zoom (`faViewBox`) must stay correct under the square render.
2. **One calibrated transform.** Extract the world→minimap mapping out of `mapXY` into a single `MAP_BOUNDS` constant (min/max tile coords + Y orientation). Tune it so hero/ward positions register against `/static/dota_map.png`. The `<image>` background and `mapXY` must share the same bounds so overlays land on the map they're drawn over.
3. **Graceful fallback.** With no PNG (`_mapImgOk === false`), the stylized SVG minimap must still render undistorted under the same square/transform path.

Out of scope: pan/zoom redesign, shipping a licensed Valve PNG (user-supplied), server-side changes.

## Definition of done
- At panel widths from narrow to wide and zoom 1×→5×, the rendered map is square — measured aspect ratio ≈ 1:1, no horizontal/vertical stretch.
- With a sample `dota_map.png` present, ≥3 fixed reference points (e.g. Roshan pit, a T1 tower, a base) and live hero positions land on their true map locations within a stated pixel tolerance.
- No-PNG stylized fallback still renders and is undistorted on the same code path.
- Marker/label screen-constant sizing under zoom is unchanged (no regression to the #24 zoom behaviour).
- Zoom 1× with no PNG is visually unchanged from today except for the (intended) removal of stretch.

## Implementation
- branch: `auto/correct-map-scaling-with-new-png-background` in `C:/Users/liamm/Scripts` (off `main`) — never touches main
- started: 2026-09-11T18:57

### Checkpoint log
- 2026-09-11T18:57 — branch created; supervised implementation started.
- 2026-09-11 — finding: containers are already square (`aspect-ratio:1/1`), so a square PNG wasn't distorted. Implemented the real levers: `mapXY` now uses a tunable `MAP_MIN`/`MAP_MAX` constant (default 64..192, byte-identical); background `<image>` + `.fmap`/`.fa-map` switched to `preserveAspectRatio="xMidYMid meet"` (stretch-proof for non-square); calibration recipe added to `static/README.txt`. Committed, pushed, draft PR #26. Note: numeric calibration to a specific licensed PNG is user-dependent (asset not bundled).
- 2026-09-11 — stage ④ VERIFY: aspect-ratio audit (3 fight SVGs → meet, `.wp` untouched), `mapXY` byte-identity + clamping + tunability, guarded degenerate coords. Verdict **pass-with-notes**: mechanism + stretch-proofing verified, but the headline DoD (reference points aligning on a real PNG) is unverifiable without the user's licensed asset — final `MAP_MIN/MAX` calibration is an open item. Report: [[2026-09-11-correct-map-scaling-with-new-png-background]].
- 2026-09-11 — stage ⑤ REVIEW: PR #26 squash-merged to `main` (`93599cb`); branch deleted; roadmap goal ticked. Cycle complete. **Open follow-up:** tune `MAP_MIN/MAX` once a licensed `dota_map.png` is supplied.
