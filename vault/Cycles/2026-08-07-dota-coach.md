---
type: cycle
project: Dota Coach
stage: refine
status: awaiting-approval
task: Reduce error in the information shared in the coaching interface
started: '2026-08-07'
readme_source: 'https://github.com/liammpek16/dota-projects'
---

## Task (from SELECT)
Reduce error in the information shared in the coaching interface

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
```

## Council refinement
**🔴 Contrarian** — "Reduce error" is unmeasurable and unbounded. Error in *which*
information? The app has three distinct sources — replay-parsed stats (objective), the
static knowledge bases (`dota_knowledge*.py` — heroes/items/mechanics), and agent-generated
advice (can hallucinate). Each needs a different fix, and with no baseline metric there's no
finish line and no way to prove the branch worked.

**🔵 First-Principles** — Root question: where does the interface get its facts, and which
layer is wrong? Errors compound parse → knowledge → agent. The highest-leverage, *most
verifiable* target is the layer closest to ground truth: the static knowledge/constants
(`data/constants/`), which are checkable against an external source of truth.

**🟢 Expansionist** — Don't do a one-off cleanup; build a **validator** that checks the
interface's facts against a trusted source and flags discrepancies. Built once, it guards
every future coaching output — and becomes the regression net for milestone 2 (real-time
per-fight feedback).

**⚪ Outsider** — "Wrong information" means the app told me something false (wrong item
timing, wrong ability). Anchor the work on *one real logged example* of a wrong output, not
an abstract goal.

**🟡 Executor** — One window can't "reduce all error." It can: pick the knowledge/constants
layer, write a validator comparing the app's constants against a trusted reference (OpenDota
`/constants`, free), emit a discrepancy report, fix the top mismatches. Mergeable + testable.

**Gap vs the goal:** the task names neither *which* information nor a *metric*. The README
shows the interface stands on a static, externally-verifiable knowledge layer — so the real,
bounded task is to make that layer provably correct, with the validator as the metric.

## Refined task spec
**Add a knowledge-correctness validator to `dota_coach` and fix the discrepancies it finds**,
scoped to the static knowledge/constants layer (heroes, items, key mechanics):
- Compare the app's constants/knowledge (`dota_coach/data/constants/`, `dota_knowledge*.py`)
  against a trusted reference (OpenDota `/constants` — free) for a defined subset
  (e.g. hero names/roles, item costs, core ability facts).
- Emit a **discrepancy report** (field · app value · reference value).
- Fix the flagged discrepancies, or document intentional deviations.
- Branch-sized: one layer, one validator, a bounded subset — not "all error everywhere."

## Definition of done
- A runnable `validate` script in `dota_coach` that checks the targeted subset against the
  reference and prints a discrepancy report.
- **0 unexplained mismatches** on the checked subset (each either fixed or documented).
- The validator is re-runnable (guards future changes) and documented in the repo.
- No change to unrelated app behavior.
