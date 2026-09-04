---
type: cycle
project: Admin Brain
stage: verify
status: done
verdict: pass
scope: batched (4 goals — goals-board UX)
task: >-
  Goals-board UX batch: highlightable text, improvements-as-default, editable
  goals, and a per-group completed-goals dropdown
started: '2026-09-04'
readme_source: 'https://github.com/liammpek16/Admin-Brain'
branch: auto/goals-board-ux
target_path: 'C:/Users/liamm/Admin-Brain'
report: 2026-09-04-goals-board-ux-highlight-edit-default-completed
---

## Task (from SELECT)
Run four Admin Brain roadmap goals through the loop as ONE batched cycle (the user's choice —
they all touch the same PROJECT GOALS board files, so separate branches would self-conflict):

1. let text from the projects be highlightable
2. make improvements the default goal option instead of checkpoint
3. make goals editable
4. add a completed goals section to both checkpoint and improvements — a dropdown to hide completed

## REFINE (scoped spec + DoD)
- **Highlightable text** — root cause: the whole `.goal <li>` is `draggable="true"`, and a draggable
  element swallows text selection. Fix: move `draggable` onto the `⠿` grip only (dragstart still
  resolves the row via `closest('li.goal')`), add `user-select: text` to `.gtext`/`.goal-proj`.
  DoD: goal/project text selectable; drag-reorder still works from the grip.
- **Improvements default** — flip the add-row `<select>` so `improvement` is first/selected and the
  `addGoal` fallback is `improvement`. Deliberately DON'T touch `parseGoalLine` (untagged→checkpoint)
  — that would silently reclassify every existing untagged goal. DoD: new-goal default is improvement;
  existing goals unchanged.
- **Editable goals** — new `editProjectGoal(project, old, new)` vault accessor rewrites only the
  checkbox text, preserving done-state, meta, `#improvement` kind tag, and Delivered sub-lines;
  rejects empty/multiline/duplicate/unknown; `POST /api/project/edit-goal`; inline ✎ rename input
  (Enter/blur commit, Esc cancel); the 20s poll skips re-render while editing. DoD: rename persists
  with all attributes intact; guards hold; no draft-clobber.
- **Completed dropdown per group** — replace the single global "hide completed" checkbox with a
  collapsible `<details>` "✓ N completed" section inside EACH checkpoint/improvement group (collapsed
  by default = hidden); persist open/closed per (project, kind) in localStorage; done `<li>`s stay in
  the DOM while collapsed so drag-reorder still sees the full goal set. DoD: each group hides its own
  completed goals behind a dropdown; choice survives reload/poll.

Server stays $0 / no-LLM / 127.0.0.1 — vault-accessor + front-end only, no new deps.

## IMPLEMENT (branch auto/goals-board-ux)
- `skills/vault/vault.js` — `editProjectGoal` (shares `parseSteps`/`writeSteps`; rebuilds line 0 from
  its parsed parts, keeping marker/checkbox/meta/kind).
- `hud/server.js` — `POST /api/project/edit-goal` (200/400), import wired.
- `hud/public/app.js` — grip-only draggable + ✎ edit button in `goalItem`; per-group completed
  `<details>` in `kindGroup` (replaces the global toggle); `isDoneOpen`/`writeDoneOpen` persistence +
  capture-phase `toggle` listener; `startGoalEdit`/`commitGoalEdit`; `isEditingGoal` background guard;
  add-select defaults to improvement.
- `hud/public/index.html` — removed the dead `#hide-completed` checkbox.
- `hud/public/style.css` — `.goal-edit`, `.goal-edit-input`, `.goal-done-section`/`-summary`,
  `user-select: text` on `.gtext`/`.goal-proj`; removed dead `.goals-toggle`/`.gdone-count`.
- `test/vault-edit-goal.test.js` — 4 tests for `editProjectGoal`.

## VERIFY — verdict PASS
- `node --test` → **20/20** (4 new edit-goal tests + full existing suite).
- Live browser (localhost:4173): `.goal` no longer draggable (grip is), `.gtext` user-select=text;
  add-select first option + value = improvement; ✎ present, opens a prefilled input, Esc restores;
  completed `<details>` = "✓ N completed", collapsed by default, toggle persists per (project,kind);
  global hide-completed checkbox gone; **no console errors**.
- HTTP round-trip on a throwaway project: add → edit → edit-guard(400 on unknown goal) → delete,
  then removed the throwaway roadmap file — clean.

Findings (minor, non-blocking): inline-edit commits on blur (clicking another control saves the
current rename first — expected); the completed dropdown's open/closed pref is per (project, kind)
localStorage, so it's per-browser (not shared). Nothing found that warrants a follow-up cycle.
