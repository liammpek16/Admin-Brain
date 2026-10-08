---
type: research
project: Voice Claude Assistant
created: '2026-10-08'
status: approved
source: 'https://claude.ai/code/artifact/34af1907-cbe1-4587-8545-00af8566c700'
---

# Voice Claude Assistant — Feasibility Study

2026-10-08 · Project: [[voice-claude-assistant|Voice Claude Assistant]] · Roadmap: [[voice-claude-assistant-roadmap]]

> Saved copy of the Claude Doc (live version: see `source` above). Decisions were answered on 2026-10-08 and are recorded at the bottom.

## Verdict

**Feasible — GO.** Every piece exists off the shelf and runs on a Raspberry Pi 5; the novel part is a ~1,000-line Python "bridge" that turns Claude Code's events into speech. Difficulty: intermediate. Expect a working prototype in 2–3 weekends and a reliable room device in 4–6.

The one decision that matters most: **the Pi should be a thin voice satellite, and Claude Code should keep running on your Windows PC.** Your Admin Brain vault, your project repos, your Claude Code login and your skills all live on the PC. Moving Claude Code onto the Pi means syncing all of that and running a 4 GB+ Node agent on a small board; leaving it on the PC means the Pi only has to hear, speak and forward text.

The feature that makes this project possible is the Claude Agent SDK's `can_use_tool` callback. It pauses Claude whenever it needs a permission or asks a clarifying question (`AskUserQuestion`), which is exactly the hook for "prompt me out loud when I need to give input."

Expected latency from end of your sentence to first spoken word: about 2–4 s for a simple question, longer while Claude reads files or runs tools. It will feel like a smart colleague thinking, not like Siri.

## Architecture

**The Pi only hears and speaks; Claude Code stays on your PC.**

```
┌─ Raspberry Pi 5 (room) ─┐        ┌─ Windows PC: bridge ────┐        ┌─ Claude Code (on PC) ───┐
│ Mic array + speaker     │ audio  │ Speech-to-text          │ prompt │ Claude Code             │
│   far-field, echo cancel│ ─────▶ │   faster-whisper on GPU │ ─────▶ │   your Pro/Max login    │
│ Wake word ("Novak")     │        │ Router                  │        │ Admin Brain vault       │
│   openWakeWord, local   │        │   stop/repeat/brief local│       │   projects, plans, goals│
│ Capture + VAD           │ speak  │ Claude session          │ events │ Skills                  │
│   Silero, ends on silence│◀───── │   Agent SDK, persistent │ ◀───── │   brief, select, session│
│ Text-to-speech          │        │ ★ Asker                 │        │ Project repos           │
│   Piper, per sentence   │        │   can_use_tool → spoken Q│       │   edits need spoken yes │
└─────────────────────────┘        └─────────────────────────┘        └─────────────────────────┘
Only audio after the wake word leaves the Pi, and only to your PC on the home network.
```

The Pi turns sound into audio clips and text back into sound; the bridge on your PC turns audio into text, drives one persistent Claude Code session in the Admin Brain, and turns Claude's questions into spoken prompts (★).

## Hardware

Budget about **$150–$220** for the room device. Prices are approximate US retail from memory, not quotes. (A Raspberry Pi is already on hand.)

