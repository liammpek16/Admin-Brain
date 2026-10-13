---
type: cycle
project: Dota Coach
stage: verify
status: done
verdict: pass-with-notes
merged: 'https://github.com/liammpek16/dota-projects/pull/13'
task: >-
  weird behavior about missing abilities that have a release function (hoodwink
  sharpshooter, aa blast)
started: '2026-09-04'
readme_source: 'https://github.com/liammpek16/dota-projects'
branch: auto/weird-behavior-about-missing-abilities-that-have-a-release-f
target_path: 'C:/Users/liamm/Scripts'
report: 2026-09-04-weird-behavior-about-missing-abilities-that-have-a-release-f
---

## Task (from SELECT)
weird behavior about missing abilities that have a release function (hoodwink sharpshooter, aa blast)

## Project goal — source: https://github.com/liammpek16/dota-projects
```
# dota-projects

A collection of personal Dota 2 analysis and coaching projects.

## Contents

| Path | Description |
|------|-------------|
| `dota_coach/` | Dota 2 coaching app — replay parsing, coaching/research agents, telemetry, dashboard, and a web app. |
| `Dota_Game_Summary.py` | Generates a summary report for a Dota match. |
| `dota_knowledge.py`, `dota_knowledge_ext.py` | Static Dota knowledge bases (heroes, items, mechanics). |
| `report_html.py` | Builds HTML match reports. |
| `run-webapp.ps1` | Launches the coaching web app. |
| `tools/manta_positions/` | Go tool for extracting positional data from replays. |

## Notes

Large or regenerable files are intentionally **not** tracked in git (see `.gitignore`):
Dota replay files (`*.dem`), per-match data dumps, the local `coach.db`, compiled
binaries, and Python caches. Reference data (`dota_coach/data/constants/`) is kept.

## Setup

```bash
# Python projects
cd dota_coach
pip install -r requirements.txt

# Go tool
cd tools/manta_positions
go build ./...
```

## Validation

`dota_coach/validate_constants.py` guards the knowledge layer the coaching interface relies
on, with two checks:

1. **Constants vs upstream** — diffs `data/constants/heroes.json` & `items.json` against the
   live OpenDota `/constants` (same upstream: `odota/dotaconstants`) over a bounded subset
   (hero name/roles/attack_type/primary_attr, item name/cost).
2. **Knowledge referential integrity** (local, no network) — every hero name used as a key in
   `dota_knowledge.py` / `dota_knowledge_ext.py` must exist in `heroes.json`. A stale or
   misspelled key is *silently skipped* by the coaching analysis, so this catches heroes whose
   coaching data quietly drops out (e.g. a rename mismatch).

Exit 0 = clean, 1 = discrepancies.

```bash
cd dota_coach
python validate_constants.py                 # both checks (constants needs network)
python validate_constants.py --knowledge     # only the local knowledge check (no network)
python validate_constants.py --offline       # skip upstream; knowledge only
python validate_constants.py --json          # machine-readable report
python validate_constants.py --upstream-dir DIR   # compare constants vs a pinned copy
python validate_constants.py --insecure      # workaround for broken local TLS chains
```

### Constants note

Two hero `localized_name`s in `data/constants/heroes.json` are **hand-corrected** to their
current in-game names — `Outworld Destroyer` (was the stale `Outworld Devourer`) and
`Ringmaster` (was `Ring Master`). The upstream `odota/dotaconstants` snapshot still carried the
old names, which silently dropped both heroes' coaching data (their knowledge keys use the
current names). If `heroes.json` is ever regenerated from a stale upstream, these can revert —
`python validate_constants.py --knowledge` is the regression net that catches it (exit 1 on any
dangling hero reference).
```

## Council refinement
5-persona council on the gap between "weird behavior about missing abilities (release-function)" and the goal (trustworthy coaching).

- **First-Principles Thinker** — Root cause found. Charged/channeled abilities log the cast and the effect under two different combat-log inflictors: `ancient_apparition_ice_blast` (tracer cast, no damage) vs `ancient_apparition_ice_blast_release` (the blast that deals damage/frostbite); same for `hoodwink_sharpshooter[_release]`. `replay.attach_combat` keys every spell by `_pretty_spell(raw_abil)`, so ONE ability splits into two entries: the cast half → casts>0, no damage → flagged a **wasted cast**; the effect half → casts=0, damage>0 → a separate "… Release" line with a phantom zero cast. To the player that's "the coach thinks I missed Ice Blast" and a duplicate/missing ability.
- **Contrarian** — Don't special-case only these two heroes; the `_release` suffix is Dota's general naming for the release phase of a charge/channel, so a targeted two-hero patch would leave every other release ability broken. Fix the class, not the instances.
- **Executor** — Branch-sized: fold `<ability>_release` back onto `<ability>` at the single name chokepoint (`_pretty_spell`), plus the OpenDota-side name normalizer (`Dota_Game_Summary._prettify_ability`) so `ability_uses`/`top_ability` collapse too. No pipeline/schema change; the merge makes cast + effect aggregate as one spell.
- **Outsider** — After the fix the coach says "you landed Ice Blast on their carry for 1.8k", not "wasted cast: Ice Blast" + "Ice Blast Release 1,800 (0 casts)". Trust restored.
- **Expansionist (deferred)** — A full ability-metadata table (charge/channel/sub-ability relationships) — overkill; a suffix fold covers the observed defect.

## Refined task spec
**Fold release-function ability names onto their base ability, in the Dota repo (`C:/Users/liamm/Scripts`).**

1. **`dota_coach/replay.py`** — add `_canonical_ability(raw)` that strips a trailing `_release` (case-insensitive) and call it inside `_pretty_spell` before prettifying. So combat-log `cast`/`dmg`/`heal`/`mod` events for `ancient_apparition_ice_blast` and `ancient_apparition_ice_blast_release` (and Sharpshooter, and any other `_release` ability) aggregate under ONE spell — cast count and damage/disable together.
2. **`Dota_Game_Summary.py`** — apply the same `_release` fold in `_prettify_ability` so the OpenDota `ability_uses` / `top_ability` path doesn't surface a separate "… Release" entry either.
3. **Consequence (no extra code)** — the wasted-cast detector no longer false-positives on the Ice Blast tracer / Sharpshooter charge, because the merged spell has both casts and effect.

Out of scope (logged follow-up): a general ability-metadata/sub-ability table; any release whose effect inflictor is NOT `base+"_release"` (none known for the reported heroes).

## Definition of done
- A fight whose combat log has `<abil>` (cast) and `<abil>_release` (damage/disable) produces **one** spell entry named for the base ability, with `casts>0` and the effect folded in — not two entries, and not a wasted cast.
- Verified specifically for `ancient_apparition_ice_blast[_release]` → "Ice Blast" and `hoodwink_sharpshooter[_release]` → "Sharpshooter".
- `_prettify_ability` (OpenDota path) collapses `_release` variants too.
- No regression: ordinary abilities, auto-attacks (`dota_unknown` → "Attack"), `item_*`, `modifier_*`, and empty names are unchanged; a genuinely wasted cast (base cast, nothing landed, no release) is still flagged.
- Adversarial verify: mixed case, `_release`-only vs base-only vs both, a `modifier_..._release` inflictor, and a normal ability name that merely contains but doesn't end in "release".

## Implementation
- branch: `auto/weird-behavior-about-missing-abilities-that-have-a-release-f` in `C:/Users/liamm/Scripts` (off `main`) — never touches main
- started: 2026-09-04T18:29

### Checkpoint log
- 2026-09-04T18:29 — branch created; supervised implementation started.
