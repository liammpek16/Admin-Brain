---
name: inbox
description: Generate a morning brief for Admin Brain — a portfolio summary, top-3 focus for today, and a needs-attention list — and save it to vault/Daily/. Pulls open inbox captures and project status. Use for a daily "what should I focus on?" brief. Deterministic, no LLM, $0.
---

# inbox

Assembles a **morning brief** from project status + open `Inbox/` captures and writes it
to `vault/Daily/<date>.md` (`type: daily`).

## Output sections
- **Morning Brief** — one-paragraph portfolio summary.
- **Focus today** — top 3: high-urgency captures → active next actions → high-priority not-started.
- **Needs attention** — the deterministic attention flags (blocked, red/yellow, stale, high-priority-not-started).

## Usage
```bash
node skills/inbox/inbox.js        # or: npm run inbox
```
```js
import { buildDailyNote, openInbox } from './skills/inbox/inbox.js';
```

Shares its attention/summary logic with the `brief` command and `metrics` via the
`vault` accessor, so all three agree. Vault path via `ADMIN_BRAIN_VAULT`.
