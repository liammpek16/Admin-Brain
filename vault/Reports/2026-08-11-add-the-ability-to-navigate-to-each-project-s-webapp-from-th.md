---
type: report
project: Admin Brain
task: Per-project "Open webapp" button (launch + open the server)
date: '2026-08-11'
cycle: 2026-08-11-add-the-ability-to-navigate-to-each-project-s-webapp-from-th
verdict: pass-with-notes
---

# Verification report — Admin Brain (webapp launcher)

**Task:** Per-project "Open webapp" button that launches + opens the server
**Branch:** `auto/add-the-ability-to-navigate-to-each-project-s-webapp-from-th` · **PR:** Admin-Brain #2

## What was tested
Independent pass against the running HUD, focused on the new "spawn a process" surface:

| # | Check | Result |
|---|-------|--------|
| H1 | `webapp_url` exposed per project; only Dota has one | ✅ |
| H2 | **Live launch**: `POST /api/project/webapp {Dota}` starts the server → `started:true` | ✅ came up on :8080 |
| H3 | `:8080` serves the real app (71 KB, title "Dota Coach") | ✅ |
| H4 | Idempotent: 2nd call while up → `already:true` (no double-launch) | ✅ |
| H5 | Button renders **only** on projects with `webapp_url` (Dota) | ✅ |
| W1 | Unknown project → `{ok:false}` | ✅ |
| W2 | **Command injection via body** — pass `webapp_cmd:"calc.exe"` for a no-webapp project | ✅ ignored; "No webapp configured"; no calc |
| W3 | Regressions — `/api/goals`, `/api/cycles` still respond | ✅ 5 / 7 |

**Core delivers the requirement:** the button genuinely *opens the server* — it launched the Dota
webapp, waited for it to answer, and served the real app. The command is sourced **only** from the
project note (W2 confirms the request body can't inject one); bound to 127.0.0.1.

## Findings (honest notes)

1. **Double-launch race (minor).** Two calls that both arrive *before* the server is up each see
   "down" and both spawn; the 2nd process fails to bind :8080 and exits. The button is disabled
   during its own request (client-side), so the common double-click is covered — but a fast API
   caller or two tabs could still race. **Fix:** a per-project in-flight lock (a `Set` of
   "launching" projects) so a concurrent call returns "already starting" instead of spawning again.
2. **Probe is liveness, not identity.** If *something else* is listening on the configured port,
   the endpoint reports `already:true` and opens it — it checks "does the URL answer," not "is it
   the right app." Acceptable for a personal localhost tool; worth noting.
3. **`webapp_url` can be any URL.** Probe/open will reach whatever the note declares (not restricted
   to localhost). It's user-authored, but the feature will open an external URL if configured.
4. **Detached & unmanaged (by design).** The spawned server outlives the HUD and can't be stopped
   from it — deliberate (out of scope), but means "Open webapp" only ever starts/opens, never stops.

## Improvements (prioritized)
1. Add the per-project in-flight lock (closes finding #1) — the one worth doing.
2. Optional: show a live "running" dot on the button when the probe succeeds (uses the same probe).
3. Optional: a companion "stop webapp" later if process management is ever wanted.

## Verdict
**pass-with-notes.** Meets its DoD and the explicit requirement — the button launches the Dota
webapp (demo), waits for it, and opens the real app; idempotent; secure (command note-only, W2);
no regressions. Safe on the branch behind draft PR #2. **Recommended follow-up (⑤ → ①):** "Add a
per-project in-flight lock to the webapp launcher so concurrent clicks can't double-spawn."
