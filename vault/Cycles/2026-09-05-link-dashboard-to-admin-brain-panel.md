---
type: cycle
project: Job Hunt / Recruiter Helper
stage: done
status: done
task: Link the jobs dashboard to the Admin Brain HUD panel (like the Dota webapp button)
started: '2026-09-05'
approved: '2026-09-05'
repo: 'https://github.com/liammpek16/job-hunt'
local_path: 'C:/Users/liamm/job-hunt'
pr: 'https://github.com/liammpek16/job-hunt/pull/6'
---

## Task (from SELECT)
Link dashboard to admin brain panel — the user wants it to work like the Dota Coach webapp
button on the HUD.

## Council refinement
- **🟢 Expansionist / 🔵 First-Principles:** the HUD ALREADY has the mechanism — the per-project
  webapp button (`launchWebapp` in `hud/server.js`) probes `webapp_url` and, if down, spawns
  `webapp_cmd` in `webapp_cwd`, polls ~20s, opens the URL. Dota uses it via `run-webapp.ps1`.
  So don't build a new HUD panel; **reuse the button**. The only gap: the Job Hunt dashboard
  was a STATIC file, not a served URL — the button needs something to probe/open.
- **🟡 Executor:** add a `--serve` mode to the dashboard skill (a tiny zero-dep 127.0.0.1 HTTP
  server rendering the LIVE dashboard from the store per request) + a `run-dashboard.ps1`
  wrapper (mirrors Dota's `run-webapp.ps1`), then set `webapp_url/webapp_cmd/webapp_cwd` on the
  Job Hunt project note. **No HUD code change.**
- **⚪ Outsider:** it should show my real pipeline and update when I apply to a role — so serve
  the live store, not a snapshot.

## Definition of done
- [x] Dashboard is servable on a local URL (`--serve`, `run-dashboard.ps1`); live from the store
- [x] Job Hunt project note carries `webapp_url/webapp_cmd/webapp_cwd` → HUD button appears
- [x] The HUD's existing launch flow brings it up + opens it (no HUD code change)
- [x] Verified end-to-end (probe-down → spawn → 200, correct dashboard served)

## Implementation
Branch `auto/link-dashboard-to-hud`; draft PR #6 (job-hunt). Port **4188** (4174 was occupied).
- `skills/dashboard/dashboard.js`: `--serve [--port 4188]`, `createServer`/`renderLiveHtml`/`serve`, `GET /health`.
- `run-dashboard.ps1`: PowerShell wrapper the button invokes.
- Vault: `webapp_*` config added to `Projects/Job Hunt - Recruiter Helper.md`.

## Verify (2026-09-05) — verdict pass
Report: `vault/Reports/2026-09-05-link-dashboard-to-hud-verify.md`. **49/49** tests (48 suite +
1 new server test) + the faithful launchWebapp replication: probe-before = down, spawn
`run-dashboard.ps1`, probe-after = **200**, page has the right `<title>` and content; empty
store also serves 200. Vault accessor surfaces `webappUrl/Cmd/Cwd` for Job Hunt.

NOTE (env): port **4174 was already in use** on this machine — moved the default to **4188**.
If 4188 is ever taken, `run-dashboard.ps1 -Port <n>` + update `webapp_url` to match.
