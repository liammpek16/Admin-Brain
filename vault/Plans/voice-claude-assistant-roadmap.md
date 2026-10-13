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
- [x] Phase 0: desk prototype on the PC — mic → faster-whisper → Claude Agent SDK session in the Admin Brain → Piper TTS through PC speakers
  - _Delivered 2026-10-08 ([voice-claude](https://github.com/liammpek16/voice-claude) `8b422d5`, `5fe30a5`): push-to-talk loop `uv run python -m desk.main`; Whisper small.en on the RTX 4070 (~0.35 s), Piper en_GB-alan voice, local intents, voice log in `vault/Voice/`. Fix: a stray `ANTHROPIC_API_KEY` overrode the subscription login, now ignored. Verified end to end by voice._
- [x] Phase 0: spoken clarifying questions + approvals via `can_use_tool` (speak options, parse spoken answer)
  - _Delivered 2026-10-08: `bridge/asker.py` + `bridge/policy.py`. Verified against real Claude: AskUserQuestion read aloud as numbered options, "option two" → Job Hunt; a write outside the vault asked "Should I allow it?" — "no" blocked it, "yeah go ahead" wrote it. Answers typed in place of speech here; the by-voice run is the Phase 0 gate._
- [x] Phase 0 gate: complete "what are my Dota Coach goals?" and answer one clarifying question entirely by voice
  - _Passed 2026-10-08 by voice (session transcript): Dota Coach goals read back; "add a goal to Dota Coach, ask me which section" → spoken AskUserQuestion answered "Roadmap steps"; "never mind, cancel that" and a spoken "no" to a git commit were both honoured. Phase 0 complete._
- [ ] Train the custom "Novak" wake word with openWakeWord (target ≤ 1 false trigger per evening of TV)
- [ ] Buy a far-field mic array with echo cancellation (ReSpeaker XVF3800-class) + small speaker for the existing Pi
- [ ] Phase 1: Pi satellite — wake word, capture + Silero VAD, Piper TTS, streaming to the PC bridge (WebSocket/Wyoming)
- [x] Phase 2: Admin Brain voice skills — local router (brief/stop/repeat), speak-short rules, long output written to the vault, voice turns logged
  - _Delivered 2026-10-13 (voice-claude, branch phase2-voice-skills-and-policy): brief, "what's next for <project>", project count and time/date answered straight from the vault via skills/vault/vault.js — ~1 s, $0, no Claude call (brief was a ~$0.15 Claude call); fuzzy project names ("the job hunt", "voice project"); voice log now records mid-turn questions/answers and marks local turns; raw Claude errors spoken as actionable sentences; "project one" style answers. Verified live in text mode + 78 tests._
- [x] Phase 2: voice permission policy — repo code edits only after a spoken "yes"; push/delete/install always confirmed; never bypassPermissions
  - _Delivered 2026-10-13: PreToolUse hook enforces the policy on every tool call regardless of settings — destructive git/rm commands denied outright, push/commit/delete/install and edits outside the vault force a spoken yes; sees through `git -C <path>` options; a yes/no answer longer than 6 words no longer counts. Live-verified on a throwaway repo: `reset --hard` blocked without a prompt, `commit` asked and a spoken "no" refused it._
- [ ] Phase 3: hardening — systemd + Windows service, auto-reconnect, "PC is offline" message, barge-in, announce when long tasks finish
  - _Built 2026-10-13 (voice-claude branch phase3-hardening), awaiting real-world check: Windows logon task + crash-restart supervisor (restart/backoff tested); "Still working: <step>" + "Done." on long turns (live-verified); Claude session auto-restart; Uno button box replug recovery; wake-word barge-in on desk + Pi (unit-tested, not yet tried by voice). Pi systemd/reconnect/"can't reach your PC" from Phase 1. Tick after a day of real use._
- [ ] Phase 4: voice quality — make Novak respond faster (lower wake-to-first-word latency, streamed TTS) and sound more natural/human (better or custom voice model)
  - _Description: make Novak respond faster (lower wake-to-first-word latency, streamed TTS) and sound more natural/human (better or custom voice model)_
  - _Built 2026-10-13 (branch phase4-extras): sentence-streamed speech (Piper first sound 0.11 s; Kokoro 0.9 s vs ~2 s); optional Kokoro-82M voice engine (NOVAK_TTS=kokoro). Measured: Claude default model 2–3 s per simple question, Sonnet/Haiku no faster, so the model stays. Waiting on the user's pick from the voice samples; Pi stays on Piper._
- [ ] LED ring states (listening / thinking / waiting for you) #improvement
  - _Built in Phase 1 (Uno sketch + Pi GPIO): idle/listening/thinking/speaking/waiting/error colours; awaits the hardware build._
- [ ] Follow-up window: reply without the wake word for ~8 s after Novak speaks #improvement
  - _Built 2026-10-13 (branch phase4-extras): desk + Pi, NOVAK_FOLLOW_UP_SECONDS; not yet tried by voice._
- [ ] Speaker verification so only your voice can approve actions #improvement
  - _Built 2026-10-13: CAM++ voice embeddings (sherpa-onnx), profile from the wake-word recordings; held-out owner audio 0.48–0.79 vs other voices ≤0.20 (threshold 0.4). Live: another voice's "yes" over the bridge was refused. Owner acceptance not yet tried live._
- [x] Daily voice-turn cap + usage tracking against subscription limits #improvement
  - _Delivered 2026-10-13: "how much have I used today?" answered locally from the voice log; NOVAK_DAILY_CLAUDE_TURNS (50) stops Claude-by-voice, local answers keep working. Tested._
- [ ] Phone fallback via Claude Code Remote Control #improvement
  - _Built 2026-10-13: `install-autostart.ps1 -Mode phone` keeps a Remote Control session in the Admin Brain for the Claude app; needs a one-time manual `claude remote-control` to accept prompts. Not yet tried._
