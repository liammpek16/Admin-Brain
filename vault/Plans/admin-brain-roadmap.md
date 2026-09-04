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
- [ ] add new project button
- [ ] adjust the goals section. Instead there should be a split between improvements versus checkpoints for each project
- [ ] allow for hiding of completed goals. All completed goals should automatically sort to the bottom of the goals list.
- [ ] connect to phone.
- [ ] pull usage limit reset times from claude. provide a notification for when this happens

## Risks
- Running the full loop from the HUD means long-running, token-spending stages behind a web
  button — needs the human approval gates (SELECT approval, PR review) to stay in front, not
  be clicked away by accident.
- Per-project webapp launch depends on each project declaring a runnable entry point/URL;
  projects without a webapp should degrade gracefully (no dead button).
- Voice activation is heavy and low-priority — keep it a stretch goal, never a blocker.

> Tick a box in Obsidian to mark a goal done — Admin Brain's progress % updates automatically
> across the brief, HUD, and metrics. Order here is a suggestion; reorder freely.
