---
name: metrics
description: Compute and record a daily numeric snapshot of the Admin Brain project portfolio (counts by status/health, stale/attention counts, average recency) into vault/Metrics/. Use to capture "the numbers" for a day so trends can be tracked over time. Deterministic, idempotent, no LLM, $0.
---

# metrics

Computes today's portfolio snapshot from the vault and writes `vault/Metrics/<date>.md`
(`type: metric-snapshot`). Re-running the same day overwrites — never duplicates.

## Metrics captured
`projects_total`, `projects_active/planned/blocked/done`, `health_green/yellow/red/gray`,
`stale_active` (active, no activity >7d), `needs_attention`, `avg_days_since`.

## Usage
```bash
node skills/metrics/metrics.js        # or: npm run metrics
```
```js
import { computeSnapshot } from './skills/metrics/metrics.js';
const { date, metrics } = await computeSnapshot();
```

Builds on the `vault` accessor; recency comes from git (when a project's `repo` is set)
or note mtime. Vault path via `ADMIN_BRAIN_VAULT`.
