// vault skill — the ONE domain accessor. Built on adapters/obsidian.
// Returns normalized project objects with DERIVED recency (per docs/DATA-CONTRACT.md).

import path from 'node:path';
import { listMarkdown, readNote, readFolder, upsertNote, lastGitActivity, isMain } from '../../adapters/obsidian/index.js';

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
      localPath: typeof d.local_path === 'string' ? d.local_path.trim() : '',
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

// Human-owned fields that may be edited from the HUD, with their allowed values.
const EDITABLE = { priority: ['high', 'med', 'low'], health: ['green', 'yellow', 'red', 'gray'] };

/** Update one human-owned field (priority|health) on a project note. Returns true on success. */
export function updateProjectField(project, field, value) {
  if (!EDITABLE[field] || !EDITABLE[field].includes(String(value))) return false;
  const note = listMarkdown('Projects')
    .map(readNote)
    .find((n) => n.data.type === 'project' && (n.data.name || n.name) === project);
  if (!note) return false;
  upsertNote('Projects', path.basename(note.path), { ...note.data, [field]: value, updated: today() }, note.body);
  return true;
}

/**
 * A project's roadmap goals — the top-level checkbox lines in its plan notes (the same lines
 * that drive milestone %). Returns { text, done, meta } per goal, with the trailing
 * " — horizon · priority" split off into `meta`. This is the source for the manual goals board.
 */
export function projectGoals(name) {
  const plans = readFolder('Plans', 'plan').filter((pl) => (pl.data.project || '') === name);
  const goals = [];
  for (const pl of plans) {
    for (const line of pl.body.split(/\r?\n/)) {
      const m = line.match(/^[-*]\s+\[([ xX])\]\s+(.+?)\s*$/); // top-level checkbox only
      if (!m) continue;
      let text = m[2].trim();
      let meta = '';
      const i = text.lastIndexOf(' — '); // " — " em-dash separator (ASCII-safe in source)
      if (i !== -1) { meta = text.slice(i + 3).trim(); text = text.slice(0, i).trim(); }
      goals.push({ text, done: m[1].toLowerCase() === 'x', meta, plan: pl.name });
    }
  }
  return goals;
}

/** Set the human-owned `next` on a project note (manual goal selection). Returns true on success. */
export function setProjectNext(project, text) {
  const note = listMarkdown('Projects')
    .map(readNote)
    .find((n) => n.data.type === 'project' && (n.data.name || n.name) === project);
  if (!note) return false;
  upsertNote('Projects', path.basename(note.path), { ...note.data, next: String(text), updated: today() }, note.body);
  return true;
}

const slugify = (s) => String(s).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60);

/**
 * Add a new roadmap goal (an unchecked checkbox line) to a project from the HUD. Appends under
 * the plan note's `## Steps`; if the project has no roadmap plan yet, creates a minimal one.
 * Returns { ok, error? }. Rejects empty/multi-line/duplicate goals and unknown projects.
 */
export function addProjectGoal(project, text) {
  const goal = String(text || '').trim();
  if (!goal) return { ok: false, error: 'goal text is empty' };
  if (/[\r\n]/.test(goal)) return { ok: false, error: 'goal must be a single line' };
  const projNote = listMarkdown('Projects')
    .map(readNote)
    .find((n) => n.data.type === 'project' && (n.data.name || n.name) === project);
  if (!projNote) return { ok: false, error: `project not found: ${project}` };
  if (projectGoals(project).some((g) => g.text.toLowerCase() === goal.toLowerCase())) {
    return { ok: false, error: 'that goal already exists' };
  }

  const line = `- [ ] ${goal}`;
  const plans = readFolder('Plans', 'plan').filter((pl) => (pl.data.project || '') === project);
  if (plans.length) {
    const pl = plans[0];
    const lines = pl.body.split(/\r?\n/);
    const si = lines.findIndex((l) => /^##\s+Steps\b/i.test(l));
    if (si === -1) {
      lines.push('', '## Steps', line); // no Steps section yet — start one
    } else {
      let end = lines.length; // end of the Steps block = next "## " heading or EOF
      for (let i = si + 1; i < lines.length; i++) { if (/^##\s/.test(lines[i])) { end = i; break; } }
      let ins = end;
      while (ins > si + 1 && lines[ins - 1].trim() === '') ins--; // insert after the last non-blank step
      lines.splice(ins, 0, line);
    }
    upsertNote('Plans', pl.name, pl.data, lines.join('\n'));
  } else {
    upsertNote(
      'Plans', `${slugify(project)}-roadmap`,
      { type: 'plan', kind: 'roadmap', created: today(), project, horizon: 'quarter', status: 'active' },
      `## Goal\n${project} roadmap.\n\n## Steps\n${line}`,
    );
  }
  return { ok: true };
}

// CLI: `node skills/vault/vault.js` → prints the normalized projects as JSON.
if (isMain(import.meta.url)) {
  getProjects().then((p) => console.log(JSON.stringify(p, null, 2)));
}
