---
type: report
project: Dota Coach
task: >-
  Fix hero position loading (button click errors 'positions failed: Failed to
  fetch')
date: '2026-09-09'
cycle: 2026-09-09-fix-hero-position-loading-button-click-errors-positions-fail
---

# Verification report — Dota Coach

**Task:** Fix hero position loading (button click errors 'positions failed: Failed to fetch')
**Branch:** `auto/fix-hero-position-loading-button-click-errors-positions-fail`

## What was tested
Independent pass: server API via curl/Python against a live instance (`:8091` demo, `:8092`
live), plus the front-end `loadPositions` polling logic driven in a **real browser**
(`localhost:8093`, in-app pane) with scripted `api()` responses and one genuine end-to-end run.

**Server (against the DoD):**
- ✅ **Reproduction / no long-held request** — a FRESH live (non-demo) first GET returns in
  **18 ms** with `{status:"running"}` (the old path held one request for up to ~18 min:
  download timeout 180 s + manta timeout 900 s). Structurally the handler spawns a daemon
  thread and returns immediately regardless of parse duration.
- ✅ **Poll to terminal** — live match went `running` → `ok` across polls; payload carries
  `{status, match_id, fights, replay_status}` (front-end contract intact).
- ✅ **DEMO instant** — `{status:"ok"}` + 4 fights, no thread, no delay.
- ✅ **Input guards preserved** — bad match id → 400, missing `player_id` → 400, unknown demo
  id → 404.
- ✅ **Idempotent / no duplicate parse** — a re-request for an in-flight key returns `running`
  (same job); 5 concurrent first-calls all return `running` with no exception (locked registry,
  single worker).
- ✅ **Error path** — stubbed `tools.match_positions` raising ⇒ job stored as
  `{status:"error", error:"Could not load positions for match 42: replay expired"}` (no crash,
  no hang); success stub ⇒ `{status:"ok"}` + data.
- ✅ **Retry after failure** — handler restarts a job whose last status was `error`
  (`job is None or status=="error"`), so the user can retry; an `ok` job is cached for the
  server's life.

**Front-end (real browser, real `loadPositions`):**
- ✅ `running`→`ok`: heroes merged into `state.chartsData.fights`, button hides, status
  "Hero positions loaded".
- ✅ `running`→`error`: shows "Positions failed: replay expired", button **re-enabled and not
  hidden** (no infinite spinner).
- ✅ transient blip (`api` throws once) then `ok`: recovers (softError budget tolerates ≤5).
- ✅ 6 consecutive throws: fails cleanly with the message, button restored.
- ✅ double-launch guard: with the page's own single listener, triple-clicking fires the job
  **once** (button disabled while in flight; label "Parsing replay…").
- ✅ genuine end-to-end (`fetchChartsData` → `loadPositions`, real demo endpoint): all 4 fights
  merged with heroes, button hidden, **no console errors**.

## Findings (weaknesses / what broke)
- **F1 (minor, leak):** `_positions_jobs` is never evicted — it grows one entry per
  `match_id:player_id` for the server's lifetime. Negligible for a single local user, but
  unbounded. No TTL/size cap.
- **F2 (minor, UX):** progress is coarse — the button shows a static "Parsing replay… (can
  take a while)" for the whole job; the spec's "downloading → parsing → matching" phases aren't
  surfaced (server status is only running/ok/error). Honest but not granular. DoD only requires
  reflecting status, which it does.
- **F3 (env limitation, not a code gap):** a **real multi-minute replay parse** (download +
  manta) was not exercised here — no `.dem` cache / built manta binary in this environment, and
  the live test match resolved via the ward-vision fallback in ~2 s, not a genuine manta parse.
  The async **transport** is proven (immediate return + background thread + polling); the heavy
  parse code is unchanged by this cycle. Worth a real-machine confirmation with manta built.
- **F4 (by design):** an `ok` result is cached until server restart; a match re-parsed upstream
  won't refresh without a restart. Acceptable — finished-match positions don't change.

## Improvements
1. (F1) Evict completed jobs — cap the registry or drop entries older than N minutes once
   terminal. Small, self-contained follow-up.
2. (F2) Optional: thread a `phase` field through the job (download → parse → match) and reflect
   it in the button label for better feedback on long parses.
3. (F3) On the user's machine, build manta (`cd tools/manta_positions && go build -o
   manta-positions.exe .`) and confirm a real replay parses and renders through the new polling
   path end-to-end.

## Verdict
**pass-with-notes.** Every DoD item is met — the root cause (a synchronous ~18-min request
whose connection was reset → "Failed to fetch") is eliminated by a background job + polling
that returns in ~18 ms, with clean error handling, no infinite spinner, DEMO/no-regression,
and a preserved ward-vision fallback. Notes F1 (registry never evicted) and F2 (coarse
progress) are real but minor; F3 (no real manta parse in this env) is an environment limitation,
not a defect in the change.
