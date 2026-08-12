---
type: cycle
project: Admin Brain
stage: implement
status: active
task: Voice-activation module for the Admin Brain and all commands
started: '2026-08-12'
readme_source: 'https://github.com/liammpek16/Admin-Brain'
branch: auto/voice-activation-module-for-the-admin-brain-and-all-commands
target_path: 'C:/Users/liamm/Admin-Brain'
---

## Task (from SELECT)
Voice-activation module for the Admin Brain and all commands

## Project goal — source: https://github.com/liammpek16/Admin-Brain
```
# Admin Brain

A personal **second brain + command center** for running my projects — a deterministic,
$0-core system layered over an [Obsidian](https://obsidian.md) vault, with a dark terminal
HUD and an autonomous feature-development loop.

The vault is the single source of truth. Everything else — the HUD, the brief, the skills —
reads from it and derives what it can, so the only things I hand-maintain per project are
`health`, `priority`, and `next`.

---

## Why it exists

I run several projects at once (Dota Coach, a Job Hunt helper, a betting analyzer, a stock
analyzer — and now Admin Brain itself). I wanted one place to:

- see every project's state at a glance,
- decide *what to work on next* without guessing,
- and actually **ship features autonomously** on a branch, with human gates, without ever
  touching `main`.

Admin Brain is now tracked *inside Admin Brain* — so its own roadmap, progress, and feature
work run through the same loop as every other project.

---

## Architecture

```
Admin-Brain/
├── vault/                    # Obsidian vault — the source of truth
│   ├── Projects/             # one note per project (health · priority · next)
│   ├── Plans/                # per-project roadmaps (milestone checkboxes → progress %)
│   ├── Sessions/             # coaching/work session logs
│   ├── Cycles/               # feature-loop state machine notes (one per task)
│   └── Reports/              # independent verification reports
├── adapters/obsidian/        # thin owned wrapper over the vault + git recency
├── skills/                   # the deterministic skills
│   ├── vault/                #   accessor: normalized projects, milestones, sessions
│   ├── metrics/  inbox/  trends/
│   └── select/  refine/  implement/  verify/   # the feature loop (Plan 2)
├── hud/                      # dark terminal HUD (Node http on 127.0.0.1:4173)
├── brief.js                  # `brief` — the daily standup command
├── plan.md                   # design plan (the brain)
└── plan_2.md                 # design plan (the autonomous feature loop)
```

### Principles
- **Adopt over invent.** The Obsidian layer uses reputable third-party skills
  ([kepano/obsidian-skills](https://github.com/kepano/obsidian-skills): bases, markdown,
  json-canvas, defuddle) rather than a hand-rolled brain.
- **Deterministic $0 core.** `metrics`, `trends`, `brief`, `select` use no LLM — just
  Node stdlib + `gray-matter` + `simple-git`. LLM usage is spent deliberately, only in the
  loop's *refine/implement/verify* stages.
- **Derived cache, not a hand-kept ledger.** I own three fields; the system derives the rest.
- **`main` is sacred.** All feature work happens on `auto/<task-slug>` branches via draft PRs.

---

## The two systems

### 1) The brain (Plan 1)
A read-only view over the vault:

| Command | What it does |
|---|---|
| `npm run brief` | Daily standup: what's active, stale, blocked, needing attention |
| `npm run metrics` | Per-project health/recency/progress rollup |
| `npm run trends` | Movement over time |
| `npm run inbox` | Things needing a decision |
| `npm run hud` | Launches the HUD at `http://127.0.0.1:4173` |

### 2) The feature loop (Plan 2)
A resumable 5-stage state machine that takes a project from "what's next" to a reviewed PR:

```
① SELECT   → deterministic ranking of the most important next step (I approve)
② REFINE   → an LLM council pressure-tests the task against the project README
③ IMPLEMENT→ autonomous build on auto/<task-slug>, checkpoint/resume, draft PR
④ VERIFY   → independent adversarial testing — try to break the feature, report honestly
⑤ REVIEW   → I review & merge; findings feed the next SELECT
```

