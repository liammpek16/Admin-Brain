---
type: cycle
project: Dota Coach
stage: done
status: done
verdict: pass
report: 2026-09-09-improve-fight-video-playback-batch
commit: 1858efe
pr: https://github.com/liammpek16/dota-projects/pull/22
fix_pr: https://github.com/liammpek16/dota-projects/pull/23
merged: '2026-09-09 (PR #22 merged; PR #23 fix follow-up open — user to merge)'
task: >-
  Improve the fight video playback (batched cycle of 4 roadmap goals): (1) fight
  time window 30s-before-start to fight-end; (2) smooth hero motion + map zoom;
  (3) small ability-cast animations; (4) Dota-minimap-style map background.
started: '2026-09-09'
batch: true
readme_source: 'https://github.com/liammpek16/dota-projects'
target_path: 'C:/Users/liamm/Scripts'
branch: auto/improve-fight-video-playback
---

## Task (from SELECT)
Four roadmap goals, all under "improve the video playback for each fight", run as ONE
batched cycle because they all touch the SAME fight-playback engine
(`webapp/index.html` `setupFightAnim` / `fightFrameSVG`, and the frame source in
`replay.py attach_frames`). Separate branches would self-conflict on the same
functions — same rationale as the earlier goals-board UX batch (PR #14).

1. **Time window** — change the fight playback to start **30 seconds before the fight
   starts** and end **exactly when the fight ends** (`#improvement`).
2. **Smooth motion + zoom** — smooth out each hero's motion within the fight; allow
   **zooming into the map** to see the distancing between heroes (`#improvement`).
3. **Ability animations** — add **small animations for each ability cast** in the fight
   (`#improvement`).
4. **Minimap background** — add a **background to the fight map that looks like the Dota
   minimap** (`#improvement`).

## Project goal — source: https://github.com/liammpek16/dota-projects
Grow Dota Coach into a reliable, trustworthy, revenue-generating coaching platform. The
per-fight tactical playback is the visual heart of the coaching UI; these four goals make
it read like a real replay review rather than a stuttering dot map. All are marked
long-term/polish on the roadmap (`Per-fight video playback — long · low (stretch)`), so the
bar is "clearly better, no regression to the coaching read", not "frame-perfect esports UI".

## Council refinement
**Grounding (from code):**
- Frames are built server-side in `replay.py attach_frames(fights, snaps, meta, events, pad=3.0)`:
  for each fight it samples position snapshots where `start-pad <= t <= end+pad` (currently
  ±3s) into `f["frames"] = [{time, heroes:[{hero,x,y,hp,max_hp,mana,max_mana,alive,is_yours}]}]`,
  then `_attach_frame_overlays` folds combat events onto the **nearest** frame (`casts`, `dmg`,
  `disabled`). `enrich_fights_with_positions` (replay.py ~788) also limits the combat-log parse
  to `windows = [(time-6, end+6)]`.
- The player renders in `webapp/index.html`: `setupFightAnim(f, frames)` runs a
  `setInterval(..., 350ms)` that steps `anim.idx` through discrete frames and calls
  `fightFrameSVG(frames[idx], f)` which rebuilds the whole `<svg viewBox="0 0 100 100">`
  each tick (heroes via `imgMarker`, HP/mana bars, ward vision, cast labels as `<text>`,
  floating dmg). Background is `mapBackgroundSVG()`. A scrub `<input type=range>` + play/pause
  + `#faClock` already exist. `mapXY(h)` maps world coords → the 0..100 SVG box.

- **First-Principles** — The four goals are independent layers over one render loop, so the
  cheapest correct design is: (a) fix the **data window** once (goal 1, server), then (b) make
  the client **time-driven** instead of frame-index-driven (a `requestAnimationFrame` clock over
  a playback window), which is the single change that unlocks goals 2 & 3 (interpolation between
  samples, and time-anchored ability animations that decay). Goal 4 is an independent visual
  swap of `mapBackgroundSVG()`. Keep it **front-end-only except goal 1**.
- **Contrarian** — Don't over-build: no video codec, no canvas/WebGL rewrite, no new deps.
  SVG + rAF is enough at this scale (≤10 heroes, tens of seconds). Zoom must not break the
  existing scrub/click-hero interactions or reduced-motion. Interpolation must be **linear
  between real samples only** — never invent positions past a hero's death or outside the window
  (no fabricated coaching signal). Keep the discrete combat events (casts/dmg/disables) anchored
  to their real event time, not smoothed.
- **Executor** — Reuse what exists: keep `fightFrameSVG`'s marker/vision/bar builders; add a
  `fightSceneSVG(atTime, f, frames)` that computes each hero's interpolated position at `atTime`
  and a viewBox for zoom, reusing the same sub-renderers. Drive it from one rAF loop that also
  updates the scrub + clock. Zoom = a pointer-wheel / +/- control that narrows the `viewBox`
  and clamps to the map; pan by drag. Ability animation = a short-lived expanding ring + label
  keyed on cast events within a ~0.9s window of `atTime`.
- **Expansionist** — While reworking the window, expose the pre-roll visually (a subtle "−30s …
  fight start" so the user understands the lead-in), and keep the clock showing real match time.
  Persist zoom level per session is optional (skip for v1).
- **Outsider (safety)** — Must degrade cleanly: **reduced-motion** users still get a static
  first frame + working scrub (no rAF autoplay); a fight with **no frames** still shows the
  snapshot; a fight with **one frame** must not divide-by-zero in interpolation; zoom clamped so
  you can't lose the map; nothing here touches the coaching read / verdict logic or the server's
  `replay_status` / ward-vision fallback. $0, no LLM, no new deps.

## Refined task spec
Branch `auto/improve-fight-video-playback` in `C:/Users/liamm/Scripts` (off `main`).

**Goal 1 — fight time window (server, `dota_coach/replay.py`)**
- Change `attach_frames` so the sampled window is **[start − 30s, end]** instead of
  `[start − pad, end + pad]`. Add a `pre_roll: float = 30.0` param (keep a small/zero tail);
  select frames with `start - pre_roll <= t <= end`.
- Widen the combat-log parse window in `enrich_fights_with_positions` to cover the pre-roll
  (`(time - 30, end)` — keep a tiny guard) so casts/damage in the lead-in are available.
- Overlay-mapping (`_attach_frame_overlays`) already keys off the frames' own times, so it
  follows automatically. No schema change to a frame.

**Goal 2 — smooth motion + zoom (front-end, `webapp/index.html`)**
- Replace the frame-index `setInterval` in `setupFightAnim` with a **time-based rAF clock**
  spanning `[frames[0].time, frames[last].time]` (playback speed ≈ real-time, keep a speed
  that isn't painfully slow — e.g. 1× with a small multiplier if too slow). Play/pause and the
  scrub now map to **time**, not index; `#faClock` shows real match time.
- Add `fightSceneSVG(atTime, f, frames)` that, per hero, finds the two bracketing samples and
  **linearly interpolates x/y** (and hp/mana for smooth bars); a hero that is dead / has no
  sample at `atTime` renders exactly as today (no invented position).
- **Zoom**: a `viewBox` computed from a zoom factor + center; wheel to zoom, +/−/reset buttons,
  drag to pan; clamp so the map stays in view. Ward vision, HP bars, labels all scale with the
  viewBox (they already use user units). Default view = full map (0 0 100 100), i.e. no visual
  change until the user zooms.

**Goal 3 — ability-cast animations (front-end)**
- For cast events near `atTime` (within a short window, e.g. `atTime-0.1 .. atTime+0.8s`), draw
  a **short expanding/fading ring** at the caster plus the existing ability label, so a cast
  visibly "pops" instead of a static text flash. Purely visual, driven by the same event data
  already on the frames (`casts`); decays over its window so it doesn't linger.

**Goal 4 — minimap background (front-end)**
- Replace/augment `mapBackgroundSVG()` with a **Dota-minimap-style** background: the diagonal
  river, the two triangular base corners (Radiant SW green / Dire NE red), lane lines, and a
  darker jungle fill — drawn as inline SVG shapes/gradients (no external image, no new dep).
  Must sit **behind** heroes/vision/overlays and scale with the zoom viewBox.

Constraints (all goals): $0, no LLM, no new deps, front-end changes stay `webapp/index.html`;
server change stays `dota_coach/replay.py`. Do not alter the coaching-read verdict logic,
`replay_status`, or the ward-vision fallback.

## Definition of done
- **Goal 1:** for a parsed fight, `f["frames"]` starts ~30s before `fight.time` and ends at
  `fight.end` (no long tail); the lead-in frames contain heroes; a unit check on `attach_frames`
  confirms the window bounds and that a synthetic snapshot 25s before start is included while one
  20s after end is excluded.
- **Goal 2:** playback is visibly smooth (heroes glide between samples, not teleport per 350ms
  tick); the scrub and clock track real match time; zoom in/out + pan work and clamp to the map;
  a single-frame fight and a no-frames fight both render without error; reduced-motion still
  yields a static first frame + working scrub (no autoplay).
- **Goal 3:** casting an ability shows a brief animated ring + label at the caster that fades;
  no lingering artifacts; casts still map to the correct hero/time.
- **Goal 4:** the map reads like the Dota minimap (river diagonal, Radiant/Dire corners, lanes)
  behind the action, in both default and zoomed views; heroes/vision/overlays remain legible.
- **No regression:** coaching read card, per-hero spell panel, ward vision, death list, and the
  positions/`replay_status` fallback all unchanged; DEMO mode still plays a fight.
- Verified by `node --test` (or equivalent) on the pure functions (window math, interpolation,
  viewBox clamp) + a real-browser drive of the playback (localhost) with no console errors.
- Draft PR opened only after the user approves; `main` untouched throughout.

## Implementation
- branch: `auto/improve-fight-video-playback` in `C:/Users/liamm/Scripts` (off `main`) — never touches main
- files: `dota_coach/replay.py` (goal 1), `dota_coach/webapp/index.html` (goals 2-4)

### Checkpoint log
- 2026-09-09 — `1858efe` — all 4 goals:
  - **G1** `attach_frames(pre_roll=30, tail=0)` → window `[start−30, end]`; combat-log parse
    window widened to `(time−32, end+2)`.
  - **G2** time-driven player: `heroesAt()` interpolation, `faViewBox()` zoom, rAF loop +
    scrub/clock in real match time; wheel-zoom-to-cursor, +/−/reset, drag-to-pan; markers
    scale-constant (`k=side/100`).
  - **G3** `fightSceneSVG()` folds timed cast/dmg events → expanding fading cast ring + label;
    damage numbers drift + fade.
  - **G4** `mapBackgroundSVG()` redrawn as a Dota-style minimap (river, halves, lanes+towers,
    bases, Roshan); real-PNG overlay kept.
- 2026-09-09 — follow-up (same session, pre-verify): switched the clock from `requestAnimationFrame`
  to a timestamp-driven `setInterval(40ms)` (rAF doesn't fire in the test pane and is less
  universal); gated the `/static/dota_map.png` overlay behind a one-time `Image` probe to stop a
  per-tick 404 flood.

## Verify
Verdict **PASS** — 33/33 automated (G1 window ×3, pure fns ×17, SVG output ×13) + live
real-browser drive (autoplay advances, scrub/clock in match time, zoom/pan, cast ring, minimap,
no error flood). No regression to coaching read / spell panel / ward vision / replay_status.
Full report: [[2026-09-09-improve-fight-video-playback-batch]] (Reports).

## Review (human gate)
Draft PR NOT yet opened — awaiting user approval to publish (per the publish gate). On approval:
open a draft PR from `auto/improve-fight-video-playback` into `main`, then on merge tick the 4
roadmap goals.
