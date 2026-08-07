// vault skill — the ONE domain accessor. Built on adapters/obsidian.
// Returns normalized project objects with DERIVED recency (per docs/DATA-CONTRACT.md).

import { listMarkdown, readNote, lastGitActivity, isMain } from '../../adapters/obsidian/index.js';

const DAY = 86_400_000;

/** All project notes, normalized with derived lastActivity / daysSince. */
export async function getProjects() {
  const notes = listMarkdown('Projects')
    .map(readNote)
    .filter((n) => n.data.type === 'project');

  const projects = [];
  for (const n of notes) {
    const d = n.data;
    const repo = typeof d.repo === 'string' ? d.repo.trim() : '';
    const gitDate = await lastGitActivity(repo);
    const lastActivity = gitDate || n.mtime;
    projects.push({
      name: d.name || n.name,
      status: (d.status || 'unknown').toLowerCase(),
      health: (d.health || 'gray').toLowerCase(),
      priority: (d.priority || 'med').toLowerCase(),
      next: d.next || '',
      updated: d.updated || null,
      repo,
      activitySource: gitDate ? 'git' : 'note',
      lastActivity: lastActivity.toISOString().slice(0, 10),
      daysSince: Math.max(0, Math.floor((Date.now() - lastActivity.getTime()) / DAY)),
    });
  }
  return projects;
}

// ---- Shared derivations (one implementation, reused by every skill) ----

export const HEALTH_ICON = { green: '🟢', yellow: '🟡', red: '🔴', gray: '⚪' };
export const icon = (h) => HEALTH_ICON[h] || '⚪';
export const today = () => new Date().toISOString().slice(0, 10);

/** Count projects by health bucket. */
export function healthCounts(projects) {
  const h = { green: 0, yellow: 0, red: 0, gray: 0 };
  for (const p of projects) h[p.health] = (h[p.health] || 0) + 1;
  return h;
}

/**
 * Deterministic "needs attention" rules — the same logic the brief, metrics,
 * and morning brief all agree on.
 */
export function needsAttention(projects) {
  const flags = [];
  for (const p of projects) {
    if (p.status === 'blocked') {
      flags.push(`${p.name}: blocked — ${p.next || 'no next action set'}`);
    } else if (p.status === 'active' && (p.health === 'red' || p.health === 'yellow')) {
      flags.push(`${p.name}: health ${p.health}${p.next ? ` — ${p.next}` : ''}`);
    } else if (p.status === 'active' && p.daysSince > 7) {
      flags.push(`${p.name}: stale — no activity in ${p.daysSince}d`);
    }
    if (p.status === 'planned' && p.priority === 'high') {
      flags.push(`${p.name}: high priority, not started yet`);
    }
  }
  return flags;
}

// CLI: `node skills/vault/vault.js` → prints the normalized projects as JSON.
if (isMain(import.meta.url)) {
  getProjects().then((p) => console.log(JSON.stringify(p, null, 2)));
}