Each cycle is a note in `vault/Cycles/`, keyed by task slug (multiple cycles per project/day
are fine). Reports land in `vault/Reports/`. Proven end-to-end on Dota Coach — the loop has
already caught real defects the implementer missed (e.g. two heroes whose coaching data was
being silently dropped due to stale hero names).

---

## The HUD

A dark, Jarvis-styled terminal dashboard: system vitals, a command deck (run `select`,
`metrics`, `inbox`, `brief`), schedule, and **live vault data**. Project `health` and
`priority` are editable inline and write straight back to the vault notes.

```bash
npm run hud    # then open http://127.0.0.1:4173
```

---

## Setup

```bash
npm install
npm run brief   # confirm it reads the vault
npm run hud     # open the dashboard
```

Requires Node.js (v24+) and the [GitHub CLI](https://cli.github.com/) (`gh`) for git recency
and the feature loop's PR steps.

---

## Status

Admin Brain is self-hosted — its own roadmap lives at
`vault/Plans/admin-brain-roadmap.md` and its project note at `vault/Projects/Admin Brain.md`.
See the roadmap for current goals and progress.
```

## Council refinement
_Grounding: the HUD already exposes its actions as buttons — command deck `.run` buttons
(data-skill = select/brief/metrics/inbox → `runSkill`), `#refresh` (SYNC), `#loop-select` (SELECT
NEXT TASK). "Voice activation for all commands" = capture speech → text, map the text to one of
those actions, fire it. This is a **long · low stretch goal**, and real mic/speech CANNOT be
exercised in this dev environment (no microphone; the in-app browser can't grant mic) — so scope to
the smallest genuinely-useful, cleanly-testable slice._

**🔴 Contrarian** — Do NOT build an always-listening wake-word assistant, pull in a cloud speech SDK,
or add LLM/NLU parsing — that's a huge, privacy-heavy project for a low-priority stretch. Use the
**browser-native Web Speech API**, **push-to-talk** (click the mic), and a **deterministic keyword→
action grammar**. And be honest: the live recognition can't be tested here, so make the *logic*
(the phrase→command mapping, feature detection, wiring) a pure, unit-testable unit.

**🔵 First-Principles** — Voice control decomposes to: (1) speech→text via `SpeechRecognition`;
(2) text→an existing action; (3) fire it. (2) is a tiny keyword table over buttons that already
exist; (3) is `button.click()` — reuse the handlers, don't reimplement select/brief/etc.

**🟢 Expansionist** — A command table keyed by phrase makes every current (and future) HUD button
voice-addressable for free — "run brief", "metrics", "select next task", "sync".

**⚪ Outsider** — I hit the mic, say "run brief," and the brief runs. If my browser can't do speech,
the button just tells me instead of failing silently.

**🟡 Executor** — Branch-sized, front-end only: a 🎤 button + `startVoice()` using
`window.SpeechRecognition || window.webkitSpeechRecognition` (push-to-talk, one-shot); a pure
`matchVoiceCommand(transcript)` → mapped action; on match `.click()` the target button and show
"heard … → …"; feature-detect and disable the button when unsupported. No deps, no LLM, no server
change — the recognition engine is the browser's own.

**Reframe:** "voice for all commands" → a **push-to-talk voice command bar** mapping spoken phrases
to the HUD's existing buttons. First slice of a stretch goal; a wake-word/always-on assistant + TTS
replies stay explicitly future.

## Refined task spec
**Add a push-to-talk voice command bar to the HUD (front-end only, no deps/LLM).**
- A **🎤 Voice** button (header, by SYNC). Click → listen once via `SpeechRecognition ||
  webkitSpeechRecognition` (`lang='en-US'`, `interimResults=false`, `continuous=false`).
- A pure **`matchVoiceCommand(transcript)`** (lowercased, trimmed) → `{ sel, label }` or `null`,
  over a keyword table:
  - `brief` → deck **brief**; `metrics` → **metrics**; `inbox` → **inbox**;
  - `select` / `next task` / `select next` → **#loop-select**;
  - `sync` / `refresh` / `reload` → **#refresh**;
  - `help` / `commands` → show the vocabulary in the status (no action fired).
- On a match, fire it by `document.querySelector(sel).click()` (reuses existing handlers); show
  **"🎙 heard '<transcript>' → <label>"** in a small voice-status line. On no match: a friendly
  "didn't catch a command — try: brief, metrics, inbox, select, sync." On recognition error /
  permission-denied / no-speech: a friendly status; the button re-enables.
- **Feature detection:** if no `SpeechRecognition`, render the mic button **disabled** with
  `title="Voice not supported in this browser"` and a one-line note.
- No new dependency, no LLM/API key, **no server or vault change**; existing HUD untouched.
- **Out of scope:** wake-word / always-listening; text-to-speech replies; LLM/NLU parsing;
  voice-driving the multi-step loop stages (approve/implement) — commands only.

## Definition of done
- `matchVoiceCommand()` maps each documented phrase to the correct target and returns `null` for
  unknown input — **unit-tested without a microphone**.
- A 🎤 button renders; in a browser without `SpeechRecognition` it is **disabled** with the
  unsupported note (feature detection verified by stubbing the API away).
- Wiring: a **simulated recognition result** with e.g. "run brief" triggers the same action as
  clicking the deck **brief** button (verified by spying the target button's click), and the status
  shows heard→matched.
- No new deps; no server/vault change; existing HUD endpoints/behaviour unaffected.
- **Honest limitation, documented:** live microphone speech can't be exercised in this environment;
  the phrase-mapping, feature-detection, and click-wiring are what's verified here — the user
  confirms end-to-end speech on their own machine/mic.

## Implementation
- branch: `auto/voice-activation-module-for-the-admin-brain-and-all-commands` in `C:/Users/liamm/Admin-Brain` (off `main`) — never touches main
- started: 2026-08-12T00:54

### Checkpoint log
- 2026-08-12T00:54 — branch created; supervised implementation started.

- 2026-08-12T05:00 — Built the push-to-talk voice command bar (front-end only). index.html: 🎤 VOICE
  button + voice-status in the header. app.js: `matchVoiceCommand(transcript)` (pure/global keyword
  grammar → {sel,label}|help|null), `startVoice()` (Web Speech `SpeechRecognition||webkitSpeechRecognition`,
  one-shot push-to-talk, onstart/onend/onerror/onresult), `handleVoiceTranscript` (clicks the matched
  HUD button), feature-detect IIFE (disables the mic + notes when unsupported). style.css: listening
  pulse + status. No deps, no LLM, no server/vault change. Verified in-browser (no mic needed):
  grammar 12/12 (brief/metrics/inbox/select/sync/help + unknown→null + empty→null); wiring — a
  simulated "run brief" transcript clicks the deck brief button + status "heard … → brief"; feature
  detection (available→enabled; stubbed-away→getSpeechRecognition null + startVoice "not supported",
  no throw); no-match → helpful hint. No voice-related console errors.

### Result — DoD check
- ✅ `matchVoiceCommand()` maps documented phrases to the right targets; `null` for unknown — unit-tested, no mic.
- ✅ 🎤 button renders; unsupported browser → disabled + note (verified by stubbing the API away).
- ✅ Simulated recognition of "run brief" fires the same action as the deck brief button (spied click); status shows heard→matched.
- ✅ No new deps; **no server/vault change**; existing HUD unaffected.
- ⚠ Honest limitation: live microphone speech can't be exercised in this env (no mic); user confirms end-to-end on their machine.

**Implement complete.** Ready for Phase D (verify).

