---
type: cycle
project: Voice Claude Assistant
stage: verify
status: done
task: stop saying "On it" after every command; make it more conversational instead
started: '2026-10-13'
readme_source: 'https://github.com/liammpek16/voice-claude'
branch: auto/stop-saying-on-it-after-every-command
target_path: 'C:/Users/liamm/voice-claude'
orchestrated: true
report: 2026-10-13-stop-saying-on-it-after-every-command-make-it-more-conversat
---

## Task (from SELECT)
stop saying "On it" after every command; make it more conversational instead

## Project goal — source: https://github.com/liammpek16/voice-claude
```
# voice-claude — Novak

A voice front-end for Claude Code and the Admin Brain. You speak a command, Claude Code runs it in the
Admin Brain, and Novak reads the answer back. When Claude needs approval or asks a question, Novak asks
out loud and listens for your reply.

Design and decisions: Admin Brain `vault/Research/voice-claude-assistant-feasibility.md`.
Roadmap: `vault/Plans/voice-claude-assistant-roadmap.md`.

## Status: Phase 0 (desk prototype)

Everything runs on the Windows PC: PC mic → faster-whisper (GPU) → Claude Agent SDK session in the
Admin Brain → Piper → PC speakers. Push-to-talk with Enter; no wake word yet ("Novak" comes in Phase 1).

## Setup

```powershell
uv sync --extra cuda          # Python 3.12 venv; drop --extra cuda to run Whisper on the CPU
uv run python -m piper.download_voices --download-dir voices en_GB-alan-medium
claude                        # once, then /login, if `claude -p "hi"` says the session expired
```

If downloads fail with certificate errors (antivirus/proxy TLS inspection), add `--native-tls` to `uv sync`.

## Run

```powershell
uv run python -m desk.selftest          # no mic: Piper speaks a phrase, Whisper transcribes it back
uv run python -m desk.selftest --play --mic   # also play it and test your microphone
uv run python -m desk.main              # Phase 0 loop: Enter to talk, Ctrl+C to quit
uv run python -m desk.main --text       # type instead of talking (still speaks)
uv run pytest
```

Things to say: "What are the goals for Dota Coach?", "What should I work on today?", "Add a goal to
Job Hunt: …", "repeat that", "more" / "tell me more", "start over", "goodbye".

## Phase 0 gate

Complete "what are my Dota Coach goals?" and answer one clarifying question entirely by voice.

## Voice permissions

`bridge/policy.py` — decided 2026-10-08:

| Request | What happens |
| --- | --- |
| Reads, searches | Run without asking |
| Writes inside the Admin Brain vault | Run without asking |
| Edits in project repos, any other shell command, web fetches | Novak asks; needs a clear spoken "yes" |
| `rm -rf`, `git push --force`, `git reset --hard`, `git clean -f`, recursive deletes | Refused, even with a yes |

The session runs with `permission_mode="default"` and only the Admin Brain's project settings, so a
user-level auto/bypass mode never applies to voice. Commands Claude Code already treats as read-only
(e.g. `git status`) run without a prompt.

## Layout

```
shared/config.py          env/.env settings (see .env.example)
bridge/                   will run on the PC in every phase
  stt.py                  faster-whisper, CUDA with CPU fallback
  claude_session.py       ClaudeSDKClient in the Admin Brain + speech rules
  asker.py                can_use_tool -> spoken question/approval -> parsed answer
  policy.py               what voice may do
  speech_format.py        markdown -> a few speakable sentences
  router.py               local intents (stop/repeat/reset/brief/quit)
  voicelog.py             every turn -> Admin Brain vault/Voice/<date>.md
desk/                     Phase 0 only: PC mic + speakers
  audio.py, tts.py, main.py, selftest.py
