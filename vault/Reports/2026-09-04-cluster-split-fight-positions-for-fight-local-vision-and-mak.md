---
type: report
project: Dota Coach
task: >-
  Cluster split-fight positions for fight-local vision, and make vision
  high-ground/line-of-sight aware (follow-up to PR #11)
date: '2026-09-04'
cycle: 2026-09-04-cluster-split-fight-positions-for-fight-local-vision-and-mak
---

# Verification report — Dota Coach

**Task:** Cluster split-fight positions for fight-local vision, and make vision high-ground/line-of-sight aware (follow-up to PR #11)
**Branch:** `auto/cluster-split-fight-positions-for-fight-local-vision-and-mak`

## What was tested
Independent adversarial pass (9 checks) on `_fight_centroids` / `_fight_local_vision`:

- **Backward compat** — a compact fight yields ONE centroid (the global mean) and identical local counts to the pre-clustering code (far ward still excluded).
- **The fix** — a two-front fight (clusters ~ (100,100) and ~(170,170)) yields TWO centroids and credits a ward near each front as local (2), where the old single-centroid (~(135,135)) would have counted **0** (explicitly computed and asserted in the test).
- **Between-fronts** — a ward sitting between the two fronts, near neither, is correctly NOT local.
- **Degenerate** — 1 hero, 5 coincident heroes (→ one centroid), and missing positions (`located: False`) all safe, no crash.

Result: **9/9 pass.** `py_compile` clean.

## Findings (weaknesses / what broke)
- Nothing broke; DoD met and backward compatibility preserved.
- **(minor, by design)** Greedy single-pass clustering with a running centroid is order-dependent in principle; for the realistic case (a couple of well-separated fronts) it's stable, and the compact path (the vast majority of fights) bypasses clustering entirely so is fully deterministic.
- **(scope, deferred)** High-ground / line-of-sight-aware vision is NOT delivered — no terrain/elevation source exists. It remains a roadmap item blocked on that data.

## Improvements
1. (Follow-up, deferred) High-ground/LoS vision once a terrain height map / navmesh source is available.
2. (Optional) If ever needed, a more robust clusterer (k-means/DBSCAN) — not warranted at current fight sizes.

## Verdict
**pass** — split-fight vision is now credited per front while compact fights stay byte-for-byte identical to PR #11; 9/9 adversarial, no regression. High-ground/LoS correctly deferred (no data), as scoped.
