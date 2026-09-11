---
type: report
project: Dota Coach
task: >-
  determine feasibility of recreating video animations of fights with .dem data
  using real character models and animations.
date: '2026-09-11'
cycle: 2026-09-11-determine-feasibility-of-recreating-video-animations-of-figh
---

# Feasibility report — 3D fight recreation from `.dem` (Dota Coach)

**Task:** determine feasibility of recreating video animations of fights with `.dem` data using real character models and animations.
**Branch:** `auto/determine-feasibility-of-recreating-video-animations-of-figh` (spike POC — preserved, **not** merged).
**Bottom line:** technically feasible for the *render pipeline* (spike proves it), but **DEFER / lean no-go** on shipping it — real animations aren't in the replay, real models are an IP risk, effort is weeks–months, and the coaching uplift over the existing 2D view is marginal.

## 1. Data sufficiency — what the `.dem` gives vs. needs
What the manta parse extracts **today** (already feeds the shipped 2D playback):
- Position + elevation: `m_cellX/Y/Z` + `m_vecX/Y/Z` (tile coords), per tick.
- HP/mana (+ maxes); the combat log: casts (src/tgt/ability), damage, deaths, modifiers/disables with durations.

What recreation additionally needs:
- **Facing/orientation** — *not* currently pulled, but soluble two ways: `m_angRotation` (entity yaw) is in the replay and extractable via a small manta addition, **and** facing can be derived from velocity (the spike does exactly this and it reads fine). → solved input.
- **Animation state** — *the crux, and it's a hard "no".* Source 2 does **not** serialize the playing animation into the `.dem`. Animations are produced client-side by each unit's **animgraph** from parameters + gameplay events; the replay carries the events/params, not baked animation. So you cannot read the real animation out — you either **reconstruct/approximate** it (map locomotion → walk/run clips, and combat-log casts/attacks/deaths → matching clips) or **replay in-engine** to get the genuine article.

**Finding:** positions ✓, elevation ✓, events ✓, facing ✓ (derivable/extractable) — literal in-game animation ✗ (approximate, or go in-engine). "Real animations from `.dem` data" as literally worded is **not** achievable outside the game client.

## 2. Assets + legal
Real hero models are Valve **Source 2** assets (`.vmdl`/`.vmesh`/`.vanim`/`.vtex`) in the game files, extractable via community tooling (VRF / Source2Viewer) → glTF/GLB + textures (and `.vanim` clips). Technically doable.
**But** they are Valve's copyrighted assets. Extraction for local/personal use is routine; **redistributing/shipping them inside a (revenue-generating) product is a real IP exposure** — the same class of decision already flagged for the minimap art in PR #24, and a bigger surface (full models + textures + animations). This is a business/legal call, not a technical one, and it **gates the whole web path**. Legal-but-off-spec alternative: generic non-Valve stand-in models (breaks the "real character models" requirement).

## 3. Rendering paths compared
| Path | Fidelity | Automatable | Embeddable in webapp | Legal | Verdict |
|---|---|---|---|---|---|
| **A. Native client capture** (`playdemo` + scripted camera + screen-capture) | Perfect (real models, real anims, real VFX) | Partial (console scripting; brittle; needs a Dota-installed GPU box) | No — produces offline video only | Cleanest (uses the actual game; no asset redistribution) | Best for occasional cinematic clips |
| **B. Custom web 3D** (three.js + extracted glTF + approximate clips) — *the spike* | Medium (approx anims, no spell VFX unless built) | Yes | **Yes** (same webapp as the 2D view) | Asset-shipping risk (§2) | Only if embedded 3D is a real differentiator |
| **C. Offline SFM / manual** | High | No | No | n/a | Not viable per-fight/per-user |

## 4. Spike result (option B, de-risking)
Built `dota_coach/docs/fight_3d_spike.html` (three.js r128): a 3D scene with **10 articulated humanoid models** (procedural placeholders for extractable `.vmdl`→glTF hero models), using **real hero names + death timing** from match `8979797378`'s 29:00 fight, driven along synthesized motion tracks with **velocity-derived facing** and procedural **walk / idle / cast / death** animation clips, plus a Radiant/Dire/river ground, orbit camera, and a timeline scrub.
Ran it in-browser (served over HTTP): THREE loaded, **no console errors**, all 10 models render and animate, dead heroes fall/fade on schedule (e.g. Ursa at ~12s), camera orbits, scrub works.
**Proves:** the web-3D pipeline (3D scene + per-hero models + position-driven motion + facing + event-driven animation clips) is feasible in the existing stack.
**Deliberately stubs:** real positions (already solved by the shipped 2D parse) and real Valve models (the §2 IP question). So the spike de-risks the *rendering*, which was the only genuinely unproven half.

## 5. Effort
- **Option B → rough-but-real 3D playback:** ~2–4 weeks — an extraction pipeline for the ~124 heroes (→ glTF + textures), a model loader/cache, an animation-clip library + event→clip mapping, camera, and perf tuning.
- **Option B → polished** (spell VFX, accurate anims, terrain): months; effectively rebuilding a slice of the game renderer.
- **Option A → scripted-camera capture prototype:** days, but yields offline videos and needs a Dota-installed render box.

## Recommendation — DEFER (lean no-go for now)
Feasible, but not worth building **now**: (1) literal animations aren't in the `.dem` — you approximate or go in-engine; (2) shipping real Valve models is an unresolved IP risk on a revenue product; (3) effort is weeks→months; (4) marginal *coaching* uplift over the already-shipped, legally-clean **2D tactical playback**, which already conveys the positioning / target-priority / vision that coaching actually acts on.
If revisited, in order: **(a)** resolve the model-licensing question first — it gates everything; **(b)** add `m_angRotation` to the manta parse (cheap; also improves the 2D view); **(c)** prototype **path A** (native capture) for occasional cinematic highlight clips *before* committing to the multi-week embedded-web-3D path B. Reach for B only if an interactive 3D view becomes a deliberate product differentiator.

## Verdict
**Feasibility DETERMINED (DoD met).** All four dimensions answered with concrete findings, the spike converted the render question from opinion to evidence, and the recommendation is decision-ready: **defer**, with a clear conditional path if pursued. No Valve assets were committed; the app is unchanged; the spike lives only on its (unmerged) branch.
