// vault skill — the ONE domain accessor. Built on adapters/obsidian.
// Returns normalized project objects with DERIVED recency (per docs/DATA-CONTRACT.md).

import { listMarkdown, readNote, readFolder, lastGitActivity, isMain } from '../../adapters/obsidian/index.js';

const DAY = 86_400_000;

/** All project notes, normalized with derived lastActivity / daysSince. */
export async function getProjects() {
  const notes = listMarkdown('Projects')
    .map(readNote)
    .filter((n) => n.data.type === 'project');

  // Milestone progress is DERIVED from ticked checkboxes in a project's plan notes.
  const plans = readFolder('Plans', 'plan');
  const progressFor = (name) => {
    const mine = plans.filter((pl) => (pl.data.project || '') === name);
    let done = 0;
    let total = 0;
    for (const pl of mine) {
      total += (pl.body.match(/^[ \t]*[-*]\s+\[[ xX]\]/gm) || []).length;
      done += (pl.body.match(/^[ \t]*[-*]\s+\[[xX]\]/gm) || []).length;
    }
    return total ? { done, total, pct: Math.round((done / total) * 100) } : null;
  };

  const projects = [];
  for (const n of notes) {
    const d = n.data;
    const repo = typeof d.repo === 'string' ? d.repo.trim() : '';
    const gitDate = await lastGitActivity(repo);
    const lastActivity = gitDate || n.mtime;
    const name = d.name || n.name;
    const milestones = progressFor(name);
    projects.push({
      name,
      status: (d.status || 'unknown').toLowerCase(),
      health: (d.health || 'gray').toLowerCase(),
      priority: (d.priority || 'med').toLowerCase(),
      next: d.next || '',
      updated: d.updated || null,
      repo,
      activitySource: gitDate ? 'git' : 'note',
      lastActivity: lastActivity.toISOString().slice(0, 10),
      daysSince: Math.max(0, Math.floor((Date.now() - lastActivity.getTime()) / DAY)),
      milestones,
      progress: milestones ? milestones.pct : null,
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

/** All coaching sessions, newest first. */
export function getSessions() {
  return readFolder('Sessions', 'session')
    .map((n) => {
      const d = n.data;
      const date = d.date ? String(d.date).slice(0, 10) : null;
      const daysAgo = date ? Math.floor((Date.now() - new Date(`${date}T00:00:00Z`).getTime()) / DAY) : null;
      return { date, project: d.project || '', player: d.player || '', rating: Number(d.rating) || 0, daysAgo };
    })
    .filter((s) => s.date)
    .sort((a, b) => b.date.localeCompare(a.date));
}

/** Sessions within the last `days` days, optionally filtered to a project. */
export function sessionsWithin(days, project = null) {
  return getSessions().filter((s) => s.daysAgo != null && s.daysAgo >= 0 && s.daysAgo <= days && (!project || s.project === project));
}

// CLI: `node skills/vault/vault.js` → prints the normalized projects as JSON.
if (isMain(import.meta.url)) {
  getProjects().then((p) => console.log(JSON.stringify(p, null, 2)));
}
