---
type: cycle
project: Voice Claude Assistant
stage: verify
status: done
task: improve reliability of detecting my voice
started: '2026-10-13'
readme_source: 'https://github.com/liammpek16/voice-claude'
branch: auto/improve-reliability-of-detecting-my-voice
target_path: 'C:/Users/liamm/voice-claude'
orchestrated: true
report: 2026-10-13-improve-reliability-of-detecting-my-voice
---

## Task (from SELECT)
improve reliability of detecting my voice

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
Job Hunt: …", "repeat that", "start over", "goodbye".

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
  follow-up without the wake word (`NOVAK_FOLLOW_UP_SECONDS`, 0 to turn off).
- **Usage:** "how much have I used today?" is answered locally from the voice log (Claude requests,
  estimated API-price cost, free local answers). After `NOVAK_DAILY_CLAUDE_TURNS` (default 50)
  Claude requests in a day, Novak stops calling Claude by voice; local answers keep working.
- **Speaker check:** a spoken "yes" to an approval only counts if it matches your voice profile
  (3D-Speaker CAM++ via sherpa-onnx; built from your wake-word recordings).
  ```powershell
  curl.exe -L -o voices\speaker_campplus_en.onnx https://github.com/k2-fsa/sherpa-onnx/releases/download/speaker-recongition-models/3dspeaker_speech_campplus_sv_en_voxceleb_16k.onnx
  uv run python -m bridge.speaker enroll     # profile from wakeword/recordings
  uv run python -m bridge.speaker test       # say something, see your score
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
**Evidence first.** The voice log for 2026-10-13 shows the speaker check refusing the owner's
own spoken "yes" **4 times** ("That didn't sound like you, so I've blocked it."). As a result a
whole request (merging PRs 1–4) failed by voice. In the same session the owner also asked for "a
longer listening time".

I measured this offline on the owner's own recordings (profile built from the 48 `positive` clips,
tested on the 21 held-out `negative` sentence clips, threshold 0.4):

| Owner audio | Rejected |
|---|---|
| full sentences | **0%** (min 0.43) |
| 1.2 s of speech | 12% |
| 0.8 s of speech | 50% |
| 0.5 s of speech (≈ a "yes") | **67%** (median 0.35) |

Trimming silence before scoring made it *worse* (57%). The profile was enrolled with room noise
in it, so silence-trimming is not the fix.

- **Contrarian:** the easy "fix" is to lower the threshold. But this check exists to stop someone
  else's "yes" approving a push or an edit. Lowering it trades your false rejections for guests'
  false accepts, and impostor scores were only measured on long clips (≤ 0.20). Keep 0.4 as the bar
  for *accepting* an approval.
- **First-Principles:** the model needs more speech than a "yes" gives it, so ask for more speech
  only when the result is unclear. Clearly-you (≥ 0.4) passes as now. Clearly-not-you (< 0.2)
  is refused as now. In between, ask once for a short sentence ("yes, go ahead with that") and score
  that, since full sentences scored 100% for you.
- **Expansionist:** you can't tune what you don't log. Write the score and seconds of speech into
  the voice log on every check, which gives real-world data for a later threshold change. Enrolling
  a few short live approvals ("yes", "yeah go ahead") through the real mic path would also make the
  profile match how you actually answer.
- **Outsider:** "detecting my voice" could also mean the wake word or the cut-off. The cut-off fits
  your "longer listening time" request: 0.8 s of silence ends a recording, so a mid-sentence pause
  cuts you off. Raising it is a one-line default change. The wake word has no logged failures;
  leave it alone.
- **Executor:** branch-sized. One branch in voice-claude touching `bridge/speaker.py`,
  `bridge/asker.py`, `shared/config.py` (+ `.env.example`), the satellite config default, the
  README and tests. No new models, no new deps, $0.

## Refined task spec
In **voice-claude**, on branch `auto/improve-reliability-of-detecting-my-voice`:

1. **Three-way speaker verdict.** `SpeakerCheck.verify` returns `accept` / `unsure` / `reject` plus
   `score` and `seconds`:
   - accept: ≥ `NOVAK_SPEAKER_THRESHOLD` (0.4)
   - reject: < `NOVAK_SPEAKER_FLOOR` (new, 0.2)
   - unsure: anything between
   - under 0.5 s of audio stays "can't tell", as today
2. **One retry with a longer phrase.** On `unsure` after a spoken yes, the asker says: "I couldn't
   confirm it's you. Say a short sentence, like 'yes, go ahead with that'."
   - That reply must parse as yes and score ≥ threshold, or it is refused.
   - Only one retry. `reject` is refused immediately, as now.
   - The policy is otherwise unchanged; push/delete stay gated.
3. **Log every check** in the voice log, e.g. `Check: score 0.33 over 0.6 s, unsure (asked again)`.
4. **Live enrollment:** `uv run python -m bridge.speaker enroll-live` records ~10 short approvals
   and sentences through `record_utterance`. They are saved to `wakeword/recordings/speaker_live/`
   (git-ignored) and included in `enroll`.
5. **Calibration report:** `uv run python -m bridge.speaker calibrate` prints, by speech length, the
   owner's score distribution and rejection rate at the current threshold and floor, using held-out
   clips. This turns the measurement above into a repeatable command.
6. **Longer listening:** default `NOVAK_SILENCE_SECONDS` goes from 0.8 to 1.2 on desk and satellite,
   documented in the README and `.env.example`.

**Out of scope:** retraining the wake word, Silero VAD, changing the threshold or impostor tuning,
and the Pi hardware.

## Definition of done
- [ ] `verify` returns the three-way verdict with score and seconds. Unit tests use a fake extractor
      to cover accept, unsure, reject, the too-short case and the floor/threshold boundaries.
- [ ] Asker tests:
  - unsure → retry prompt → a long yes ≥ threshold is allowed
  - unsure → retry → still unsure is refused
  - unsure → retry → "no" is refused
  - reject is refused with no retry
  - at most one retry
  - typed input (None) is unchanged
- [ ] Every speaker check appears in the voice-log exchanges with its score, seconds and verdict.
- [ ] `enroll-live` and `calibrate` exist and are documented. `calibrate` run on the existing
      recordings reproduces the length table above (±5 points).
- [ ] The silence default is 1.2 s in config, the satellite config, `.env.example` and the README.
- [ ] The full `uv run pytest` suite is green, and the desk app starts in `--text` mode.
- [ ] Real-world check (you, by voice): approve 5 actions with a plain "yes" and with the retry
      sentence. This is recorded as pending if it can't be done in-session.

## Feasibility
**Verdict: go** (9/10) — advisory; the human gates decide.
- scores: clarity 2 · size 2 · cost 2 · risk 1 · testability 2
- total 9/10, no blockers

## Orchestration plan
| # | task | attributes | tier [score] | model | status | note |
|---|---|---|---|---|---|---|
| T1 | Three-way speaker verdict + one-retry approval flow + voice-log check lines (speaker.py, asker.py, config, desk/bridge wiring) | feature, 5f, known, amb med, risk high | heavy [6] | `opus` | done | master (opus): verdict + retry flow + log + wiring |
| T2 | speaker enroll-live + calibrate CLI commands | feature, 2f, known, amb low, risk low | standard [2] | `sonnet` | done | sonnet sub-agent, reviewed; calibrate reproduces table |
| T3 | Silence default 0.8 to 1.2 s + README/.env.example docs | mechanical, 4f, known, amb low, risk low | light [1] | `haiku` | done | haiku sub-agent, reviewed |
| T4 | Independent adversarial verify pass + report | verify, 1f, known, amb low, risk low | heavy (lifted from standard) [1] | `opus` | done | opus sub-agent: pass-with-notes; F1 F2 F3 F6 fixed post-verify |

## Implementation
- branch: `auto/improve-reliability-of-detecting-my-voice` in `C:/Users/liamm/voice-claude` (off `main`) — never touches main
- started: 2026-10-13T17:53

### Checkpoint log
- 2026-10-13T17:53 — branch created; supervised implementation started.
- 2026-10-13T17:56 — T1 master (opus), T2 sonnet, T3 haiku done + reviewed; voice-claude suite 110/110; desk --text starts. Commits 9020cbf, 3fdfa4f.
- 2026-10-13T18:12 — T4 verify (opus): pass-with-notes, no approval bypass in 12,348 fuzzed sequences. Master fixed F1/F2/F3/F6; 112/112. Draft PR voice-claude#5. Real-world voice check pending.
