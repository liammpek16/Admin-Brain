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
- [x] Run the feature loop from inside the Admin Brain (HUD-triggered SELECT→VERIFY cycles) — near · high #improvement
  - _Delivered (`a663c92`): FEATURE LOOP panel — pipeline, gates, stage runners. Follow-ups logged: stage handoff button; autonomous `claude -p` stage-runner (Phase E)._
- [x] Goals board: browse every project's goals and manually run one through the loop (alternative to auto-select) — near · high #improvement
  - _Delivered (PR #1): PROJECT GOALS panel — per-goal Run buttons + add-goals-from-the-HUD; one-open-cycle-per-project enforced._
- [x] Add the ability to navigate to each project's webapp when applicable (e.g. the Dota coaching webapp) — near · high #improvement
  - _Delivered (PR #2): ⧉ webapp button launches + opens the project's server (Dota wired to live mode on :8080). Follow-up: per-project in-flight lock (verify finding — double-launch race)._
- [ ] Improve the HUD for aesthetic reasons — mid · low (longer-term) #improvement
- [x] Voice-activation module for the Admin Brain and all commands — long · low (stretch goal) #improvement
  - _Delivered (PR #5): push-to-talk voice command bar (🎤) — browser Web Speech, deterministic keyword grammar → clicks the matching HUD button; no deps/LLM. Live mic to be confirmed by the user; future: wake-word, TTS._
- [x] add function to manually drag goals to determine which is at the top of the order #improvement
  - _Delivered (PR #3): drag `.goal` rows (⠿ grip) to reorder within a project; persists to the roadmap Steps with atomic goal-block moves + a no-loss permutation guard._
- [x] delete notes #improvement
  - _Delivered (PR #6): a hover-reveal ✕ on every goal in the PROJECT GOALS panel → confirm → removes that goal's `## Steps` block (checkbox + Delivered/meta sub-lines) via `deleteProjectGoal`; git-recoverable. Shared `parseSteps`/`writeSteps` now back both reorder and delete._
- [x] fix latency issue with writing new project goals in the admin brain #improvement
  - _Delivered (PR #4): TTL promise-cache + parallelized git-recency in getProjects — add-goal 1788ms→171ms, warm reads ~800ms→6ms._
- [x] audio break down of goals for the day. Make the voice sound like Jarvis from Iron Man #improvement
  - _Delivered (PR #7): 🔊 AGENDA button speaks today's focus/attention via browser Web Speech synthesis — the best available British male voice (Jarvis approximation), rate/pitch tuned, toggle to stop; also a "read my goals" voice command. Front-end only, $0/no-deps/local. A true neural clone was declined at the refine gate (would need an external paid TTS service). User to confirm the audio on their machine._
- [ ] Voice commands auto prompt audio response #improvement
- [x] Fix latency with writing goals pt.2 #improvement
  - _Delivered (PR #8): git recency served stale-while-revalidate in the obsidian adapter — the network is off the read/write path, so getProjects() after TTL expiry is ~18ms (was ~430ms). Sticky against a transient null; no API change._
  - _Delivered (PR #9): the real "typed goal disappears" bug — the 20s poll's `loadGoals()` innerHTML rebuild was destroying the input mid-type. Fixed A (poll skips re-render while a goal field is focused) + B (snapshot/restore drafts + caret across any re-render) + D (drafts mirrored to localStorage, survive a reload). Verified live in the browser._
- [x] add new project button #improvement
  - _Delivered (PR pending): a `＋ NEW PROJECT` control in the PROJECTS panel opens an accessible, keyboard-operable form that creates a project note via a new validated `createProject` vault accessor + a narrow `POST /api/project/create` route (201/400). Rejects empty/multiline/unsafe/duplicate names without touching an existing note; defaults to planned·gray·med; refreshes the Projects + Goals panels on success. Vault-adapter-only, no new deps. `node --test` + 13 adversarial checks + a live browser pass — all green._
- [x] adjust the goals section. Instead there should be a split between improvements versus checkpoints for each project #improvement
  - _Delivered (PR pending): the PROJECT GOALS board now splits each project's goals into **CHECKPOINTS** and **IMPROVEMENTS** groups. A goal's `kind` is derived from a trailing `#improvement`/`#checkpoint` tag on its plan line (untagged → checkpoint, so nothing moved), parsed by one shared `parseGoalLine`; `addProjectGoal` takes a kind, new `setProjectGoalKind` + `POST /api/project/goal-kind` + a per-goal ⇄ button reclassify in place. Drag-reorder is scoped per group; run/delete/reorder still match on the tag-stripped text. 6/6 tests + live browser pass._
- [x] allow for hiding of completed goals. All completed goals should automatically sort to the bottom of the goals list. #improvement
  - _Delivered (PR pending): in every goal group, completed goals now render **below** all open ones (display-only stable sort — the roadmap file isn't rewritten on load), and a persistent **"hide completed"** toggle in the PROJECT GOALS header removes them from view while each group keeps a muted `+N done` indicator (hidden, not lost). Front-end only: a pure `goals-view.js` helper (unit-tested via a `vm` sandbox) + localStorage preference. 11/11 tests + live browser (order, hide, reload-persistence) pass._
- [x] determine feasibility of connecting to a custom made phone app #improvement
  - _Delivered (PR pending): feasibility determined = **FEASIBLE, $0, on-ethos** (report `vault/Reports/2026-09-05-phone-app-feasibility.md`). The HUD already exposes a JSON API, so a phone client is just another consumer. Two gaps: loopback-only reach + **no auth** (safe only while `127.0.0.1`-only). Recommended cheapest/safest path: HUD-as-**PWA** + **`ADMIN_BRAIN_HUD_HOST` bind config + shared-secret token auth** (prereq — never expose loop-run/webapp-launch unauthenticated) + reach over **Tailscale** (free/private/encrypted). Rejected cloud relay (breaks $0/local-first) and public tunnels without auth. Research-only cycle (SELECT→REFINE→done); three follow-up build goals added below._
- [ ] Make the HUD a mobile-installable PWA (manifest + service worker + responsive layout) — phone-app path #improvement
- [ ] Add a configurable bind host + shared-secret token auth to the HUD API (prereq for phone access) — phone-app path #improvement
- [ ] Reach the HUD from the phone over Tailscale (setup doc + smoke test) — phone-app path #improvement
- [x] pull usage limit reset times from claude. provide a notification for when this happens #improvement
  - _Delivered (PR pending): a **USAGE LIMITS** panel + a new `usage` skill. `normalizeUsage` (pure, tested) ingests reset times from a declared source (`ADMIN_BRAIN_CLAUDE_USAGE` or `vault/State/claude-usage.json`) — accepting both the native shape and **Anthropic rate-limit headers** — derives per-limit `status`/countdown, and `GET /api/usage` serves them. The HUD shows each limit with a live countdown and fires **one browser notification per reset** (permission-gated, deduped). Degrades honestly to a "not configured" message; $0, no network, no deps. 16/16 tests + live browser pass. NB: Claude exposes no free/stable local reset source, so the file is the honest ingest point (hand-updated / pasted headers / a future updater)._
- [ ] whenever a new project is made through the admin brain, add in an automatic task to run it through the council loop to write the initial project readme and develope the plan #improvement
- [x] let text from the projects be highlightable #improvement
  - _Delivered (PR pending): the whole `.goal` row was `draggable`, which blocks text selection — moved `draggable` onto the ⠿ grip only (dragstart still resolves the row via `closest('li.goal')`), so goal/project text is now selectable (`user-select: text`) while drag-to-reorder still works from the handle._
- [x] make improvements the default goal option instead of checkpoint #improvement
  - _Delivered (PR pending): the add-a-goal group selector now defaults to **improvement** (option ordered first + `addGoal` fallback flipped). `parseGoalLine`'s untagged→checkpoint rule is untouched, so existing goals don't silently reclassify — only the new-goal default changed._
- [x] make goals editable #improvement
  - _Delivered (PR pending): a hover-reveal ✎ on every goal opens an inline rename input (Enter/blur commit, Esc cancel) → new `editProjectGoal` vault accessor rewrites just the checkbox text while preserving done-state, meta, `#improvement` kind, and Delivered sub-lines; rejects empty/multiline/duplicate; `POST /api/project/edit-goal`. The 20s poll skips re-render while editing. 4 unit tests + live browser + HTTP round-trip pass._
- [x] add a completed goals section to both checkpoint and improvements. Make sure that this menu is a dropdown in order to hide completed goals #improvement
  - _Delivered (PR pending): replaced the single global "hide completed" toggle with a collapsible **"✓ N completed"** `<details>` dropdown inside EACH checkpoint/improvement group (collapsed = hidden by default); the open/closed choice persists per (project, kind) in localStorage. Done `<li>`s stay in the DOM while collapsed so drag-reorder still sees the full set._
- [x] make editing and writing goals have wrapped text in the text box #improvement
  - _Delivered (PR pending): both goal fields (the add-a-goal box and the inline ✎ rename box) are now auto-growing `<textarea>`s that soft-wrap long goal text (`white-space: pre-wrap; overflow-wrap: anywhere`) instead of scrolling it off a one-line `<input>`. `autoGrowGoalField` sizes each box to its content on type/restore; Enter still submits (no newline), the draft-persist/caret-restore and background-poll guards carry over unchanged. Front-end only, no deps. 20/20 tests + live browser (wrap + auto-grow, no h-scroll, no console errors)._
- [x] allow unlimited text limits for goal writing #improvement
  - _Delivered (PR #17): removed the two front-end `maxlength="200"` caps on the goal-writing fields (the add-a-goal box and the inline ✎ rename box). The vault/server never limited goal length, so the cap was purely cosmetic and truncated longer goals as typed. Goal text is now unlimited; goals stay single-line data and the auto-grow textareas wrap it. Front-end only, no deps. 20/20 tests + live browser (300-char goal stored untruncated in both fields)._
- [x] Feature Loop model optimization #improvement
  - _Goal: build a skill for the admin brain loop that generates a master agent to analyze the feasibility of every new feature running through the feature loop, then spins up sub-agents to perform each task, matching each sub-agent's model to the complexity the task requires._
  - _Delivered (PR #18, merged): new `orchestrate` skill. The master agent runs a feasibility pass (5 dimensions → go / go-with-split / no-go, advisory) and splits the spec into sub-tasks. A deterministic harness routes each sub-task by complexity tier to haiku/sonnet/opus. The verifier can never be weaker than the implementer. Dogfooded on its own cycle; verify pass-with-notes, F1–F5 fixed; 95/95 tests._
- [x] add descriptions to feature goals #improvement
  - _Delivered (PR #19, merged): each goal can carry one `_Description:_` sub-line (legacy `_Goal:_` read too) — a ≡ inline editor on the goals board sets/clears it, `POST /api/project/goal-description`, and the REFINE brief now includes it so the council refines against the goal's intent. Verify pass-with-notes, F1–F3 fixed; 101/101 tests. Follow-up: description field on the add-goal row._

## Risks
- Running the full loop from the HUD means long-running, token-spending stages behind a web
  button — needs the human approval gates (SELECT approval, PR review) to stay in front, not
  be clicked away by accident.
- Per-project webapp launch depends on each project declaring a runnable entry point/URL;
  projects without a webapp should degrade gracefully (no dead button).
- Voice activation is heavy and low-priority — keep it a stretch goal, never a blocker.

> Tick a box in Obsidian to mark a goal done — Admin Brain's progress % updates automatically
> across the brief, HUD, and metrics. Order here is a suggestion; reorder freely.
