---
type: cycle
project: Voice Claude Assistant
stage: verify
status: done
task: >-
  Shorter spoken replies — Novak's answers should be brief and to the point,
  with detail left to the vault
started: '2026-10-13'
readme_source: 'https://github.com/liammpek16/voice-claude'
branch: auto/shorter-spoken-replies-novak-s-answers-should-be-brief-and-t
target_path: 'C:/Users/liamm/voice-claude'
orchestrated: true
report: 2026-10-13-shorter-spoken-replies-novak-s-answers-should-be-brief-and-t
---

## Task (from SELECT)
Shorter spoken replies — Novak's answers should be brief and to the point, with detail left to the vault

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
**Evidence.** Across the 37 Claude replies in `vault/Voice/`, Novak spoke a **median of 47 words
(about 19 s)**, with a p90 of 90 words and a maximum of 111. 20 of the 37 replies ran over 45 words.

There are two reasons:
- The prompt says "at most three short sentences", but Claude packs whole lists into each sentence.
- `to_speech` keeps up to **4 sentences**, and every cut reply adds " The full answer is in today's
  voice log." (8 more words).

The goal's own description sets the target: "give the short answer first and only expand when asked".

- **Contrarian:** a hard word cap alone will chop answers mid-thought. The *model* has to write a
  short answer, and the formatter should only be a safety net that cuts at a sentence or clause
  boundary, never mid-phrase. Cutting must also never drop the actual answer to a yes/no question.
- **First-Principles:** count words, not sentences. Listening time is what matters, and sentences
  vary from 5 to 40 words. A budget of about 30 words (~12 s) by default, configurable, with the
  prompt aiming for ≤ 20.
- **Expansionist:** "only expand when asked" needs an actual way to ask. A local "more" / "tell me
  more" / "go on" intent can read the next part of the last full reply. That costs $0, makes no
  Claude call, and fits in the existing 8 s follow-up window. The cut-off hint then becomes "Say
  'more' for the rest." (5 words), replacing the 8-word vault pointer.
- **Outsider:** local answers (brief, project status) already go through their own text. Check that
  they also fit the budget, or the brief stays the longest thing Novak says.
- **Executor:** branch-sized, in `bridge/speech_format.py`, `bridge/claude_session.py` (rules),
  `bridge/router.py`, `bridge/turns.py`, config, README and tests. It can be measured offline by
  replaying the logged full replies through the new formatter.

## Refined task spec
In **voice-claude**, on branch `auto/shorter-spoken-replies-…`:

1. **Word budget.** `to_speech(markdown, max_words=cfg.max_spoken_words)` replaces `max_sentences`.
   - `NOVAK_MAX_SPOKEN_WORDS` defaults to 30.
   - It keeps whole sentences while they fit. If the first sentence alone is over budget, it cuts at the
     last clause break (`,` `;` `:`) or ` and `/` but ` within budget and ends it with a full stop.
   - It never returns an empty string.
   - It returns the **remaining text** (`rest`) for "more".
2. **Prompt.** `SPEECH_RULES` changes to:
   - lead with the direct answer in one sentence of at most 20 words, plus at most one more short sentence
   - for lists, say the count and the top one to three items, never the whole list
   - no preamble ("Sure", "Great question")
3. **"More" intent.** The router adds `more` for "more", "tell me more", "go on", "keep going",
   "continue" and "what else".
   - The turn handler speaks the next budget-sized chunk of the last reply's remaining text, locally.
   - When nothing is left: "That's everything."
   - Logged as a local turn.
4. **Shorter hint.** A cut reply ends with "Say 'more' for the rest." instead of " The full answer is
   in today's voice log." The full reply is still written to the voice log as now.
5. **Local answers.** The brief and project answers also go through the budget, so their extra detail
   is available by "more".
6. **Replay script.** `uv run python -m bridge.speech_format replay` runs every logged full reply in
   `vault/Voice/` through `to_speech` and prints the word-count distribution before and after.

**Out of scope:** TTS speed, changing which model answers, summarising with a second LLM call,
and the Pi side (it receives the same text from the bridge).

## Definition of done
- [ ] `to_speech` unit tests cover:
  - within-budget text passes unchanged
  - multi-sentence text is cut at a sentence boundary
  - a single over-long sentence is cut at a clause break and ends with "."
  - no clause break → a word cut ending in "."
  - `rest` holds exactly the unspoken remainder
  - code/tables are still dropped
  - never empty
- [ ] Router tests: each "more" phrase → `more`, while "more coffee please" or "tell me more about Dota Coach" → claude.
- [ ] Turn tests: "more" walks through `rest` chunk by chunk, then says "That's everything." It makes no Claude call and is logged as local.
- [ ] The replay script on today's logs shows **median ≤ 25 and p90 ≤ 35 spoken words** (vs 47/90), including the hint.
- [ ] `SPEECH_RULES` updated. `NOVAK_MAX_SPOKEN_WORDS` is in config, `.env.example` and the README.
- [ ] The full `uv run pytest` suite is green, and desk `--text` mode answers a question and then "more".
- [ ] Real-world check (you, by voice): five questions feel short enough, and "more" works. Pending if not done in-session.

## Feasibility
**Verdict: go** (10/10) — advisory; the human gates decide.
- scores: clarity 2 · size 2 · cost 2 · risk 2 · testability 2
- total 10/10, no blockers

## Orchestration plan
| # | task | attributes | tier [score] | model | status | note |
|---|---|---|---|---|---|---|
| T1 | to_speech word budget with clause cuts + rest + replay script | feature, 2f, known, amb med, risk low | standard [3] | `sonnet` | done | sonnet sub-agent, reviewed; replay median 22 / p90 32 |
| T2 | more intent: router + turn handler chunking + hint + local-answer budget + config | feature, 4f, known, amb low, risk med | standard [3] | `sonnet` | done | sonnet sub-agent, reviewed; 119/119 |
| T3 | SPEECH_RULES prompt + README + .env.example | mechanical, 3f, known, amb low, risk low | light [1] | `haiku` | done | haiku sub-agent, reviewed |
| T4 | Independent adversarial verify pass + report | verify, 1f, known, amb low, risk low | standard [1] | `sonnet` | done | sonnet sub-agent: pass-with-notes; F1-F3 fixed post-verify |

## Implementation
- branch: `auto/shorter-spoken-replies-novak-s-answers-should-be-brief-and-t` in `C:/Users/liamm/voice-claude` (off `main`) — never touches main
- started: 2026-10-13T18:54

### Checkpoint log
- 2026-10-13T18:54 — branch created; supervised implementation started.
- 2026-10-13T18:59 — T1/T2 sonnet, T3 haiku done + reviewed; replay median 22 / p90 32 words (was 46.5 / 90); suite 119/119.
- 2026-10-13T19:04 — T4 verify (sonnet): pass-with-notes. Master fixed F1–F3 (weak 'more' words, abbreviations, project answer leads with Next); 122/122. Draft PR voice-claude#6. Real-world voice check pending.
