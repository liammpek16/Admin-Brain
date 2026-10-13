---
type: report
project: Dota Coach
task: Make fight vision high-ground/line-of-sight aware
date: 2026-09-08
cycle: 2026-09-08-make-fight-vision-high-ground-line-of-sight-aware
branch: auto/make-fight-vision-high-ground-line-of-sight-aware
pr: https://github.com/liammpek16/dota-projects/pull/18
verdict: pass
---

# Verification report — Dota Coach

**Task:** Make fight vision high-ground/line-of-sight aware
**Branch:** `auto/make-fight-vision-high-ground-line-of-sight-aware` · **PR** #18 (draft)

## What was tested
Independent adversarial pass (separate from the implementation) against the definition of
done: replay Z emission, the elevation-grid builder, the LOS-aware ward credit, graceful
degradation, and the real end-to-end pipeline.

- **Replay Z (ground truth):** rebuilt the manta binary and parsed a real cached `.dem` —
  `m_cellZ`/`m_vecZ` resolve; whole-game Z spread 128.0–133.7 (Radiant-base high-ground
  heroes ~131 vs lane heroes ~129). Elevation is real and usable.
- **Unit / DoD (22/22):** grid built from Z (None without Z); nearest-cell fill; **(a)**
  low-ground ward under a high-ground fight dropped, control on flat ground credited (proves
  it's elevation, not radius); **(b)** equal-ground ward credited, `los_aware:true`; **(c)**
  ward behind an intervening peak dropped, control with a clear line credited; **(d)** no-Z
  input ⇒ byte-for-byte old counts, `los_aware:false`; **(e)** radius still enforced;
  sentries never counted; back-compatible signature.
- **Adversarial (16/16):** empty/None/malformed fight & grid input; **invariant over 400
  random fights — the LOS credit is never GREATER than the radius-only credit** (the rule
  can only remove false vision, never invent it); margin boundary is strict; zero-length
  raycast (ward at centroid); sparse grid → conservative credit; split-fight fronts; flat
  terrain is a no-op; map-wide `your/enemy_wards_active` untouched; pure/idempotent.
- **End-to-end (live match 8920276350, cached replay):** `force=True` fresh run →
  `replay_status: ok`, 8 fights all `located:true, los_aware:true`; local counts
  meaningfully tighter than map-wide (9:00 map-wide you=4 → local you=3; multiple enemy
  wards not covering the fight dropped to 0).

## Findings (weaknesses / what broke)
- **[fixed in-cycle, `91b712a`]** Two "never raises" contract gaps: `_build_elevation_grid`
  crashed on a non-dict snapshot, and `_ElevationGrid.at`/`los_blocked` raised on NaN/inf
  ward coords (the old flat-radius code returned a falsy comparison instead). Both guarded
  to skip / return-unknown. Not reachable from real OpenDota/replay data (coords are ints,
  snapshots are dicts), but the docstrings promise "never raises" and it's on the coaching
  critical path.
- **[minor, by design]** The elevation model is a *coarse* 4-tile grid learned from where
  heroes walked; cells no hero visited are unknown and treated conservatively (ward
  credited). LOS is a grid raycast, not per-tree occlusion — trees aren't modelled (they're
  dynamic and not in the data). `_ELEV_MARGIN=0.75` was chosen against the observed ~2-unit
  low/high gap; it's a module constant, tunable.
- **[minor]** Requires the manta binary to be **rebuilt** (`go build`) to get Z; an old
  binary silently yields `los_aware:false` (graceful, but the user must rebuild to benefit).
  Called out in the PR.

## Improvements
1. (Optional) Persist the elevation grid per match so a re-analysis without a replay parse
   can still apply LOS.
2. (Optional) Fill unknown cells by interpolating neighbours instead of leaving them
   conservative, for wards in rarely-walked corners.
3. (Optional) Surface `los_aware` in the webapp fight view (currently fights_vision is
   LLM-prompt-only).

## Verdict
**pass** — every DoD criterion met and independently confirmed; the one real finding (two
robustness gaps) was fixed within the cycle and re-verified (22/22 + 16/16). Remaining notes
are minor/by-design. Draft PR #18 ready for human review; `main` untouched.
