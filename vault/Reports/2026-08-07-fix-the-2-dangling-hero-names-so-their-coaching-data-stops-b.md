---
type: report
project: Dota Coach
task: Fix the 2 dangling hero names so their coaching data stops being dropped
date: '2026-08-07'
cycle: 2026-08-07-fix-the-2-dangling-hero-names-so-their-coaching-data-stops-b
verdict: pass
---

# Verification report — Dota Coach

**Task:** Fix the 2 dangling hero names so their coaching data stops being dropped
**Branch:** `auto/fix-the-2-dangling-hero-names-so-their-coaching-data-stops-b` · **PR:** #3

## What was tested
An independent adversarial suite (9 checks) against the two-name correction in `heroes.json`:

| # | Check | Result |
|---|-------|--------|
| T1 | Both corrected names present exactly once (`Outworld Destroyer`, `Ringmaster`) | ✅ |
| T2 | Stale names fully gone (`Outworld Devourer`, `Ring Master` → 0) | ✅ |
| T3 | **No duplicate `localized_name` introduced** (collision check — the real risk) | ✅ none |
| T4 | Hero count unchanged (127↔127); exactly ids 76 & 131 changed; **all other fields identical** | ✅ |
| T5 | `validate_constants.py --knowledge` → exit 0 | ✅ |
| T6 | Knowledge files (`dota_knowledge*.py`) untouched vs `main` | ✅ |
| T7 | **Real coaching join** — all 25 flagged references now resolve against `heroes.json` | ✅ |
| T8 | Regression guard still fires — re-inject a bad name → exit 1 | ✅ |
| T9 | Diff scope minimal (2 files: heroes.json ±2, README +10) | ✅ |

**Result: 9/9 passed.** Working copy left clean.

## The important one (T7)
This isn't just "the validator now passes." I simulated the actual coaching lookup and confirmed
that **all 25 references** — the exact set cycle-2 flagged — across `COUNTER_ITEMS`,
`HERO_COUNTERS`, `HERO_PROFILE`, `SINGLE_TARGET_LOCKDOWN`, and the `_EXT/_MIDS/_NEW` variants now
resolve. Outworld Destroyer's and Ringmaster's counter-items, counters, and profiles are back in
the coaching output. **The original "wrong/missing information in the coaching interface" is
genuinely closed for these two heroes.**

## Findings (weaknesses / honest notes)
1. **Durability depends on `heroes.json` not being regenerated from a stale upstream.** The fix
   edits reference data by hand; a naïve regen from the current `odota/dotaconstants` snapshot
   (which still carries the old names) would silently revert it. Mitigation in place: the
   `--knowledge` check is the regression net (T8 proves it fires). The *robust* fix — an
   alias/normalization map at join time — was deliberately deferred as out-of-scope.
2. **Item-reference integrity remains unchecked** (unchanged from cycle 2) — knowledge files
   reference items as freeform prose the validator can't verify.
3. **Adversarial suite still lives in scratch, not the repo** (unchanged from cycle 2).

## Improvements (prioritized)
1. **(Optional hardening) Add the alias/normalization map** so hero-name drift can't recur even
   across a `heroes.json` regen — the durable version of this fix.
2. Consider adding the validator to CI so a stale regen is caught automatically.
3. Commit the adversarial suite.

## Verdict
**pass.** Two-string-edit fix, join-safe (id is the API key), no collateral, and it verifiably
restores real coaching data for both heroes (25/25 refs resolve). Safe on the branch behind
draft PR #3. The only open item is *durability* (regen could revert), which the new validator
guards against and the deferred alias-map would eliminate.
