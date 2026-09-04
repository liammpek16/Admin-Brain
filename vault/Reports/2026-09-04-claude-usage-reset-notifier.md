---
type: report
project: Admin Brain
task: pull Claude usage-limit reset times + notify on reset
date: '2026-09-04'
cycle: 2026-09-04-pull-usage-limit-reset-times-from-claude-provide-a-notificat
---

# Verification report — Admin Brain

**Task:** pull usage-limit reset times from Claude; notify when a reset happens
**Branch:** `auto/claude-usage-reset-notifier` (stacked on `auto/hide-and-sort-completed-goals`)

## What was tested
The pure `normalizeUsage` via unit tests, and the whole pipeline (server route → panel → notification)
via a **live browser** pass against a real HUD started with `ADMIN_BRAIN_CLAUDE_USAGE` pointed at a
crafted source (a passed reset + a soon + an ok). The notification was exercised by stubbing
`window.Notification` in the page to capture calls (an automated harness can't grant OS notification
permission), which verifies the dedup logic deterministically.

| # | Check | Result |
|---|-------|--------|
| U1 | Native shape → `msUntil` + `status`, sorted soonest-first, `used`/`limit` preserved | ✅ |
| U2 | Status thresholds: now → `reset`, ≤15m → `soon`, >15m → `ok` (edge at 15m) | ✅ |
| U3 | Anthropic `anthropic-ratelimit-*-reset` header shape accepted; other keys ignored | ✅ |
| U4 | Epoch seconds AND millis both parse to the right ISO | ✅ |
| U5 | Empty / non-object / `limits:[]` / unparseable date → `configured:false` (no fabricated time) | ✅ |
| U6 | A valid limit beside an invalid one keeps only the valid one | ✅ |
| C1 | `npm run usage` with no source → honest "not configured" guidance, exit 0 | ✅ |
| B1 | Live `GET /api/usage` returns configured limits with correct status/sort | ✅ |
| B2 | Panel renders each limit (dot · name · used/limit · countdown · reset time); `5h` shows `reset` | ✅ |
| B3 | Sub-header shows the soonest ("next reset now"); countdowns format (`7m 45s`, `1d 23h`) | ✅ |
| B4 | Reset notification fires **once** for the passed `5h` reset; a 2nd poll does **not** re-fire | ✅ |
| B5 | Dedup key persisted to `localStorage` (`5h@<resetsAt>`) | ✅ |
| B6 | Not-configured state renders the env/file guidance message (fetch stubbed) | ✅ |
| B7 | No console errors across the flow | ✅ |

Totals: **16/16** automated tests + **7** live browser/CLI checks — all green.

## Findings (weaknesses / what broke)
Nothing broke. The important honest note is about provenance, not a defect:

1. **"Pull from Claude" is an ingest pipeline, not a magic auto-pull.** Claude Code stores no free,
   stable, local usage-reset file (verified: `~/.claude/.claude.json` has none), and reading the
   Anthropic API's rate-limit headers needs an API key and spends quota — which violates the project's
   deterministic **$0 / no-network** core. So reset times are read from a **declared source**
   (`ADMIN_BRAIN_CLAUDE_USAGE` or `vault/State/claude-usage.json`) that accepts both the native shape
   and Anthropic's own header shape. Populating it is hand-update / pasted response headers / a future
   tiny updater. This is called out in the panel (not-configured message), the SKILL, and the PR — the
   pipeline (parse → status → countdown → one-shot notification) is the deliverable and is fully real.
2. **OS-level notification delivery wasn't asserted** (a headless harness can't grant permission); the
   *decision* logic (fire once per reset, dedup, permission-gated) was verified via a stubbed
   `Notification`. The real `new Notification(...)` call is a one-liner behind that verified guard.
3. **Countdowns refresh on the 20s poll**, not every second — a limit's countdown can lag up to ~20s.
   Cheap and consistent with the rest of the HUD; a per-second tick is an easy follow-up if wanted.

## Improvements
- (Follow-up) a small updater that writes `vault/State/claude-usage.json` from a real source (pasted
  headers or, if the user opts into an API key, the rate-limit headers) so the panel auto-populates.
- (Optional) a 1s local ticking countdown for the soonest limit; in-panel flash on reset in addition
  to the browser notification.

## Verdict
**pass.** The feature ingests Claude usage-limit reset times from a declared source (native or
Anthropic-header shape), shows them with a live, sorted countdown, and fires exactly one browser
notification per reset — degrading honestly to a clear "not configured" message and never inventing a
time. Deterministic, $0, no network, no new deps. Safe on the stacked branch behind the draft PR.
