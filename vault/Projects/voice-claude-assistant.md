---
type: project
name: Voice Claude Assistant
status: planned
health: green
priority: med
updated: '2026-10-08'
next: 'Phase 0: desk prototype (PC mic -> faster-whisper -> Agent SDK -> Piper)'
local_path: 'C:/Users/liamm/voice-claude'
repo: 'https://github.com/liammpek16/voice-claude'
tags:
  - voice
  - raspberry-pi
  - claude-code
---

## Summary
"Novak" — a room voice assistant that drives Claude Code. Say the wake word, speak a command,
and Claude Code runs it against the Admin Brain (goals, projects, cycles) and reads the answer
back; when Claude needs approval or asks a question, Novak asks out loud and listens for the
reply. Feasibility = **GO**. Full study: [[voice-claude-assistant-feasibility]]; roadmap:
[[voice-claude-assistant-roadmap]].

**Architecture (decided 2026-10-08):** thin Raspberry Pi satellite (wake word, capture + VAD,
Piper TTS) streaming to a **Python bridge on the Windows PC** (faster-whisper STT, local intent
router, persistent Claude Agent SDK session in the Admin Brain, `can_use_tool` → spoken
questions/approvals). Claude Code stays on the PC with the existing login, vault and repos.

**Decisions:**
- Where Claude Code runs: PC bridge + thin Pi satellite.
- Wake word: custom-trained **"Novak"** (openWakeWord), Alexa-style.
- Autonomy by voice: code edits in project repos allowed **with spoken approval**; push/delete
  always gated; never `bypassPermissions`.
- Start: **Phase 0 desk prototype** on the PC first (a Raspberry Pi is already on hand).

## Now
Phase 0: desk prototype on the PC — mic → faster-whisper → Agent SDK session → Piper, with
spoken clarifying questions. Gate: answer "what are my Dota Coach goals?" and one clarifying
question entirely by voice.

## Blockers
- none
