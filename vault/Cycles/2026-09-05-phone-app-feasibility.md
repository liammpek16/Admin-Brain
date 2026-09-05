---
type: cycle
project: Admin Brain
stage: refine
status: done
verdict: feasible
scope: research / feasibility (no code)
task: >-
  Determine the feasibility of connecting to a custom-made phone app
started: '2026-09-05'
readme_source: 'https://github.com/liammpek16/Admin-Brain'
branch: auto/phone-app-feasibility
target_path: 'C:/Users/liamm/Admin-Brain'
report: 2026-09-05-phone-app-feasibility
---

## Task (from SELECT)
Determine whether a custom-made phone app could connect to Admin Brain, and how — a feasibility
determination, not a build. Loop shape = SELECT → REFINE (the analysis) → done; no IMPLEMENT/VERIFY
because the deliverable is the assessment itself.

## Outcome — FEASIBLE (see report 2026-09-05-phone-app-feasibility)
The HUD already exposes a JSON HTTP API, so a phone client is just another consumer. Two real gaps:
loopback-only reach, and NO auth (safe only while `127.0.0.1`-only). Recommended cheapest/safest path,
consistent with the $0 / local-first / no-cloud ethos:
1. HUD as a **PWA** (manifest + service worker + responsive layout) — reuses the whole existing UI.
2. **`ADMIN_BRAIN_HUD_HOST` bind config + shared-secret token auth** on `/api/*` — the prerequisite
   for any phone access (never expose loop-run / webapp-launch unauthenticated).
3. Reach the PC over **Tailscale** (free, private, encrypted) — zero code.
Rejected: a cloud relay/sync (breaks $0/local-first) and a public tunnel without strong auth.

## Roadmap changes
- Ticked the feasibility goal (determination made + documented).
- Added three follow-up goals for the recommended path: PWA, bind+token auth, Tailscale reach.

No code changed this cycle; the commit carries the feasibility report, this cycle note, and the
roadmap update only. Next step is the user's call on whether to run the PWA / auth cycles.