```

Phase 1 moves `desk/audio.py` + `desk/tts.py` (plus a wake word) onto the Raspberry Pi as `satellite/`.

## Always on (Phase 3)

```powershell
powershell -ExecutionPolicy Bypass -File deploy\install-autostart.ps1              # desk mode: --box --wake
powershell -ExecutionPolicy Bypass -File deploy\install-autostart.ps1 -Mode bridge # PC side of the Pi satellite
powershell -ExecutionPolicy Bypass -File deploy\install-autostart.ps1 -Remove
```

A logon task (not a service: audio needs your session) runs `deploy/run-novak.ps1`, which restarts
Novak after any exit with backoff (10 s doubling to 5 min) and logs to `logs/novak.log`.

- **Barge-in:** saying the wake word while Novak talks stops it and it listens straight away
  (`NOVAK_BARGE_IN=0` to disable, `NOVAK_BARGE_IN_THRESHOLD`, default 0.7, to tune).
- **Long turns:** "Still working: <what Claude is doing>" after 20 s, 60 s, then every 2 min;
  replies to turns over 30 s start with "Done."
- **Recovery:** a dead Claude session is restarted ("I lost my connection to Claude…"); an unplugged
  Uno button box is re-detected and its light restored; the Pi satellite reconnects to the bridge.

## Phase 4 extras

- **Follow-up window:** after a reply, Novak keeps listening for 8 s, so you can answer or ask a
  follow-up without the wake word (`NOVAK_FOLLOW_UP_SECONDS`, 0 to turn off). Novak stops recording
  after 1.2 s of quiet (`NOVAK_SILENCE_SECONDS`).
- **Usage:** "how much have I used today?" is answered locally from the voice log (Claude requests,
  estimated API-price cost, free local answers). After `NOVAK_DAILY_CLAUDE_TURNS` (default 50)
  Claude requests in a day, Novak stops calling Claude by voice; local answers keep working.
- **Short replies:** replies are capped at about 30 words (`NOVAK_MAX_SPOKEN_WORDS`), cut at a sentence
  or clause break. A cut reply ends "Say 'more' for the rest." Saying "more", "tell me more", "keep going"
  or "what else" reads the next part without calling Claude ("continue" and "go on" too, but only while
  part of the reply is unread; otherwise they go to Claude as an answer). The full reply is always in the
  voice log. `uv run python -m bridge.speech_format replay` shows how long past replies would be now.
- **Speaker check:** a spoken "yes" to an approval is matched against your voice profile
  (3D-Speaker CAM++ via sherpa-onnx; built from your wake-word recordings). Three outcomes:
  - score at or above `NOVAK_SPEAKER_THRESHOLD` (0.4): the yes counts.
  - below `NOVAK_SPEAKER_FLOOR` (0.2): refused.
  - in between: Novak says it couldn't confirm it's you and asks once for a short sentence like
    "yes, go ahead with that". A plain "yes" is often too short to recognise (about 0.5 s of speech
    failed 2 in 3 times in testing; full sentences always passed).

  Every check's score and seconds of speech are written to the voice log; if the check can't tell or
  fails, that is logged too (a failing check refuses the approval).
  ```powershell
  curl.exe -L -o voices\speaker_campplus_en.onnx https://github.com/k2-fsa/sherpa-onnx/releases/download/speaker-recongition-models/3dspeaker_speech_campplus_sv_en_voxceleb_16k.onnx
  uv run python -m bridge.speaker enroll     # profile from wakeword/recordings
  uv run python -m bridge.speaker enroll-live # record ~10 short approvals and sentences through the mic, add to your profile
  uv run python -m bridge.speaker test       # say something, see your score
  uv run python -m bridge.speaker calibrate  # your score and rejection rate by length of speech (held-out recordings)
  ```
- **Phone fallback:** `deploy\install-autostart.ps1 -Mode phone` keeps a Claude Code Remote Control
  session running in the Admin Brain, reachable from the Claude app on your phone (type or dictate)
  when you're away from Novak. Run `claude remote-control` once by hand in the Admin Brain first to
  accept its trust and enable prompts.

## Voice quality (Phase 4)

Replies are spoken **sentence by sentence**: the first sentence plays while the rest are still being
synthesized (Piper: first sound after ~0.1 s; Kokoro: ~0.9 s instead of ~2 s for a whole reply).

Two voices engines (`NOVAK_TTS`):

| Engine | Sound | Speed on the PC | Notes |
| --- | --- | --- | --- |
| `piper` | clear, a bit robotic | 0.25 s for a 10 s reply | runs well on a Pi |
| `kokoro` (default, voice `bm_george`) | much more natural | 2 s for a 10 s reply (first sound 0.9 s) | 330 MB model, PC only |

```powershell
curl.exe -L -o voices\kokoro-v1.0.onnx https://github.com/thewh1teagle/kokoro-onnx/releases/download/model-files-v1.0/kokoro-v1.0.onnx
curl.exe -L -o voices\voices-v1.0.bin https://github.com/thewh1teagle/kokoro-onnx/releases/download/model-files-v1.0/voices-v1.0.bin
```
then `NOVAK_TTS=kokoro` and `NOVAK_KOKORO_VOICE=bm_george` (or another voice) in `.env`.

Measured on this PC: Claude itself takes 2-3 s for a simple question with the default model, and
Sonnet/Haiku weren't faster, so the model stays the default.
```

## Council refinement
**Evidence first.** `bridge/turns.py:120` says a fixed "On it." the moment any request goes to
Claude, before Claude has done anything. Local answers (brief, time, project, usage) skip it, so
every Claude request opens with the same two words. A simple question takes Claude 2–3 s
(README), and Kokoro needs ~0.9 s before the first sound. So for many requests "On it." is
followed almost at once by the real answer, and it adds nothing.

- **Contrarian:** don't just delete it. On a 20-second request, total silence after you speak
  feels like Novak didn't hear you, and the first "Still working" update only comes at 20 s.
  Some acknowledgement has to stay for slow requests.
