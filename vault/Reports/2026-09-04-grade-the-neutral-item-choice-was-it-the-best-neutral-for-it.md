---
type: report
project: Dota Coach
task: >-
  Grade the neutral item choice - was it the best neutral for its tier/role
  (follow-up to PR #14)
date: '2026-09-04'
cycle: 2026-09-04-grade-the-neutral-item-choice-was-it-the-best-neutral-for-it
---

# Verification report — Dota Coach

**Task:** Grade the neutral item choice - was it the best neutral for its tier/role (follow-up to PR #14)
**Branch:** `auto/grade-the-neutral-item-choice-was-it-the-best-neutral-for-it`

## What was tested
Independent adversarial pass (10 checks) on `_item_tier_by_id` / `_player_final_items` and the prompt (scope A):

- **Tier tagging** — a neutral with a known tier renders "Pirate Hat (neutral, tier 4)"; purchased items are never tagged or tiered.
- **Graceful degrade** — neutral with no tier in the map, no tier map passed at all, and an unknown neutral id all fall back to plain "(neutral)" (never a wrong tier).
- **Absence** — a hero with no neutral shows no neutral entry.
- **Real data** — `_item_tier_by_id(fetch_item_constants())` returns a non-empty int-valued map (the neutral pool).
- **Prompt** — `_build_prompt` renders the tiered neutral and the rule instructs judging the neutral against same-tier neutrals only, never against purchased items.

Result: **10/10 pass.** `py_compile` clean.

## Findings (weaknesses / what broke)
- Nothing broke; DoD (scope A) met.
- **(scope, by design)** This is scope A: the coach *reasons* about the neutral within its tier; there is no deterministic "best neutral" verdict. That's intentional — scope B (a curated tier→role table) was deferred to avoid brittle, patch-stale advice.
- **(minor)** OpenDota's `tier` field is the authority for a neutral's tier; if upstream omits a tier for some neutral, that item degrades to plain "(neutral)" (no wrong tier shown). Acceptable.
- **(LLM-side)** As with the other prompt cycles, the coach honoring the within-tier framing in prose is the model's part; the data + rule are the deterministic, verified part.

## Improvements
1. (Follow-up, deferred = scope B) A curated tier→role neutral knowledge base + deterministic best-in-tier grading, ideally sourced from real pick/winrate data to stay current.

## Verdict
**pass** — the neutral now carries its tier in the data the coach sees, the prompt confines any neutral judgment to same-tier alternatives (never purchased items), purchased items stay untagged, and every missing-data path degrades cleanly (10/10). Deterministic best-in-tier grading correctly deferred as scope B.
