---
type: report
project: Voice Claude Assistant
task: >-
  Shorter spoken replies — Novak's answers should be brief and to the point,
  with detail left to the vault
date: '2026-10-13'
cycle: 2026-10-13-shorter-spoken-replies-novak-s-answers-should-be-brief-and-t
verdict: pass-with-notes
---

# Verification report — Voice Claude Assistant

**Task:** Shorter spoken replies — Novak's answers should be brief and to the point, with detail left to the vault
**Branch:** `auto/shorter-spoken-replies-novak-s-answers-should-be-brief-and-t` (3 commits over main)
**Verdict: pass-with-notes.** All code-level DoD items are met. There is one real-world risk (router steals "continue" / "go on" / "and") and a few polish bugs.

## What was tested
Independent throwaway scripts in the OS temp dir. No repo edits, no Claude calls, no audio.
- `uv run pytest -q`: 119 passed.
- `to_speech` against ~14 realistic replies at max_words 1, 2, 5, 30 and 1e3. Cases: decimals and prices, `Dr.` / `U.S.` / `e.g.`, ellipses, quotes, questions, yes/no, lists, table-only, code-only, non-ASCII, a 500-char word, a 300-char URL. For every case I checked three things: the budget (excluding the hint) is never exceeded, the output is never empty, and `text + rest` keeps every word in order. Budget and word order held everywhere. The only empty results were table-only and code-only replies (finding 4).
- Router: 21 phrasings, including noise-like words.
- `TurnHandler` with a fake session: more after a long reply, after an error, after an exception, after stop, after repeat, after "Shall I continue?", and more after exhaustion.
- Local answers: real `snapshot()` of the real vault through `brief_speech` / `project_speech` and the budget.
- Replay CLI, plus an independent recount from the vault logs with the real hint wording.
- README, `.env.example`, config and `SPEECH_RULES` against the code.

## Findings (severity-ranked)

1. **MEDIUM: "continue", "go on" and "and" are stolen from real conversation with Claude.** The router matches them as a whole utterance, so Claude never sees them.
   - Repro: Claude replies "I found three failing tests. Shall I continue and fix them?". The user says "go on". Result: kind `more`, Novak says "That's everything.", and Claude calls added = 0. "continue" does the same.
   - The 8 s follow-up window (no wake word) makes this likely, because "go on" and "continue" are natural yes-replies to a plain-text question from Claude.
   - Bare "and" is a typical Whisper trailing or noise token. In the follow-up window it routes to `more` and gives a spurious "That's everything." or the next chunk. Cost is $0, but it is annoying.
   - "so", "okay", "uh and" and "and then?" are NOT matched; they go to Claude.
   - Fix: only treat `continue`, `go on` and `and` as `more` when `pending_rest` is non-empty, otherwise fall through to Claude. Better, drop bare "and" from `EXACT["more"]`.
2. **LOW-MEDIUM: a sentence cut after an abbreviation gives an awkward chunk.** The sentence split breaks on `Dr.`, `U.S.` and `e.g.`.
   - Repro: 28 words, then ". Dr. Smith said hello to me again…". Spoken text ends "…w27. Dr." followed by "Say 'more' for the rest.". The rest starts "Smith said…".
   - `max_words=30` on "Dr. Smith said hello to everyone in the U.S. office, e.g. the people on…" gives "…U.S. office, e.g." with the rest starting "the people on…".
   - Fix: treat a lone `Dr.` / `Mr.` / `e.g.` / `i.e.` token as non-terminal in the split.
3. **LOW: the local project answer can drop its most useful sentence.** The whole-sentence rule applies.
   - Real vault: "Voice Claude Assistant" speaks only "…is active, 39 percent of its milestones done." The "Next: …" sentence (21 words; 10 + 21 > 30) goes to `rest`.
   - Admin Brain and Dota Coach keep Next and push "Open goals include…" to `rest`, which is as intended.
   - The brief is exactly 30 words and fits whole.
   - Fix: lead `project_speech` with Next, or put the progress percent after it.
4. **LOW: `to_speech` returns an empty string for table-only or code-only markdown.** The spec says it never returns empty.
   - Repro: `to_speech("| a | b |\n|---|---|\n| 1 | 2 |")` gives `Spoken("", True, "")`.
   - This is pre-existing behaviour, and the "never empty" unit test only covers blank input.
   - `TurnHandler._budget` still produces speech (" The full answer is in today's voice log.", with a leading space), so the user hears something. The function-level contract is still violated.
5. **LOW: hard word cuts with no clause break can end on a dangling function word, and `rest` is force-capitalised.**
   - Spoken: "…next week and." (cut before a second "and"), and "…beyond the budget of thirty." with rest "Words in total here.".
   - A "more" chunk can start "And …".
   - Fix: back off a hard cut over trailing the / a / of / and / to, and don't capitalise `rest`.
6. **LOW: "stop" then "more".** `stop` leaves `pending_rest` alone, so "more" reads the NEXT chunk and skips whatever of the current chunk the user didn't hear. This is not stale rest from an OLD answer.
7. **INFO: `pending_rest` is cleared or overwritten correctly in every path I tried.**
   - An error reply, an exception, reset and the daily cap all clear it. A new Claude reply overwrites it. A local `time` / `usage` / `count` / `brief` / `project` answer also overwrites it, so "what time is it" mid-walk discards the rest.
   - "more" after an error gives "That's everything.". "more" after an exception gives "That's everything.".
   - "repeat" does not touch `pending_rest`; "more" after "repeat" continues correctly.
   - I found no cancel path in `desk/main.py` that could skip the clearing.
