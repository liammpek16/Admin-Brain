---
type: research
project: friendslop game
created: '2026-10-13'
status: approved
approved: '2026-10-13'
source: 'C:/Users/liamm/friendslop-game/docs/gameplan-v2-council.md'
---

# friendslop game — Gameplan v2 (council-revised)

2026-10-13 · Project: [[friendslop-game|friendslop game]] · Roadmap: [[friendslop-game-roadmap]] · Approved over v1 (`friendslop-game/docs/gameplan-v1-guideline.md`)

Gameplan v1 was put through the Admin-Brain 5-persona council (**Contrarian,
First-Principles Thinker, Expansionist, Outsider, Executor**). This version keeps v1's
engine choice and most of its step-level advice, but changes the **shape** of the plan:
fewer, gated **milestones** instead of 12 sequential phases, a **netcode spike** before any
real building, proximity voice and invites moved into the prototype, marketing and business
as **parallel tracks**, and an explicit **cut list**.

---

## Part A — Council findings on v1

### Contrarian: "v1 is still too big, and its riskiest bet is untested"
- **Scope.** 12 phases and 8–14 months is a lot for a first shipped game. Most solo first games
  die in content production, not in coding. v1 has no cut list. → *Add a launch scope cap and
  a post-launch backlog.*
- **The roped-team idea has a hidden netcode trap.** A rope/joint between two players means
  joining two physics bodies **owned by different machines**. Each side corrects the other
  every frame, so it jitters or snaps. Same for players shoving each other. v1 puts these
  in Phase 2 with no early test. → *Do a 1-week **netcode spike** first: two players, fast
  slope, roped together, 150 ms lag. If it can't be made to feel okay, change the co-op
  dependency (e.g. one shared sled owned by the host) **before** designing around it.*
- **You can't review netcode Claude writes**, and VERIFY can't judge it by reading. → *Add
  automated **headless multi-instance tests** (host + 3 bot clients, scripted inputs, fake
  lag) so the loop's VERIFY stage can actually break networking code.*
- **Engine escape hatch.** If Godot's 3D physics/networking blocks the spike, switching to Unity
  costs a week *then* and months *later*. → *Make the engine decision final only after the spike.*

### First-Principles Thinker: "What actually makes this genre work?"
Strip it down: friendslop sells through **clips → streamers → wishlists**, and clips come
from **shared failure + voice + physics**. So the irreducible pieces are:
1. A core loop that produces funny failure.
2. **Proximity voice**: the comedy engine of *Lethal Company*, *R.E.P.O.*, *Content Warning*.
   v1 tests fun (Phase 3) **without it** (Phase 6). That tests the wrong game. → *Basic
   proximity voice moves into the prototype.*
3. Getting 4 friends into one game quickly.
4. A store page that converts a clip into a wishlist.

Everything else (cosmetics, procedural variety, daily seeds, 25 objects, accessibility depth)
multiplies these; it doesn't replace them. v1's "animated character + ragdoll on falls"
choice is correct; **active ragdoll** (*Gang Beasts*-style) would be harder to network and is
rightly avoided.

### Expansionist: "Make every phase also produce marketing"
- **Marketing as a parallel track from the prototype on.** Grey-box physics fails make good
  TikTok/Shorts. Start a Discord and a devlog at the fun gate, not at Phase 11.
- **Built-in clip machine:** auto-capture the last ~10 s before a big crash and let players
  save/share it, plus an end-of-run "funniest moment" replay. This turns every player into a
  marketer and feeds streamers.
- **Shareable seed codes** ("try mountain BANANA-42") and a daily mountain: cheap replay and
  community challenges.
- **Next Fest demo as a real milestone**, not an optional step.
- **Reuse Admin-Brain:** each milestone becomes roadmap goals; VERIFY gets game-specific checks
  (headless bot tests, seed determinism test, bandwidth budget test).
- Post-launch: new mountains/biomes as updates, Steam Workshop later.

