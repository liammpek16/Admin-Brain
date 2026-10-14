---
type: plan
kind: roadmap
created: '2026-09-04'
project: friendslop game
horizon: quarter
status: active
---

## Goal
A goofy 3D-physics online co-op game (4–8 players, proximity voice, likely a skiing theme)
built in Godot 4 with Claude and launched on Steam in Early Access. Plan approved 2026-10-13:
[[friendslop-game-gameplan]] (council-revised v2: gated milestones M0–M4, each with a
continue / change / kill decision).

## Steps
- [x] determine feasibility with claude
  - _Done 2026-09-04: build GO, sell GO-conditional; Godot 4 + GodotSteam. See the friendslop-game README._
- [x] write and approve the full gameplan (roadmap critique, council review, v1 vs v2)
  - _Done 2026-10-13: v2 approved → [[friendslop-game-gameplan]]. Drafts in `friendslop-game/docs/`._

### M0 — Setup + netcode spike (2–3 weeks)
- [x] M0: install & configure Godot 4 + GodotSteam + Git LFS; two instances connect via Steam App 480
  - _Description: pin one Godot version; .gitignore the .godot cache and .blend1 autosaves; LFS for .glb/.png/.wav/.blend; lobby filtered by a custom key. Also do one Godot 3D beginner tutorial yourself (human)._
  - _Built 2026-10-13 ([friendslop-game#1](https://github.com/liammpek16/friendslop-game/pull/1), draft): Godot 4.7.2 + Jolt, GodotSteam 4.23.1 in LFS, ENet + Steam lobby networking, `tools/smoke_test.ps1` passes at 4 and 8 players headless; Steam lobby created and found on this PC._
  - _Ticked 2026-10-13 on request. The Steam join between two PCs is not yet tested; tracked as its own goal below._
- [ ] M0: verify a Steam join between two PCs/accounts (human + a friend)
  - _Description: unzip `build/friendslop-test.zip` (made by `tools/package_test.ps1`) on both PCs, host → Find Steam lobbies → join; both see 2 moving players; leave/host-left handled. Steps in the session guide / PR #1._
- [x] M0: Blender MCP test: generate and import one prop
  - _Description: answers the old goal "can I use Blender with Claude to generate models?"_
  - _Built 2026-10-13 ([friendslop-game#2](https://github.com/liammpek16/friendslop-game/pull/2), draft, stacked on #1): yes, headless. Blender 5.2.2 installed; `tools/blender/make_sled.py` builds a low-poly sled with no Blender window, exports .glb; `scenes/props/sled.tscn` physics prop; `tools/checks/check_props.gd` passes. Interactive Blender MCP not set up (optional)._
- [ ] M0: netcode spike: fast slope, owned movement, host-owned boxes, rope vs shared-sled under 150 ms lag
  - _Description: throwaway code. Each player owns their movement, host owns shared objects; compare two players roped together vs one host-owned sled with clumsy at 150 ms / 2% loss._
  - _Built 2026-10-13 ([friendslop-game#3](https://github.com/liammpek16/friendslop-game/pull/3), draft, stacked on #2). Results in `docs/spike/m0-netcode-spike.md`: at ~20 m/s and 150 ms + jitter + 2% loss, others drawn up to 4.4 m behind; rope toward the displayed partner is stable but brakes pairs to 10–12 m/s; rope with prediction yanks (tug ~4×, yank ~6× at 150 ms); host-owned sled is consistent (p95 1.3 m), rider steering +240 ms after the host's. Recommendation: shared sled, rope only soft/cosmetic, stay on Godot. Built-in lag simulator used instead of clumsy._
- [x] M0: headless host + 3 bot clients test harness for VERIFY
  - _Description: scripted inputs + fake lag, assert positions converge; becomes the feature loop's netcode check._
  - _Mostly built 2026-10-13: `tools/smoke_test.ps1` (host + N bots, pass/fail, 4 and 8 players) in #1, and `tools/spike/run_spike.ps1` + `analyze.py` (fake lag, true-vs-shown errors) in #3. Remaining: pass/fail thresholds on the lag run and wiring it into the loop's VERIFY stage._
  - _Done 2026-10-13: `tools/verify.ps1` ([friendslop-game#4](https://github.com/liammpek16/friendslop-game/pull/4)) runs import, script compile, prop, 4-player smoke and free + sled lag checks against `tools/spike/thresholds.json` (baseline + ~40%); passes 3/3, fails on sabotage (slow snapshots, unsynced boxes, broken script). Wired into VERIFY via the project note's `verify_cmd` ([Admin-Brain#20](https://github.com/liammpek16/Admin-Brain/pull/20), takes effect once merged)._
- [x] M0 gate: decide co-op dependency + confirm engine
  - _Description: rope / shared sled / other; Godot confirmed or switch to Unity now. Write the decision here._
  - _Decided 2026-10-13: **co-op dependency = the shared, host-owned sled** (for now and for testing). **Rope comes back later as a separate item** (soft/cosmetic, or tied to the sled, not a hard link between two players; see the M3 rope goal). **Engine: stay on Godot 4.7** (+ Jolt, GodotSteam). Based on the spike results in friendslop-game `docs/spike/m0-netcode-spike.md` (#3)._

### M1 — Prototype + fun gate (5–8 weeks)
- [x] M1: one-page design doc (pillars, core loop, run shape) + council review
  - _Description: replaces "determine theme and main mechanics". 3 pillars, one-sentence core loop, co-op dependency from M0, 10–25 min runs, win/lose; test the one-line pitch on 3 non-friends._
  - _Done 2026-10-13 ([friendslop-game#5](https://github.com/liammpek16/friendslop-game/pull/5), `docs/design.md`): **Downhill Delivery Co.** A crew rides one sled down a random mountain delivering fragile cargo to the lodge before dark. One pilot; crew grabs trackside pickups, cares for the cargo and fights monsters; 4-seat toboggan (8 seats for 5–8 players). Council-reviewed. Pitch test on 3 non-friends still to do (human)._
- [ ] M1: hand-built 600 m grey-box slope with one checkpoint hut and the bottom lodge
  - _Built 2026-10-13 ([friendslop-game#6](https://github.com/liammpek16/friendslop-game/pull/6), draft): 600 m / 97 m drop from tables (pitch 0–17°, banks, bumps), snaking racing line with gates, trees, 2 jumps, checkpoint at 300 m, both lodges. Collision matches heights to 3 mm. Tick after you've played it._
- [ ] M1: toboggan: pilot seat + crew seats, throw-off / bail / re-board, catch-up on skis
  - _Description: host-owned sled from the M0 spike; pilot steers + brakes, instant local lean animation hides the input delay; sled slows with no pilot; respawn at checkpoint after ~150 m behind._
  - _Built 2026-10-13 (#6): pilot seat 0 steers/brakes/pushes off; E boards nearest free seat, Space bails, hard hits throw riders off, re-board while moving, empty-pilot sled slows to a stop, >150 m behind → respawn ahead with a cone of shame. `tools/run_test.ps1`: 4 bots, forced crash at 200 m, everyone re-boards and delivers (78 s at 0 ms, 93 s at 150 ms). Bail + respawn not bot-tested yet. Tick after you've played it._
- [ ] M1: character controller with ski movement, ragdoll + get-up, floppy camera
- [ ] M1: interaction system: pick up / hold / throw / drop with ownership transfer
- [ ] M1: egg-crate cargo with one care need (re-pad after big bumps) + trackside pickups (~5 items)
  - _Description: cargo can fall off, be carried and thrown back; condition drops from crashes and neglect; pickups grabbed at speed: padding, snowball, flare, frying pan, repair plank._
- [ ] M1: one monster: snow goblin (chases, boards, tries to steal cargo; knocked off with snowballs / frying pan)
  - _Description: host-owned AI like the sled; the crew's combat job._
- [ ] M1: rebindable input map + controller mapping
- [ ] M1: basic proximity voice via Steam Voice + per-player mute
- [ ] M1: Steam invite/join flow under 60 s
- [ ] M1 gate: fun playtest with 2–3 friends (go / re-theme / kill)
  - _Description: human-only. Pass = ≥ 2 of 3 friends ask to play again within a week and ≥ 5 laugh moments in the recording. No money spent before this passes. Then start Discord + devlog + clips._

### M2 — Vertical slice + Steam page (8–12 weeks)
- [ ] M2: seeded procedural mountain from hand-made chunks + determinism test
- [ ] M2: 4 characters on a shared rig + base & ski animations + hats + talking animation
- [ ] M2: art style + first audio pass + 10 objects on the shared object system
  - _Description: toon shader + outline; AI meshes only as cleaned-up starting points; keep an AI-content log for Steam's disclosure._
- [ ] M2: Steamworks account, App ID, store page live as Coming Soon
  - _Description: human-led. Name/trademark check, $100 fee, tax interview, human-made capsule art, trailer; start the business/legal track (LLC decision, bank account)._
- [ ] M2 gate: 3 strangers play a full run unaided

### M3 — Content, hardening + Next Fest demo (10–14 weeks)
- [ ] M3: content to launch cap + clip machine + seed codes/daily mountain
- [ ] M3: rope item: soft/cosmetic rope or a rope tied to the host-owned sled/cargo #item
  - _Description: from the M0 gate. A hard rope between two independently simulated players braked pairs to 10–12 m/s (or yanked them with prediction) at 150 ms in the spike, so build it as a loose, mostly visual link or anchor one end to a host-owned object._
- [ ] M3: online hardening: lobby flow, disconnects, version check, bandwidth test, soak test
- [ ] M3: polish: menus, settings, game feel, controller support
- [ ] M3: security & legal checklist complete
  - _Description: see Appendix 2 of [[friendslop-game-gameplan]]._
- [ ] M3: Steam Playtest rounds + Next Fest demo
  - _Description: gate on wishlists: ≥ 5k launch as planned; 1–5k smaller launch or more marketing; < 1k rethink the hook._

### M4 — Early Access launch (4–6 weeks, then ongoing)
- [ ] M4: Early Access launch + post-launch update plan
  - _Description: $7.99–$9.99, decide Friend's Pass, submit for Steam review before setting a date, EA roadmap on the store page._

## Risks
- Fun can only be judged by human playtests (M1 gate).
- Fast skiing + networked physics; roped players across machines may jitter (M0 spike).
- Scope creep: hold the launch cap and cut list in [[friendslop-game-gameplan]] Part D.
- AI-made art is a reputation risk in this genre; human-finish it and disclose it.