- **First-Principles:** the acknowledgement is there to cover silence, so only speak when there
  is silence to cover. Wait a moment. If Claude has already answered, say nothing extra. If it
  hasn't, then acknowledge.
- **Expansionist:** a conversational acknowledgement says what's happening. Claude already
  reports its current step (`on_step`, e.g. "reading dota coach roadmap"), which the "Still
  working" updates use. If a step is known when the acknowledgement is due, say that. If not,
  use a short varied phrase and never repeat the previous one twice in a row.
- **Outsider:** "more conversational" could also mean Novak chats more. That works against the
  shorter-replies goal you just confirmed. Keep the reply itself unchanged and only change the
  filler around it. Keep "Done." on very long turns, because it tells you the wait is over.
- **Executor:** branch-sized. Touches `bridge/turns.py`, `shared/config.py`, `.env.example`, the
  README and `tests/test_turns.py`. No new deps, no LLM call for the filler, $0. The LED ring and
  earcons are out of scope.

## Refined task spec
In **voice-claude**, on branch `auto/stop-saying-on-it-after-every-command`:

1. **Delayed acknowledgement.** Remove the immediate "On it." Wait `NOVAK_ACK_AFTER_SECONDS`
   (new, default 1.5 s; 0 = always acknowledge at once). If Claude's reply is ready by then, Novak
   says only the answer.
2. **Say what's happening.** If the acknowledgement is due and Claude has reported a step, say
   that step, e.g. "Reading the dota coach roadmap." Otherwise pick from a short pool of varied
   phrases ("One sec.", "Let me check.", "Give me a moment.", "Looking into it.", …). The same
   phrase never plays twice in a row, and "On it." is not in the pool.
3. **Don't talk over a question.** If Claude is already asking you something (asker active),
   skip the acknowledgement.
4. **Timing is unchanged otherwise.** "Still working" updates still count from when you finished
   speaking, and "Done." still prefixes turns over 30 s.
5. **Docs:** the README "Long turns" section and `.env.example` describe the new behaviour and
   the setting.

**Out of scope:** changing the replies themselves, LLM-generated filler, earcons/LED cues, and
local-answer paths (they already say nothing first).

## Definition of done
- [ ] A quick Claude reply (under the ack delay) is spoken with no acknowledgement at all.
- [ ] A slow reply gets exactly one acknowledgement before any "Still working" update. It names
      the current step when one is known, otherwise it uses a pool phrase.
- [ ] Across consecutive slow turns, the pool phrase is never the same twice in a row, and never
      "On it."
- [ ] No acknowledgement while the asker is active. `NOVAK_ACK_AFTER_SECONDS=0` acknowledges at once.
- [ ] Existing turn tests updated (no more `said[0] == "On it."`). Full `uv run pytest` suite
      is green, and the desk app starts in `--text` mode.
- [ ] README and `.env.example` document `NOVAK_ACK_AFTER_SECONDS`.
- [ ] Real-world check (you, by voice): a quick question and a slow request both feel natural.
      This is recorded as pending if it can't be done in-session.

## Feasibility
**Verdict: go** (10/10) — advisory; the human gates decide.
- scores: clarity 2 · size 2 · cost 2 · risk 2 · testability 2
- total 10/10, no blockers

## Orchestration plan
| # | task | attributes | tier [score] | model | status | note |
|---|---|---|---|---|---|---|
| T1 | Delayed, step-aware acknowledgement replacing 'On it.' + NOVAK_ACK_AFTER_SECONDS wiring + tests (turns.py, config, desk/bridge wiring) | feature, 5f, known, amb low, risk low | standard [3] | `sonnet` | done | master (opus) built it directly; small, single-module change |
| T2 | README Long turns + .env.example docs for NOVAK_ACK_AFTER_SECONDS | mechanical, 2f, known, amb low, risk low | light [1] | `haiku` | done | master, with T1 |
| T3 | Independent adversarial verify pass + report | verify, 1f, known, amb low, risk low | standard [1] | `sonnet` | done | sonnet sub-agent: pass-with-notes; F1 F2 F3 F4 fixed post-verify |

## Implementation
- branch: `auto/stop-saying-on-it-after-every-command` in `C:/Users/liamm/voice-claude` (off `main` 5a72b50). Main is not touched.

### Checkpoint log
- 2026-10-13: T1+T2 done. Suite 146/146, desk --text starts. Commit c309ce6.
- 2026-10-13: T3 verify (sonnet): pass-with-notes. F1/F2 (overdue "still working" updates could burst) and F3/F4 (blank or double-period step text) fixed. F5 noted: a TTS error during the ack now goes through the recover path. Suite 148/148. Commit c1c3564. Not pushed, no PR yet. Real-world voice check pending.
