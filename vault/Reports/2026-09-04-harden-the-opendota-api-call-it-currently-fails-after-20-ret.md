---
type: report
project: Dota Coach
task: harden the opendota API call. It currently fails after 20 retries.
date: '2026-09-04'
cycle: 2026-09-04-harden-the-opendota-api-call-it-currently-fails-after-20-ret
---

# Verification report — Dota Coach

**Task:** harden the opendota API call. It currently fails after 20 retries.
**Branch:** `auto/harden-the-opendota-api-call-it-currently-fails-after-20-ret`

## What was tested
_Adversarial checks against the definition of done — edge cases, bad input, failure modes._

Independent pass against the REAL module (not the implementer's own harness). **18/18 checks pass** (5 DoD + 13 adversarial).

DoD:
1. Live `tools.list_recent_games(114182902, limit=20)` → returns games, no SSLError (root cause fixed on this machine; pre-verified `truststore.inject_into_ssl()` → HTTP 200).
2. `import Dota_Game_Summary` with truststore present → `_OS_TRUST_STORE True`; with truststore import blocked → module still imports, `_OS_TRUST_STORE False`, `_VERIFY_TLS True` (certifi fallback).
3. Simulated cert-verify `SSLError` inside `requests.get` → raises on attempt **1** (0.00s, no 3× backoff) with a message naming truststore + `DOTA_COACH_INSECURE`.
4. `DOTA_COACH_INSECURE=1` → `_VERIFY_TLS False` + printed warning; unset → verification enforced.
5. `truststore` present in `dota_coach/requirements.txt`.

Adversarial:
- **V1 (8 cases):** junk `DOTA_COACH_INSECURE` values (`0`/`false`/`no`/` `/empty) keep TLS ON; only `1`/`yes`/`true` (case-insensitive) disable it. No accidental downgrade.
- **V3:** an empty/odd `SSLError` object still fast-fails with the actionable message (no crash formatting the error).
- **V4:** a genuine transient `ConnectionError` (non-SSL) still retries all 3 attempts then raises — retry behaviour preserved (SSLError is caught first, so it can't swallow real connection errors).
- **V5:** a non-retryable HTTP 404 still raises on the first attempt (no spin) — unchanged.
- **V6:** trust-store injection is idempotent (safe to call repeatedly).
- **V9:** `_tls_help()` embeds the original error + both remedies.

## Findings (weaknesses / what broke)
_Honest — what an attacker or bad input exposes._

- **No defect broke the fix.** Core failure mode resolved; TLS stays enforced by default; the insecure path is opt-in and loud.
- **(minor, by design)** The `DOTA_COACH_INSECURE` escape hatch is scoped to `Dota_Game_Summary`'s own `requests` calls. `tools.hero_high_bracket_stats`' direct `requests.get(.../heroStats)` and `validate_constants.py`'s live fetch do NOT honor it — but both are still covered by the **truststore** injection (importing either path imports `Dota_Game_Summary`, which patches `ssl` process-wide), so the primary fix reaches them; only the last-resort `verify=False` bypass doesn't.
- **(minor)** `validate_constants.py` is a standalone script that never imports `Dota_Game_Summary`, so it gets neither truststore nor the env hatch — it keeps its own `--insecure` flag (unchanged). This is the pre-identified follow-up, not a regression.
- **(cosmetic)** The transient-retry path still sleeps 2+4+6s of backoff — unchanged pre-existing behaviour; only cert errors were made fast.

## Improvements
_Concrete, prioritized recommendations._

1. **Follow-up cycle:** apply the same `truststore` injection at the top of `validate_constants.py`'s live-fetch path so its `--insecure` becomes rarely needed (out of scope here; logged in the refine spec).
2. Optional: thread `verify=_VERIFY_TLS` into `tools.hero_high_bracket_stats` for full insecure-mode symmetry (low value — truststore already covers the common case).

## Verdict
**pass** — all 18 checks green; root cause fixed and pre-verified live (HTTP 200), TLS not weakened by default, failure mode now fast + legible. Findings are minor/by-design with one logged follow-up.
