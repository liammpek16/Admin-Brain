---
type: cycle
project: Dota Coach
stage: verify
status: done
task: Extend the constants validator to ability facts and the knowledge Python files
started: '2026-08-07'
readme_source: 'https://github.com/liammpek16/dota-projects'
branch: auto/extend-the-constants-validator-to-ability-facts-and-the-know
target_path: 'C:/Users/liamm/Scripts'
report: 2026-08-07-extend-the-constants-validator-to-ability-facts-and-the-know
---

## Task (from SELECT)
Extend the constants validator to ability facts and the knowledge Python files

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

`dota_coach/validate_constants.py` checks the local constants
(`data/constants/heroes.json`, `items.json`) against the live OpenDota `/constants`
(same upstream: `odota/dotaconstants`) over a bounded subset — hero
name/roles/attack_type/primary_attr and item name/cost — and reports any discrepancies.
Guards the knowledge layer the coaching interface relies on. Exit 0 = clean, 1 = mismatches.

```bash
cd dota_coach
python validate_constants.py                 # live check (human-readable)
python validate_constants.py --json          # machine-readable report
python validate_constants.py --upstream-dir DIR   # compare vs a pinned copy
python validate_constants.py --insecure      # workaround for broken local TLS chains
```
```

## Council refinement
**🔴 Contrarian** — This bundles two things, and one is a phantom. There are **no local
ability constants** (`data/constants/` holds only heroes.json + items.json), and the
knowledge files don't key by ability — so "ability facts" has nothing local to check. Chasing
it means *inventing* an abilities dataset (a separate task), not "extending the validator."

**🔵 First-Principles** — What actually breaks the coaching output? `dota_knowledge*.py` is
keyed by hero `localized_name`, and its own docstring admits: *"anything not present here is
simply skipped… partial coverage degrades gracefully."* So a misspelled/stale hero key
**silently drops** that hero's counter-items/profile — an invisible correctness hole. The
verifiable core is **referential integrity**: every hero key must exist in heroes.json.

**🟢 Expansionist** — One referential-integrity check guards *all* the knowledge structures at
once, and every future edit to them — the regression net the coaching agent needs as heroes
get renamed patch to patch.

**⚪ Outsider** — If the app skips a hero because the name's slightly off, I'd never know — it
just quietly gives worse advice. Catching that beats re-checking item costs.

**🟡 Executor** — Branch-sized: add a `--knowledge` check that imports `dota_knowledge*.py`,
collects hero-name keys from the hero-keyed containers, and flags any missing from heroes.json.
Drop abilities.

**Gap:** "ability facts" doesn't map to this codebase (no local ability data). The real,
high-value extension is **knowledge-file referential integrity on hero names**.

## Refined task spec
**Extend `validate_constants.py` with a `--knowledge` referential-integrity check:**
- Import `dota_knowledge.py` and `dota_knowledge_ext.py`.
- Collect every hero name used as a key/member in the hero-keyed structures (COUNTER_ITEMS,
  HERO_PROFILE, HERO_COUNTERS, SINGLE_TARGET_LOCKDOWN, HERO_ITEM_NOTES, DETECTION_HEROES).
- Verify each exists as a `localized_name` in `heroes.json`; report any dangling reference
  (hero name → which structure it came from). Exit non-zero on dangling refs.
- Wire into the default run and a `--knowledge`-only flag.
- **Drop "ability facts"**: no local ability constants exist and the knowledge files don't key
  by ability — that would need a new abilities dataset first (separate task). Document the call.

## Definition of done
- `validate_constants.py --knowledge` imports the knowledge modules and reports hero-name keys
  not found in heroes.json, with the structure each came from.
- Reports the true current state (0 or N dangling references).
- Detection verified (inject a misspelled hero key → flagged, exit 1).
- No change to unrelated behavior; documented in the README.

## Implementation
- branch: `auto/extend-the-constants-validator-to-ability-facts-and-the-know` in `C:/Users/liamm/Scripts` (off `main`) — never touches main
- started: 2026-08-07T15:31

### Checkpoint log
- 2026-08-07T15:31 — branch created; supervised implementation started.
- 2026-08-07T15:45 — Added `--knowledge` referential-integrity check (auto-detects hero-keyed
  containers). Ran it: **25 dangling refs = 2 real heroes silently dropped** — `Outworld
  Destroyer` (heroes.json has `Outworld Devourer`) and `Ringmaster` (heroes.json has `Ring
  Master`). Default run: `CONSTANTS: OK` + knowledge findings. Commit `22e40f5`, README updated.

### Result — DoD check
- ✅ `--knowledge` imports the knowledge modules and reports hero-name keys missing from heroes.json, with the container each came from.
- ✅ Reports the true current state (2 heroes / 25 refs) — a real, previously-invisible correctness hole.
- ✅ Dropped "ability facts" with a documented reason (no local ability constants).
- ✅ No change to unrelated behavior; documented in README.

**Implement complete.** Draft PR: https://github.com/liammpek16/dota-projects/pull/2. The 2
dangling heroes are a natural follow-up task (decide canonical spelling → fix constants or
knowledge keys). Ready for Phase D.

## Verify (Phase D)
Independent verification: **pass-with-notes** — 9/9 adversarial checks pass (detection,
clean-path, import safety, no item false-positives). Found a **genuine coaching bug** (2
heroes silently dropped). Reports but doesn't fix it. Report:
[[2026-08-07-extend-the-constants-validator-to-ability-facts-and-the-know]].
**Recommended next step (⑤ → ①):** "fix the 2 dangling hero names (Outworld Devourer→Destroyer,
Ring Master→Ringmaster) so their coaching data stops being dropped."

_Cycle complete (PR #2 draft, awaiting your review/merge)._
