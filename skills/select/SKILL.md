---
name: select
description: Rank every project's next step and propose the single most important one as the "task of the day" (Plan 2, stage ①). Deterministic and inspectable — shows the full score breakdown so the pick is auditable — and writes a cycle note awaiting approval. Use to decide what to work on next across all projects. No LLM, $0.
---

# select

Scores each project's `next` step from signals the vault already derives and proposes the
top one, writing `vault/Cycles/<date>-<project>.md` (`type: cycle`, `status: awaiting-approval`).

## Scoring (all weights 1.0 by default — tunable in select.js, plan_2 §9.4)
- **priority** — high 3 / med 2 / low 1
- **health** — blocked or red +3, yellow +1.5
- **staleness** — active projects only, up to +3 by `daysSince` (capped at 14d)
- **attention** — +2 if `needsAttention` flags the project
- **stalled** — +1 if active with milestone progress < 25%

## Usage
```bash
node skills/select/select.js        # or: npm run select
```
Prints the ranking + the proposed task, and writes the cycle note. **You approve** by
setting `status: approved` in the note (the human gate before ② REFINE). Deterministic —
re-running the same day updates the same note.
