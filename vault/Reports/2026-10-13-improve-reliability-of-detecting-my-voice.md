---
type: report
project: Voice Claude Assistant
task: improve reliability of detecting my voice
date: '2026-10-13'
cycle: 2026-10-13-improve-reliability-of-detecting-my-voice
verifier: T4 (independent opus sub-agent)
verdict: pass-with-notes
---

# Verification report — Voice Claude Assistant

**Task:** improve reliability of detecting my voice
**Branch:** `auto/improve-reliability-of-detecting-my-voice` (commits 9020cbf, 3fdfa4f on top of main a73562d)

## What was tested
- **Code review** of `git diff main..HEAD`: `bridge/asker.py`, `bridge/speaker.py`, `bridge/server.py`, `desk/main.py`, `desk/audio.py`, `satellite/*`, `shared/config.py`, `.env.example`, README.
- **Exhaustive approval-flow fuzz** (throwaway script in the OS temp dir, not in the repo): every combination of 3 replies from {"yes", "no", "", "yes no", "hmm", "yes, go ahead with that", "open the dota project"} × 2 speaker results from {accept, unsure, reject, True, False, None}. That is **12,348 sequences**, 2,860 of which ended in Allow. Assertions:
  - never more than 2 speaker checks (at most one voice retry, even after the outer "Sorry, was that a yes or a no?" loop);
  - every Allow is either (one check, result accept/True/None) or (first check unsure → second check accept/True).
  - **Result: no bypass found.**
- **Targeted cases:** an exception from `verify_speaker`; an outer retry followed by an unsure result followed by an accept; NaN scores; floor set above the threshold; the 6-word answer cap against the retry prompt; a None result on the first check; `voiced`/`slice_seconds`/`summarize` edge cases (empty, all-silence, one sample, int16 input, negative length).
- **Stale-audio check:** `desk/main.py hear()` sets `last_audio[0] = None` before recording and only sets it after a successful recording. `bridge/server.py Link.hear()` sets `self.last_audio = None` after sending `listen`, and leaves it None on timeout. So the retry scores the NEW clip. A timed-out retry gives None, which is refused. The old "yes" is never re-scored.
- **Unchanged paths:** the AskUserQuestion path and the policy `allow`/`deny` paths are untouched by the diff.
- **Config:** `NOVAK_SPEAKER_FLOOR` parsing (valid, `abc`, `nan`). Silence default checked in `shared/config.py`, `satellite/config.py`, `desk/audio.py`, `satellite/audio.py`, `.env.example` and README.
- **`uv run pytest -q`:** 110 passed.
- **`uv run python -m bridge.speaker calibrate`:** ran it. `speaker_profile.npy` mtime unchanged (10:35); `git status` clean.
- **Voice log:** Check lines go through `Asker.exchanges` → `TurnHandler` `drain()` → `voicelog.log_turn` as `> **Check:** score 0.33 over 0.6 s, unsure`.

## Findings (weaknesses / what broke)
Severity-ranked. No security-critical issue found.

1. **Medium: "seconds" is recording length, not speech length, so the log and calibration don't line up.**
   - `verify` reports `len(audio)/16000`. `record_utterance` returns 0.3 s of pre-roll + speech + at least 1.2 s of trailing quiet. A 0.5 s "yes" is therefore logged as about 2.0 s.
   - `calibrate`, by contrast, scores **voiced-trimmed** slices. The real-world numbers it is meant to enable won't be comparable to the calibrate table.
   - The 1.2 s silence change also adds about 0.4 s more room noise to every approval clip. That effect on short-yes scores was not measured.
   - Side effect: on desk, `MIN_SAMPLES` (0.5 s) can practically never trigger, because every recording is at least about 1.5 s.
   - Repro: read `desk/audio.py` lines 37-58. Pre-roll is 10 blocks of 30 ms. The loop stops after more than `silence_seconds * 33` quiet blocks.
2. **Low-Medium: a None result is allowed silently, with no Check line.**
   - When `verify_speaker()` returns None on a spoken yes (no profile, model missing, satellite link gone, or a clip under 0.5 s), the yes is allowed and nothing is logged.
   - This is the pre-existing design, and the spec keeps it ("stays can't tell"). It still conflicts with the DoD wording "every speaker check appears in the voice log".
   - A None on the *retry* is correctly refused, but it is also not logged.
   - Repro: `speaker_asker(["yes"], [None])` → Allow, and `[w for who, w in asker.drain() if who == "Check"] == []`.
3. **Low: the retry prompt is right at the 6-word answer cap.**
   - "yes, go ahead with that" (5 words) parses as yes.
   - A natural longer sentence like "yes it's me, go ahead with that" (7 words) gives `parse_yes_no` → None, and Novak answers "I didn't get a clear yes". It fails closed, but it will frustrate the owner.
   - Repro: `parse_yes_no("yes it's me, go ahead with that") is None`.
4. **Low: the owner can be hard-rejected on a plain yes.** Calibrate shows 4% of the owner's 0.5 s clips below the floor (min 0.15). Those get "That didn't sound like you" with no retry. This is by spec, but worth tracking in the log data.
5. **Low: `enroll-live` saves and enrolls every clip unreviewed.**
   - Whatever the mic picks up goes into `speaker_live/` and immediately into the averaged profile: a TV, a guest talking over the prompt, or noise that trips the loudness gate.
   - There is no per-clip score check against the existing profile and no way to drop a bad clip besides deleting the file.
   - This would only skew the profile. It cannot add an impostor unless their speech was recorded during the session, and only the owner runs the command.