### Outsider: "What does a player (or buyer) actually see?"
- **The front door is the invite flow.** If getting 4 friends into a game takes more than
  ~60 s, they'll play something else. v1 polishes this in Phase 7. → *Steam invite / join
  via friends list works in the prototype.*
- **First 5 minutes = the whole sale** (2-hour refund window, streamer attention). No tutorial
  wall; you're on skis and falling over within 30 s.
- **The hook must survive one screenshot.** "Skiing co-op" is a genre; *"roped together,
  hauling a fragile crate down an avalanche"* is a hook. Test the one-line pitch on people
  who aren't your friends.
- **AI art is a reputation risk in this genre.** Some players review-bomb visibly AI-made
  games. Use AI meshes/images as a **starting point**, human-finished, in a consistent style;
  get the capsule art made by a human artist.
- **Steam Deck matters less** for a voice-chat PC friend game; full controller support is
  enough at launch. Deck verification can be post-launch.
- Legal is mostly handled by Steam's defaults; don't let it stall you, but do it before the
  page goes public (name check) and before launch (privacy/licences).

### Executor: "Turn it into gates, time boxes and loop-sized goals"
- Restructure into **5 milestones**, each with a **time box**, a **measurable gate**, and a
  **kill/continue decision**.
- Mark **human-only** work (playtesting, art direction, Steamworks/tax, marketing) so the
  loop doesn't wait on things Claude can't do.
- Add a **budget**, the **first two weeks** as concrete tasks, and write each milestone as
  branch-sized roadmap goals for the Admin-Brain loop.
- Define gate numbers in advance so you can't move the goalposts (see each gate).

---

## Part B — Decisions locked by this plan

