---
type: cycle
project: Dota Coach
stage: verify
status: done
task: Fix the 2 dangling hero names so their coaching data stops being dropped
started: '2026-08-07'
readme_source: 'https://github.com/liammpek16/dota-projects'
branch: auto/fix-the-2-dangling-hero-names-so-their-coaching-data-stops-b
target_path: 'C:/Users/liamm/Scripts'
report: 2026-08-07-fix-the-2-dangling-hero-names-so-their-coaching-data-stops-b
---

## Task (from SELECT)
Fix the 2 dangling hero names so their coaching data stops being dropped

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
```

## Council refinement
_The task is clear; the real question is **which side to change**. Ground truth: `heroes.json`
has stale `"Outworld Devourer"` / `"Ring Master"`; the knowledge files use the live-game
`"Outworld Destroyer"` (10 refs) / `"Ringmaster"` (5 refs). So the knowledge base is correct
and `heroes.json` is the stale join key._

**🔴 Contrarian** — Don't "fix" the knowledge files to match a *wrong* dataset. Renaming the
knowledge keys to `Outworld Devourer` / `Ring Master` would make the validator pass while
showing players **outdated hero names** — trading a silent drop for silently-wrong output.
The stale side is `heroes.json`.

**🔵 First-Principles** — The coaching join is `knowledge[hero.localized_name]`. It fails only
because the two names disagree. The minimal, correct reconciliation is to make the **join key**
(`heroes.json.localized_name`) equal the live-game name the rest of the app already uses. Two
string edits; nothing else moves.

**🟢 Expansionist** — But `heroes.json` is *reference data that mirrors `odota/dotaconstants`*.
Hand-editing it diverges from upstream, and a future regen silently re-introduces the bug. The
durable answer is an **alias/normalization map** applied at join time, so drift can't recur.

**⚪ Outsider** — I just want Outworld Destroyer's coaching to show up, with the right name. As
long as it's fixed and correct, I don't care where the edit lives.

**🟡 Executor** — Both fixes are branch-sized. Ship the direct correction (edit the 2
`localized_name`s in `heroes.json` to the live names), because the knowledge base — the larger,
hand-curated asset — already holds the truth, and **the validator we just built is the
regression net** if a regen ever reverts it. Log the alias-map as the follow-up hardening.

**Resolution:** Correct `heroes.json` (the stale side) → `Outworld Destroyer`, `Ringmaster`.
One-directional, matches the 15 existing knowledge refs, and re-running `validate_constants.py
--knowledge` proves the drop is gone (0 dangling). Note the divergence-from-upstream risk in
the code; the validator guards regressions. Alias-layer noted as future hardening (Contrarian's
concern is real but heavier than this cycle).

## Refined task spec
**Correct the two stale hero names in `dota_coach/data/constants/heroes.json`:**
- `"localized_name": "Outworld Devourer"` → `"Outworld Destroyer"`
- `"localized_name": "Ring Master"` → `"Ringmaster"`
- Change **only** the `localized_name` field for those two hero entries; touch nothing else in
  the file (ids, npc names, stats stay put — id is the API join key, so this is join-safe).
- Add a short `## Constants note` to the README documenting that these two names are
  hand-corrected vs a stale `dotaconstants`, and that `validate_constants.py --knowledge`
  guards against regressions.
- **Out of scope:** the alias/normalization map (logged as follow-up); any other hero.

## Definition of done
- `heroes.json` shows `Outworld Destroyer` and `Ringmaster`; the old names are gone.
- `python validate_constants.py --knowledge` → **0 dangling references, exit 0** (was 25 refs /
  2 heroes / exit 1).
- No other `localized_name` or field changed (diff is exactly two string edits + README note).
- The knowledge files are **not** modified.

## Implementation
- branch: `auto/fix-the-2-dangling-hero-names-so-their-coaching-data-stops-b` in `C:/Users/liamm/Scripts` (off `main`) — never touches main
- started: 2026-08-07T17:35

### Checkpoint log
- 2026-08-07T17:35 — branch created; supervised implementation started.
- 2026-08-07T17:42 — Applied the two `localized_name` edits in `heroes.json`
  (`Outworld Devourer`→`Outworld Destroyer`, `Ring Master`→`Ringmaster`) via a verified
  exact-count replacement. JSON still valid. `validate_constants.py --knowledge` → **KNOWLEDGE:
  OK, exit 0** (was 25 dangling / exit 1). Added README `## Constants note`. Commit `cfa4c1b`.
  Draft PR: https://github.com/liammpek16/dota-projects/pull/3.

### Result — DoD check
- ✅ `heroes.json` shows `Outworld Destroyer` and `Ringmaster`; the stale names are gone.
- ✅ `validate_constants.py --knowledge` → 0 dangling references, exit 0 (was 25 / 2 heroes / 1).
- ✅ Diff is exactly two `localized_name` edits + README note (`git diff --stat`: heroes.json ±2, README +10).
- ✅ Knowledge files untouched.

**Implement complete.** Ready for Phase D (verify).

## Verify (Phase D)
Independent verification: **pass** — 9/9 adversarial checks. Confirmed the *real* coaching join
(not just the validator): **all 25 flagged references now resolve**, so Outworld Destroyer's and
Ringmaster's coaching data is genuinely restored. No collateral (127 heroes, exactly ids 76 &
131 renamed, all other fields identical, no name collisions), knowledge files untouched, and the
regression guard still fires. Report:
[[2026-08-07-fix-the-2-dangling-hero-names-so-their-coaching-data-stops-b]].
**Open item (not blocking):** durability — a `heroes.json` regen from stale upstream could
revert this; the `--knowledge` check guards it, and the deferred **alias-map** would eliminate
it. Recommended optional follow-up: add the alias/normalization map.

_Cycle complete (PR #3 draft, awaiting your review/merge). This closes the coaching bug the
cycle-2 validator discovered._
