---
type: plan
kind: roadmap
created: 2026-08-07T00:00:00.000Z
project: Admin Brain
horizon: quarter
status: active
---

## Goal
Make Admin Brain a self-hosting command center: run its own feature loop, reach every
project from one place, capture notes without leaving it, and eventually drive it by voice.

## Steps
- [x] Run the feature loop from inside the Admin Brain (HUD-triggered SELECT→VERIFY cycles) — near · high
  - _Delivered (`a663c92`): FEATURE LOOP panel — pipeline, gates, stage runners. Follow-ups logged: stage handoff button; autonomous `claude -p` stage-runner (Phase E)._
- [x] Goals board: browse every project's goals and manually run one through the loop (alternative to auto-select) — near · high
  - _Delivered (PR #1): PROJECT GOALS panel — per-goal Run buttons + add-goals-from-the-HUD; one-open-cycle-per-project enforced._
- [x] Add the ability to navigate to each project's webapp when applicable (e.g. the Dota coaching webapp) — near · high
  - _Delivered (PR #2): ⧉ webapp button launches + opens the project's server (Dota wired to live mode on :8080). Follow-up: per-project in-flight lock (verify finding — double-launch race)._
- [ ] Improve the HUD for aesthetic reasons — mid · low (longer-term)
- [x] Voice-activation module for the Admin Brain and all commands — long · low (stretch goal)
  - _Delivered (PR #5): push-to-talk voice command bar (🎤) — browser Web Speech, deterministic keyword grammar → clicks the matching HUD button; no deps/LLM. Live mic to be confirmed by the user; future: wake-word, TTS._
- [x] add function to manually drag goals to determine which is at the top of the order
  - _Delivered (PR #3): drag `.goal` rows (⠿ grip) to reorder within a project; persists to the roadmap Steps with atomic goal-block moves + a no-loss permutation guard._
- [x] delete notes
  - _Delivered (PR #6): a hover-reveal ✕ on every goal in the PROJECT GOALS panel → confirm → removes that goal's `## Steps` block (checkbox + Delivered/meta sub-lines) via `deleteProjectGoal`; git-recoverable. Shared `parseSteps`/`writeSteps` now back both reorder and delete._
- [x] fix latency issue with writing new project goals in the admin brain
  - _Delivered (PR #4): TTL promise-cache + parallelized git-recency in getProjects — add-goal 1788ms→171ms, warm reads ~800ms→6ms._
- [x] audio break down of goals for the day. Make the voice sound like Jarvis from Iron Man
  - _Delivered (PR #7): 🔊 AGENDA button speaks today's focus/attention via browser Web Speech synthesis — the best available British male voice (Jarvis approximation), rate/pitch tuned, toggle to stop; also a "read my goals" voice command. Front-end only, $0/no-deps/local. A true neural clone was declined at the refine gate (would need an external paid TTS service). User to confirm the audio on their machine._
- [ ] Voice commands auto prompt audio response
- [x] Fix latency with writing goals pt.2
  - _Delivered (PR #8): git recency served stale-while-revalidate in the obsidian adapter — the network is off the read/write path, so getProjects() after TTL expiry is ~18ms (was ~430ms). Sticky against a transient null; no API change._
  - _Delivered (PR #9): the real "typed goal disappears" bug — the 20s poll's `loadGoals()` innerHTML rebuild was destroying the input mid-type. Fixed A (poll skips re-render while a goal field is focused) + B (snapshot/restore drafts + caret across any re-render) + D (drafts mirrored to localStorage, survive a reload). Verified live in the browser._
- [x] add new project button
  - _Delivered (PR pending): a `＋ NEW PROJECT` control in the PROJECTS panel opens an accessible, keyboard-operable form that creates a project note via a new validated `createProject` vault accessor + a narrow `POST /api/project/create` route (201/400). Rejects empty/multiline/unsafe/duplicate names without touching an existing note; defaults to planned·gray·med; refreshes the Projects + Goals panels on success. Vault-adapter-only, no new deps. `node --test` + 13 adversarial checks + a live browser pass — all green._
- [x] adjust the goals section. Instead there should be a split between improvements versus checkpoints for each project
  - _Delivered (PR pending): the PROJECT GOALS board now splits each project's goals into **CHECKPOINTS** and **IMPROVEMENTS** groups. A goal's `kind` is derived from a trailing `#improvement`/`#checkpoint` tag on its plan line (untagged → checkpoint, so nothing moved), parsed by one shared `parseGoalLine`; `addProjectGoal` takes a kind, new `setProjectGoalKind` + `POST /api/project/goal-kind` + a per-goal ⇄ button reclassify in place. Drag-reorder is scoped per group; run/delete/reorder still match on the tag-stripped text. 6/6 tests + live browser pass._
- [x] allow for hiding of completed goals. All completed goals should automatically sort to the bottom of the goals list.
  - _Delivered (PR pending): in every goal group, completed goals now render **below** all open ones (display-only stable sort — the roadmap file isn't rewritten on load), and a persistent **"hide completed"** toggle in the PROJECT GOALS header removes them from view while each group keeps a muted `+N done` indicator (hidden, not lost). Front-end only: a pure `goals-view.js` helper (unit-tested via a `vm` sandbox) + localStorage preference. 11/11 tests + live browser (order, hide, reload-persistence) pass._
- [ ] connect to phone.
- [x] pull usage limit reset times from claude. provide a notification for when this happens
  - _Delivered (PR pending): a **USAGE LIMITS** panel + a new `usage` skill. `normalizeUsage` (pure, tested) ingests reset times from a declared source (`ADMIN_BRAIN_CLAUDE_USAGE` or `vault/State/claude-usage.json`) — accepting both the native shape and **Anthropic rate-limit headers** — derives per-limit `status`/countdown, and `GET /api/usage` serves them. The HUD shows each limit with a live countdown and fires **one browser notification per reset** (permission-gated, deduped). Degrades honestly to a "not configured" message; $0, no network, no deps. 16/16 tests + live browser pass. NB: Claude exposes no free/stable local reset source, so the file is the honest ingest point (hand-updated / pasted headers / a future updater)._

## Risks
- Running the full loop from the HUD means long-running, token-spending stages behind a web
  button — needs the human approval gates (SELECT approval, PR review) to stay in front, not
  be clicked away by accident.
- Per-project webapp launch depends on each project declaring a runnable entry point/URL;
  projects without a webapp should degrade gracefully (no dead button).
- Voice activation is heavy and low-priority — keep it a stretch goal, never a blocker.

> Tick a box in Obsidian to mark a goal done — Admin Brain's progress % updates automatically
> across the brief, HUD, and metrics. Order here is a suggestion; reorder freely.
