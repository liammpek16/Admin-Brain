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
- [ ] Add security to the webapp before launching live
- [ ] create a user privacy agreement
- [ ] Land the first paying subscription (first revenue) — mid · high
- [ ] Clean up the interface — mid · med #improvement
- [ ] Determine feasibility of moving API calls to a known script — mid · med #improvement
- [x] Per-fight video playback — long · low (stretch goal) #improvement
  - _Delivered (PR #22, follow-ups #23/#24): time-driven per-fight playback shipped in the webapp — interpolated hero motion, scroll zoom / pan, cast + damage overlays, minimap background._
- [x] fix hero position loading. Error is "positions failed: Failed to fetch" #improvement
  - _Delivered (PR #20 + #21): replay parse now runs as a background job (#20) and the non-serialisable elevation grid was dropped from `replay_status` (#21), fixing the "Failed to fetch"._
- [x] fix bug of damage numbers and ability usage in the video playback occuring once a player has died #improvement
  - _Delivered (PR #24): overlays (damage numbers, cast rings, disable badges) are gated to heroes alive at time t, so a dead hero shows only its ✕ — no lingering post-death artifacts._
- [x] player icon size should scale with zoom ratio #improvement
  - _Delivered (PR #24): hero icons clamp to a screen-consistent size across zoom (grows 8.8%→26.4% of the box from zoom 1→5×) so distancing reads clearly._
- [x] playback video background should be the dota minimap #improvement
  - _Delivered (PR #22/#23/#24): procedural Dota-style minimap (river, tinted halves/bases, lanes+towers, Roshan), with an optional real `/static/dota_map.png` overlay behind a one-time probe._
- [x] animate abilities used (physical icon animation when an ability is used) #improvement
  - _Delivered (PR #22/#24): each cast pops an expanding, fading ring; when an ability icon is available it renders as an animated `<image>`, else falls back to a text label._
- [x] create a new button for the parser to occur before the coaching analysis #improvement
  - _Delivered: explicit "Parse replay" button in the webapp coach panel. New `POST/GET /api/parse` (kick off / poll the OpenDota replay parse) backed by `tools.request_parse` / `tools.parse_status`; "Start coaching analysis" stays disabled until the replay is parsed, so coaching always runs on complete data._
- [x] allow coaching agent and research agent to be called through claude code to not use API credits #improvement
  - _Delivered: new `dota_coach/llm.py` provider seam. Set `DOTA_COACH_LLM=claude_code` (or `--llm claude_code` on the agents / webapp) to route coaching + research through the local `claude` CLI in headless mode — uses the Claude subscription, no API key and no API credits. Default stays `anthropic`._
- [x] Reduce error in the information shared in the coaching interface — near · high #improvement
- [x] Real-time per-fight coaching feedback: target prioritization, missed spells, positioning — mid · high #improvement
  - _Delivered (PR #4): deterministic "Coaching read" per fight in the webapp (target priority / missed spells / positioning), no LLM. Live in-game version remains a separate future goal._
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
- [x] improve the video playback for each fight. Change the start and end time for the fight playback to be 30 seconds before the start of the fight to exactly when the fight ends. #improvement
  - _Delivered (PR #22, batched cycle): `attach_frames` samples `[fight start − 30s, fight end]` (pre_roll=30, tail=0) instead of a symmetric ±3s pad; combat-log parse window widened to cover the lead-in._
- [x] improve the video playback for each fight. Smooth out the motion for each hero within the fight. Allow zooming in on the map to see the distancing between each hero. #improvement
  - _Delivered (PR #22 + #23): the player is time-driven; `heroesAt()` linearly interpolates each hero between real samples for smooth motion. Scroll-to-zoom toward the cursor, +/−/reset, drag-to-pan; markers stay screen-size so hero distancing reads clearly._
- [x] improve the video playback for each fight. add small animations for each ability case in the fight. #improvement
  - _Delivered (PR #22): each cast pops a short expanding, fading ring + label over the caster; damage numbers drift up and fade._
- [x] improve the video playback for each fight. add a background to the fight map that looks like the minimap from dota #improvement
  - _Delivered (PR #22 + #23): `mapBackgroundSVG` redrawn Dota-minimap-style (river band, Radiant/Dire tinted halves + bases, three lanes with tower dots, Roshan); optional real /static/dota_map.png overlay kept behind a one-time probe._
- [x] should be able to call coaching analysis on each specific fight analysis. #improvement
  - _Delivered (PR #27): `coaching_agent.web_start_fight` + `_build_fight_prompt` scope the LLM review to one `key_fights[idx]` (with that fight's local vision); `POST /api/coach` takes a `fight_index`, persisted under a composite `<match>_f<idx>` key that resumes independently and is kept out of the durable player profile; a "💬 Coach this fight" button on each Fight Analysis card. Verified pass-with-notes (no cross-fight leak, isolated persistence + restart recovery, 409/no-spend on unparsed)._
- [x] correct map scaling with new png background #improvement
  - _Delivered (PR #26): `mapXY` world→minimap mapping extracted to a tunable `MAP_MIN`/`MAX` constant (default 64..192, byte-identical), and the fight-map SVGs + PNG `<image>` switched from `preserveAspectRatio="none"` to `xMidYMid meet` (stretch-proof). Calibration recipe added to `static/README.txt`. Verified pass-with-notes: mechanism + stretch-proofing confirmed; final numeric calibration to a supplied licensed minimap PNG is a user step (asset not bundled, per #24)._
- [x] green and red hero outlines should also scale down with zoom like hero icons #improvement
  - _Delivered (PR #25): `imgMarker` gains a `strokeWidth` param (default 1.1); hero and ward call sites pass `1.1*hs`/`1.1*k` so the team-colored ring tracks the icon under zoom instead of ballooning, and the dead-hero dashed ring scales too. `svgNum` keeps the 1× output byte-identical. Verified pass (constant stroke/radius ratio 1×→8×)._
- [x] determine feasibility of recreating video animations of fights with .dem data using real character models and animations. #improvement
  - _Delivered (research cycle + spike, no app PR): **recommendation DEFER / lean no-go.** Feasible for the render pipeline — a three.js spike (`dota_coach/docs/fight_3d_spike.html`, on an unmerged branch) rendered 10 animated placeholder hero models on a real fight's names/deaths — but literal animations are **not in the `.dem`** (Source 2 animgraph-driven, so approximate or replay in-engine), real Valve models carry the #24-class IP risk, effort is weeks→months, and the coaching uplift over the shipped 2D playback is marginal. If revisited: resolve model licensing first, add `m_angRotation` to the manta parse, and prototype native-client capture (path A) before embedded web-3D (path B). Full report: `Reports/2026-09-11-determine-feasibility-of-recreating-video-animations-of-figh`._

## Risks
- Real-time accuracy is hard, and errors erode coaching trust — milestone 1 de-risks everything after it.
- Video playback is technically heavy; keep it a long-term stretch, not a blocker.
- Revenue depends on the product feeling reliable first — milestones 1–2 gate the subscription milestone.

> Tick a box in Obsidian to mark a milestone done — the project's progress % updates
> automatically across the brief, HUD, and metrics. Reorder freely; order here is a suggestion.
