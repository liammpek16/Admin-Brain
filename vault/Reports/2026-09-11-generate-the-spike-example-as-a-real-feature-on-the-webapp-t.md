---
type: report
project: Dota Coach
task: >-
  generate the spike example as a real feature on the webapp. This spike should
  be an additional loading option in the fight breakdown screen to replace the
  current 2D visualization
date: '2026-09-11'
cycle: 2026-09-11-generate-the-spike-example-as-a-real-feature-on-the-webapp-t
---

# Verification report — Dota Coach

**Task:** generate the spike example as a real feature on the webapp. This spike should be an additional loading option in the fight breakdown screen to replace the current 2D visualization
**Branch:** `auto/generate-the-spike-example-as-a-real-feature-on-the-webapp-t`

## What was tested
An **independent** pass: a live real-browser drive in `--demo` plus isolated adversarial tests
calling the real `setupFight3D` on hand-built frames (not the implementer re-confirming its edits).
- **Live drive (real fight):** entered a player → match → opened the 24:00 Fight Analysis → toggled
  **3D**. three.js lazy-loaded; the 3D scene rendered the **real** heroes (real names/teams:
  Slark/Storm Spirit/Invoker… vs your greens) at fight-consistent positions on the Radiant/Dire/
  river ground, with the **shared clock still running** and the placeholder-model note shown.
  Toggling **2D** restored the SVG and removed the canvas. No console errors.
- **Leak / lifecycle (the council's flagged risk):** 12× `setupFight3D` create→dispose in a loop →
  **no error, no WebGL context-loss, 0 canvases left** in the DOM, no "too many WebGL contexts"
  warning. `dispose()` called twice is safe (idempotent).
- **Degenerate input:** empty `frames` → builds an empty scene, no throw; a hero with `x/y === null`
  → guarded (`continue`), no throw. Both render and dispose cleanly.

## Findings (weaknesses / what broke)
- **[low · spec deviation] Elevation `z` is not used.** Refined-spec item 2 said "use `z` elevation
  when present", but `fa3dXZ` maps only `x/y` → the ground plane and models sit flat (only the gait
  bob lifts them). Fine for readability and avoids odd floating on noisy Z, but it *does* drop the
  high-ground signal the 2D LOS work surfaced. Honest gap, not a bug.
- **[low · efficiency] The 3D render loop runs even when paused.** `requestAnimationFrame` keeps
  drawing while 3D is active regardless of `anim.playing`, so an idle 3D view still consumes GPU.
  It's bounded — leaving the tab / switching to 2D disposes it (verified) — but pausing could halt
  the rAF (and re-kick it on camera drag) to idle cheaper.
- **[info] Models are stylized placeholders, by design.** Not the literal "real character models"
  of the original wish — the legally-clean choice from the feasibility cycle; the UI states it.
- **No breakage found:** shared clock stays in sync across a toggle, scrub works in 3D, empty/null
  frames degrade cleanly, teardown leaves nothing behind, and `stopFightAnim` now also clears the
  `setInterval` (a **pre-existing** 2D leak — it previously cancelled only an unused `raf`), so
  re-opening fights no longer strands old playback loops.

## Improvements
1. _(optional)_ Pause the 3D `requestAnimationFrame` when `!anim.playing` and no drag is active
   (re-kick on pointer/scrub) to cut idle GPU use.
2. _(optional)_ If high-ground matters visually, lift models by a scaled `hero.z` (with clamping)
   to use the elevation the parse already carries.
3. _(nice-to-have)_ Vendor a pinned `three.min.js` under `static/` so 3D works fully offline
   instead of depending on cdnjs at runtime.

## Verdict
**pass-with-notes.** Every DoD criterion holds and was verified independently: the in-place 2D/3D
toggle preserves time on the shared clock, the 3D view is driven by the real fight frames
(real heroes/positions/facing/death/casts), three.js is lazy-loaded with a 2D fallback, and — the
council's headline risk — **no WebGL leak** across 12× create/dispose. The notes are a deliberate
scope choice (placeholder models), one small spec deviation (`z` unused), and one idle-efficiency
nit; none block merge.
