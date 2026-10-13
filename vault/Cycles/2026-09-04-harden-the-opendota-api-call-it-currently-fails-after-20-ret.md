---
type: cycle
project: Dota Coach
stage: review
status: done
verdict: pass
merged: 'ab93419'
pr: 'https://github.com/liammpek16/dota-projects/pull/7'
task: harden the opendota API call. It currently fails after 20 retries.
started: '2026-09-04'
readme_source: 'https://github.com/liammpek16/dota-projects'
branch: auto/harden-the-opendota-api-call-it-currently-fails-after-20-ret
target_path: 'C:/Users/liamm/Scripts'
report: 2026-09-04-harden-the-opendota-api-call-it-currently-fails-after-20-ret
---

## Task (from SELECT)
harden the opendota API call. It currently fails after 20 retries.

## Project goal — source: https://github.com/liammpek16/dota-projects
```
# dota-projects

A collection of personal Dota 2 analysis and coaching projects.

## Contents

| Path | Description |
|------|-------------|
| `dota_coach/` | Dota 2 coaching app — replay parsing, coaching/research agents, telemetry, dashboard, and a web app. |
| `Dota_Game_Summary.py` | Generates a summary report for a Dota match. |
| `dota_knowledge.py`, `dota_knowledge_ext.py` | Static Dota knowledge bases (heroes, items, mechanics). |
| `report_html.py` | Builds HTML match reports. |
| `run-webapp.ps1` | Launches the coaching web app. |
| `tools/manta_positions/` | Go tool for extracting positional data from replays. |

## Notes

Large or regenerable files are intentionally **not** tracked in git (see `.gitignore`):
Dota replay files (`*.dem`), per-match data dumps, the local `coach.db`, compiled
binaries, and Python caches. Reference data (`dota_coach/data/constants/`) is kept.

## Setup

```bash
# Python projects
cd dota_coach
pip install -r requirements.txt

# Go tool
cd tools/manta_positions
go build ./...
```

## Validation

`dota_coach/validate_constants.py` guards the knowledge layer the coaching interface relies
on, with two checks:

1. **Constants vs upstream** — diffs `data/constants/heroes.json` & `items.json` against the
   live OpenDota `/constants` (same upstream: `odota/dotaconstants`) over a bounded subset
   (hero name/roles/attack_type/primary_attr, item name/cost).
2. **Knowledge referential integrity** (local, no network) — every hero name used as a key in
   `dota_knowledge.py` / `dota_knowledge_ext.py` must exist in `heroes.json`. A stale or
   misspelled key is *silently skipped* by the coaching analysis, so this catches heroes whose
   coaching data quietly drops out (e.g. a rename mismatch).

Exit 0 = clean, 1 = discrepancies.

```bash
cd dota_coach
python validate_constants.py                 # both checks (constants needs network)
python validate_constants.py --knowledge     # only the local knowledge check (no network)
python validate_constants.py --offline       # skip upstream; knowledge only
python validate_constants.py --json          # machine-readable report
python validate_constants.py --upstream-dir DIR   # compare constants vs a pinned copy
python validate_constants.py --insecure      # workaround for broken local TLS chains
```

### Constants note

Two hero `localized_name`s in `data/constants/heroes.json` are **hand-corrected** to their
current in-game names — `Outworld Destroyer` (was the stale `Outworld Devourer`) and
`Ringmaster` (was `Ring Master`). The upstream `odota/dotaconstants` snapshot still carried the
old names, which silently dropped both heroes' coaching data (their knowledge keys use the
current names). If `heroes.json` is ever regenerated from a stale upstream, these can revert —
`python validate_constants.py --knowledge` is the regression net that catches it (exit 1 on any
dangling hero reference).
```

## Council refinement
_5-persona council: gaps between the task and the project goal._

