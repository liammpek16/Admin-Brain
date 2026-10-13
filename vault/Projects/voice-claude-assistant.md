---
type: project
name: Voice Claude Assistant
status: active
health: green
priority: med
updated: '2026-10-13'
next: >-
  Shorter spoken replies — Novak's answers should be brief and to the point,
  with detail left to the vault
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
Phase 0 done 2026-10-08 (desk prototype works by voice, spoken questions/approvals verified).
Now: train the custom "Novak" wake word with openWakeWord, wire it into the desk loop as a
hands-free mode, then Phase 1 — move wake word, capture and TTS onto the Pi.

## Blockers
- none
