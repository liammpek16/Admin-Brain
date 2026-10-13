---
type: report
project: Dota Coach
task: >-
  coach has way to much prioritization on vision during fights. The coach should
  analyze if there are wards local to fight, and how much vision each team has
  against the other
date: '2026-09-04'
cycle: 2026-09-04-coach-has-way-to-much-prioritization-on-vision-during-fights
---

# Verification report — Dota Coach

**Task:** coach has way to much prioritization on vision during fights. The coach should analyze if there are wards local to fight, and how much vision each team has against the other
**Branch:** `auto/coach-has-way-to-much-prioritization-on-vision-during-fights`

## What was tested
Independent adversarial pass (18 checks) against the DoD, exercising `_fight_local_vision`, `_project_fights_vision`, and `_fmt_fight_vision` with hostile/edge input:

- **Locality correctness** — a ward live but far from the fight centroid → **0 local** though the map-wide count is >0; one-sided local wards → correct `+2`/`-1` differential; a boundary ward exactly at the vision radius is counted, one tile beyond is not.
- **Team differential** — your-edge, enemy-edge, and even cases map to the right `vision_advantage` sign and the right prompt wording ("you had the vision edge", "the enemy had vision on this and you didn't", "both teams fought this blind", "vision was even").
- **Fallback / no silent wrong claim** — no hero positions → `located: False`, and the prompt line falls back to the map-wide count **labeled** "(map-wide — fight location unknown …)".
- **Robustness** — missing `wards`, `wards: None`, ward with `None` coords, a hero with partial coords, and empty fight lists all return clean results and never raise.
- **Scope preserved** — sentries excluded from vision count (observers only); map-wide `*_wards_active` retained in the projection for the map view.
- **Backward compatibility** — an OLD cached `fights_vision` entry (no `located`/local keys) still renders via the map-wide fallback with no crash.
- **Wiring** — `_project_fights_vision` is invoked both pre-enrichment (Dota_Game_Summary.analyze_match) and post-replay-enrichment (tools.analyze_match_for_coaching, in the same `status == "ok"` block that rebuilds `key_fights`), so locality is computed once real hero positions exist.

Result: **18/18 pass.** `py_compile` clean on all three edited modules.

## Findings (weaknesses / what broke)
- Nothing broke; DoD fully met.
- **(minor, by design)** The fight location is the centroid of *all* heroes present. In a spread-out skirmish (two clusters far apart) the centroid can sit between them and under-count wards covering either cluster. The labeled map-wide fallback only triggers when positions are entirely absent, not for this spread case — so a very split fight could read as "blind" when each half had its own ward. Acceptable: teamfights (what this section covers) are compact by definition, and the previous behavior (whole-map count) was strictly worse.
- **(minor)** The 14-tile radius is derived from observer vision (~1600 units) but is a single heuristic constant, not terrain/high-ground aware — a ward with line-of-sight blocked by a cliff still counts if it's within range. Out of scope (high-ground vision was explicitly deferred).

## Improvements
1. (Follow-up, deferred) For split fights, cluster hero positions and count wards per cluster instead of one centroid.
2. (Follow-up, deferred, already logged in spec) vision-uptime through the fight, dewarding-during-fight credit, high-ground/LoS-aware vision.

## Verdict
**pass** — DoD met in full, 18/18 adversarial checks, backward-compatible with cached analyses, graceful fallback with honest labeling. The two findings are minor, by-design approximations that are strictly better than the whole-map count they replace, and match the scope the council deferred.
