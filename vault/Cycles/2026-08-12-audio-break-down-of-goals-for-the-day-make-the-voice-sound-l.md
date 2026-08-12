---
type: cycle
project: Admin Brain
stage: implement
status: active
task: >-
  audio break down of goals for the day. Make the voice sound like Jarvis from
  Iron Man
started: '2026-08-12'
readme_source: 'https://github.com/liammpek16/Admin-Brain'
branch: auto/audio-break-down-of-goals-for-the-day-make-the-voice-sound-l
target_path: 'C:/Users/liamm/Admin-Brain'
---

## Task (from SELECT)
audio break down of goals for the day. Make the voice sound like Jarvis from Iron Man

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
_Scope: a HUD control that speaks today's goals aloud in a Jarvis-styled voice. The HUD already
computes the day's agenda (FOCUS TODAY + NEEDS ATTENTION via `/api/overview`), and PR #5 already
added the browser Web Speech **recognition** side — this is its natural twin: **synthesis**
(`window.speechSynthesis`). Front-end only, like the voice command bar._

**🔴 Contrarian** — The foot-gun here is the phrase "sound like Jarvis from Iron Man." Browser TTS
**cannot** clone Paul Bettany — a real movie voice needs an external neural-TTS service (ElevenLabs
etc.), which would **break every core principle**: $0 → paid API, local/private → the briefing text
leaves the machine, no-deps → an SDK + an API key. So don't chase the clone. Ship the honest thing:
read the agenda in the **best available British male voice** with Jarvis phrasing/cadence. Two real
traps to handle: (1) `speechSynthesis.getVoices()` returns **[]** on first call until `onvoiceschanged`
fires — pick the voice lazily or you get the wrong one; (2) don't read a wall of markdown/IDs — speak a
short, composed briefing.

**🔵 First-Principles** — "Audio breakdown of goals" = take the data the HUD already has for today
(focus list, attention count, portfolio line) → compose a short spoken script → `speechSynthesis.speak`.
The "Jarvis-ness" is voice choice + phrasing + rate/pitch. Nothing else is required at $0.

**🟢 Expansionist** — A `speak(text)` + best-voice primitive is the base for a future conversational
HUD (audible command confirmations, spoken replies) — the synthesis half that pairs with PR #5's
recognition. Keep THIS branch to the daily-agenda briefing; leave the rest as follow-ups.

**⚪ Outsider** — I click one button and a calm British voice tells me what to focus on today, like a
morning briefing. It must not recite raw markdown or numbers-as-noise; it should sound composed.

**🟡 Executor** — Branch-sized, front-end only (mirrors the voice command bar): a 🔊 button in the
header; on click build a script from the already-loaded overview, pick the most Jarvis-like installed
voice (British male, rate ~0.95, pitch ~0.9), `speechSynthesis.speak`; click again cancels. Handle async
voice load + the unsupported-browser case. No deps, no server/vault change.

**Gap:** the deliverable is a **short, well-phrased spoken agenda in the best-available British male
voice** — an honest browser-native approximation of Jarvis. A movie-accurate clone is explicitly OUT
(needs an external paid TTS service → breaks $0/local/no-deps); logged as a stretch follow-up.

## Refined task spec
**Add a "speak today's agenda" control to the HUD — a Jarvis-styled audio briefing via the browser's
Web Speech synthesis.** Front-end only (`hud/public/{index.html,app.js,style.css}`); no server/vault/dep
change; stays $0 / no-LLM / local.

- **`buildBriefingScript(overview)`** — pure + global (like `matchVoiceCommand`), so it's unit-testable
  without audio. From the `/api/overview` data the HUD already loads (date, portfolio counts + summary,
  `attention[]`, `focus[]`) compose a concise, Jarvis-styled spoken string: a greeting, "N item(s) need
  your attention", then the focus items read as an agenda. Graceful when focus is empty ("nothing on the
  board for today"). A few sentences — not a data dump.
