---
type: cycle
project: friendslop game
stage: implement
status: active
task: determine feasibility with claude
started: '2026-09-04'
readme_source: 'C:/Users/liamm/friendslop-game'
approved: '2026-09-04'
repo: 'C:/Users/liamm/friendslop-game'
commit: 'cb96cb7'
---

## Task (from SELECT)
determine feasibility with claude — first step of `friendslop-game-roadmap`. Goal of the
project: build a game **with Claude** that could eventually be sold on the **Steam store**.

## Project goal — source: n/a
```
_No README found — friendslop game is a not-started project (stub note only). Per the
refine skill, a not-started project's first task is to establish scope/feasibility, not to
refine against an existing goal. So this cycle treats "determine feasibility" as: produce an
honest go/no-go verdict + the constraints that a scope/README must respect._
```

### Context folded into this run (from the session)
- Builder is on **Claude Code / Opus 4.8**, with the Claude 5 family + Haiku 4.5 available —
  strong, current coding models, not a toy setup.
- An **autonomous build loop already exists and ships real software**: the Admin-Brain
  SELECT → REFINE → IMPLEMENT → VERIFY → REVIEW cycle has produced merged PRs across Dota
  Coach, Betting Analysis, Stock Analyzer, Job Hunt. Capability to build non-trivial apps
  with Claude is *demonstrated*, not hypothetical.
- Environment: solo dev, Windows, git, no game engine or art pipeline in place yet.
- "friendslop" ⇒ a cheap, funny, friend-group **multiplayer party/co-op** game (the "slop"
  genre — Jackbox / Among Us / cheap co-op adjacent), not a AAA production.

## Council refinement
_5-persona council: gaps between the task "determine feasibility" and the real goal (a
sellable Steam game built with Claude)._

- **Contrarian:** "Feasible?" is the wrong yes/no. Almost *any* game is technically feasible
  to code with Claude — that's not the risk. The two things that actually kill a friend-group
  Steam game are (1) **fun is not testable** — the loop's VERIFY stage is adversarial *correctness*
  testing; it cannot tell you a game is enjoyable, and Claude can't judge fun either, so "is it
  fun" stays a human, playtest-only signal the loop can't close; and (2) **art + audio + game
  feel**, which Claude does not produce and which is what makes "slop" games either charming or
  actual slop nobody buys. Declaring feasibility without naming these two as the binding
  constraints would be a false green light.
- **First-Principles Thinker:** Break "sell on Steam" into its irreducible gates: **(a)
  engine/code** — solvable, Claude writes Godot/GDScript, Unity/C#, or HTML5/LÖVE fluently;
  **(b) multiplayer netcode** — the genuinely hard bit, *but* Steam gives it away free
  (SteamNetworkingSockets / relay + lobbies via Steamworks), so target Steam's stack and P2P,
  not a hand-rolled server; **(c) assets** — art/sound/music, Claude's weak spot, needs asset
  packs / gen tools / a human touch; **(d) distribution** — Steam Direct: **$100 one-time fee
  per app** (recoupable after $1,000 in sales), a business/tax setup, and a review pass. Each
  gate is individually crossable by a solo dev + Claude. The verdict is **feasible**, and the
  hard gate is (c), then keeping (b) scoped small.
- **Expansionist:** If it's feasible, aim the scope to *compound*. A **local-multiplayer /
  single-screen or web-shareable** first cut sidesteps netcode entirely and still tests "is it
  fun with friends" — the only question that matters — before spending weeks on Steam
  networking. Reuse the Admin-Brain loop as the game's build harness (it already does
  branch/PR/checkpoint), and let each roadmap step (theme → mechanics → vertical slice → Steam
  page → release) be its own cycle. The Steam page ("coming soon") can go up cheap and early to
  test whether *anyone outside the friend group* wants it — wishlists are the real feasibility
  test of the *business*, distinct from the *build*.
- **Outsider:** A player/buyer doesn't care that Claude wrote it. The market reality of the
  "slop" genre: a flood of cheap co-op/party games where **the winners win on a hook + vibe +
  streamability**, not on engineering. Feasibility of *building* ≠ feasibility of *selling*.
  So the feasibility answer must separate the two: **build = clearly yes; sell = conditional**
  on landing a hook and doing the unglamorous Steam-page/marketing/wishlist work, which is
  human effort Claude can assist but not do for you. Don't let a "yes, feasible" hide that the
  selling risk is entirely on the human side.
- **Executor:** Then the deliverable of *this* task is not code — it's a **written feasibility
  verdict + a one-page scope/README** that the next roadmap steps refine against (theme,
  mechanics). Concretely: pick the engine now (recommend **Godot 4** — free, no royalties,
  first-class 2D, native Steam integration via GodotSteam, ideal for solo+AI), name the
  constraint owners (Claude: code/systems/tooling; human: fun playtesting, art/audio
  sourcing, Steam admin), and set the gate for "proceed to build": a throwaway **prototype
  that is fun with 2–3 friends in one sitting**. If that gate fails, kill or re-theme before
  spending on Steam. Ship the verdict, unblock step 2.

