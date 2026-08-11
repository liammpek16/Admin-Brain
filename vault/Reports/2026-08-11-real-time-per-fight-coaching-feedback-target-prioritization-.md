---
type: report
project: Dota Coach
task: Deterministic per-fight coaching read (target priority / missed spells / positioning)
date: '2026-08-11'
cycle: 2026-08-11-real-time-per-fight-coaching-feedback-target-prioritization-
verdict: pass-with-notes
---

# Verification report — Dota Coach (per-fight coaching read)

**Task:** Real-time per-fight coaching feedback — target prioritization, missed spells, positioning
**Branch:** `auto/real-time-per-fight-coaching-feedback-target-prioritization-` · **PR:** dota-projects #4

## What was tested
Independent adversarial pass against the running demo webapp (`-Demo`, port 8099):

| # | Check | Result |
|---|-------|--------|
| D1 | `GET /api/match/<id>/fights` returns verdicts with `matched:false`, wasted casts, caught-alone death | ✅ |
| D2 | Card renders three verdicts — ✗✗✗ on the bad 24:00 fight, ✓✓✓ on the clean 33:00 | ✅ |
| V1 | Missing `player_id` → 400 | ✅ |
| V2 | Non-numeric match id → 400 | ✅ |
| V3 | Unknown demo match id → 404 | ✅ |
| V4 | Valid → 200 | ✅ |
| A1 | Fight with **no verdict** (8:00) → no card, and the fight view still renders (no crash) | ✅ |
| A2 | **XSS** — hostile hero/spell names in a verdict are escaped, not injected | ✅ |
| A3 | No `/api/coach` (LLM) call when opening a fight — the card is purely from `/api/fights` | ✅ by construction |

Core is solid: the deterministic verdicts render instantly, degrade cleanly when a fight has no
verdict, and are XSS-safe. Existing Heroes/Charts/Fight-map/coach views are untouched.

## Findings

1. **Minor: the "Missed spells" row always renders.** `coachingReadHTML` pushes a missed-spells
   row unconditionally, so a verdict with **no your-team participant data** would show a misleading
   "✓ no wasted casts" (can't tell "clean" from "no data"). Not reachable from the real endpoint
   (verdicts built by `_summarize_fight_for_coaching` always carry participants), but the row should
   guard on `participants.some(p => p.is_yours)`. One-line fix.
2. **Live path not exercised against a real replay.** The demo path is fully verified; the live path
   (`tools.match_fights`) is a thin wrapper returning `analyze_match_for_coaching`'s existing
   `key_fights` — the coach's own data — and degrades to `{fights:[], replay_status}` by construction,
   so it's low-risk, but a real parsed match wasn't available to confirm end-to-end.
3. **Out of scope but important — `heroes.json` regressed during testing.** Running the app
   regenerated `data/constants/heroes.json` from a stale upstream, reverting the hand-corrected
   `Outworld Destroyer` / `Ringmaster` back to `Outworld Devourer` / `Ring Master` (validator → exit
   1). This is exactly the regression PR #3's report warned about, now observed firing in practice. I
   restored the file; it is **not** in this PR. The coaching-data-drop bug silently returns whenever
   this happens.

## Improvements (prioritized)
1. **Harden the hero-name fix (finding #3)** — protect the hand-corrections when constants refresh
   (an alias/normalization map, or don't overwrite localized_names on refresh). This is a real
   coaching-correctness bug that reappears on its own — higher value than the cosmetic note.
2. Guard the missed-spells row on having your-team participants (finding #1).
3. Confirm the live path on a real parsed match when one's available.

## Verdict
**pass-with-notes.** Meets its DoD — the webapp shows an instant, deterministic per-fight Coaching
read (target priority / missed spells / positioning) with no LLM call; validated end-to-end in demo
(endpoint 200, ✗✗✗ / ✓✓✓ cards), robust (graceful no-verdict, XSS-safe), existing views unaffected.
Safe on the branch behind draft PR #4. **Recommended follow-up (⑤ → ①):** "Harden heroes.json hand-
corrections so a constants refresh can't silently revert Outworld Destroyer / Ringmaster."
