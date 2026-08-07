---
name: trends
description: Detect the trend (up/down/flat + percent change) of a portfolio metric over a window by reading the Metrics snapshot series, and record it to vault/Trends/. Use to see whether things are improving over time. Needs several daily snapshots first (cold-start); reports insufficient data until then. Deterministic, no LLM, $0.
---

# trends

Reads the `vault/Metrics/*.md` series and computes direction + `change_pct` for a metric
over a window, writing `vault/Trends/<date>-<metric>.md` (`type: trend`).

## Cold-start
Trends need history. With fewer than 2 snapshots in the window it reports **insufficient
data** (direction `flat`). Run `metrics` daily to accumulate the series.

## Usage
```bash
node skills/trends/trends.js [metric] [--window N]   # default: projects_active, 14 days
# e.g. node skills/trends/trends.js avg_days_since --window 30
```
```js
import { trend } from './skills/trends/trends.js';
const t = trend('projects_active', 14);
```

`direction` is `flat` when |change| < 2%. Vault path via `ADMIN_BRAIN_VAULT`.
