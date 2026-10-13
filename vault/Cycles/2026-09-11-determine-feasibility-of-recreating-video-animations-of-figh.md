---
type: cycle
project: Dota Coach
stage: done
status: done
task: >-
  determine feasibility of recreating video animations of fights with .dem data
  using real character models and animations.
started: '2026-09-11'
readme_source: 'https://github.com/liammpek16/dota-projects'
branch: auto/determine-feasibility-of-recreating-video-animations-of-figh
target_path: 'C:/Users/liamm/Scripts'
report: 2026-09-11-determine-feasibility-of-recreating-video-animations-of-figh
---

## Task (from SELECT)
determine feasibility of recreating video animations of fights with .dem data using real character models and animations.

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
_5-persona council: gaps between the task ("determine feasibility of recreating fight video with real character models + animations from `.dem` data") and the goal of a trustworthy, revenue-worthy coaching platform._

- **First-Principles** — this is a **research/feasibility** goal, not a build. Like the earlier "research all available outputs from the dota download" cycle, its deliverable is a decision-ready report + go/no-go recommendation, not a PR. Don't let it turn into building a 3D engine. The question decomposes into four independent sub-questions, each of which can independently kill or shape the idea:
  1. **Data sufficiency** — what does the `.dem` (via the manta parse) actually give us to drive real models? Today the parser pulls position (`m_cellX/Y/Z` + `m_vecX/Y/Z`), HP/mana, and the combat log (casts/damage/deaths/modifiers). It does **not** pull orientation (`m_angRotation`/facing) or any animation state. Critically, Source 2 does **not** serialize per-tick animation into the replay — animations are produced client-side by the hero's animgraph from parameters/events, so "real animations" can't simply be read out; they'd have to be *reconstructed/approximated* (map move/attack/cast/death events → animation clips) or replayed *in-engine*.
  2. **Assets + legal** — "real character models" = Valve's Source 2 hero assets (`.vmdl`/`.vmesh`/`.vanim`), copyrighted. Extractable via VRF/Source2Viewer → glTF for local use, but **shipping them in a product is the same IP question already flagged for the minimap PNG (#24)** — a decision only the user can make.
  3. **Rendering path** — at least three: **(A) native client** (`playdemo` + camera scripting + screen capture) = highest fidelity, real models/anims for free, but not embeddable in the webapp and brittle to automate; **(B) custom web 3D** (three.js/babylon, extracted glTF, positions from the parse, *approximate* clips) = embeddable but large effort + approximate anims + the legal issue; **(C) offline SFM/manual** = not automatable.
  4. **Effort vs. payoff** — weigh against the *existing* 2D tactical playback (already shipped, #22–#24), which is legally clean and already conveys positioning/target-priority. Does 3D materially improve *coaching* value, or is it polish?
- **Contrarian** — the honest likely answer is "high effort, real legal risk, marginal *coaching* uplift over the 2D view" — but the job here is to *establish and evidence* that, not presume it. The report must give a real recommendation, not a shrug.
- **Expansionist (bounded)** — an *optional, tiny* de-risking spike (load ONE extracted hero glTF in three.js and move it along already-parsed positions for one fight) would convert opinion into evidence — but it's optional and time-boxed, not required to answer the question.
- **Outsider** — a player imagines a mini in-engine replay of their fight. Manage that expectation: name what's realistically achievable (approximate models + canned clips) vs. the imagined pixel-perfect re-render.
- **Executor** — deliverable is a written report in `vault/Reports/`; at most a throwaway spike branch, never a shipped feature from this cycle.

## Refined task spec
_A research/feasibility cycle. Deliverable = a decision report committed to the Admin-Brain vault (pattern: the 2026-09-08 "research all outputs" cycle — **no PR** to the app). Any code is a throwaway spike only._

Investigate and document, each with a concrete finding (not hand-waving):
1. **Data sufficiency** — inventory exactly what the `.dem`/manta layer provides today (position/elevation, HP/mana, combat log) and what recreation additionally needs (per-tick **orientation** — is `m_angRotation` extractable via manta? — and **animation state**). State plainly that Source 2 animations are animgraph-driven and not serialized per tick, so anims must be reconstructed from events or obtained in-engine. Note what a manta change would need to add (e.g. yaw) vs. what is fundamentally not in the replay.
2. **Assets + legal** — where real hero models live (Source 2 `.vmdl`), how they'd be extracted (VRF → glTF) and the IP constraint on redistributing them in a product. Frame it as the same user-owned decision as the #24 minimap art.
3. **Rendering options** — evaluate paths A (native client capture), B (custom web 3D with extracted glTF + approximate clips), C (offline/SFM), on: fidelity, automatability, embeddability in the webapp, and legal exposure.
4. **Effort + recommendation** — rough effort tiers for the viable path(s), and a clear **go / no-go / defer** recommendation *relative to the existing 2D playback* and the platform's revenue goal.
5. _(optional, time-boxed)_ A minimal spike (one hero glTF moving along one fight's parsed positions in three.js) to validate the web-3D path — only if it materially firms up the recommendation.

Out of scope: building the renderer, extracting/committing any Valve assets into the repo, changing the shipped 2D playback.

## Definition of done
- A written feasibility report in `vault/Reports/` that answers the question with an explicit **go / no-go / defer** recommendation and its reasoning.
- All four dimensions covered with concrete findings: (a) data sufficiency — what the parse has vs. needs, and the animgraph/not-serialized reality; (b) asset extraction + the legal/IP constraint; (c) the rendering paths compared on fidelity/automatability/embeddability/legal; (d) effort tiers vs. the existing 2D view.
- The recommendation is decision-ready: the user can act on it without further research.
- If a spike was run, its result (what worked / what it proved) is recorded; if not, the report says why it wasn't needed.
- No Valve assets committed; no change to the shipped app.

## Implementation
- branch: `auto/determine-feasibility-of-recreating-video-animations-of-figh` in `C:/Users/liamm/Scripts` (off `main`) — never touches main
- started: 2026-09-11T19:46

### Checkpoint log
- 2026-09-11T19:46 — branch created; supervised implementation started.
- 2026-09-11 — investigation + spike done. Assessed data sufficiency (positions/elevation/events ✓, facing derivable, **literal animation not in the `.dem`** — animgraph-driven), assets/legal (Valve `.vmdl` → glTF, IP risk like #24), and 3 render paths. **Spike** `dota_coach/docs/fight_3d_spike.html` (three.js, 10 animated placeholder models on real names/deaths from match 8979797378) ran clean in-browser, proving the web-3D render pipeline (option B). Committed `5e68245`, pushed branch (preserved, **not for merge**).
- 2026-09-11 — stage ④/⑤: feasibility report written → **recommendation DEFER (lean no-go)**: feasible but real anims need in-engine, real models are an IP call, effort weeks→months, marginal coaching uplift over the shipped 2D view. Report: [[2026-09-11-determine-feasibility-of-recreating-video-animations-of-figh]]. Cycle complete (research cycle — no PR to the app).
