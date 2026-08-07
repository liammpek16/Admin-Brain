---
type: report
project: Dota Coach
task: Extend the constants validator to ability facts and the knowledge Python files
date: '2026-08-07'
cycle: 2026-08-07-extend-the-constants-validator-to-ability-facts-and-the-know
---

# Verification report — Dota Coach

**Task:** Extend the constants validator to ability facts and the knowledge Python files
**Branch:** `auto/extend-the-constants-validator-to-ability-facts-and-the-know`

## What was tested
An independent adversarial suite (9 checks) against the new `--knowledge` check:
- **Detection:** real data flags exactly the 2 dangling heroes (`Outworld Destroyer`,
  `Ringmaster`) and **no item false-positives** (auto-detection correctly skips item-keyed
  containers).
- **Clean path:** patching heroes.json to include both names → **0 findings** (proves it's not
  just always-failing — the exit-0 path works).
- **Robustness:** an unimportable knowledge module → reported as a finding, no crash;
  item-keyed containers skipped.
- **CLI:** `--knowledge` exit 1, `--knowledge --json` valid JSON, `--offline` runs the
  knowledge check (exit 1).

**Result: 9/9 passed.** The extension is robust and its auto-detection is sound.

## Findings (weaknesses / what broke)
Nothing broke, and the feature delivers real value — but honest notes:

1. **It reports the bug; it doesn't fix it (by design).** The 2 dangling heroes mean the
   coaching analysis *still* silently drops Outworld Destroyer & Ringmaster. The validator
   now *finds* it — but the underlying coaching bug persists until a follow-up fixes the names.
2. **Root cause is stale constants, not the knowledge base.** heroes.json has `Outworld
   Devourer` / `Ring Master`; the knowledge files use the current in-game names. Yet cycle-1's
   constants-vs-upstream check reported **0 discrepancies** — meaning the pinned `dotaconstants`
   *also* lags current Dota. So the trusted reference itself can be stale; "correct vs
   OpenDota" ≠ "correct vs the live game."
3. **Item-reference integrity is unchecked.** The knowledge files reference items as freeform
   prose ("Rod of Atos / Gleipnir"), which this check can't validate — a remaining gap.
4. **The 50% auto-detect threshold is a heuristic.** A container hit by a mass rename (>50%
   keys invalid) would be misclassified as non-hero and silently skipped.
5. **Still no committed test suite** (the adversarial checks live in scratch, not the repo).

## Improvements (prioritized)
1. **Spin off a fix task:** rename `Outworld Devourer`→`Outworld Destroyer` and `Ring
   Master`→`Ringmaster` in heroes.json (or the knowledge keys — decide canonical), so the 2
   heroes stop being dropped. *This is the one that actually removes the coaching bug.*
2. **Reconsider the upstream reference** — dotaconstants can lag; consider validating a few
   names against a fresher source, or flag "stale upstream" explicitly.
3. Add optional explicit hero-keyed container lists to harden the auto-detect heuristic.
4. Commit the adversarial suite to the repo.

## Verdict
**pass-with-notes.** The extension meets its DoD (imports the knowledge modules, reports
dangling hero refs with their container, robust — 9/9), and it found a **genuine, previously
invisible coaching bug**. Safe on the branch. But it *reports* rather than *fixes*, so the
recommended follow-up (⑤ → ①) is: **"fix the 2 dangling hero names so their coaching data
stops being dropped."**
