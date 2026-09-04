---
type: project
name: Admin Brain
status: active
health: green
priority: high
next: adjust the goals section. Instead there should be a split between improvements versus checkpoints for each project
started: 2026-08-07T00:00:00.000Z
updated: '2026-09-03'
tags:
  - meta
  - tooling
  - second-brain
repo: 'https://github.com/liammpek16/Admin-Brain'
local_path: 'C:/Users/liamm/Admin-Brain'
---

## Summary
Admin Brain, tracked inside Admin Brain. The second-brain + command center now manages its
own roadmap and ships its own features through the same 5-stage feature loop as every other
project. See `README.md` and `plan_2.md` for the design; roadmap at
[[admin-brain-roadmap]].

## Now
- Batch of 4 roadmap goals running through the loop (stacked draft PRs). Shipped: **add-new-project
  button** — a `＋ NEW PROJECT` form in the PROJECTS panel creates a validated project note via the
  vault adapter. Next in the stack: split the goals section into improvements vs checkpoints, then
  hide/auto-sort completed goals, then pull Claude usage-limit reset times + notify.

## Blockers
- none

## Log
- 2026-08-07 — Self-hosted: added the project note, README, and roadmap.
- 2026-08-07 — Goal #1 delivered (HUD FEATURE LOOP panel). Loop-in-HUD cycle closed as
  already-delivered at the refine gate; handoff button + autonomous `claude -p` runner logged
  as follow-ups.
- 2026-08-12 — "delete notes" goal delivered + ticked (PR #6): a guarded delete-goal ✕ in the
  PROJECT GOALS panel. Redirected at review from an earlier cycle-note-file delete.
- 2026-08-12 — "audio breakdown / Jarvis voice" goal delivered + ticked (PR #7): 🔊 AGENDA
  speaks the day's agenda via browser Web Speech synthesis (best British male voice). True neural
  clone declined at the refine gate (would need external paid TTS). User to confirm the audio.
- 2026-08-19 — "fix latency with writing goals pt.2" delivered + ticked. PR #8: git recency
  stale-while-revalidate (~430ms→~18ms, network off the write path). PR #9: fixed the real
  disappearing-goal-draft bug — the 20s poll's board rebuild was destroying the input; A+B+D
  (skip-while-focused, snapshot/restore, localStorage). Both merged to main.
- 2026-09-03 — "add new project button" delivered (draft PR). `＋ NEW PROJECT` in the PROJECTS
  panel → accessible keyboard form → new validated `createProject` vault accessor + `POST
  /api/project/create` (201/400). Rejects empty/multiline/unsafe/duplicate names without touching
  an existing note; defaults planned·gray·med. Independent verify: 2/2 unit + 13/13 adversarial +
  live browser, verdict pass. First of a stacked batch of 4 goals.

> **You own three fields:** `health` · `priority` · `next`. Recency derives from `repo`.