| Part | Recommended pick | Why | Approx. cost |
| --- | --- | --- | --- |
| Board | Raspberry Pi 5, 4 GB (8 GB if you might run STT on the Pi) | Fast enough for wake word + local TTS; 4 GB is plenty for a thin satellite | $60–$80 |
| Power | Official 27 W USB-C PSU | Under-powered Pis cause USB audio dropouts | $12 |
| Cooling + case | Official case with fan, or Active Cooler | Always-on device; prevents throttling | $10–$15 |
| Storage | 32–64 GB A2 microSD (or NVMe HAT later) | OS + models (~1 GB) | $10–$15 |
| Microphone | ReSpeaker XVF3800 / XVF3000 USB 4-mic array (or ReSpeaker Lite) | Far-field pickup, beamforming, on-chip echo cancellation (AEC) so it hears you while it is talking | $35–$60 |
| Speaker | Small powered USB or 3.5 mm speaker (Pi 5 has no headphone jack, so use USB or the mic array's audio out) | Clear voice, not music quality | $15–$30 |
| Optional status light | Mic array's built-in LED ring, or a WS2812 ring on GPIO | Shows listening / thinking / waiting-for-you at a glance | $0–$10 |
| Optional button | Momentary push button on GPIO | Push-to-talk fallback and a physical "stop" | $2 |

The microphone is the part not to cheap out on. A $5 USB mic works at arm's length but fails across a room and cannot cancel its own speaker, so the bot hears itself and re-triggers.

## Software stack and toolboxes

All components below are free and local except Claude itself, which runs on your existing Claude subscription.

| Job | Tool | Runs on | Notes |
| --- | --- | --- | --- |
| Wake word ("Novak") | [openWakeWord](https://github.com/dscripka/openWakeWord) | Pi | Apache-2.0; custom wake word trained from synthetic speech in ~20 min, no recordings needed. Alternative: Picovoice Porcupine (easier, but licence-limited) |
| Voice activity detection | Silero VAD (or webrtcvad) | Pi | Decides when you stopped talking |
| Speech-to-text | [faster-whisper](https://github.com/SYSTRAN/faster-whisper) `small.en` / `distil-large-v3` | PC (GPU) | Whisper tiny on a Pi 5 takes 2–3 s and is error-prone with code and project names; on a PC GPU, small/medium is under 1 s |
| Text-to-speech | [Piper](https://github.com/OHF-Voice/piper1-gpl) | Pi | Real-time on a Pi 5, ~sub-second per sentence; pick a voice you like |
| Audio transport Pi ↔ PC | Wyoming protocol (Home Assistant's voice protocol) or a plain WebSocket | both | Wyoming already has satellite/STT/TTS servers you can reuse instead of writing audio plumbing |
| Claude Code control | [Claude Agent SDK for Python](https://code.claude.com/docs/en/agent-sdk/python) (`ClaudeSDKClient`) | PC | Persistent session, streaming events, `can_use_tool` for permissions + questions, `interrupt()` for "stop" |
| Fallback control | `claude -p --output-format stream-json --resume <id>` | PC | Simpler, but no live callback for questions |
| Spoken summaries | A system-prompt rule ("answer for speech: ≤ 3 sentences, no code") | PC | Cheapest way to make output listenable |
| Process supervision | systemd (Pi), Windows Task Scheduler or NSSM service (PC) | both | Auto-start and restart on crash |

Off-the-shelf shortcuts worth evaluating before writing your own audio code: Home Assistant's voice satellite projects (Wyoming satellite / linux-voice-assistant) and community Pi voice stacks such as TrooperAI. Use them for the audio half only; none of them drive Claude Code.

## Conversation flow

One voice turn runs these steps; step 6 is where the bot prompts you for input.

1. **Idle.** Pi listens only for the wake word; nothing leaves the device.
2. **Wake.** "Novak" fires; chime plays, LED turns blue.
3. **Capture.** Pi records until VAD hears ~0.8 s of silence, then streams the audio to the PC.
4. **Transcribe + route.** PC turns speech into text. A small router checks for local intents first ("stop", "repeat that", "new session", "what's my brief") so those never cost a Claude call.
5. **Run.** Everything else goes into the persistent Claude Code session with the Admin Brain as its working directory. While Claude works, the Pi says a short filler ("On it") and the LED pulses.
6. **Needs you.** If Claude asks a question or wants approval, `can_use_tool` fires. The bridge speaks the question and the options ("Option one, …; option two, …"), opens the mic without a wake word, and maps your answer to an option label or free text. Approvals are spoken as "Claude wants to run git push — yes or no?".
7. **Read back.** The final answer is spoken sentence by sentence as it streams. Anything long (code, diffs, tables) is not read aloud; the bot says "I've put the details in today's note" and writes them to the vault.
8. **Follow-up window.** For ~8 s after speaking, the mic stays open so you can reply without the wake word; then it returns to Idle.

Two controls must work at every step: saying the wake word while it is talking stops speech (barge-in), and "cancel" calls the SDK's `interrupt()`.

## Code infrastructure

One Python repo (`voice-claude`) with two deployable halves sharing a message schema. Python fits because the Agent SDK, faster-whisper, openWakeWord and Piper all have first-class Python APIs.

```
voice-claude/
  shared/
    protocol.py        # message types: AudioChunk, Transcript, Speak, State, Ask, Answer
    config.py          # wake word, voices, PC address, timeouts (pydantic-settings + .env)
  satellite/           # runs on the Pi
    main.py            # asyncio state machine: IDLE -> LISTENING -> WAITING -> SPEAKING
    wakeword.py        # openWakeWord wrapper
    capture.py         # mic stream + Silero VAD endpointing
    tts.py             # Piper, sentence queue, barge-in stop
    leds.py            # state -> colour
    link.py            # WebSocket/Wyoming client to the PC, auto-reconnect
  bridge/              # runs on the Windows PC
    server.py          # WebSocket server, one satellite session at a time
    stt.py             # faster-whisper on GPU
    router.py          # local intents (stop/repeat/brief) vs Claude
    claude_session.py  # ClaudeSDKClient: start/resume session, stream events, interrupt
    asker.py           # can_use_tool -> speakable question -> parse spoken answer
    speech_format.py   # markdown -> speakable sentences; long output -> vault note
    policy.py          # allow/deny lists for tools (no destructive commands by voice)
    log.py             # every turn appended to the vault as a session note
  tests/               # recorded-audio fixtures, fake Claude event streams
  deploy/
    voice-satellite.service   # systemd unit for the Pi
    install-bridge.ps1        # registers the bridge as a Windows service
```

Design rules that keep it maintainable:

- The satellite knows nothing about Claude; the bridge knows nothing about microphones. Either half can be swapped (phone app, desktop mic) later.
- `asker.py` and `speech_format.py` are pure functions with unit tests; they hold most of the tricky logic.
- Configuration, not code, holds the wake word, voice, allowed tools and working directory.
- Prefer reusing Wyoming servers for STT/TTS over writing your own transport, in line with the Admin Brain rule of adopting maintained tools over hand-rolling.

## Admin Brain integration

No new Admin Brain code is needed for v1: the bridge starts its Claude session with the Admin Brain repo as the working directory, so Claude already sees the vault, `CLAUDE.md` and the existing skills (`brief`, `select`, `session`, `plan`, `inbox`).

| You say | What happens |
| --- | --- |
| "What should I work on today?" | Router runs `node brief.js` directly (deterministic, $0, ~1 s) and Claude only phrases it for speech |
| "What are the goals for Dota Coach?" | Claude reads `vault/Projects/Dota Coach.md` + `vault/Plans/dota-coach-roadmap.md` and reads back open milestones |
| "Add a task to Job Hunt: apply to three remote roles" | Claude appends to the roadmap or `vault/Inbox`, then confirms out loud |
| "Run the next cycle" | Claude runs `npm run select`; the approval gate is spoken as a yes/no question |
| "Log a session" | Claude asks the session fields one by one and calls `skills/session/session.js` |

Three additions make this work well:

- A `voice` section in the Admin Brain `CLAUDE.md` (or an appended system prompt) telling Claude to answer in ≤ 3 spoken sentences and to write details to the vault.
- A voice-turn log: each turn appended to `vault/Sessions/` or `vault/Daily/`, so voice work shows up in metrics and trends.
- Hard limits for voice-originated work: read and vault-write freely; code changes in project repos, pushes and deletes require a spoken "yes" or are refused outright.

## What you need to learn, in order

Each topic is ordered by when the build needs it; rough effort assumes you already write Python or JS.

| # | Topic | What specifically | Effort |
| --- | --- | --- | --- |
| 1 | Raspberry Pi basics | Flash Raspberry Pi OS Lite 64-bit, headless SSH, static IP / hostname, `apt`, Python venvs | 1 evening |
| 2 | Linux audio | ALSA vs PipeWire, `arecord`/`aplay`, picking the right device index, sample rates (16 kHz mono for speech) | 1–2 evenings — the most frustrating part |
| 3 | Python `asyncio` | Tasks, queues, cancellation; the whole satellite and bridge are async event loops | 2–3 evenings |
| 4 | Speech pipeline concepts | Wake word vs VAD vs STT, false accepts/rejects, endpointing, echo cancellation, barge-in | 1 evening of reading |
| 5 | WebSockets / Wyoming | Streaming binary audio + JSON events between two machines, reconnect logic | 1–2 evenings |
| 6 | Claude Agent SDK | `ClaudeSDKClient`, message types, sessions/resume, `can_use_tool`, hooks, permission modes, `interrupt()` | 2–3 evenings |
| 7 | Claude Code permissions | `allowedTools` rule syntax, `settings.json` deny rules, why voice should never run `bypassPermissions` | 1 evening |
| 8 | Prompting for speech | System-prompt rules for short spoken answers; converting markdown to speakable text | ongoing |
| 9 | Services | systemd units on the Pi, a Windows service or scheduled task for the bridge, logs with `journalctl` | 1 evening |
| 10 | Wake-word training | openWakeWord's Colab notebook to train "Novak" | 1 evening |

Good first exercises: get `arecord` → faster-whisper → print working on the Pi; then run the Agent SDK "user input" example from the docs in a terminal before adding any audio.

## Warnings

The first three are the ones most likely to sink the project if ignored.

1. **Safety of voice-driven actions.** Anyone in the room, a TV, or a mis-transcription can issue a command. Never run the voice session in `bypassPermissions`; require a spoken yes for edits, git push, installs and deletes. Consider speaker verification later.
2. **Speech is a terrible channel for code.** Claude's normal answers are long markdown with code blocks. Without a strict "speak short, write details to the vault" rule, the bot will read file paths and diffs aloud for minutes.
3. **Hearing itself.** Without hardware echo cancellation the speaker output re-triggers the wake word or gets transcribed as your answer. Buy a mic array with AEC and mute capture while speaking until barge-in works.
4. **Subscription terms and auth.** Running Claude Code with your own Pro/Max login for personal automation is the normal case, but `--bare` mode and some SDK paths require an `ANTHROPIC_API_KEY` (metered billing). Keep the bridge on the PC where you are already logged in, and re-check Anthropic's terms if you ever share the device.
5. **Usage limits.** Every voice turn spends subscription usage, and the Admin Brain's autonomous cycles already spend some. Route cheap intents (brief, time, stop) locally and set a daily voice-turn cap.
6. **PC must be on.** The satellite is useless if the PC sleeps. Configure wake-on-LAN or keep the PC awake, and have the Pi say "Your PC is offline" instead of failing silently.
7. **Latency stacking.** Wake word + endpointing + STT + Claude thinking + TTS add up. Stream TTS per sentence and play a filler sound immediately, or it will feel broken.
8. **Transcription of names.** Whisper mishears project names ("Dota Coach", "friendslop", "Admin Brain"). Pass an `initial_prompt` with your vocabulary and let Claude fuzzy-match project names.
9. **Long-running tasks.** A cycle can run for many minutes. The bot should say "I'll tell you when it's done" and announce completion later rather than holding the mic open.
10. **Windows networking.** Windows Firewall blocks inbound connections to the bridge by default; allow the port on the private network only and authenticate the satellite with a shared token.
11. **Privacy.** Only post-wake-word audio should leave the Pi, and only to your PC. Keep everything on the LAN; do not expose the bridge to the internet.
12. **SD-card wear and power cuts.** An always-on Pi logging to the SD card can corrupt it. Use the official PSU, log to RAM (`log2ram`), or boot from NVMe.

## Build phases

Five phases, each ending in a gate you can test in one sitting.

1. **Phase 0 — Desk prototype, no Pi (1 weekend).** PC mic → faster-whisper → Agent SDK session in the Admin Brain → Piper through PC speakers, with spoken questions via `can_use_tool`. *Gate: you complete "what are my Dota Coach goals?" and answer one clarifying question by voice.*
2. **Phase 1 — Pi satellite (1–2 weekends).** Move wake word, capture and TTS to the Pi; stream to the bridge on the PC. *Gate: wake word works from across the room with ≤ 1 false trigger per evening of TV.*
3. **Phase 2 — Admin Brain voice skills (1 weekend).** Local router for brief/stop/repeat, speech-format rules, vault logging, voice permission policy. *Gate: a week of daily "morning brief" use without touching the keyboard.*
4. **Phase 3 — Hardening (1 weekend).** Services, auto-reconnect, PC-offline message, barge-in, completion announcements for long tasks. *Gate: survives a Pi reboot and a PC sleep/wake unattended.*
5. **Phase 4 — Nice-to-haves (later).** LED states, speaker verification, a second satellite, phone fallback via Claude Code Remote Control.

## Decisions (answered 2026-10-08)

| Decision | Answer |
| --- | --- |
| Where Claude Code runs | PC bridge + thin Pi satellite |
| Bot name / wake word | Train a custom one: **"Novak"** (Alexa-style) |
| Autonomy by voice | Code edits in project repos **with spoken approval** |
| Start point | Phase 0 desk prototype first (a Raspberry Pi is already on hand) |
| Project name and priority | "Voice Claude Assistant", priority med, health green |

## Sources

- [Run Claude Code programmatically (headless / `claude -p`)](https://code.claude.com/docs/en/headless) — output formats, `--resume`, permission flags, `--bare` needs an API key
- [Agent SDK: handle approvals and user input](https://code.claude.com/docs/en/agent-sdk/user-input) — `can_use_tool`, `AskUserQuestion`
- [Agent SDK Python reference](https://code.claude.com/docs/en/agent-sdk/python)
- [openWakeWord overview](https://whipscribe.com/tools/openwakeword) and [Training a wake word that actually fires](https://dev.to/gabrielhruiz/training-a-wake-word-that-actually-fires-lessons-from-an-offline-voice-assistant-3716)
- [Raspberry Pi 5 offline voice benchmarks](https://bmdpat.com/blog/raspberry-pi-5-local-voice-ai-2026) — Whisper tiny 2–3 s, small ~9 s on Pi 5 CPU
- [Local voice assistant stack 2026: Whisper + Piper](https://dev.to/kunal_d6a8fea2309e1571ee7/local-ai-voice-assistant-stack-2026-whisper-piper-ollama-wired-together-572l)
- [TrooperAI (Pi 5 low-latency voice assistant)](https://github.com/m15-ai/TrooperAI)
- [Claude Code on ARM64 Linux](https://learn.arm.com/install-guides/claude-code/)

Hardware prices and the ReSpeaker model names are from memory and should be checked before ordering.
