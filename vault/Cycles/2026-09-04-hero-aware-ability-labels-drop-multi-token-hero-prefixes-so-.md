---
type: cycle
project: Dota Coach
stage: verify
status: done
verdict: pass
merged: 'https://github.com/liammpek16/dota-projects/pull/16'
task: >-
  Hero-aware ability labels: drop multi-token hero prefixes so abilities read
  Ice Blast not Apparition Ice Blast (follow-up to PR #13)
started: '2026-09-04'
readme_source: 'https://github.com/liammpek16/dota-projects'
branch: auto/hero-aware-ability-labels-drop-multi-token-hero-prefixes-so-
target_path: 'C:/Users/liamm/Scripts'
report: 2026-09-04-hero-aware-ability-labels-drop-multi-token-hero-prefixes-so-
---

## Task (from SELECT)
Hero-aware ability labels: drop multi-token hero prefixes so abilities read Ice Blast not Apparition Ice Blast (follow-up to PR #13)

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
Follow-up to PR #13 (the pre-existing label nuance surfaced there).

- **First-Principles Thinker** — Two inconsistent prettifiers: `replay._pretty_spell` drops exactly ONE leading token (so `ancient_apparition_ice_blast` → "Apparition Ice Blast"), and `Dota_Game_Summary._prettify_ability` drops NONE (`sniper_shrapnel` → "Sniper Shrapnel"). Both guess at the hero prefix by token position instead of knowing the actual hero names. The fix is to strip the real hero prefix using the hero-name list from `fetch_hero_constants`.
- **Contrarian** — Token-count heuristics will always misfire (single- vs multi-word heroes, abilities whose name repeats a hero word). Use the authoritative hero-name set, and strip the LONGEST matching prefix so "ancient_apparition_" goes but a coincidental word doesn't.
- **Executor** — Branch-sized: build a cached set of hero internal-name prefixes (from `npc_dota_hero_<name>` → `<name>_`), and in both prettifiers strip the longest matching prefix before titple-casing. Keep the `_release` fold (PR #13) applied first. Don't thread constants through every call — cache a module-level prefix set, lazily.
- **Outsider** — "Ice Blast", "Shrapnel", "Sharpshooter" read cleanly; "Apparition Ice Blast" / "Sniper Shrapnel" look like bugs.
- **Expansionist (deferred)** — A full ability display-name table (localized ability names from constants) would be even nicer but is a bigger data dependency; prefix-strip is enough.

## Refined task spec
**Hero-aware ability prettification in both name paths (Dota repo).**

1. Build a cached hero-prefix set from `fetch_hero_constants` (each hero's `name` minus `npc_dota_hero_`, e.g. `ancient_apparition`), longest-first for matching.
2. `replay._pretty_spell` and `Dota_Game_Summary._prettify_ability`: after the existing `_release` fold and `modifier_`/`item_` handling, strip the longest hero prefix that the ability key starts with (e.g. `ancient_apparition_ice_blast` → `ice_blast` → "Ice Blast"; `sniper_shrapnel` → "Shrapnel"), then title-case.
3. Fall back to current behavior when no hero prefix matches (generic/item/modifier names unchanged).

Out of scope: full localized ability-name table from constants.

## Definition of done
- `ancient_apparition_ice_blast[_release]` → "Ice Blast"; `hoodwink_sharpshooter[_release]` → "Sharpshooter"; `sniper_shrapnel` → "Shrapnel".
- Both the replay path (`_pretty_spell`) and OpenDota path (`_prettify_ability`) agree.
- Non-hero inflictors, `item_*`, `modifier_*`, `dota_unknown`→"Attack", empty/None unchanged; the `_release` fold still applies.
- Hero-prefix set is cached (no per-call constants fetch).
- Adversarial verify: single- vs multi-word hero prefixes, an ability whose suffix coincidentally equals a hero word, an unknown/non-hero inflictor, and the interaction with `_release`.

## Implementation
- branch: `auto/hero-aware-ability-labels-drop-multi-token-hero-prefixes-so-` in `C:/Users/liamm/Scripts` (off `main`) — never touches main
- started: 2026-09-04T18:48

### Checkpoint log
- 2026-09-04T18:48 — branch created; supervised implementation started.
