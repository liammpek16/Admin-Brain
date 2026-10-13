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
- [ ] M0: install & configure Godot 4 + GodotSteam + Git LFS; two instances connect via Steam App 480
  - _Description: pin one Godot version; .gitignore the .godot cache and .blend1 autosaves; LFS for .glb/.png/.wav/.blend; lobby filtered by a custom key. Also do one Godot 3D beginner tutorial yourself (human)._
- [ ] M0: Blender MCP test: generate and import one prop
  - _Description: answers the old goal "can I use Blender with Claude to generate models?"_
- [ ] M0: netcode spike: fast slope, owned movement, host-owned boxes, rope vs shared-sled under 150 ms lag
  - _Description: throwaway code. Each player owns their movement, host owns shared objects; compare two players roped together vs one host-owned sled with clumsy at 150 ms / 2% loss._
- [ ] M0: headless host + 3 bot clients test harness for VERIFY
  - _Description: scripted inputs + fake lag, assert positions converge; becomes the feature loop's netcode check._
- [ ] M0 gate: decide co-op dependency + confirm engine
  - _Description: rope / shared sled / other; Godot confirmed or switch to Unity now. Write the decision here._

### M1 — Prototype + fun gate (5–8 weeks)
- [ ] M1: one-page design doc (pillars, core loop, run shape) + council review
  - _Description: replaces "determine theme and main mechanics". 3 pillars, one-sentence core loop, co-op dependency from M0, 10–25 min runs, win/lose; test the one-line pitch on 3 non-friends._
- [ ] M1: character controller with ski movement, ragdoll + get-up, floppy camera
- [ ] M1: interaction system: pick up / hold / throw / drop with ownership transfer
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
