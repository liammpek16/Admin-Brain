---
type: report
project: Dota Coach
task: >-
  language from the coach is very confusing. spits out a bunch of hero names and
  damage, but is not clear about who that damage is coming from or who it is
  hitting.
date: '2026-09-04'
cycle: 2026-09-04-language-from-the-coach-is-very-confusing-spits-out-a-bunch-
---

# Verification report — Dota Coach

**Task:** language from the coach is very confusing. spits out a bunch of hero names and damage, but is not clear about who that damage is coming from or who it is hitting.
**Branch:** `auto/language-from-the-coach-is-very-confusing-spits-out-a-bunch-`

## What was tested
Independent adversarial pass (14 checks) on `_fmt_key_fights` and the prompt text:

- **Direction never conflated** — across the replay branch (`hero_damage`) and the OpenDota fallback (`damage_total`), the `(to X)` target list attaches to damage *dealt*; the strings `"taken (to"` and `"took (to"` never appear.
- **"took" only where valid** — the trailing "took N" clause appears only in the `hero_damage` branch (real per-fight damage taken); it's suppressed in the OpenDota-only fallback and when `damage_taken` is absent, so we never invent a received-damage figure.
- **Formatting/robustness** — large numbers keep comma grouping with direction intact; a zero-amount `damage_to` still attaches to "dealt"; missing hero name, `participants: None`, and `participants: []` don't crash.
- **No regression** — top spells, wasted casts, disables dealt/suffered, and the "key ability -> targets" suffix all still render alongside the new dealt/took line.
- **Prompt** — the `TALKING ABOUT DAMAGE & KILLS` attacker→target rule and the "hero damage DEALT … not damage they took" header are present; `_build_prompt` builds without error.

Result: **14/14 pass.** `py_compile` clean.

## Findings (weaknesses / what broke)
- Nothing broke; DoD fully met.
- **(minor, expected)** This makes the *data we hand the model* unambiguous and adds a language rule, but the coach's actual prose clarity is ultimately the LLM's to honor — not deterministically testable here. The change removes the concrete ambiguity that was feeding the confusion and gives an explicit rule; real-world prose quality is confirmed by the user on a live review.
- **(out of scope, noted in spec)** The stray `�` mojibake in one stored review is an encoding artifact, unrelated to attribution — left as a logged follow-up.

## Improvements
1. (Follow-up) Chase the `�` encoding artifact in stored coaching JSON (ensure UTF-8 on write/read of the conversation store).
2. (Optional) A tiny eval prompt that checks a generated review never says "<hero> <number>" without a target — would make prose clarity regression-testable.

## Verdict
**pass** — the concrete data ambiguity ("taken (to …)") is removed, direction is explicit in every branch, an attacker→target language rule is in the prompt, and nothing regressed (14/14). Remaining clarity is LLM-side prose, which the user validates live.
