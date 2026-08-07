---
name: refine
description: Sharpen an approved task (Plan 2, stage ②) by convening the 5-persona LLM council to find gaps between the task and the project's real goal (from its README), then produce a branch-sized spec with a clear definition of done. Use after SELECT approval, before implementation. The harness fetches inputs; the council reasons.
---

# refine

Stage ② of the Plan 2 cycle. Two parts:

## 1. Harness (deterministic) — gather inputs
```bash
node skills/refine/refine.js --project "Dota Coach"
```
Fetches the project's `README` (local path or GitHub via `gh`, from the `repo` field) and
the approved task, then writes/updates `vault/Cycles/<date>-<project>.md` at `stage: refine`
with the task, the README as the project goal, and empty council sections.

## 2. Council (agent reasoning) — sharpen the task
Convene the council — **Contrarian, First-Principles Thinker, Expansionist, Outsider,
Executor** — on the assembled brief. Their job:
- Find **gaps between the task as written and the project's actual goal** (from the README).
- Produce a **Refined task spec** that is branch-sized (split if too big), and a
  **Definition of done** that is clear and testable.

Write the result into the cycle note's `## Council refinement`, `## Refined task spec`, and
`## Definition of done` sections, then set `status: awaiting-approval`. **The human approves
the refined spec** before implementation (stage ③).

> Needs a README to analyze against. Not-started projects (no repo/README) can't be refined
> this way — for those, the first task is to create the scope/README itself.