8. **INFO:** the "Done. " prefix is not counted in the budget, so a long turn can speak 31 + 5 words.
9. **INFO: pre-existing oddities surfaced by the vault run.**
   - `project_speech` gives "…with claude to generate models for the game?." (double punctuation).
   - The `—` replacement in `_clean` leaves " ," (a space before the comma).
   - URLs are replaced by "a link".
10. **INFO: config and docs.**
    - `int(os.environ["NOVAK_MAX_SPOKEN_WORDS"])` crashes at startup on a non-integer value, as the other int settings do.
    - The README layout comment for `speech_format.py` ("markdown -> a few speakable sentences") and the router comment ("stop/repeat/reset/brief/quit") are stale.
    - The replay command is not documented in the README.

## Improvements (prioritized)
1. Gate `continue` / `go on` / `and` behind a non-empty `pending_rest`, and ideally drop bare "and". (Finding 1)
2. Make `Dr.` / `Mr.` / `e.g.` / `i.e.` / `U.S.` non-terminal in the sentence split. (Finding 2)
3. Reorder `project_speech` to lead with Next. (Finding 3)
4. Guarantee non-empty `to_speech` output, or document and test the table/code-only case. (Finding 4)
5. Avoid trailing-conjunction hard cuts and don't capitalise `rest`. (Finding 5)
6. README: document the replay command and refresh the layout comments. Consider `stop` clearing `pending_rest`. (Findings 6, 10)

## Definition of done
| DoD item | Status | Evidence |
|---|---|---|
| `to_speech` unit tests (pass-through, sentence cut, clause cut ending ".", word cut, `rest`, code/tables dropped, never empty) | Met | `tests/test_speech_format.py`, 119/119 green. My fuzz: budget never exceeded and word order preserved in every case. The "never empty" test misses table/code-only (finding 4) |
| Router tests ("more" phrases -> `more`; "more coffee please" and "tell me more about Dota Coach" -> claude) | Met | `tests/test_router.py`; my run confirms. The set is over-broad: "and", "continue" (finding 1) |
| Turn tests (more walks `rest`, then "That's everything.", no Claude call, logged local) | Met | `tests/test_turns.py`; my harness: chunks, then "That's everything.", 0 Claude calls |
| Replay: median <= 25 and p90 <= 35 including the hint | Met | `replay` prints 38 entries, median 22, p90 32, max 33 (then 46.5 / 90 / 111). My independent recount with the real hint wording gives the identical 22 / 32 / 33. 27 of 38 truncated. Parser: 17 + 6 + 15 = 38 log entries, all Claude turns (the spec's "37" is off by one). The logs predate the new prompt, so real replies should be shorter still |
| `SPEECH_RULES` updated; `NOVAK_MAX_SPOKEN_WORDS` in config, `.env.example`, README | Met | Rules match the spec: one sentence of at most 20 words plus at most one more, count plus top 1-3 for lists, no preamble. Default 30 in config; README and `.env.example` agree with the code |
| Full pytest green; desk `--text` answers a question then "more" | Partial | Pytest 119/119. `desk.main --text` was not run (it plays audio and calls Claude). Only the TurnHandler path was exercised, with a fake session |
| Real-world check by voice | Pending | Needs the user (five questions, "more" works) |
| Local answers (brief/project) budgeted; extra detail via "more" | Met | Real vault: brief = 30 words and fits; Admin Brain, Dota Coach, friendslop, Job Hunt and Voice Claude Assistant are cut with `rest` available (finding 3) |

## Verdict
**pass-with-notes.** Every code-level DoD item is met and the numbers are real (replay 22 / 32 vs 46.5 / 90). Fix finding 1 (stealing "continue" / "go on" / "and") before relying on it hands-free. Findings 2-5 are polish.

## Post-verify fixes (master agent, same branch)
- **F1:** bare "and" no longer counts as "more". "continue" and "go on" count as "more" only while part of the last reply is still unread. Otherwise they go to Claude, so "Shall I continue?" → "go on" works. The router gained a `phrase()` helper so "hey Novak, continue" is handled the same way. Regression tests added.
- **F2:** common abbreviations no longer end a sentence: Dr., Mr., Mrs., Ms., St., vs., etc., e.g., i.e., approx., No. and fig., plus single letters such as "U.S.". Regression test added.
- **F3:** the local project answer now leads with "Next for <project>: …", followed by the status and the open goals, so the next step is never cut.
- The README documents the weak-"more" rule and the `replay` command.
- **Not fixed (follow-ups):**
  - F4: table-only or code-only replies still speak only the voice-log hint.
  - F5: a hard word cut can end on a conjunction, and `rest` is capitalised.
  - F6: "stop" then "more" skips the rest of the chunk that was interrupted.
  - Minor: the "Done." prefix isn't counted in the word budget, and a bad `NOVAK_MAX_SPOKEN_WORDS` value crashes at startup.
- Suite after the fixes: **122/122**. These fixes have not had an independent re-check.
