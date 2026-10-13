---
type: report
project: Dota Coach
task: >-
  coach compares neutral items against purchased items. It should be able to
  make the distinction
date: '2026-09-04'
cycle: 2026-09-04-coach-compares-neutral-items-against-purchased-items-it-shou
---

# Verification report — Dota Coach

**Task:** coach compares neutral items against purchased items. It should be able to make the distinction
**Branch:** `auto/coach-compares-neutral-items-against-purchased-items-it-shou`

## What was tested
Independent adversarial pass (11 checks) on `_player_final_items` and the prompt:

- **Tagging** — a full inventory + neutral yields the 6 shop items untagged and the neutral as "Pirate Hat (neutral)"; purchased slots are never tagged.
- **Neutral absence** — `item_neutral: 0` and a missing `item_neutral` key both produce no neutral entry.
- **Edge inventories** — only-neutral inventory tags correctly; an unknown neutral id still renders tagged ("item 999 (neutral)"); an unknown purchased id is NOT tagged; an all-empty inventory returns `[]`.
- **Prompt** — the FINAL ITEMS block and the `_SYSTEM` ITEMS rule both carry the "(neutral) = dropped from neutral creeps, not bought; don't compare/swap with purchased" instruction; `_build_prompt` renders a tagged neutral in a real player_builds entry.

Result: **11/11 pass.** `py_compile` clean.

## Findings (weaknesses / what broke)
- Nothing broke; DoD fully met.
- **(confirmed safe)** Counter-item recommendations use `_player_owned_items` (purchase_log), where neutrals never appear, so they were already correct and are untouched — verified by inspection.
- **(minor, expected)** As with the other prompt-facing cycles, the coach *honoring* the new rule in prose is LLM-side; the data now makes the distinction unambiguous and the instruction is explicit, which is the deterministic part. User confirms on a live review.

## Improvements
1. (Follow-up, deferred, per spec) Grade the neutral *choice* itself (best neutral for the tier/role) — a separate feature, not this defect.

## Verdict
**pass** — the neutral item is now clearly distinguished from purchased items in the data the coach receives, the prompt forbids comparing/swapping across the two categories, purchased items are never mistagged, and recommendations are unaffected (11/11).
