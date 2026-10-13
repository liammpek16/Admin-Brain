---
type: report
project: Dota Coach
task: Fix coaching analysis blocking the load hero positions button
date: 2026-09-08
cycle: 2026-09-08-fix-coaching-analysis-blocking-the-load-hero-positions-butto
branch: auto/fix-coaching-analysis-blocking-the-load-hero-positions-butto
pr: https://github.com/liammpek16/dota-projects/pull/19
verdict: pass
---

# Verification report — Dota Coach

**Task:** Fix coaching analysis blocking the load hero positions button
**Branch:** `auto/fix-coaching-analysis-blocking-the-load-hero-positions-butto` · **PR** #19 (draft)

## What was tested
Independent live verification in the in-app browser against the running demo webapp
(`--demo`, localhost:8080), driving the real UI flow (enter player → select match →
coaching → load positions).

- **The bug (timing):** wrapped `window.fetch` to hold the `/api/coach` response 4s, then
  ran the coaching flow and sampled the button state 1.5s in — **`coachStillInFlight:true`
  and `#loadPosBtn` hidden:false, disabled:false** → the button is visible and clickable
  *while the coaching analysis is in flight*. This is the exact behaviour that was broken
  (previously the button was revealed only after the coaching await resolved).
- **Clean end-to-end run:** positions load concurrently, heroes merge into the fight data
  (`fights_have_heroes:true`), the button self-hides afterwards, the coaching review renders,
  status shows "Hero positions loaded".
- **No console errors** (`read_console_messages onlyErrors` → none).
- **Merge integrity:** confirmed the demo `/charts` and `/positions` endpoints return the
  same fight times (480/960/1440/1980), so `loadPositions()`'s time-keyed in-place merge
  lines up.
- **Server concurrency (static):** `ThreadingHTTPServer`; `/positions` handler takes no
  lock; `_conv_lock` wraps only a dict write, not the long `web_start` — so a positions
  request genuinely runs alongside coaching.

## Findings (weaknesses / what broke)
- **[none blocking]** First scripted run showed `fights_have_heroes:false` — traced to a
  test artifact of programmatically double-invoking `startCoaching` (racing two chart
  fetches); a clean run merged correctly. Not a code defect.
- **[minor, out of scope]** If the user starts a positions parse and the coaching call
  finishes slightly after, `coachStatus` can be overwritten with the "hover a fight time"
  tip over the "Hero positions loaded" message — cosmetic status text only; the data and
  button state are correct.
- **[pre-existing, out of scope]** The replay-positions parse is itself slow; it shows its
  own "Parsing replay… (can take a while)" state. Unchanged by this fix.

## Improvements
1. (Optional) Sequence the two status messages so a positions-success message isn't
   overwritten by the coaching tip when they finish close together.
2. (Optional) Disable/spinner the coaching button area is already handled; consider a small
   "positions loading in background" affordance for clarity.

## Verdict
**pass** — the reported bug is fixed and directly demonstrated live (button available during
coaching), with the full flow (concurrent positions load + merge, self-hide, coaching
render) confirmed and no console errors. Remaining notes are cosmetic/out-of-scope. Draft
PR #19 ready for review; `main` untouched.
