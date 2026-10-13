---
type: report
project: Dota Coach
cycle: 2026-09-09-improve-fight-video-playback-batch
stage: verify
verdict: pass
date: '2026-09-09'
---

# VERIFY — Improve fight video playback (4-goal batch)

Independent verification of branch `auto/improve-fight-video-playback` (commit `1858efe`
plus follow-ups), Dota repo `C:/Users/liamm/Scripts`. Server change: `dota_coach/replay.py`;
front-end: `dota_coach/webapp/index.html`.

## Method
- Deterministic unit tests (Python + Node), run against the REAL source (the inline webapp
  script is VM-loaded with DOM/window stubs — the reliable headless pattern here).
- Live real-browser drive of the demo webapp (`--demo` on :8099, `localhost` not 127.0.0.1)
  through the actual app flow: load charts → `loadPositions()` (merges 12 frames/fight) →
  `openFightAnalysis()` → play/scrub/zoom.

## Results — 33/33 automated + live drive

**Goal 1 — fight time window (`attach_frames`)** — 3/3
- Window is exactly `[start−30, end]` (verified `[570, 612]` for a fight 600→612), **no
  post-end tail**; lead-in frames carry heroes; a single-frame fight does not error.

**Goal 2 — smooth motion + zoom** — pure-fn 17/17, live confirmed
- `heroesAt()` linearly interpolates x/y/hp/mana between real samples (midpoint x=5,y=10,
  hp=80); clamps to first/last outside the window; empty→[]; single-frame safe; a dead hero
  is not interpolated to a live position.
- `faViewBox()` zoom clamps to the map on all four edges and at deep zoom.
- LIVE: autoplay advances by real elapsed time (Δt≈1.09s over 700ms at FA_SPEED 1.6), the
  clock shows real match time (7:59), pause holds the frame + flips the label, the scrub maps
  to time, wheel-zoom offsets the viewBox toward the cursor, +/−/reset buttons work.

**Goal 3 — ability-cast animations** — SVG-output 13/13, live confirmed
- A cast within its ~0.9s window renders an expanding, fading purple ring (`#b98cff`) + the
  ability label over the caster; gone after the window; damage numbers drift up and fade.

**Goal 4 — minimap background** — covered by SVG-output tests, live confirmed
- `mapBackgroundSVG()` renders the river diagonal, Radiant/Dire tinted halves + bases,
  ≥3 lane polylines with tower dots, Roshan pit, and Radiant/Dire labels; the optional real
  `/static/dota_map.png` overlay is kept behind a one-time probe.

**Scale-constant markers:** when zoomed in, marker/label strokes shrink (cast-ring stroke
0.70 full → 0.32 at 2.2×) so hero portraits stay screen-size and distancing reads clearly,
while the map itself magnifies.

**No regression:** coaching-read card, per-hero spell panel, ward vision, death list, and the
positions/`replay_status` fallback are untouched; DEMO plays a fight end-to-end; the static
no-frames snapshot path still renders via the `fightFrameSVG` compat wrapper.

## Findings (non-blocking)
1. **rAF → setInterval switch (done in-cycle).** The initial implementation drove the clock
   with `requestAnimationFrame`; the in-app Browser pane never fires rAF (visible but not
   painting), which also makes rAF less universal. Switched to a timestamp-driven
   `setInterval(40ms)` — display-rate-independent, fires everywhere, live-verified advancing.
2. **One benign 404 for the optional minimap image.** `/static/dota_map.png` is absent, so a
   single startup probe 404s once (like a favicon miss); the render loop no longer re-requests
   it every tick (the earlier per-tick flood was fixed by the probe gate).
3. **Playback speed (FA_SPEED 1.6) is a taste knob** — samples are ~2s apart; tune if the user
   wants faster/slower. Reduced-motion still suppresses autoplay (static first frame + working
   scrub), verified by code path.
4. **Server-side goal-1 window not exercised on a live manta parse here** (demo synthesizes
   frames). The `attach_frames` math is unit-tested; a real replay parse should be sanity-
   checked on the user's machine (start the webapp with `MANTA_POSITIONS_BIN` set — the manta
   binary must be built for real positions, per the prior positions cycle).

## Verdict: PASS
All four goals implemented and verified; $0, no LLM, no new deps; front-end-only except the
one server window change; `main` untouched (work on the branch). Ready for a draft PR pending
user approval.