- **Reliability engineer:** The failure is NOT transience — it's `SSL: CERTIFICATE_VERIFY_FAILED / unable to get local issuer certificate`, reproduced on the first call. certifi is current (2026.06.17) yet still fails, which means a TLS-intercepting middlebox (corporate proxy / AV like Zscaler/Kaspersky) is re-signing traffic with a CA that lives in the **Windows cert store but not in certifi's bundle**. Confirmed: `truststore.inject_into_ssl()` → 200 OK. So the whole app is dead-on-arrival on this machine for every OpenDota call (recent games, match detail, constants, parse), not just "recent games".
- **Correctness reviewer:** `request_with_retries` treats `SSLError` as a `ConnectionError` (it's a subclass) and burns all 3 retries + backoff on a non-transient config error before re-raising — slow AND misleading ("after 20 retries"; the 20 is urllib3's pool count). A cert-verify failure should fail FAST with an actionable message, not spin.
- **Security reviewer:** Fix must not weaken TLS by default. `verify=False` as a default is unacceptable. Prefer using the OS trust store (verification stays ON, just sourced from Windows/macOS). Any bypass must be explicit opt-in + a loud warning. Note precedent: `validate_constants.py` already has an opt-in `--insecure` for the same broken-chain scenario — mirror that, don't default it on.
- **UX reviewer:** Today the user sees a raw `HTTPSConnectionPool(...)` stack trace in the webapp. They need one sentence telling them what's wrong and the two ways to fix it (install truststore / set an env var).
- **Maintainer:** `truststore` is a small, reputable pure-Python package (maintained by a pip/urllib3 maintainer) — fits the project's "adopt maintained libs" preference. Injection must be a **no-op when the package is absent** (graceful: fall back to certifi) so the repo still runs where truststore isn't installed. All OpenDota traffic funnels through `Dota_Game_Summary.py`, so one injection point at its module import covers requests AND urllib for the whole process.

## Refined task spec
_A sharpened, branch-sized task._

Harden every OpenDota HTTPS call so it succeeds behind a TLS-intercepting middlebox, fails fast + legibly when it genuinely can't, and never weakens TLS by default. In `Dota_Game_Summary.py`:

1. **Use the OS trust store (default-on, safe).** Add a `_enable_os_trust_store()` helper called once at module import that runs `truststore.inject_into_ssl()`, wrapped in `try/except ImportError` (+ broad guard) so it's a silent no-op when truststore isn't installed — verification stays ON either way (OS store when available, certifi otherwise). Add `truststore` to `dota_coach/requirements.txt`.
2. **Fail fast on cert-verify errors.** In `request_with_retries`, catch `requests.exceptions.SSLError` separately and DON'T retry it (cert verification is not transient) — re-raise immediately wrapped with an actionable message: what happened + "install `truststore` (already in requirements) or, if you accept the risk, set `DOTA_COACH_INSECURE=1`."
3. **Opt-in insecure escape hatch.** Env var `DOTA_COACH_INSECURE=1` (mirrors validate_constants' `--insecure`) makes the session pass `verify=False` and suppress urllib3's `InsecureRequestWarning`, after printing a one-line loud warning. Off by default. Applies to the `requests.get`/`requests.post` paths in this module.
4. **Legible webapp surface.** The `/api/games` handler (`webapp/server.py`) already wraps the exception; keep its message but let the improved exception text flow through so the UI shows the actionable hint, not a raw pool trace.

## Definition of done
_Clear, testable completion criteria._

- With `truststore` installed, `tools.list_recent_games(114182902, limit=20)` returns games (no SSLError) on this machine. ✅ pre-verified: injection → 200 OK.
- With truststore importable, `import Dota_Game_Summary` injects the OS trust store; with it absent, import still succeeds and behaves exactly as before (certifi).
- A simulated cert-verify `SSLError` raised inside `requests.get` causes `request_with_retries` to raise on the **first** attempt (no 3× retry/backoff) with a message naming truststore + `DOTA_COACH_INSECURE`.
- `DOTA_COACH_INSECURE=1` routes calls with `verify=False` + a printed warning; unset → verification enforced.
- Retry behaviour for genuinely transient errors (timeouts, 429/5xx/52x) is unchanged.
- `truststore` present in `dota_coach/requirements.txt`.

**Out of scope (follow-ups):** applying the same OS-trust-store injection to `validate_constants.py`'s live fetch (separate urllib script; would remove the need for its `--insecure`); packaging/pinning a corporate CA bundle.

## Implementation
- branch: `auto/harden-the-opendota-api-call-it-currently-fails-after-20-ret` in `C:/Users/liamm/Scripts` (off `main`) — never touches main
- started: 2026-09-04T13:38

### Checkpoint log
- 2026-09-04T13:38 — branch created; supervised implementation started.
