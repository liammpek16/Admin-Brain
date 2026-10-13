---
type: report
project: Dota Coach
task: >-
  weird behavior about missing abilities that have a release function (hoodwink
  sharpshooter, aa blast)
date: '2026-09-04'
cycle: 2026-09-04-weird-behavior-about-missing-abilities-that-have-a-release-f
---

# Verification report — Dota Coach

**Task:** weird behavior about missing abilities that have a release function (hoodwink sharpshooter, aa blast)
**Branch:** `auto/weird-behavior-about-missing-abilities-that-have-a-release-f`

## What was tested
Independent adversarial pass (13 checks) on `_canonical_ability`, `_pretty_spell`, `_prettify_ability`, and an end-to-end `attach_combat` aggregation:

- **The core merge** — a combat log with `ancient_apparition_ice_blast` (cast) + `ancient_apparition_ice_blast_release` (1,800 dmg) yields **one** spell entry (`casts=1`, damage to the target folded in), not two, and is **not** flagged wasted. A normal (non-release) ability still produces exactly one entry — confirming the split was release-specific.
- **Class-wide** — base and release fold to the *same* label for AA (`ancient_apparition_ice_blast`), Hoodwink (`hoodwink_sharpshooter`), and an arbitrary control (`zeus_arc_lightning`), on both the replay and OpenDota name paths.
- **Robustness** — mixed case `_RELEASE`; `_release`-only vs base-only; `modifier_..._release`; a name containing but not *ending* in `_release` ("…released…", "release_…") is untouched; `dota_unknown`→"Attack"; `item_*`, empty, and `None` unaffected.
- **No false negative** — a genuinely wasted cast (base ability cast, nothing landed, no release) is still flagged.

Result: **13/13 pass** (2 initial failures were wrong expected-strings in the test, not code — `_prettify_ability` never dropped the hero prefix, pre-existing; re-confirmed no regression). `py_compile` clean on all four modules.

## Findings (weaknesses / what broke)
- The bug is fixed and nothing regressed.
- **(minor, pre-existing, out of scope)** `_pretty_spell` drops only ONE leading token as the hero prefix, so a two-word hero name yields e.g. "Apparition Ice Blast" instead of "Ice Blast" (Hoodwink is single-token, so "Hoodwink Sharpshooter"). This labeling nuance predates this change and is unrelated to the release-split defect; the ability is now correctly merged and attributed, just with the hero word retained. A hero-aware strip would need the hero-name list and risks over-stripping real ability words — deliberately not attempted here.

## Improvements
1. (Follow-up, deferred) Hero-aware ability prettification (use the hero-name table to drop multi-token hero prefixes) so labels read "Ice Blast" not "Apparition Ice Blast".
2. (Follow-up, deferred, per spec) A general ability-metadata/sub-ability table for any release whose effect inflictor isn't `base+"_release"` (none known for the reported heroes).

## Verdict
**pass-with-notes** — the reported defect (release-function abilities splitting into a phantom wasted cast + a duplicate "… Release" line) is fixed class-wide, verified end-to-end, with no regression and genuine wasted casts still caught. The one note is a pre-existing, cosmetic label nuance (multi-token hero prefixes), logged as a follow-up.
