---
type: report
project: Admin Brain
task: Drag to reorder project goals in the HUD
date: '2026-08-12'
cycle: 2026-08-12-add-function-to-manually-drag-goals-to-determine-which-is-at
verdict: pass
---

# Verification report — Admin Brain (drag-to-reorder goals)

**Task:** Add a function to manually drag goals to determine which is at the top of the order
**Branch:** `auto/add-function-to-manually-drag-goals-to-determine-which-is-at` · **PR:** Admin-Brain #3

## What was tested
Independent pass over the reorder logic + the drag UI:

| # | Check | Result |
|---|-------|--------|
| D1 | Reorder via `fetch` persists to the roadmap (moved-to-top; set + count preserved) | ✅ |
| D2 | **Synthetic browser drag** (last goal → top) persists end-to-end | ✅ |
| D3 | Moving a **done** goal preserves `[x]`, ` — meta`, and its `_Delivered_` sub-bullet | ✅ |
| D4 | Bad-set order (missing/extra) → **400**, file unchanged | ✅ |
| A1 | Reorder preserves the `## Goal` and `## Risks` sections; goal count intact | ✅ |
| A2 | A **foreign goal** (another project's) in the order → rejected (permutation guard) | ✅ |
| A3 | A **duplicate** in the order → rejected | ✅ |
| A4 | Idempotent — re-sending the current order is a clean no-op | ✅ |
| A5 | Unknown project → rejected | ✅ |
| A6 | 8 draggable rows with grips + `data-goal`; group carries `data-project` | ✅ |

Core is solid: goal-**blocks** (checkbox line + indented sub-bullets) move atomically, the no-loss
permutation guard makes it impossible to add/drop/duplicate a goal, and every reorder round-trips
the done-state, meta, Delivered notes, and the rest of the roadmap file intact. Server stays $0/no-LLM.

## Notes (no blocker)
1. **Pre-existing, out of scope:** the HUD's 20s poll (`loadOverview` / `loadCycles` / `loadGoals`)
   doesn't wrap its `fetch` in try/catch, so when the server is unreachable it logs unhandled-promise
   console noise (`ERR_CONNECTION_REFUSED`). Not introduced here (those loaders predate this cycle);
   surfaced during testing only because the local test server was flapping. Worth a small hardening
   pass someday, but unrelated to drag-reorder.
2. **Matching is by goal text** (meta stripped). A project with two *identical* goal texts couldn't be
   reordered (the duplicate guard rejects) — a safe, acceptable edge that prevents ambiguity.
3. **Test-harness only:** a reorder payload sent through the raw shell was rejected because the shell
   mangled the `→` in a goal name; the browser and `fetch` send clean UTF-8 and reorder correctly.

## Verdict
**pass.** Drag-to-reorder persists a project's goal order to the roadmap with atomic block moves and a
strict no-loss guard; done-state / meta / Delivered sub-bullets and the file's other sections are all
preserved; the endpoint rejects any non-permutation. Safe on the branch behind draft PR #3.
