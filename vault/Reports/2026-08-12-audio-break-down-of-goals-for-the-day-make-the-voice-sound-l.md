---
type: report
project: Admin Brain
task: >-
  audio break down of goals for the day. Make the voice sound like Jarvis from
  Iron Man
date: '2026-08-12'
cycle: 2026-08-12-audio-break-down-of-goals-for-the-day-make-the-voice-sound-l
---

# Verification report — Admin Brain

**Task:** audio break down of goals for the day. Make the voice sound like Jarvis from Iron Man
**Branch:** `auto/audio-break-down-of-goals-for-the-day-make-the-voice-sound-l`

## What was tested
Independent adversarial pass against the DoD. The pure logic (`buildBriefingScript`, `pickJarvisVoice`,
`speechClean`, plus the added `matchVoiceCommand` route) was exercised by loading the **real
`hud/public/app.js` source** into a stubbed VM context (not copies) and hitting it with malformed input.
The audio itself is browser-only and can't run headlessly (same constraint as PR #5's mic).

| # | Check | Result |
|---|-------|--------|
| B1 | `buildBriefingScript` on `{}` — no counts/focus/attention | ✅ no throw; "nothing flagged" + "nothing on the focus board" |
| B2 | `counts.active` non-number (e.g. `"lots"`) | ✅ omitted, no "NaN active projects" |
| B3 | `focus`/`attention` passed as a **string**, not an array | ✅ treated as empty (Array.isArray guard) |
| B4 | `focus` with `null` / `''` / number entries | ✅ empties dropped, `123` → "123", no blank "1. ." line |
| B5 | `counts:null, focus:null, attention:null` | ✅ no throw |
| B6 | Singular vs plural grammar (1 item / 1 project) | ✅ "1 item needs", "1 active project" |
| V1 | `pickJarvisVoice` list with `null`/`undefined` entries | ✅ skipped; preference still found |
| V2 | Voices missing `lang` / missing `name` | ✅ no throw; degrades correctly |
| V3 | `en_GB` underscore lang variant | ✅ matched (regex `en[-_]?GB`) |
| V4 | Non-array passed to `pickJarvisVoice` | ✅ → `null` (engine default) |
| V5 | No English voice at all | ✅ → `null` (speaks in default voice) |
| S1 | `speechClean` on `<script>…</script>` / backticks / pipes | ✅ no throw; markdown noise stripped, dashes/arrows → pauses |
| G1 | `matchVoiceCommand("read my goals"/"agenda")` → `#tts-btn` | ✅ routes to the button |
| G2 | "brief"/"metrics" unaffected by the new agenda command | ✅ no collision (brief still runs the skill) |
| F1 | Module loads with `window.speechSynthesis` **undefined** | ✅ feature-detect disables the button; **no throw** |
| L1 | Live server serves new index.html/app.js/style.css; `/api/overview` feeds it | ✅ |

Totals: **22/22 adversarial checks** + the 19 DoD unit checks, all green, against the real source.

## Findings (weaknesses / what broke)
No defects; nothing broke and no DoD criterion fails. Minor, non-blocking notes:

1. **No cap on the spoken agenda.** A 30-item `focus` list is read in full (verified). In practice
   `focusToday` returns a short list, so this never bites — but a future flood of focus items would make
   a long briefing. (Improvement: cap to the top N + "and M more".)
2. **`speechClean` targets markdown, not HTML** — it strips `` ` `` `*` `#` `_` `>` `|` but leaves `<`
   and `/`. Harmless here: the text is **spoken** (TTS, not `innerHTML`, so no XSS surface) and focus/
   attention strings are vault-derived, never HTML. Noted only for completeness.
3. **Voice quality depends on the OS's installed voices.** On a machine with no en-GB voice it falls
   back to the default voice — it still speaks the agenda, just less "Jarvis". Expected for browser TTS.
4. **Audio playback is unverifiable headlessly** (as with PR #5's mic) — the button's actual sound and
   the specific voice must be confirmed by the user on their machine (Chrome/Edge have the best en-GB
   voices).

## Improvements
- (Optional) cap the spoken focus list to the top ~5 with an "and N more" tail.
- (Follow-up / stretch, already logged) a real neural "movie Jarvis" voice via an external TTS service —
  deliberately deferred at the refine gate to preserve $0/local/no-deps.
- (Nice-to-have) a brief "voices are still loading, try again" status if the very first click lands
  before `voiceschanged` (today it simply speaks in the default voice that once).

## Verdict
**pass.** The feature meets the DoD: a 🔊 AGENDA button speaks a concise, Jarvis-styled briefing of
today's focus/attention in the best available British male voice, toggles off on a second click, and
degrades safely (empty/malformed data, no voices, unsupported browser — none throw). Front-end only;
$0 / no-LLM / local; the 🎤 voice bar is unaffected and now pairs with an "agenda" command. The sole
open item is the inherent one — **the user confirms the actual audio on their machine.** Safe on the
branch behind draft PR #7.