- **Voice selection** — `pickJarvisVoice(voices)` (pure/global): from `speechSynthesis.getVoices()`
  choose the best British male voice by a preference list (e.g. "Google UK English Male", "Microsoft
  Ryan/George (en-GB)", "Daniel"), else any `en-GB`, else the default. Handle the async load
  (`onvoiceschanged`) so a first-click before voices load still works.
- **Button** — a 🔊 control ("🔊 AGENDA") in the header topline next to 🎤 VOICE. Click → speak the
  briefing (rate ~0.95, pitch ~0.9, the picked voice); click again → `speechSynthesis.cancel()` (toggle),
  mirroring the mic button. A `#tts-status` line shows state.
- **Voice-command symmetry (small)** — add an "agenda"/"read my goals"/"brief me" phrase to the existing
  voice grammar that clicks the new button, so the mic and speaker pair up.
- **Feature-detect** — if `window.speechSynthesis` is absent, disable the button with a note; never throw.

## Definition of done
- A 🔊 AGENDA button in the HUD header; clicking speaks a **concise, Jarvis-styled briefing of today's
  focus/attention** using the best available British male voice; clicking again stops it mid-speech.
- **`buildBriefingScript(overview)`** is pure/global and returns a short spoken string across overview
  states (with focus items; empty focus; some vs zero attention) — no markdown, no raw IDs.
- **`pickJarvisVoice(voices)`** returns the preferred en-GB male when present, degrades to any en-GB,
  then to the default/undefined; tolerant of an **empty** initial voice list (async load).
- Unsupported browsers: button disabled + note; no crash.
- No new deps; no server/vault change; $0 / no-LLM / local; existing HUD (incl. 🎤 voice) unaffected.
- Verified: unit tests for `buildBriefingScript` (several overview shapes) and `pickJarvisVoice` (voice
  lists incl. empty) via node/global; feature-detect both ways. **Caveat (as with PR #5's mic): actual
  audio playback / the specific voice can't be verified headlessly — the user confirms the sound on their
  machine (Chrome/Edge).**

**Out of scope:** a real neural "movie Jarvis" voice clone (needs an external paid TTS service + API key
→ breaks $0/local/no-deps — logged as a stretch follow-up); TTS of arbitrary notes; wake-word / always-on
listening; server-side audio.

## Implementation
- branch: `auto/audio-break-down-of-goals-for-the-day-make-the-voice-sound-l` in `C:/Users/liamm/Admin-Brain` (off `main`) — never touches main
- started: 2026-08-12T23:30

### Checkpoint log
- 2026-08-12T23:30 — branch created; supervised implementation started.
- 2026-08-12T23:45 — Built the audio briefing (front-end only, no deps/server/vault change).
  `hud/public/index.html`: 🔊 AGENDA button + `#tts-status` beside 🎤 VOICE. `hud/public/app.js`:
  `lastOverview` stash (set in `loadOverview`); pure globals `buildBriefingScript(overview)`
  (Jarvis-styled greeting + active count + attention count + numbered focus agenda; graceful on
  empty), `speechClean` (strips md, dashes/arrows→pauses), `pickJarvisVoice(voices)` (en-GB male
  preference list → any en-GB → any English → null=default; tolerates []); `speakAgenda()` toggle
  (`speechSynthesis.speak`/`.cancel`, rate 0.95/pitch 0.9, live `.speaking` state) with async
  voice warm-up (`voiceschanged`) + unsupported-browser feature-detect; a new "agenda/read my
  goals" voice command (`#tts-btn`) + updated help text. `hud/public/style.css`: `#tts-btn.speaking`
  cyan pulse. Server still $0/no-LLM.

### Result — DoD check
- ✅ 🔊 AGENDA button in the header; click speaks a concise Jarvis-styled briefing of today's
  focus/attention in the best available British male voice; click again cancels (toggle).
- ✅ `buildBriefingScript(overview)` pure/global, correct across shapes (focus items; empty focus;
  singular/plural project + zero/some attention; null overview) — no markdown/IDs (verified).
- ✅ `pickJarvisVoice(voices)` prefers en-GB male → any en-GB → any English → null(default);
  tolerates an empty list (async load).
- ✅ Unsupported browsers: both feature-detect IIFEs disable the button + note; module load throws
  nothing (proven — loaded with `speechSynthesis` undefined).
- ✅ No new deps; no server/vault change; $0/no-LLM/local; 🎤 voice bar unaffected (its grammar
  still routes brief/metrics/etc.; agenda added without collision).
- ✅ 19/19 unit checks against the REAL `app.js` source (VM-loaded): `speechClean`,
  `buildBriefingScript`, `pickJarvisVoice`, `matchVoiceCommand`. Live server serves the new assets.
- ⏳ Caveat: actual audio / the exact voice can't be verified headlessly (as with PR #5's mic) —
  user confirms the sound on their machine.

**Implement complete.** Ready for Phase D (verify).

