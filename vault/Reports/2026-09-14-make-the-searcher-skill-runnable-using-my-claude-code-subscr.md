---
type: report
project: Job Hunt / Recruiter Helper
task: >-
  make the searcher skill runnable using my claude code subscription rather than
  api credits.
date: '2026-09-14'
cycle: 2026-09-14-make-the-searcher-skill-runnable-using-my-claude-code-subscr
---

# Verification report — Job Hunt / Recruiter Helper

**Task:** make the searcher skill runnable using my claude code subscription rather than api credits.
**Branch:** `auto/make-the-searcher-skill-runnable-using-my-claude-code-subscr`

## What was tested
- **Unit suite:** `npm test` → **56/56 pass** (8 new `claude-source` tests + updated `searcher` auto-detect).
- **Auto-select (DoD):** `resolveSource(null, {})` → `claude`; with an Adzuna key → `adzuna`; with a LinkedIn key → `linkedin`; explicit `--source` overrides. No-key run of the real CLI used `claude` and did NOT exit 3.
- **Two-phase handoff (DoD):** first run with no results file wrote `data/claude-search-<slug>.request.json` and exited **4** (handoff pending) with the prompt printed — distinct from under-target `1` and no-creds `3`.
- **Ingest/normalize/dedupe:** results file (array and `{roles:[...]}` wrapper) → shared shape with `source:"claude"`, `salary_min` alias coerced, duplicate ids collapsed, title-less junk dropped.
- **Fail-loud on bad data:** malformed JSON in the results file → `BAD_RESULTS` (never a silent 0-role "success").
- **Keyed sources unaffected:** explicit `--source adzuna` with no key still exits **3**.
- **Path safety:** `slugFor({title:'../../etc/passwd', location:'$(rm)'})` → `etc-passwd-rm` (no slashes, no shell metachars — handoff filenames can't escape `data/`).
- **Store interop:** the 22 ingested roles are read by the dashboard skill (`Sourced 22`) — customizer/ATS/dashboard contract intact.
- **Goal 2 live run:** `--title "Sales Engineer" --location "New York City"` on the subscription surfaced **22 real, distinct** NYC roles (Datadog, Vimeo, Twilio, Okta, Samsara, Yext ×3, Similarweb ×2, R3, Viant, Azul, Samba TV, Perforce, Lakera, Sumo Logic, Transmit Security, Coactive AI, AHEAD, Jobgether, Tessera Labs), saved at status `saved`; no auto-apply (human pick-gate holds).

## Findings (weaknesses / what broke)
- **Under the ≥100 bar (expected, honest):** one subscription handoff surfaced 22 verifiable roles, not 100 — the CLI correctly signals this with exit **1** ("under target"). Reaching ≥100 needs either several handoff rounds (paginating across more boards) or the keyed sources. This is a capacity trade-off, not a bug: the DoD ("runs with no key on the subscription") is met; the roadmap's ≥100 is a *searcher* property inherited from goal 2, unchanged by this cycle.
- **Handoff is manual/two-step by design:** Claude Code must write the results file between the two runs. That is the deliberate "$0 hands reasoning to Claude" pattern (no unattended `claude -p` runner — same Phase-E deferral as Admin Brain's loop-handoff).
- **Salary/description sparsity:** search-result snippets rarely include salary; only 1/22 roles had a salary. Richer fields would need fetching each posting page (deferred).

## Improvements
1. Add a `--refresh` flag (or stale-TTL) so a stored results file can be re-searched without manual deletion.
2. Multi-round handoff helper: accumulate roles across several searches toward the ≥100 bar (dedupe already handles overlap).
3. Optional per-posting enrichment pass (fetch the URL for salary/description) — separate cheap step.

## Verdict
**pass-with-notes** — DoD fully met (searcher runs on the subscription with no API key/credits; auto-selected; store contract intact; 56/56 tests) and Goal 2's first live NYC "Sales Engineer" search ran end-to-end. The only note is the inherited ≥100 volume bar, which one manual handoff round doesn't hit and the exit code honestly reports.