| Decision | Choice | Reversible until |
|----------|--------|------------------|
| Engine | **Godot 4** (+ Jolt physics, GodotSteam, netfox if useful). Unity is the fallback; **Unreal ruled out** (Blueprints are binary, so Claude can't edit them). **Confirmed at the M0 gate 2026-10-13 (Godot 4.7.2).** | Decided |
| Networking | Listen-server (one player hosts), Steam lobbies + Steam relay; no rented servers | Never needs to change for co-op |
| Authority | Each player owns their own movement; host owns shared objects, hazards, seed, score | End of M0 spike |
| Co-op dependency | **Shared, host-owned sled** (decided at the M0 gate 2026-10-13, from the netcode spike); rope returns later as an item | Revisit after the M1 fun gate |
| Character physics | Animated controller + ragdoll on big hits (not active ragdoll) | End of M1 |
| Player count | Designed for 4, supports up to 8 | End of M2 |
| Voice | Steam Voice → positional 3D audio, relay-only (never stored) | — |
| Art | Chunky low-poly / toon + outline; Blender + packs + AI-as-starting-point, human-finished | Start of M2 |
| Launch | **Early Access**, $7.99–$9.99 | Pricing until store release |

---

## Part C — The milestone plan

```
M0 Setup + netcode spike ─▶ M1 Prototype + FUN GATE ─▶ M2 Vertical slice + STEAM PAGE
   (2–3 wks)                  (5–8 wks)                   (8–12 wks)
                                                              │
        M4 Early Access launch + live ◀─ M3 Content, hardening + NEXT FEST DEMO
           (4–6 wks + ongoing)              (10–14 wks)

Parallel:  Marketing track  ── starts at M1 gate ───────────────────────────▶
           Business/legal   ── starts at M2 ────────────────────────────────▶
```

Total to Early Access: **~7–11 months** part-time. Each gate has a **kill/continue**.

---

### M0 — Setup + netcode spike · 2–3 weeks

**Goal:** Prove the riskiest technical thing works *before* designing around it.

**Steps**
1. Install Godot 4 (pin one version), Blender, Git LFS, GodotSteam. `.gitignore` the `.godot/`
   cache and `.blend1` autosaves; LFS for `.glb/.png/.wav/.blend`.
2. Do one beginner 3D tutorial yourself (*human*). You need to recognise nodes, signals,
   RigidBody vs CharacterBody before reviewing code.
3. Steam test networking on **App ID 480 (Spacewar)**; lobbies filtered by a custom key.
4. **The spike** (throwaway code): 2–4 capsules on a fast grey-box slope over Steam, with:
   - each player owning their own movement, host owning 5 boxes;
   - **two players joined by a rope**, and the alternative: **one shared sled** owned by host;
   - **clumsy** at 150 ms / 2% loss.
5. **Headless test harness:** launch host + 3 bot clients from a script, play scripted inputs,
   assert positions converge. This becomes the loop's VERIFY tool for netcode.
6. Blender MCP: generate one prop and import it (answers *"can I use Blender with Claude?"*).

**Warnings**
- ⚠️ Spike code is **thrown away**. Don't let it become the game.
- ⚠️ Physics isn't deterministic across machines: exactly one owner simulates each object.
- ⚠️ Never sync ragdoll bones, only root + state.

**Gate (decide in writing):** Which co-op dependency survives the network (rope / shared sled /
other)? Is Godot okay, or switch to Unity now? → *Continue* / *Change mechanic* / *Switch engine*.

---

### M1 — Prototype + FUN GATE · 5–8 weeks

**Goal:** An ugly, online, *funny* prototype that 4 friends can get into in under a minute.

**Steps**
1. **One-page design** (`docs/design.md`): 3 pillars, one-sentence core loop, the co-op
   dependency chosen in M0, run length (10–25 min), win/lose, what changes per run. Re-run
   the council on it. Test the one-line pitch on 3 non-friends (*human*).
2. **Character controller:** walk/sprint/jump/crouch + ski lean/carve/tuck/brake; ragdoll on
   big hits, get-up; floppy third-person camera.
3. **Interaction system:** one interact ray; objects declare holdable/usable/throwable;
   ownership moves to the holder. Pick up / hold (wobbly joint) / throw (charge) / drop.
4. **Input map** (rebindable from day one): WASD move · Space jump · Shift sprint ·
   E interact · LMB grab · RMB throw (hold to charge) · Q drop · Ctrl tuck/crouch ·
   V push-to-talk (optional) · Tab players/emotes. Controller mapping in parallel.
5. **Basic proximity voice** (pulled from v1 Phase 6): Steam Voice → AudioStreamPlayer3D on the
   speaker's character; per-player mute from day one.
6. **Invite flow:** host → Steam invite / join from friends list → in game. Under 60 s.
7. Grey-box mountain (hand-built, not procedural yet), ~5 objects, a goal (the lodge).
8. Debug overlay: ping, object owners, bytes/sec.
9. **Fun gate playtest** (*human*): 2–3 friends, 45–60 min, recorded with OBS. Watch, don't
   explain. Ask: funniest moment? when bored? play again tomorrow?

**Warnings**
- ⚠️ Friends are polite. Unprompted "can we play again?" is the only real signal.
- ⚠️ Claude's netcode can pass on one PC and fail under lag. Nothing is "done" until the
  headless bot test + clumsy pass.
- ⚠️ No art, no cosmetics, no procedural generation yet.

**Gate (numbers set now):** ≥ 2 of 3 friends ask to play again within a week **and** ≥ 5
"laugh moments" in the recording. → *Continue* / *Re-theme (back to M1 step 1)* / *Kill*.
**No money spent before this passes.**

**Marketing track starts here:** Discord server, a devlog post, 3 short clips of the funniest
grey-box moments.

---

### M2 — Vertical slice + STEAM PAGE · 8–12 weeks

**Goal:** One complete, good-looking run that you'd put in a trailer, and a live store page.

**Steps: world**
1. **Procedural mountain from hand-made chunks:** ~12–15 chunks (slopes, jumps, cliffs, trees,
   crevasses) stitched in seeded order + random props/hazards. Host sends the seed.
2. **Seed determinism test** in VERIFY: same seed → identical mountain on every client (no
   unseeded random calls anywhere in generation).
3. 2–3 hazards (avalanche, ice, wind).

**Steps: characters & animation**
4. **4 characters** on one shared humanoid rig (readable silhouettes, named, with personality).
5. Mixamo base set (idle/walk/run/jump/fall/get-up/crouch) + Blender-made ski set
   (tuck/carve/brake/crash); IK hands for carrying; animation ↔ ragdoll blend.
6. Hats as bone attachments (the only cosmetic system at launch).
7. Talking animation driven by voice volume (mouth flap/head bob).

**Steps: look & sound**
8. Lock the art style: toon shader + outline. AI meshes as starting points only, cleaned up,
   consistent. Keep an **AI-content log** (needed for Steam's disclosure).
9. First audio pass: skis per surface, impacts, wind, ragdoll sound, music loop.
10. ~10 objects on one shared component-based object system, each with a funny failure mode.

**Steps: Steam (human-led, Claude assists)**
11. Name + trademark check. Steamworks account, **$100 app fee**, tax interview, bank info →
    own App ID (replace 480).
12. Store page: **human-made capsule art**, 5+ screenshots, 30–60 s trailer with the funniest
    moment in the first 5 s, tags, AI disclosure. Publish as **Coming Soon**.

**Business/legal track starts:** sole proprietor vs LLC decision, separate bank account,
set aside tax on future income.

**Warnings**
- ⚠️ AI-generated meshes need topology/UV/rig clean-up and have licence terms (commercial use,
  territory limits). Check every tool's licence.
- ⚠️ Performance target now: 60 fps with 4 players on a mid-range PC (GTX 1060-class).
- ⚠️ Mixamo animations can't be redistributed as raw files.

**Gate:** 3 people who aren't your friends play a full run for 30 min with no help; store page
live. → *Continue* / *Cut scope*.

---

### M3 — Content, hardening + NEXT FEST DEMO · 10–14 weeks

**Goal:** Enough content for a launch, online play that survives real life, and a demo at
Steam Next Fest.

**Steps: content (launch scope cap: see Part D)**
1. Objects to ~20, hazards to ~6, chunks to ~25, 4–6 characters, ~20 hats.
2. **Clip machine:** auto-save the last ~10 s before big crashes + end-of-run "funniest
   moment" replay. **Shareable seed codes** + daily mountain.
3. Extra voice features: walkie-talkie item, muffled when buried/ragdolled, cave echo.

**Steps: online hardening (the "how servers work" phase, explained in Appendix 1)**
4. Lobby flow: host → invite → character select → ready → start. Version check.
5. Disconnects: client drops → character goes limp; **host leaves → run ends cleanly**
   (no host migration). Late join = lobby/spectate only.
6. Bandwidth budget test in VERIFY: < ~50 KB/s per player at 8 players.
7. 1-hour soak test with 4 players in different homes (*human*).

**Steps: polish**
8. Menus + settings (graphics, audio, voice device/volume, open mic vs push-to-talk,
   rebinding, FOV, sensitivity, camera shake off, subtitles for key sounds).
9. Game feel: screen shake, slow-mo on big crashes, impact particles.
10. Full controller support.

**Steps: security & legal (proportionate; details in Appendix 2)**
11. Friends-only/invite-only lobbies by default; host validates important events; reject
    malformed network messages (fuzz the message parser in VERIFY).
12. Privacy policy (only if collecting crash logs/analytics), voice notice, licences/credits
    file, Steam's standard EULA.

**Steps: playtests & demo**
13. **Steam Playtest** rounds: friends → friends-of-friends → open sign-ups. In-game feedback
    button + Discord + 3-question survey. Fix the top 3 issues per round.
14. **Demo** (one short mountain) for the next **Steam Next Fest**; push clips + streamer keys
    in the 2 weeks before.

**Warnings**
- ⚠️ Polish expands forever. Time-box it inside this milestone.
- ⚠️ Assume playtest footage goes public.
- ⚠️ Any crash/analytics upload → privacy policy required (GDPR/CCPA basics).

**Gate:** Demo shipped at Next Fest; wishlists counted. Rough guide: **≥ 5k wishlists** →
launch as planned; **1–5k** → launch smaller/cheaper or do another marketing push;
**< 1k** → rethink the hook before launching.

---

### M4 — Early Access launch + live · 4–6 weeks, then ongoing

**Steps**
1. Price **$7.99–$9.99** (genre norm), launch discount ~10–20%. Decide on a **Friend's Pass**
   (one owner hosts, friends play free) vs plain sales.
2. Submit build + page for Steam review **before** setting a date (review takes days).
3. Launch week: streamer keys, clips, Discord events, reply to every review early on.
4. Early Access roadmap posted on the store page: what's coming (new mountains, objects).
5. Patch cadence (e.g. hotfixes in week 1, then a content update every 4–6 weeks).
6. Post-launch backlog (Part D).

**Warnings**
- ⚠️ 2-hour refund window: the first 2 hours must deliver.
- ⚠️ Early Access means you **must** keep updating; abandoned EA games get punished in reviews.
- ⚠️ Steam takes 30%; income is taxable. Set aside a share of every payout.

---

## Part D — Launch scope cap & cut list

**At launch (cap):** 1 biome (one mountain range) · ~25 chunks · 4–6 characters · ~20 hats ·
~20 objects · ~6 hazards · proximity voice + walkie-talkie · clip machine · seeds + daily
mountain · 1–8 players · keyboard + controller.

**Cut to post-launch backlog:** extra biomes · full cosmetic economy/unlock progression ·
achievements · Steam Workshop/mod support · Steam Deck Verified · host migration · PvP or
sabotage modes · leaderboards (these bring cheating concerns) · localisation beyond English ·
console ports.

---

## Part E — Budget (rough)

| Item | Cost | When |
|------|------|------|
| Godot, Blender, Mixamo, GodotSteam, Git LFS (within quota) | $0 | M0 |
| Asset packs (Kenney/Quaternius free; Synty-style paid packs optional) | $0–300 | M2 |
| AI mesh/sound tools (optional subscriptions) | $0–30/mo | M2–M3 |
| Steam Direct app fee (recouped after $1k sales) | $100 | M2 |
| Capsule art by a human artist | $300–1,500 | M2 |
| Trailer editing (DIY or freelancer) | $0–800 | M2/M3 |
| LLC (optional, state-dependent) | $50–500 + yearly fee | M2 |
| Lawyer consult before launch (optional, recommended) | $150–500 | M3 |
| **Total** | **~$100 minimum, ~$1–3.5k comfortable** | |

---

## Part F — First two weeks (concrete)

1. Install Godot 4 (pin version), GodotSteam, Blender, Git LFS; set up `.gitignore` /
   `.gitattributes` in `friendslop-game`. *(Claude + you)*
2. Do one Godot 3D beginner tutorial. *(you)*
3. Two instances connect through Steam App 480 lobby on one PC, then two PCs. *(Claude)*
4. Spike scene: fast slope, capsules, 5 host-owned boxes, rope vs shared-sled test. *(Claude)*
5. Headless host + 3 bots test script. *(Claude)*
6. Run with clumsy at 150 ms; record a video of both co-op options. *(you)*
7. Write the M0 gate decision into the vault. *(you + council)*

---

## Part G — Ownership

| Work | Owner |
|------|-------|
| Engine code, netcode, tools, tests, procedural generation, Steamworks integration | **Claude** (Admin-Brain loop) |
| Blender modelling/rigging with Blender MCP | **Claude drafts, you finish/approve** |
| Fun judgement, playtests, art direction, game feel tuning | **You** |
| Steamworks account, tax, bank, LLC, legal sign-off | **You** |
| Capsule art, trailer, marketing, Discord, streamer outreach | **You** (Claude drafts copy/scripts) |

---

## Appendix 1 — How the "servers" work (plain English)

- **You don't rent servers.** One player's game is the **host**; everyone else connects to it.
  If the host quits, the run ends.
- **Steam lobbies** are the matchmaking: invite a friend, join from the friends list.
- **Steam relay (Steam Datagram Relay)** carries the traffic through Valve's network: it
  gets through home routers and **hides players' IP addresses**. Free.
- **Authority:** the host is the truth for shared stuff (objects, hazards, score, the seed).
  Each player is the truth for their own character's movement (fine for friends co-op).
- **Updates** go out ~20–30 times a second; other players' characters are **interpolated**
  (smoothly moved between updates) so they don't stutter.
- **RPCs** = one-off events ("player died"); **state sync** = continuous (positions).
- **Physics:** each object is simulated by exactly one machine (its owner); everyone else
  copies it. Ragdoll limbs are simulated locally on each machine and never sent.
- **Testing:** multiple instances on one PC → two PCs on LAN → friends in other homes;
  always with fake lag (clumsy).

## Appendix 2 — Security & legal checklist

- [ ] Friends-only lobbies by default; IPs hidden via Steam relay
- [ ] Host validates gameplay-critical events; clients can't declare wins/spawns
- [ ] Network message parser rejects malformed/oversized packets (fuzzed in VERIFY)
- [ ] Version mismatch rejected with a clear message
- [ ] Per-player voice mute; voice relayed, never stored
- [ ] Steam standard EULA
- [ ] Privacy policy (if any crash logs/analytics); GDPR/CCPA basics
- [ ] Licences/credits file (Godot MIT notice, GodotSteam, assets, fonts, sounds)
- [ ] AI-content log + Steam AI disclosure
- [ ] Game name/trademark check before the page goes public
- [ ] No copyrighted characters/songs/brands
- [ ] Steam content survey (maturity rating)
- [ ] Business structure, tax ID, Steam tax interview, separate bank account
- [ ] Optional: 1-hour games/IP lawyer consult before launch *(this plan is guidance, not legal advice)*

---

## Part H — Candidate roadmap goals (Admin-Brain, branch-sized)

- [ ] M0: install & configure Godot 4 + GodotSteam + Git LFS; two instances connect via Steam App 480
- [ ] M0: Blender MCP test: generate and import one prop
- [ ] M0: netcode spike: fast slope, owned movement, host-owned boxes, rope vs shared-sled under 150 ms lag
- [ ] M0: headless host + 3 bot clients test harness for VERIFY
- [ ] M0 gate: decide co-op dependency + confirm engine
- [ ] M1: one-page design doc (pillars, core loop, run shape) + council review
- [ ] M1: character controller with ski movement, ragdoll + get-up, floppy camera
- [ ] M1: interaction system: pick up / hold / throw / drop with ownership transfer
- [ ] M1: rebindable input map + controller mapping
- [ ] M1: basic proximity voice via Steam Voice + per-player mute
- [ ] M1: Steam invite/join flow under 60 s
- [ ] M1 gate: fun playtest with 2–3 friends (go / re-theme / kill)
- [ ] M2: seeded procedural mountain from hand-made chunks + determinism test
- [ ] M2: 4 characters on a shared rig + base & ski animations + hats + talking animation
- [ ] M2: art style + first audio pass + 10 objects on the shared object system
- [ ] M2: Steamworks account, App ID, store page live as Coming Soon
- [ ] M2 gate: 3 strangers play a full run unaided
- [ ] M3: content to launch cap + clip machine + seed codes/daily mountain
- [ ] M3: online hardening: lobby flow, disconnects, version check, bandwidth test, soak test
- [ ] M3: polish: menus, settings, game feel, controller support
- [ ] M3: security & legal checklist complete
- [ ] M3: Steam Playtest rounds + Next Fest demo
- [ ] M4: Early Access launch + post-launch update plan
