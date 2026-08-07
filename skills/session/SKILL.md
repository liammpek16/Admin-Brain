---
name: session
description: Log a coaching session for a project as a structured note in vault/Sessions/ (type session), capturing what was covered, feedback given, and action items. Use to record a Dota Coach (or any) coaching session so cadence can be tracked. Deterministic, no LLM, $0.
---

# session

Records one coaching session as `vault/Sessions/<date>-<slug>.md` (`type: session`).
Sessions this week feed the HUD and the `sessions_7d` metric.

## Usage
```bash
node skills/session/session.js --player "Alex" \
  --covered "Reviewed 3 fights" --covered "Laning phase" \
  --feedback "Missed 2 stuns" --feedback "Late rotations" \
  --action "Positioning drill before next game" --rating 4
```

- `--project` (default `Dota Coach`), `--date` (default today), `--player`, `--rating` (1–5),
  and repeatable `--covered` / `--feedback` / `--action`.
- Same-day sessions get a numeric suffix so nothing is overwritten.
- Fields left out become empty placeholders to fill in Obsidian. Vault path via `ADMIN_BRAIN_VAULT`.
