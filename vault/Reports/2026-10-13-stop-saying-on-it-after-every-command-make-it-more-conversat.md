---
type: report
project: Voice Claude Assistant
task: stop saying "On it" after every command; make it more conversational instead
date: '2026-10-13'
cycle: 2026-10-13-stop-saying-on-it-after-every-command-make-it-more-conversat
verdict: pass-with-notes
---
# Verify: drop the fixed "On it."

Branch auto/stop-saying-on-it-after-every-command (c309ce6). 146 tests pass. Text mode starts and exits on "goodbye".

## Findings

| # | Severity | Status | Finding |
|---|----------|--------|---------|
| F1 | low | ❌ | Burst of updates when the ack window is long. With NOVAK_ACK_AFTER_SECONDS larger than the first update time, the ack is followed at once by "Still working". Repro: updates (0.2, 0.2), ack 0.35, reply at 0.7 gives ack at 0.36, update at 0.36, update at 0.41. Cause: `due` is absolute, so overdue slots fire back to back. Default 1.5 s vs 20 s is safe. |
| F2 | low | ❌ | Same burst if speaking the ack or an update takes longer than the gap to the next due time (old code restarted the timer after each say). Unlikely with real TTS. |
| F3 | low | ❌ | Whitespace-only step (" ") is truthy and is spoken as " ."; "  x" becomes "  x.". Repro: `_acknowledgement(" ")`. Should strip the step. |
| F4 | info | ❌ | A step that already ends in a period is spoken as "Reading file.." (harmless in TTS). |
| F5 | low | ❌ | The ack `say` is now inside the try block. If TTS raises there, `_recover()` resets Claude and the turn returns "error". Before, it raised out of handle. The reply task is left running either way. |
| F6 | ok | ✅ | session.ask raising before, during or after the ack window: same "lost connection" path, `reset` called once, no ack spoken when it fails inside the window. |
| F7 | ok | ✅ | Reply arriving while the ack is being spoken: next wait returns at once, no extra update. |
| F8 | ok | ✅ | Negative ack value acts like 0 (ack at once). One-char step "a" gives "A.". |
| F9 | ok | ✅ | No stale "On it." in code. Only README (describing the removal) and a test assertion mention it. Satellite code has none. |

## Definition of done

- [x] Quick reply gives no acknowledgement.
- [x] Slow reply gives exactly one ack before any update; step if known, else a pool phrase.
- [x] Pool phrase never repeats back to back, never "On it." (200-pick test).
- [x] No ack while the asker is active; ACK=0 acknowledges at once.
- [x] Updates still scheduled from the request end (20, +40, then every 120 s); "Done." prefix kept.
- [x] Full pytest green (146 passed).
- [x] Desk app starts in --text mode.
- [x] README and .env.example document NOVAK_ACK_AFTER_SECONDS; wired in desk/main.py and bridge/server.py.

## Verdict

Pass with notes. The feature works as specified at the default settings. The notes are edge cases: F1 and F2 can burst "Still working" lines, and F3 can speak a blank step. None blocks a merge. A cheap fix for F1/F2 is to skip overdue slots (advance `due` until it is in the future). For F3, strip the step before use.

Housekeeping: my throwaway script created an empty `ablog/` directory in the repo root (untracked). A cleanup command was blocked by a hook, so it is still there.
