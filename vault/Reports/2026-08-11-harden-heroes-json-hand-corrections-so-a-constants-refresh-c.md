---
type: report
project: Dota Coach
task: Keep hand-corrected hero names across a constants refresh
date: '2026-08-11'
cycle: 2026-08-11-harden-heroes-json-hand-corrections-so-a-constants-refresh-c
verdict: pass
---

# Verification report — Dota Coach (hero-name overlay)

**Task:** Harden heroes.json hand-corrections so a constants refresh can't silently revert them
**Branch:** `auto/harden-heroes-json-hand-corrections-so-a-constants-refresh-c` · **PR:** dota-projects #5

## What was tested
Independent adversarial pass, no network (monkeypatched `request_with_retries`):

| # | Check | Result |
|---|-------|--------|
| A1 | **Successful refresh** returning the STALE upstream table → return + on-disk both corrected | ✅ `Outworld Destroyer` / `Ringmaster` |
| A1b | All 127 heroes preserved; `validate_constants.py --knowledge` → exit 0 (was 1) | ✅ |
| A2 | **Offline fallback** (fetch raises) with an already-STALE disk cache → does it serve stale? | ⚠ **found: yes** → **fixed** (overlay now applied on the fallback read too) → ✅ corrected |
| A3 | **Item constants** path unaffected (no overrides passed) | ✅ round-trips |
| A4 | `_apply_hero_overrides` defensive (None / empty / non-dict / missing-id / list) + idempotent | ✅ |
| A5 | heroes.json round-trips byte-identical to committed after a corrected refresh | ✅ |

## Findings (found + resolved in-cycle)

1. **Offline-fallback read didn't re-apply the overlay (fixed).** The first commit applied overrides
   only on a *successful* fetch (before the disk write). So if the on-disk cache were already stale
   **and** OpenDota were down, `_cached_constants` returned the stale cached copy unchanged — a path
   where the names could still be wrong at runtime. Since this cycle's whole guarantee is "names can't
   silently revert," I closed it in the same PR: the `except` branch now applies `overrides(cached)`
   before returning. Re-verified (A2) → corrected. (It does not re-write the disk on the degraded
   outage path — the returned data is corrected, which is what the coaching join needs; a successful
   fetch later re-writes the corrected file.)

## Notes (no action needed)
- The overlay is **id-keyed** (76 / 131), robust to the exact thing that drifts (names). If Valve
  renames these again the overlay is a one-line update; the validator remains the net that tells you.
- Live path against a real OpenDota fetch wasn't exercised (network blocked here), but both code paths
  (success + fallback) are covered by the monkeypatch tests, and the disk round-trips identically.

## Verdict
**pass.** The fix targets the actual root cause (the clobbering write in `_cached_constants`), keeps
`heroes.json` correct for every reader on both the refresh and outage-fallback paths, is defensive and
idempotent, and leaves item constants untouched. Validator goes exit 1 → exit 0 after a simulated
stale refresh. Safe on the branch behind draft PR #5.
