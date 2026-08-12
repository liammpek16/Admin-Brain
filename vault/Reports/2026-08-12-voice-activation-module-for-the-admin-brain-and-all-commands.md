---
type: report
project: Admin Brain
task: Push-to-talk voice command bar in the HUD
date: '2026-08-12'
cycle: 2026-08-12-voice-activation-module-for-the-admin-brain-and-all-commands
verdict: pass
---

# Verification report — Admin Brain (voice command bar)

**Task:** Voice-activation module for the Admin Brain and all commands (first slice)
**Branch:** `auto/voice-activation-module-for-the-admin-brain-and-all-commands` · **PR:** Admin-Brain #5

## What was tested
Independent pass over the phrase grammar, wiring, feature detection, and safety (browser, no mic):

| # | Check | Result |
|---|-------|--------|
| G1 | Grammar maps brief/metrics/inbox/select/sync/help correctly; unknown & empty → `null` | ✅ 12/12 |
| W1 | Simulated `"run brief"` transcript **clicks the deck brief button** (spied) + status heard→matched | ✅ |
| F1 | Feature detection: API present → button enabled; API stubbed away → `getSpeechRecognition()` null and `startVoice()` shows "not supported" (no throw) | ✅ |
| A1 | Case + whitespace normalized (`"  BRIEF  "`, `"MeTrIcS"`) | ✅ |
| A2 | **Word boundaries** — no false positives (`briefing`, `selection`, `debrief` → null) | ✅ |
| A3 | Multi-command utterance (`"run brief then sync"`) → first match wins, deterministic | ✅ |
| A4 | **XSS-safe** — status uses `textContent`; `<img onerror>` in a transcript is not injected | ✅ |
| A5 | Clicking the mic → `startVoice()` → `new SpeechRecognition().start()` (status "🎙 listening…") | ✅ |
| S1 | Diff is **front-end only** — `hud/public/*` (+ cycle/report notes); no server/skills/adapters change | ✅ |
| N1 | No-match / mic-denied / no-speech → friendly status, no crash | ✅ |

## Findings
No defects.

- **Honest limitation (by environment):** live microphone speech can't be exercised here — the
  Browser pane **blocks mic access** (the browser explicitly flagged it during A5). So the verified
  surface is the phrase→command grammar, the click-wiring up to `recognition.start()`, feature
  detection, and safety. End-to-end spoken commands should be confirmed on a real mic + a
  Web-Speech-capable browser (Chrome/Edge). This was scoped and disclosed up front.
- **Pre-existing, out of scope:** the HUD's 20 s poll logs `ERR_CONNECTION_REFUSED` when the local
  server is unreachable (unhandled fetch rejection in the loaders) — unrelated to this cycle, seen
  only because the test server was flapping.

## Verdict
**pass.** A clean, dependency-free, no-LLM push-to-talk command bar: deterministic keyword grammar
over the HUD's existing buttons, reusing their handlers, with feature detection and graceful
degradation. Grammar, wiring, safety, and the click→recognition path are all verified; the sole
untestable piece (live mic capture) is an environment limit, not a code gap. Front-end only, existing
HUD untouched. Safe on the branch behind draft PR #5.
