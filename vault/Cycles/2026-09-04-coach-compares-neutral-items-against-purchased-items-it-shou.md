---
type: cycle
project: Dota Coach
stage: verify
status: done
verdict: pass
merged: 'https://github.com/liammpek16/dota-projects/pull/14'
task: >-
  coach compares neutral items against purchased items. It should be able to
  make the distinction
started: '2026-09-04'
readme_source: 'https://github.com/liammpek16/dota-projects'
branch: auto/coach-compares-neutral-items-against-purchased-items-it-shou
target_path: 'C:/Users/liamm/Scripts'
report: 2026-09-04-coach-compares-neutral-items-against-purchased-items-it-shou
---

## Task (from SELECT)
coach compares neutral items against purchased items. It should be able to make the distinction

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
5-persona council on the gap between "coach compares neutral items against purchased items" and the goal (trustworthy coaching).

- **First-Principles Thinker** — `Dota_Game_Summary._player_final_items` builds one flat list of the 6 shop slots **plus** `item_neutral`, with no marker. The coach's "EACH HERO'S FINAL ITEMS" line then reads e.g. "Black King Bar, Manta Style, …, Pirate Hat" — the neutral (Pirate Hat) is indistinguishable from bought items, so the coach critiques it as an itemization choice or compares it against purchased items. Neutrals are dropped from neutral creeps, not bought, so that comparison is category-invalid.
- **Contrarian** — Good news: the counter-item "already built?" check uses `_player_owned_items` (purchase_log), where neutrals never appear, so recommendations aren't corrupted — the defect is purely the undifferentiated FINAL ITEMS list + no prompt rule. Don't over-engineer a neutral-tier evaluation system; just make the distinction visible and tell the coach to respect it.
- **Executor** — Branch-sized: tag the neutral in `_player_final_items` (append "(neutral)") and add a prompt rule that neutrals aren't purchased and mustn't be compared against the bought build. `your_items` (item_analysis) is display-only, so tagging is safe.
- **Outsider** — A player doesn't want "why Pirate Hat over a real item" — Pirate Hat wasn't a shop decision. Distinguishing it stops nonsensical advice.
- **Expansionist (deferred)** — Grading neutral-item *choice* (was this the best neutral for the tier/role?) is a separate future feature; the ask here is only to stop conflating neutrals with purchases.

## Refined task spec
**Distinguish the neutral item from purchased items, in the Dota repo (`C:/Users/liamm/Scripts`).**

1. **`Dota_Game_Summary._player_final_items`** — keep the 6 shop slots as-is, but tag the neutral slot clearly, e.g. `"Pirate Hat (neutral)"`, so every consumer (the coach's `player_builds.final_items` and `item_analysis.your_items`) can tell it apart. Neutral rendered only when present.
2. **`coaching_agent` prompt** — in the EACH HERO'S FINAL ITEMS block (and the ITEMS rule in `_SYSTEM`), state that an item tagged "(neutral)" is a neutral item dropped from neutral creeps, not bought: do NOT compare it against or lump it with purchased items, and don't recommend swapping a purchased item for a neutral or vice versa.

Out of scope (logged follow-up): evaluating whether the chosen neutral was the best option for its tier/role.

## Definition of done
- `_player_final_items` returns the neutral item tagged "(neutral)"; the 6 purchased slots are untagged; a hero with no neutral shows no neutral entry.
- The coach's FINAL ITEMS list and `item_analysis.your_items` both carry the tag.
- The prompt instructs the coach not to compare/lump the neutral with purchased items.
- No regression: heroes with empty slots, no neutral, or unknown item ids still format cleanly; counter-item recommendations (purchase_log-based) unchanged.
- Adversarial verify: neutral present/absent, only-neutral inventory, unknown neutral id, all-empty inventory, and confirm purchased items are never tagged.

## Implementation
- branch: `auto/coach-compares-neutral-items-against-purchased-items-it-shou` in `C:/Users/liamm/Scripts` (off `main`) — never touches main
- started: 2026-09-04T18:35

### Checkpoint log
- 2026-09-04T18:35 — branch created; supervised implementation started.
