---
type: report
project: Dota Coach
task: should be able to call coaching analysis on each specific fight analysis.
date: '2026-09-11'
cycle: 2026-09-11-should-be-able-to-call-coaching-analysis-on-each-specific-fi
---

# Verification report — Dota Coach

**Task:** should be able to call coaching analysis on each specific fight analysis.
**Branch:** `auto/should-be-able-to-call-coaching-analysis-on-each-specific-fi`

## What was tested
Independent tests over the real functions (`_build_fight_prompt`, `web_start_fight` helpers,
`server.Handler._recover_convo`, `conversation_store` with an isolated temp `BASE`) plus a live
DEMO server drive — adversarial, not the happy path:
- **Prompt scoping (DoD #1):** built a 2-fight analysis + 1 timestamp-matched vision entry.
  `_build_fight_prompt` for the 24:00 fight contains the single-fight header and that fight's
  local-vision line, the player's hero/role — and the *other* fight's `12:00` does **not** leak.
- **Persistence + no collision (DoD #2):** `save_conversation(acct,'999_f2')` round-trips, and
  `load_conversation(acct,'999')` returns `None` — the fight file (`999_f2.json`) never collides
  with the match-level file (`999.json`).
- **Restart recovery (DoD #2):** `_recover_convo('123_999_f2')` → `(123,'999_f2',msgs)` and
  `_recover_convo('123_999')` → `(123,'999',msgs)`; both id shapes resolve to the right on-disk
  key after the in-memory cache is gone.
- **Index clamping:** `fight_index` 99 → last fight, −5 → 0 (no IndexError).
- **DEMO end-to-end (DoD #4/#5):** `POST /api/coach {fight_index}` → fight-scoped reply + its own
  `conversation_id`; a follow-up on that id works; the no-`fight_index` match path returns the
  full match review unchanged.
- **Unparsed guard (DoD #4):** `web_start_fight` calls `_require_parsed` before `_message`, so an
  unparsed replay raises `MatchNotParsedError` → 409 with **no** model call (same credit guard as
  `web_start`); a no-fights case raises `ValueError` → 400.
- **Compile/parse:** `py_compile` clean on both Python files; browser load shows `coachThisFight`
  wired with no console errors.

## Findings (weaknesses / what broke)
- **[low] Per-fight sessions appear in `list_conversations` as pseudo-matches.** They persist
  with a string `match_id` like `'999_f2'`, so `list_conversations` returns rows `[999, '999_f2']`.
  Today nothing in the app surfaces that list, and per-fight sessions are deliberately kept out of
  the durable player profile (`web_start_fight` does **not** call `_learn_from_review`, and
  `profile_brief` reads only `profile.json`), so the learning loop stays clean. But if a "your
  saved coaching sessions" view is ever added, it would need to filter/label the `_f` rows.
- **[low · quality, data-dependent] Reply quality tracks `key_fights[idx]` richness.** On an
  OpenDota-only (unparsed) match the fight entry is thin (no per-spell/positioning detail), so the
  single-fight read is necessarily shallower. The 409 parsed-gate mitigates the worst case, and
  the prompt tells the coach to say so rather than invent — but a *thin-but-parsed* fight can still
  yield a light review. Not a defect; a data ceiling.
- **[info] Fight index is matched to the coach's `key_fights` by timestamp (±30s) in the UI.**
  Same basis as the existing "Coaching read" lookup. If two fights fell within 30s of each other,
  the earlier index wins; not observed in practice given fight spacing.
- No functional breakage: match-level path unchanged, fight/match conversations isolated,
  follow-ups persist to the right file, unparsed spends nothing.

## Improvements
1. _(optional, if a saved-sessions UI lands)_ Filter or label composite `_f<idx>` keys in
   `list_conversations` so per-fight sessions read as "Fight at MM:00" rather than a stray match id.
2. _(optional)_ Surface the fight label in the coach header client-side too (the server already
   sends `Fight at MM:00 …`), so a resumed fight session is unambiguous in the panel.

## Verdict
**pass-with-notes.** Every DoD criterion is met and independently verified: fight-scoped prompt
with no cross-fight leak, isolated persistence + restart recovery for both id shapes, index
clamping, the 409/no-spend parsed gate, an unchanged match-level path, and a working DEMO + UI
button. The findings are latent/cosmetic (the `list_conversations` pseudo-match rows) or an
inherent data ceiling (reply depth on thin fights), none blocking merge.
