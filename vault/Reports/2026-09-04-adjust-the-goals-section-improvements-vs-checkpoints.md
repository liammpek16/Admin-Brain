---
type: report
project: Admin Brain
task: adjust the goals section (improvements vs checkpoints split)
date: '2026-09-04'
cycle: 2026-09-04-adjust-the-goals-section-instead-there-should-be-a-split-bet
---

# Verification report — Admin Brain

**Task:** adjust the goals section — split into improvements vs checkpoints per project
**Branch:** `auto/goals-split-improvements-checkpoints` (stacked on `auto/add-new-project-button`)

## What was tested
Independent pass against the DoD on the **real** `skills/vault/vault.js` (temp vault) plus a **live
browser** pass against the real HUD on a spare port. Focus: the new `kind` derivation must not lose
or corrupt any existing goal, and the existing run/delete/reorder affordances must keep working now
that a goal line can carry a tag.

| # | Check | Result |
|---|-------|--------|
| U1 | Untagged goal → `kind: checkpoint` (default) | ✅ |
| U2 | `#improvement` parsed; tag stripped from `text`; case-insensitive (`#IMPROVEMENT`) | ✅ |
| U3 | Meta + trailing tag on one line → both `meta` and `kind` correct, tag not in text | ✅ |
| U4 | `addProjectGoal(kind='improvement')` writes ` #improvement`; checkpoint writes no tag | ✅ |
| U5 | `addProjectGoal` with an invalid kind → refused | ✅ |
| U6 | `setProjectGoalKind` flips groups, preserves meta, append/removes tag; reload-stable | ✅ |
| U7 | Reclassify guards: unknown goal refused, invalid kind refused, note not corrupted | ✅ |
| U8 | After reclassify, `reorderProjectGoals` + `deleteProjectGoal` still match on stripped text | ✅ |
| U9 | `GOAL_KINDS` == `['checkpoint','improvement']` | ✅ |
| B1 | Live: every project shows CHECKPOINTS / IMPROVEMENTS groups with counts (e.g. 16/0, 12/0) | ✅ |
| B2 | Live: existing untagged goals ALL appear (under CHECKPOINTS) — nothing disappears | ✅ |
| B3 | Live: add checkpoint + improvement to a sandbox project → each lands in its group | ✅ |
| B4 | Live: ⇄ reclassify moves `cp one` from CHECKPOINTS to IMPROVEMENTS in the DOM + persists | ✅ |
| B5 | Live: invalid-kind reclassify → 400, handled inline; no JS console error | ✅ |

Totals: **6/6** automated tests + **9** accessor assertions + **5** live browser checks — all green.

## Findings (weaknesses / what broke)
Nothing broke. Honest, non-blocking notes:

1. **Console still logs the handled 400** on the invalid-kind guard path (same repo convention as
   add-goal/delete-goal/create). Not a JS error.
2. **A goal's kind is not draggable across groups** — moving between CHECKPOINTS and IMPROVEMENTS is
   the ⇄ button, not drag-and-drop (drag is constrained to within a kind-list on purpose, since a
   cross-list drop wouldn't change the persisted tag and would snap back). Deliberate; worth a note
   if drag-between-groups is ever wanted (it would just call `setProjectGoalKind` on drop).
3. **Untagged-default = checkpoint** is a choice: it means IMPROVEMENTS starts empty for every
   project until the user tags/reclassifies. Matches the refine decision (existing goals are
   milestone-style); reversible per goal via ⇄.

## Improvements
- (Optional follow-up) allow drag between the two groups to reclassify (drop → `setProjectGoalKind`).
- (Optional) a board-level filter/toggle to focus one kind — natural once counts grow.

## Verdict
**pass.** The board now splits every project's goals into CHECKPOINTS and IMPROVEMENTS, derived from
a single inline tag with checkpoint as the safe tagless default, so no existing goal is lost and
milestone-% is untouched. Add-with-kind, in-place reclassify, and all prior affordances work; the
change is one shared parser plus a thin route and UI. Safe on the stacked branch behind the draft PR.
