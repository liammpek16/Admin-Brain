// metrics skill — compute today's numeric snapshot from vault state and write
// vault/Metrics/<date>.md (type: metric-snapshot). Idempotent. No LLM, $0.

import { getProjects, healthCounts, needsAttention, today } from '../vault/vault.js';
import { upsertNote, isMain } from '../../adapters/obsidian/index.js';

/** Compute the snapshot object for a date from current vault state. */
export async function computeSnapshot(date = today()) {
  const p = await getProjects();
  const h = healthCounts(p);
  const cnt = (f) => p.filter(f).length;
  const metrics = {
    projects_total: p.length,
    projects_active: cnt((x) => x.status === 'active'),
    projects_planned: cnt((x) => x.status === 'planned'),
    projects_blocked: cnt((x) => x.status === 'blocked'),
    projects_done: cnt((x) => x.status === 'done'),
    health_green: h.green,
    health_yellow: h.yellow,
    health_red: h.red,
    health_gray: h.gray,
    stale_active: cnt((x) => x.status === 'active' && x.daysSince > 7),
    needs_attention: needsAttention(p).length,
    avg_days_since: p.length ? Math.round(p.reduce((s, x) => s + x.daysSince, 0) / p.length) : 0,
    milestones_done: p.reduce((s, x) => s + (x.milestones ? x.milestones.done : 0), 0),
    milestones_total: p.reduce((s, x) => s + (x.milestones ? x.milestones.total : 0), 0),
    avg_progress: (() => {
      const w = p.filter((x) => x.progress != null);
      return w.length ? Math.round(w.reduce((s, x) => s + x.progress, 0) / w.length) : 0;
    })(),
  };
  return { date, metrics };
}

// CLI: compute + write today's snapshot (re-running the same day overwrites, not duplicates).
if (isMain(import.meta.url)) {
  const { date, metrics } = await computeSnapshot();
  const file = upsertNote('Metrics', date, { type: 'metric-snapshot', date, metrics }, '');
  console.log(`Wrote snapshot ${date} -> ${file}`);
  console.log(JSON.stringify(metrics, null, 2));
}
