---
type: report
project: Admin Brain
task: Goals board — browse every project's goals and manually run one through the loop
date: '2026-08-07'
cycle: 2026-08-07-goals-board-browse-every-project-s-goals-and-manually-run-on
verdict: pass-with-notes
---

# Verification report — Admin Brain (Goals board)

**Task:** Goals board — browse every project's goals and manually run one through the loop
**Branch:** `auto/goals-board-browse-every-project-s-goals-and-manually-run-on` · **PR:** Admin-Brain #1

## What was tested
Independent adversarial pass against the running HUD (not the implementer's own happy path):

| # | Check | Result |
|---|-------|--------|
| G1 | `/api/goals` shape + counts + `done`/`hasOpenCycle` (Dota 6, Admin Brain 6, Job Hunt 5) | ✅ |
| G2 | Reject a **done** goal | ✅ rejected |
| G3 | Reject a goal **not in the roadmap** (injection guard) | ✅ rejected |
| G4 | Reject a project with a cycle **in flight** (Job Hunt, Admin Brain) | ✅ rejected |
| G5 | **Success**: a valid goal sets `next` and opens a cycle at `awaiting-approval` | ✅ |
| A1 | **YAML-hostile goal** (colon + commas: Dota's "…feedback: target prioritization, …") round-trips | ✅ no corruption (upsert emits a folded scalar; note re-parses) |
| A2 | Run a **2nd different goal** for the same project (before approving the 1st) | ⚠ **creates a duplicate proposal** |
| A3 | `hasOpenCycle` after a select-stage proposal exists | ⚠ **False** (root cause of A2) |

Core behaviour is solid: the injection guard holds (a non-roadmap goal is refused, and the goal is
**never passed as a shell arg** — only `project` is; the goal reaches the note via a YAML-safe
`upsertNote`), done/in-flight rejections work, and the happy path opens a proper cycle.

## Findings

1. **The "one open cycle per project" invariant isn't fully enforced (A2/A3).** `hasOpenCycle` and
   the `select-goal` guard both use `inFlightProjects()`, which only counts cycles **past** the
   select stage. A select-stage `awaiting-approval` **proposal** is not counted — so if you Run
   goal A (creating a proposal) and then Run goal B before approving A, you get **two** proposals
   for the same project, and the board keeps offering Run. Not dangerous (both are just proposals,
   resolved in the loop panel), but it violates the feature's own one-cycle intent and clutters the
   board. Reachable from the UI.
   - **Fix (small):** count *any* non-done/abandoned cycle (including stage `select`) as "open" for
     the goals board — a dedicated `projectsWithOpenCycle()` used by both `goalsBoard().hasOpenCycle`
     and `selectGoal()`'s guard (allow an idempotent re-run of the *same* goal). Leaves the separate
     `select.js` past-select guard as-is.

2. **`$0/no-LLM` server preserved (positive).** The endpoints only parse notes and spawn the
   deterministic `select`; no network, no model — the footer stays true.

3. **Done goals are shown but correctly non-runnable** (struck through, no button) — good.

## Improvements (prioritized)
1. Apply Fix #1 (count select-stage proposals as open) — the one real gap.
2. Optional: a tiny "cleared" affordance to abandon a stale select proposal from the HUD (today you
   delete the note or approve+advance it), which would make #1 fully self-service.

## Verdict
**pass-with-notes.** The goals board meets its core DoD — browse every project's goals, run any
incomplete one through the loop, with a solid injection guard and a $0/no-LLM server. One confirmed
gap: select-stage proposals aren't counted as "open," so a project can accumulate duplicate
proposals (A2/A3). Safe on the branch behind draft PR #1. **Recommended follow-up (⑤ → ①):** "Count
select-stage proposals as open in the goals board so a project can't accumulate duplicate proposals."
