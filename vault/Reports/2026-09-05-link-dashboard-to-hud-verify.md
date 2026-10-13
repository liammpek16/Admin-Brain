---
type: report
project: Job Hunt / Recruiter Helper
cycle: Link the jobs dashboard to the Admin Brain HUD panel
stage: verify
verdict: pass
date: '2026-09-05'
pr: 'https://github.com/liammpek16/job-hunt/pull/6'
---

# VERIFY — link dashboard to the HUD button (like Dota)

Independent pass on the `--serve` dashboard server + `run-dashboard.ps1` + the Job Hunt
project-note `webapp_*` config (branch `auto/link-dashboard-to-hud`, draft PR #6).

## Result: **pass**

- **Unit/integration (49/49):** full job-hunt suite 48/48 + a new test that starts
  `createServer()` on an ephemeral port and asserts `GET /` → 200 `text/html` containing
  "Job Hunt Dashboard", and `GET /health` → `ok`.
- **Faithful HUD-button replication:** reproduced `launchWebapp`'s exact flow (spawn `webapp_cmd`
  in `webapp_cwd`, shell + detached, poll the URL): probe **before** = down (0), spawn
  `run-dashboard.ps1`, probe **after** = **200**; fetched body has `<title>Job Hunt Dashboard</title>`
  and the Applied tile. Empty store also serves 200 (empty state).
- **Vault wiring:** `skills/vault/vault.js` `getProjects()` surfaces `webappUrl/webappCmd/webappCwd`
  for Job Hunt — the front-end shows the button only when `webapp_url` is set, so it will appear.
- **No HUD code change** — reuses the existing per-project webapp button.

## Notes

- **Port:** 4174 was already in use on this machine; default moved to **4188**. Configurable via
  `run-dashboard.ps1 -Port <n>` (keep `webapp_url` in sync).
- **Live, local, $0:** server binds `127.0.0.1` only, re-reads the store per request, zero deps.
- The server is spawned **detached/unmanaged** by design (same as Dota's) — stop it from its
  terminal or by freeing the port. This matches the webapp-launcher cycle's known trade-off.

## Recommended next

Merge PR #6 + commit the vault config, then the Job Hunt "webapp" button in the HUD opens the
live pipeline dashboard. It fills in as roles are searched and marked applied.
