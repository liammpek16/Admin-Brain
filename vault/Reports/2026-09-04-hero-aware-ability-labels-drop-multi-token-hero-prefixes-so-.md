---
type: report
project: Dota Coach
task: >-
  Hero-aware ability labels: drop multi-token hero prefixes so abilities read
  Ice Blast not Apparition Ice Blast (follow-up to PR #13)
date: '2026-09-04'
cycle: 2026-09-04-hero-aware-ability-labels-drop-multi-token-hero-prefixes-so-
---

# Verification report — Dota Coach

**Task:** Hero-aware ability labels: drop multi-token hero prefixes so abilities read Ice Blast not Apparition Ice Blast (follow-up to PR #13)
**Branch:** `auto/hero-aware-ability-labels-drop-multi-token-hero-prefixes-so-`

## What was tested
Independent adversarial pass (16 checks) on `_pretty_spell` (replay) and `_prettify_ability` (OpenDota):

- **DoD core** — `ancient_apparition_ice_blast[_release]` → "Ice Blast", `hoodwink_sharpshooter` → "Sharpshooter", `sniper_shrapnel` → "Shrapnel", on BOTH paths, and the two paths agree.
- **Multi-word ability body** — `sven_storm_hammer` → "Storm Hammer" (hero stripped, ability body intact).
- **Non-hero / robustness** — `dota_unknown`→"Attack", empty→"Attack", `item_black_king_bar`→"Black King Bar", `None`→"Ability", `modifier_stunned`→"Stunned"; an unknown non-hero inflictor (`some_tower_attack`) is kept intact, not mangled by a positional token-drop.
- **Caching** — the hero-prefix set is cached (stable identity), non-empty (>50 heroes), and sorted longest-first so the most specific prefix wins.
- **Fallback proven live** — during the run the OpenDota constants endpoint returned 522; `_hero_ability_prefixes` fell back to the cached hero constants and still produced correct labels (best-effort path exercised for real).

Result: **16/16 pass.** `py_compile` clean.

## Findings (weaknesses / what broke)
- Nothing broke; DoD met on both name paths.
- **(minor)** If hero constants are entirely unavailable (no cache at all), `_hero_ability_prefixes` returns empty and labels keep the hero word (e.g. "Ancient Apparition Ice Blast") — a graceful degrade to the pre-fix behavior, not a crash.
- **(cosmetic)** Commit message has a typo ("Shrappshooter") in prose only; code and labels are correct.

## Improvements
1. (Optional, deferred) Use the localized ability display names from constants for an authoritative label table — bigger data dependency, not needed for the reported issue.

## Verdict
**pass** — ability labels are now hero-aware on both the replay and OpenDota paths ("Ice Blast", "Shrapnel", "Sharpshooter"), backed by the real hero-name list with longest-match, cached, and degrading gracefully (proven against a live 522 fallback). 16/16 adversarial, no regression.
