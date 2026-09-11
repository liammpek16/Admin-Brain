---
type: report
project: Dota Coach
task: correct map scaling with new png background
date: '2026-09-11'
cycle: 2026-09-11-correct-map-scaling-with-new-png-background
---

# Verification report — Dota Coach

**Task:** correct map scaling with new png background
**Branch:** `auto/correct-map-scaling-with-new-png-background`

## What was tested
Independent audit of the two levers against the DoD, plus adversarial coordinate inputs:
- **`preserveAspectRatio` audit** (grep over `index.html`): the three fight-map surfaces
  that were `none` now read `xMidYMid meet` — background `<image>` (983), `.fmap` (1092),
  `.fa-map` (1473). The unrelated `.wp` win-probability chart correctly still uses `none`
  (1769), and the ability-icon `<image>` (1459) was already `meet` (untouched).
- **`mapXY` regression:** byte-identical to the old `(x-64)/128` formula across a coord
  sweep (verified at implement time; re-confirmed here at center → `[50,50]`).
- **Clamping:** out-of-playable coords clamp — `x=0 → 0`, `x=300 → 100` (no overflow off
  the map).
- **Degenerate input:** `x=undefined → NaN` in isolation, but both call sites guard
  `if (h.x == null || h.y == null) continue` (which also catches `undefined`), so mapXY is
  never reached with a missing coord.
- **Tunability:** swapping `MAP_MIN/MAX` to `0/256` changes the divisor/crop as intended
  (the single-constant calibration works).

## Findings (weaknesses / what broke)
- **[med · scope — the headline DoD is not verifiable here] Real-PNG alignment untested.**
  The DoD's core criterion — "with a sample `dota_map.png`, ≥3 reference points land within
  tolerance" — cannot be checked without a licensed minimap asset, which is deliberately not
  bundled (copyright, per #24). This PR ships the *mechanism* (tunable `MAP_MIN/MAX`),
  *robustness* (stretch-proof), and *docs* (the three-landmark recipe), but the final numeric
  calibration is deferred until the user drops in their image. Honestly: the goal as written
  ("correct" scaling) is only provably met once that asset exists and the constants are tuned.
- **[low] `meet` doesn't rescue a non-square PNG's alignment.** For a non-square image, `meet`
  letterboxes it inside the 0..100 box while hero positions still map to the full range, so
  markers would sit off the art. `mapXY` assumes a square, playable-area crop (README states
  this). `meet` is still the right call — it removes distortion for the supported square case;
  it just can't fix a wrong crop.
- **[info] Default behaviour is unchanged without a PNG.** Since `mapXY` is byte-identical and
  a square viewBox in a square container renders the same under `none` and `meet`, existing
  users (stylized fallback) see no visual change — good for safety, but it also means this PR's
  visible payoff only appears once a (correctly-cropped) PNG is supplied.

## Improvements
1. _(to actually close the DoD)_ When the user supplies their `dota_map.png`, tune `MAP_MIN/MAX`
   against three landmarks (Roshan pit, both ancients) and capture the values — that's the step
   that turns "mechanism shipped" into "verified correct".
2. _(optional)_ If non-square minimaps must be supported later, drive the `<image>` width/height
   and `mapXY` from the same explicit bounds rectangle rather than assuming square.

## Verdict
**pass-with-notes.** The stretch-proofing, the single-constant calibration, and the
byte-identical no-PNG default are implemented and verified, and nothing regressed. But the
literal DoD (reference points aligning on a real PNG) is **not verifiable without the user's
licensed asset**, so final numeric calibration is an explicit open item for review — not a code
defect, a missing input. Safe to merge as the mechanism; alignment sign-off waits on the image.
