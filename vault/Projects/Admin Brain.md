---
type: project
name: Admin Brain
status: active
health: green
priority: high
next: add descriptions to feature goals
started: 2026-08-07T00:00:00.000Z
updated: '2026-10-11'
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
- Batch of 4 roadmap goals shipped through the loop as a **stack of 4 draft PRs** (#10→#11→#12→#13,
  merge in order): **add-new-project button** (validated create form) · **goals split into checkpoints
  vs improvements** (derived kind tag + per-group board + ⇄ reclassify) · **hide/auto-sort completed
  goals** (done-to-bottom display sort + persistent hide toggle) · **Claude usage-limit reset notifier**
  (new `usage` skill + USAGE LIMITS panel + one-shot browser notification). Next: connect to phone.

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
- 2026-09-04 — "split the goals section (improvements vs checkpoints)" delivered (draft PR, stacked).
  Every goal gets a derived `kind` from a trailing `#improvement`/`#checkpoint` tag (untagged →
  checkpoint, nothing moved); shared `parseGoalLine`; `setProjectGoalKind` + `POST
  /api/project/goal-kind`; the board renders two labeled groups with a ⇄ reclassify button and a
  kind selector on the add-row. 6/6 tests + live browser, verdict pass.
- 2026-09-04 — "hide + auto-sort completed goals" delivered (draft PR, stacked). Completed goals
  render below open ones (display-only stable sort — no plan-note rewrite on load) and a persistent
  "hide completed" header toggle removes them while each group keeps a `+N done` indicator. Front-end
  only: pure `goals-view.js` helper (vm-sandbox unit test) + localStorage pref. 11/11 tests + live
  browser (order, hide, reload-persistence), verdict pass.
- 2026-09-04 — "pull Claude usage-limit reset times + notify" delivered (draft PR, stacked). New
  `usage` skill: pure `normalizeUsage` (native + Anthropic-header shapes → status/countdown) reading a
  declared source (`ADMIN_BRAIN_CLAUDE_USAGE` / `vault/State/claude-usage.json`); `GET /api/usage`; a
  USAGE LIMITS panel with live countdowns + a one-shot, deduped browser notification per reset.
  Honest not-configured state; $0/no-network. 16/16 tests + live browser, verdict pass. NB: no free
  stable local reset source exists, so the file is the honest ingest point. Closes the 4-goal batch.

> **You own three fields:** `health` · `priority` · `next`. Recency derives from `repo`.