6. **Low: exceptions from `verify_speaker` are not caught in the asker.** For example, `score()` raises RuntimeError if the profile is None in a race; I didn't find a path in practice. The exception goes up to the SDK, which returns an error response, so the tool is not approved (fail-closed). There is no spoken message and no deny reason, though. This is pre-existing.
7. **Info: NaN and odd configs fail closed.**
   - `judge(nan)` gives "unsure", which can never become an accept.
   - `NOVAK_SPEAKER_FLOOR=nan` turns off hard rejects: everything below the threshold becomes unsure → retry → still needs ≥ threshold.
   - Floor above threshold leaves no unsure band and is safe.
   - `NOVAK_SPEAKER_FLOOR=abc` crashes at startup with a ValueError, the same as the other float settings.
8. **Info: `voiced()` on int16 input.** `np.abs(-32768)` overflows, so `voiced(np.array([0,-32768,0,100], int16))` returns `[100]`. All callers pass float32 (`_recordings` divides by 32768), so this is not reachable today.
9. **Info: `slice_seconds(x, negative)`** returns a truncated, non-None slice. Callers only pass the constants 1.2/0.8/0.5.

## Improvements
1. **Log speech seconds, not recording seconds.** Use `len(voiced(audio))/16000`, or log both. Then the voice-log data and the calibrate table use the same unit before anyone tunes the threshold from them.
2. **Log a None result too:** e.g. `Check: no voice check (too short / no profile)`. Then "every check" in the log really means every check.
3. **Raise `MAX_ANSWER_WORDS` for the retry reply only** (e.g. 10). Alternatively, keep the suggested phrase and add "just say" to the prompt.
4. **Wrap `verify_speaker()` in try/except** inside `_speaker_outcome`, logging the error and treating it as a refusal with a spoken message.
5. **In `enroll-live`, score each new clip against the current profile** and skip or warn on anything below the floor. Also add a `--no-enroll` flag so clips can be reviewed before they go into the profile.
6. **Measure live-shaped clips in calibrate:** speech plus 1.2 s of trailing room noise, as the mic path produces. This checks whether the 0.8 → 1.2 s silence change moved short-yes scores.

## Definition of done
| Item | Status | Evidence |
|---|---|---|
| `verify` gives a three-way verdict with score and seconds; fake-extractor unit tests cover accept, unsure, reject, too-short and the boundaries | **met** | `tests/test_speaker.py` (`judge` at 0.40/0.39/0.20/0.19, floor == threshold, under 0.5 s, no profile). "seconds" is recording length (Finding 1). |
| Asker tests: unsure→long yes allowed; unsure→unsure refused; unsure→"no" refused; reject without retry; at most one retry; typed (None) unchanged | **met** | `tests/test_asker.py` lines 143-178, plus my 12,348-sequence fuzz: no bypass, never more than 2 checks. |
| Every speaker check is in the voice log with score, seconds and verdict | **partial** | Verdict checks are logged via exchanges → `log_turn`. None results aren't logged (Finding 2), and seconds include silence (Finding 1). The "(asked again)" suffix from the spec example is missing. |
| `enroll-live` and `calibrate` exist and are documented; calibrate reproduces the table ±5 points | **met** | README + module docstring. My run: full 0%, 1.2 s 12%, 0.8 s 48%, 0.5 s 65% vs the council's 0 / 12 / 50 / 67. Held-out set is 33 clips (negative + positive_holdout) vs the council's 21. n is small at 1.2 s (8). |
| Silence default is 1.2 s in config, satellite config, `.env.example` and README | **met** | `shared/config.py`, `satellite/config.py`, `desk/audio.py`, `satellite/audio.py`, `.env.example`, README all say 1.2. No 0.8 silence default is left. |
| Full pytest suite green; desk app starts in `--text` | **met / not re-run** | 110 passed. I did not re-run `--text`, because it plays "Ready." aloud and the verify rules forbid audio. The orchestrator's checkpoint says it starts. |
| Real-world check by voice (5 approvals) | **pending** | Needs the owner at the mic. |

## Verdict
**pass-with-notes.** The approval gate is sound:
- Exhaustive fuzzing found no way to reach Allow without an accept (or the pre-existing typed/None path).
- There is at most one voice retry.
- The retry scores the fresh recording, and a stale clip is never reused.
- NaN and odd configs fail closed.

The notes are about measurement fidelity (logged seconds vs speech seconds, None checks not logged) and usability (the 6-word cap on the retry sentence). They are not about security. The real-world voice check is still pending.

## Post-verify fixes (master agent, same branch)
- **F1:** `verify` now logs seconds of *speech*, with the lead-in and trailing quiet trimmed, so the numbers can be compared with `calibrate`. The 0.5 s "can't tell" cut is still applied to the whole clip on purpose: measuring it on trimmed speech would turn more answers into "can't tell", which is allowed.
- **F2:** "Can't tell" results are now logged as a Check line, and the "(asked again)" suffix is added to unsure checks.
- **F3:** the retry reply may be up to 10 words, so "yes it's me, go ahead with that" now passes. A first answer is still limited to 6 words.
- **F6:** an exception from the speaker check is now logged and **refuses** the approval with a spoken message.
- **Not fixed, logged as follow-ups:**
  - F4: about 4% of the owner's 0.5 s "yes" answers fall below the floor and are refused with no retry. This is per spec.
  - F5: `enroll-live` adds clips to the profile without reviewing them.
  - The `calibrate` run on clips shaped like real recordings is not done.
- Regression tests were added. The suite after the fixes is **112/112**. These fixes have not had an independent re-check.
