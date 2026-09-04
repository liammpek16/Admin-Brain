---
type: report
project: Admin Brain
task: allow hiding completed goals + auto-sort them to the bottom
date: '2026-09-04'
cycle: 2026-09-04-allow-for-hiding-of-completed-goals-all-completed-goals-shou
---

# Verification report — Admin Brain

**Task:** allow hiding completed goals; auto-sort completed goals to the bottom
**Branch:** `auto/hide-and-sort-completed-goals` (stacked on `auto/goals-split-improvements-checkpoints`)

## What was tested
The pure sort/partition helper (`hud/public/goals-view.js`) via a `vm`-sandbox unit test, plus a
**live browser** pass against the real HUD (Admin Brain has 5 open + 11 completed checkpoints — a
real mixed group) covering the display sort, the hide toggle, and reload-persistence.

| # | Check | Result |
|---|-------|--------|
| U1 | Shipped `goals-view.js` exposes `sortGoalsForDisplay` + `partitionCompleted` | ✅ |
| U2 | `partitionCompleted` splits open/done, preserving input order per bucket | ✅ |
| U3 | `sortGoalsForDisplay` → all open first, all done last, **stable** within a bucket | ✅ |
| U4 | Already-sorted / single-bucket inputs unchanged | ✅ |
| U5 | Empty / `undefined` / `null` inputs handled without throwing | ✅ |
| B1 | Live: checkpoint group order is `OOOOODDDDDDDDDDD` (5 open, then 11 done) | ✅ |
| B2 | Live: header reads `CHECKPOINTS 5 +11 done` (open count + muted done indicator) | ✅ |
| B3 | Live: tick "hide completed" → 0 done rows shown, 5 open remain, `+11 done` indicator stays | ✅ |
| B4 | Live: preference persisted to `localStorage` (`admin-brain:hide-completed=1`) | ✅ |
| B5 | Live: **after a full reload** the checkbox is still checked and done goals stay hidden | ✅ |
| B6 | Live: no console errors across the whole flow | ✅ |

Totals: **11/11** automated tests + **6** live browser checks — all green.

## Findings (weaknesses / what broke)
Nothing broke. Honest, non-blocking notes:

1. **Sort is display-only by design** — the plan note is NOT rewritten on load, so the raw roadmap
   keeps its authored order (completed goals only move to the bottom *visually*). This is deliberate
   (avoids fighting drag-reorder and silent vault writes); if the user ever wants the file itself
   re-sorted, that would be a separate explicit action.
2. **The hide preference is global and per-viewer** (one localStorage flag for the whole board), not
   per-project. Matches the refine scope; a per-project toggle is a possible follow-up.
3. **Completed goals remain drag-reorderable when shown.** Dragging a done goal above an open one and
   dropping persists that order to the roadmap, which the on-load display-sort would then re-float to
   the bottom on the next render — i.e. a manual done-goal reorder is visually overridden by the
   open-first rule. Consistent with "completed sort to the bottom"; noted for transparency.

## Improvements
- (Optional) a per-project hide toggle if boards grow long.
- (Optional) disable dragging on completed goals (or drop them from the reorder payload) so a manual
  reorder of done goals can't be silently re-floated — minor, cosmetic.

## Verdict
**pass.** Completed goals now sort to the bottom of each group and can be hidden via a persistent
header toggle, entirely on the front-end over existing data — no server or vault change. The sort rule
is unit-tested against the shipped file, and the live flow (order, hide, `+N done`, reload) is clean
with no console errors. Safe on the stacked branch behind the draft PR.
