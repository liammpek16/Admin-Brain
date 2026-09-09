---
type: plan
kind: roadmap
created: 2026-08-07T00:00:00.000Z
project: Dota Coach
horizon: quarter
status: active
---

## Goal
Grow Dota Coach into a reliable, trustworthy, revenue-generating coaching platform.

## Steps
- [x] create a new button for the parser to occur before the coaching analysis #improvement
  - _Delivered: explicit "Parse replay" button in the webapp coach panel. New `POST/GET /api/parse` (kick off / poll the OpenDota replay parse) backed by `tools.request_parse` / `tools.parse_status`; "Start coaching analysis" stays disabled until the replay is parsed, so coaching always runs on complete data._
- [x] allow coaching agent and research agent to be called through claude code to not use API credits #improvement
  - _Delivered: new `dota_coach/llm.py` provider seam. Set `DOTA_COACH_LLM=claude_code` (or `--llm claude_code` on the agents / webapp) to route coaching + research through the local `claude` CLI in headless mode — uses the Claude subscription, no API key and no API credits. Default stays `anthropic`._
- [ ] Add security to the webapp before launching live
- [ ] create a user privacy agreement
- [x] Reduce error in the information shared in the coaching interface — near · high #improvement
- [x] Real-time per-fight coaching feedback: target prioritization, missed spells, positioning — mid · high #improvement
  - _Delivered (PR #4): deterministic "Coaching read" per fight in the webapp (target priority / missed spells / positioning), no LLM. Live in-game version remains a separate future goal._
- [ ] Clean up the interface — mid · med #improvement
- [ ] Determine feasibility of moving API calls to a known script — mid · med #improvement
- [ ] Land the first paying subscription (first revenue) — mid · high
- [ ] Per-fight video playback — long · low (stretch goal) #improvement
- [x] Harden heroes.json hand-corrections so a constants refresh can't silently revert them — near · high #improvement
  - _Delivered (PR #5): id-keyed canonical overlay re-applied on every hero-constants refresh (fetch + offline-fallback); a stale upstream can no longer revert Outworld Destroyer / Ringmaster. Validator stays the net._
- [x] research all available outputs from the dota download. for context, this would be the .dem files that are downloaded from steam servers for each match. #improvement
  - _Delivered (research cycle, no PR): full inventory of every download artifact under `dota_coach/data/` — the four upstream sources (OpenDota API, Valve `.dem` replays, the manta parse, constants/CDN) and each output file's provenance + schema. Surfaced the gaps that drove the next two goals: hero positions were x/y only (no elevation Z) and fight-local vision was a flat radius. Report committed to the Admin-Brain vault (`Reports/2026-09-08-research-all-available-outputs-from-the-dota-download`)._
- [x] harden the opendota API call. It currently fails after 20 retries. #improvement
  - _Delivered (PR #7): the failure was CERTIFICATE_VERIFY_FAILED from a TLS-intercepting proxy/AV whose CA isn't in certifi's bundle. `truststore` now routes verification through the OS trust store (default-on, certifi fallback); `request_with_retries` fails fast on cert errors with an actionable message; opt-in `DOTA_COACH_INSECURE=1` escape hatch. TLS stays enforced by default._
- [x] coach has way to much prioritization on vision during fights. The coach should analyze if there are wards local to fight, and how much vision each team has against the other #improvement
  - _Delivered (PR #11): per-fight vision is now fight-LOCAL — `fights_vision` carries `your/enemy_wards_local` + a `vision_advantage` differential (observer wards within a ward's vision radius of the fight centroid, from replay hero positions), replacing the misleading whole-map ward count; labeled map-wide fallback when positions are absent. The coach prompt demotes vision from a required headline to one proportional factor. 18/18 adversarial._
- [x] language from the coach is very confusing. spits out a bunch of hero names and damage, but is not clear about who that damage is coming from or who it is hitting. #improvement
  - _Delivered (PR #12): removed the ambiguous `dmg dealt, N taken (to X)` construct — the `(to …)` target breakdown now attaches to damage DEALT (`dealt N (to X), took M`), the DAMAGE OUTPUT header says "hero damage DEALT", and a new `TALKING ABOUT DAMAGE & KILLS` prompt rule forces attacker→target attribution and bans bare hero-name+number dumps. 14/14 adversarial._
- [x] weird behavior about missing abilities that have a release function (hoodwink sharpshooter, aa blast) #improvement
  - _Delivered (PR #13): release-function abilities (`ancient_apparition_ice_blast[_release]`, `hoodwink_sharpshooter[_release]`) were splitting into a phantom "wasted cast" + a duplicate "… Release" line. `_canonical_ability` now folds a trailing `_release` onto the base ability in `_pretty_spell` (replay) and `_prettify_ability` (OpenDota), so cast + effect aggregate as one — fixes the whole `_release` class. 13/13 adversarial; minor pre-existing label nuance (multi-token hero prefix) logged as follow-up._
- [x] coach compares neutral items against purchased items. It should be able to make the distinction #improvement
  - _Delivered (PR #14): `_player_final_items` now tags the neutral slot "(neutral)" (purchased slots untagged), and the coach prompt (FINAL ITEMS block + `_SYSTEM`) forbids comparing/lumping/swapping neutrals with the purchased build. Counter-item recs (purchase_log-based) were already neutral-safe. 11/11 adversarial._

- [x] Cluster split-fight positions for fight-local vision (follow-up to PR #11) #improvement
  - _Delivered (PR #15): `_fight_centroids` splits a two-front fight into per-front centroids; a ward is local if it covers ANY front. Compact fights stay byte-for-byte identical. 9/9 adversarial._
- [x] Make fight vision high-ground / line-of-sight aware #improvement
  - _Delivered (PR #18): the elevation source that was blocking this is now real replay Z — the manta helper emits per-hero `m_cellZ`/`m_vecZ`, a coarse per-match elevation grid is learned from it, and `_fight_local_vision` credits an observer ward only with genuine line of sight (not below the fight ground = can't see up a cliff; not blocked by higher intervening terrain), exposing an honest `los_aware` flag. Degrades to the old flat-radius behaviour when Z is absent. 22/22 DoD + 16/16 adversarial + live end-to-end. (Rebuild the manta binary to activate.)_
- [x] Hero-aware ability labels: drop multi-token hero prefixes so abilities read "Ice Blast" not "Apparition Ice Blast" (follow-up to PR #13) #improvement
  - _Delivered (PR #16): `_strip_hero_prefix` uses the real hero-name list (cached, longest-first) in both `_pretty_spell` (replay) and `_prettify_ability` (OpenDota); "Ice Blast" / "Sharpshooter" / "Shrapnel". Degrades gracefully if constants unavailable. 16/16 adversarial._
- [x] Grade the neutral item choice — was it the best neutral for its tier/role (follow-up to PR #14) #improvement
  - _Delivered (PR #17, scope A): the neutral now carries its tier ("(neutral, tier N)" via `_item_tier_by_id`), and the coach prompt judges it against same-tier neutrals only — never purchased items. Deterministic best-in-tier grading (scope B, curated table) deferred. 10/10 adversarial._
- [x] fix bug where running coaching analysis prevents user from clicking the load hero positions button #improvement
  - _Delivered (PR #19): `#loadPosBtn` was revealed only after the slow coaching `await` resolved, so it stayed hidden for the whole analysis. `startCoaching` now reveals it up front, in parallel with the coaching call (the server is threaded and the two requests are independent), and fetches charts once so `loadPositions`' in-place hero merge isn't clobbered. Front-end only. Verified live: the button is clickable while coaching is in flight; positions load + merge; no console errors._

## Risks
- Real-time accuracy is hard, and errors erode coaching trust — milestone 1 de-risks everything after it.
- Video playback is technically heavy; keep it a long-term stretch, not a blocker.
- Revenue depends on the product feeling reliable first — milestones 1–2 gate the subscription milestone.

> Tick a box in Obsidian to mark a milestone done — the project's progress % updates
> automatically across the brief, HUD, and metrics. Reorder freely; order here is a suggestion.
