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
- [ ] Add the ability to capture notes into the vault from within the Admin Brain (quick-note in the HUD) — near · high
- [ ] Improve the HUD for aesthetic reasons — mid · low (longer-term)
- [x] Voice-activation module for the Admin Brain and all commands — long · low (stretch goal)
  - _Delivered (PR #5): push-to-talk voice command bar (🎤) — browser Web Speech, deterministic keyword grammar → clicks the matching HUD button; no deps/LLM. Live mic to be confirmed by the user; future: wake-word, TTS._
- [x] add function to manually drag goals to determine which is at the top of the order
  - _Delivered (PR #3): drag `.goal` rows (⠿ grip) to reorder within a project; persists to the roadmap Steps with atomic goal-block moves + a no-loss permutation guard._
- [x] fix latency issue with writing new project goals in the admin brain
  - _Delivered (PR #4): TTL promise-cache + parallelized git-recency in getProjects — add-goal 1788ms→171ms, warm reads ~800ms→6ms._
- [ ] delete notes

## Risks
- Running the full loop from the HUD means long-running, token-spending stages behind a web
  button — needs the human approval gates (SELECT approval, PR review) to stay in front, not
  be clicked away by accident.
- Per-project webapp launch depends on each project declaring a runnable entry point/URL;
  projects without a webapp should degrade gracefully (no dead button).
- Voice activation is heavy and low-priority — keep it a stretch goal, never a blocker.

> Tick a box in Obsidian to mark a goal done — Admin Brain's progress % updates automatically
> across the brief, HUD, and metrics. Order here is a suggestion; reorder freely.