## Refined task spec
_A sharpened, branch-sized task._

Produce a **feasibility verdict + minimal scope doc** for friendslop game (no game code yet).
This is a documentation/decision cycle — its output becomes the project README the later
steps refine against.

1. **Verdict (go/no-go), split into build vs. sell:**
   - *Build feasibility:* **GO.** A solo dev + Claude can build a small multiplayer party/co-op
     game. Claude covers engine code, game systems, and tooling; the demonstrated Admin-Brain
     loop can drive the build with branches/PRs/checkpoints.
   - *Sell-on-Steam feasibility:* **GO, conditional.** Technically low-barrier ($100 Steam
     Direct, free Steam networking, Godot no royalties). Commercial success is *not* guaranteed
     and rests on human-side work (a hook, playtested fun, a Steam page, wishlists/marketing) —
     that's the real risk, not the code.
2. **Name the binding constraints** (what feasibility *depends on*):
   - Fun is human-playtest-only — neither Claude nor the loop's VERIFY can judge it. Gate the
     project on a "fun in one sitting with 2–3 friends" prototype before any Steam spend.
   - Art/audio/game-feel are Claude's weak spot — plan asset packs / gen tools / minimal-art
     styles from the start; treat this as the top production risk.
   - Keep netcode scoped: prefer local/same-screen or web-shareable for the first playable, and
     when online is needed, ride **Steam's networking**, not a custom server.
3. **Lock the stack + ownership** so step 2 (theme/mechanics) starts unblocked:
   - Engine: **Godot 4** + **GodotSteam** for Steam integration (recommended; free, no
     royalties, solo+AI friendly). Note Unity/C# and HTML5/LÖVE as fallbacks.
   - Ownership: Claude → code, systems, build tooling, Steamworks integration; Human → fun
     playtesting, art/audio sourcing, Steam Direct account + tax/business setup.
4. **Write it up as `README.md`** at the project repo root (create a repo for friendslop game),
   and set the friendslop-game project note's `repo` + `Summary`, so future `refine` cycles have
   a real goal to analyze against (removes the "no README" block for this project).

## Definition of done
_Clear, testable completion criteria._

- A written feasibility verdict exists (in the friendslop game README) that **explicitly
  separates build-feasibility from sell-feasibility** and gives a clear GO / NO-GO for each
  with the reasoning above.
- The **three binding constraints** (fun = human-only, art/audio = production risk, netcode =
  keep scoped/use Steam's) are named in the doc, each with the mitigation.
- The **engine + Steam integration choice is recorded** (Godot 4 + GodotSteam) with the
  one-line rationale and the named fallbacks.
- **Ownership split** (Claude vs. human) is written down.
- A **go-gate for entering the build phase** is defined: "a throwaway prototype that is fun
  with 2–3 friends in one sitting" — proceed only if it passes.
- The friendslop-game **project note is updated** (`repo` set, `Summary` filled) and a README
  exists at that repo, so the next roadmap step ("determine theme and main mechanics") can be
  refined against a real goal.

**Out of scope (follow-ups / later roadmap steps):** choosing the actual theme & mechanics
(step 2); building any prototype; Steam page creation; account/tax setup. This cycle only
produces the verdict + scope that those steps depend on.

> **Human approval gate:** approve this refined spec before it moves to IMPLEMENT (which here =
> writing the README/scope + creating the repo, not game code). — **Approved 2026-09-04.**

## Implementation
- **Approved** 2026-09-04. This is a bootstrap cycle: the project had no repo, so IMPLEMENT
  here = creating the repo + writing the scope README (not game code). The `implement.js`
  harness (which branches an existing clone) does not apply; the first commit is main by
  necessity for a brand-new repo.
- repo created: `C:/Users/liamm/friendslop-game` (local, git-initialized, `main`)
- README written = the feasibility verdict + scope doc (satisfies the Definition of done)
- project note `friendslop-game.md` updated: `repo` set, `Summary` filled, `Now` = next
  roadmap step. Future `refine` cycles now have a real goal to analyze against.
- commit `cb96cb7` on `main`
- pushed to GitHub (private): https://github.com/liammpek16/friendslop-game — project note
  `repo` set to the GitHub URL so future `refine` cycles fetch the README via `gh`

### Checkpoint log
- 2026-09-04 — repo bootstrapped, README/scope committed (`cb96cb7`), project note updated.
  Definition of done met. **Not yet pushed to a GitHub remote** (external publish — awaiting
  human go-ahead).

### Definition of done — status
- [x] Verdict separates build- vs sell-feasibility with GO/NO-GO — README §Feasibility verdict
- [x] Three binding constraints named with mitigations — README §Binding constraints
- [x] Engine + Steam integration recorded (Godot 4 + GodotSteam) + fallbacks — README §Stack
- [x] Ownership split written — README §Ownership split
- [x] Go-gate for build phase defined — README §Go-gate
- [x] Project note updated (repo + Summary) + README exists — unblocks next roadmap step
