---
type: plan
kind: roadmap
created: '2026-10-08'
project: Voice Claude Assistant
horizon: quarter
status: active
---

## Goal
Talk to Claude Code from anywhere in the room: say "Novak", give a command, hear the answer,
and answer Claude's questions and approvals by voice — with the Admin Brain as its memory.
Design and rationale: [[voice-claude-assistant-feasibility]].

## Steps
- [x] Feasibility study: architecture, hardware, toolboxes, learning plan, warnings
  - _Done 2026-10-08: GO. Decisions — PC bridge + thin Pi satellite; custom "Novak" wake word; code edits with spoken approval; start with Phase 0._
- [ ] Phase 0: desk prototype on the PC — mic → faster-whisper → Claude Agent SDK session in the Admin Brain → Piper TTS through PC speakers
- [ ] Phase 0: spoken clarifying questions + approvals via `can_use_tool` (speak options, parse spoken answer)
- [ ] Phase 0 gate: complete "what are my Dota Coach goals?" and answer one clarifying question entirely by voice
- [ ] Train the custom "Novak" wake word with openWakeWord (target ≤ 1 false trigger per evening of TV)
- [ ] Buy a far-field mic array with echo cancellation (ReSpeaker XVF3800-class) + small speaker for the existing Pi
- [ ] Phase 1: Pi satellite — wake word, capture + Silero VAD, Piper TTS, streaming to the PC bridge (WebSocket/Wyoming)
- [ ] Phase 2: Admin Brain voice skills — local router (brief/stop/repeat), speak-short rules, long output written to the vault, voice turns logged
- [ ] Phase 2: voice permission policy — repo code edits only after a spoken "yes"; push/delete/install always confirmed; never bypassPermissions
- [ ] Phase 3: hardening — systemd + Windows service, auto-reconnect, "PC is offline" message, barge-in, announce when long tasks finish
- [ ] LED ring states (listening / thinking / waiting for you) #improvement
- [ ] Follow-up window: reply without the wake word for ~8 s after Novak speaks #improvement
- [ ] Speaker verification so only your voice can approve actions #improvement
- [ ] Daily voice-turn cap + usage tracking against subscription limits #improvement
- [ ] Phone fallback via Claude Code Remote Control #improvement
