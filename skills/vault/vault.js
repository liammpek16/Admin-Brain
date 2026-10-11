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

  // Resolve each project's git recency concurrently (not one-await-at-a-time) — the per-project
  // lookups are independent, and lastGitActivity is TTL-cached, so this is fast and network-light.
  const projects = await Promise.all(notes.map(async (n) => {
    const d = n.data;
    const repo = typeof d.repo === 'string' ? d.repo.trim() : '';
    const gitDate = await lastGitActivity(repo);
    const lastActivity = gitDate || n.mtime;
    const name = d.name || n.name;
    const milestones = progressFor(name);
    return {
      name,
      status: (d.status || 'unknown').toLowerCase(),
      health: (d.health || 'gray').toLowerCase(),
      priority: (d.priority || 'med').toLowerCase(),
      next: d.next || '',
      updated: d.updated || null,
      repo,
      localPath: typeof d.local_path === 'string' ? d.local_path.trim() : '',
      webappUrl: typeof d.webapp_url === 'string' ? d.webapp_url.trim() : '',
      webappCmd: typeof d.webapp_cmd === 'string' ? d.webapp_cmd.trim() : '',
      webappCwd: typeof d.webapp_cwd === 'string' ? d.webapp_cwd.trim() : '',
      activitySource: gitDate ? 'git' : 'note',
      lastActivity: lastActivity.toISOString().slice(0, 10),
      daysSince: Math.max(0, Math.floor((Date.now() - lastActivity.getTime()) / DAY)),
      milestones,
      progress: milestones ? milestones.pct : null,
    };
  }));
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
const PROJECT_STATUSES = ['active', 'planned', 'paused', 'blocked', 'done', 'archived'];

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

/** Create one validated project note using the vault as the sole source of truth. */
export function createProject(input = {}) {
  const name = String(input.name || '').trim();
  if (!name) return { ok: false, error: 'project name is required' };
  if (/[\r\n]/.test(name)) return { ok: false, error: 'project name must be a single line' };
  if (name.length > 120) return { ok: false, error: 'project name is too long' };
  const slug = slugify(name);
  if (!slug) return { ok: false, error: 'project name must include letters or numbers' };

  const projects = listMarkdown('Projects').map(readNote).filter((n) => n.data.type === 'project');
  if (projects.some((n) => String(n.data.name || n.name).trim().toLowerCase() === name.toLowerCase())) {
    return { ok: false, error: 'a project with that name already exists' };
  }
  if (projects.some((n) => n.name.toLowerCase() === slug)) {
    return { ok: false, error: 'a project with that name already exists' };
  }

  const status = String(input.status || 'planned');
  const health = String(input.health || 'gray');
  const priority = String(input.priority || 'med');
  if (!PROJECT_STATUSES.includes(status)) return { ok: false, error: 'invalid project status' };
  if (!EDITABLE.health.includes(health)) return { ok: false, error: 'invalid project health' };
  if (!EDITABLE.priority.includes(priority)) return { ok: false, error: 'invalid project priority' };

  const optional = ['next', 'repo', 'local_path', 'webapp_url', 'webapp_cmd', 'webapp_cwd'];
  const data = { type: 'project', name, status, health, priority, updated: today() };
  for (const field of optional) {
    const value = String(input[field] || '').trim();
    if (/[\r\n]/.test(value)) return { ok: false, error: `${field} must be a single line` };
    if (value) data[field] = value;
  }
  upsertNote('Projects', slug, data, '## Summary\n\n## Now\n\n## Blockers\n- none');
  return { ok: true, project: name };
}

// A goal's optional inline "kind" — a trailing `#checkpoint` / `#improvement` tag (case-insensitive)
// on the checkbox line. Untagged goals are CHECKPOINTS (existing roadmap goals are milestone-style),
// so only improvements carry a tag. The tag sits at the END of the line and is stripped BEFORE the
// ` — meta` split, so the derived `text` is always tag-free — which is what keeps text-matching
// (delete / reorder / run) working the same for a tagged or untagged goal.
export const GOAL_KINDS = ['checkpoint', 'improvement'];
const KIND_TAG_RX = /\s*#(checkpoint|improvement)\s*$/i;

/** Parse one plan-note line into { done, text, meta, kind }, or null if it isn't a top-level goal. */
function parseGoalLine(line) {
  const m = line.match(/^[-*]\s+\[([ xX])\]\s+(.+?)\s*$/); // top-level checkbox only
  if (!m) return null;
  let rest = m[2].trim();
  let kind = 'checkpoint';
  const km = rest.match(KIND_TAG_RX);
  if (km) { kind = km[1].toLowerCase(); rest = rest.slice(0, km.index).trim(); }
  let text = rest;
  let meta = '';
  const i = text.lastIndexOf(' — '); // " — " em-dash separator (ASCII-safe in source)
  if (i !== -1) { meta = text.slice(i + 3).trim(); text = text.slice(0, i).trim(); }
  return { done: m[1].toLowerCase() === 'x', text, meta, kind };
}

// A goal's optional description — an indented sub-line in its goal-block, `  - _Description: …_`.
// The legacy hand-written `_Goal: …_` form is read too (and normalised to Description on write).
// It has no checkbox, so it never counts as a goal or toward milestone %.
const DESC_RX = /^\s+[-*]\s+_(?:Description|Goal):\s*(.*?)_\s*$/i;
const descLine = (d) => `  - _Description: ${d}_`;

/**
 * A project's roadmap goals — the top-level checkbox lines in its plan notes (the same lines
 * that drive milestone %). Returns { text, done, meta, kind, description } per goal, with the
 * trailing " — horizon · priority" split off into `meta`, the `#checkpoint`/`#improvement` tag into
 * `kind`, and the first `_Description:` sub-line into `description` ('' if none). This is the
 * source for the manual goals board.
 */
export function projectGoals(name) {
  const plans = readFolder('Plans', 'plan').filter((pl) => (pl.data.project || '') === name);
  const goals = [];
  for (const pl of plans) {
    let cur = null;
    for (const line of pl.body.split(/\r?\n/)) {
      const g = parseGoalLine(line);
      if (g) {
        cur = { text: g.text, done: g.done, meta: g.meta, kind: g.kind, description: '', plan: pl.name };
        goals.push(cur);
        continue;
      }
      if (/^\S/.test(line)) { cur = null; continue; } // a heading/paragraph ends the goal-block
      const dm = cur && !cur.description && line.match(DESC_RX);
      if (dm) cur.description = dm[1].trim();
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
 * `kind` ('checkpoint' default | 'improvement') decides the group — only improvements get a tag.
 * Returns { ok, error? }. Rejects empty/multi-line/duplicate goals, bad kinds, and unknown projects.
 */
export function addProjectGoal(project, text, kind = 'checkpoint') {
  const goal = String(text || '').trim();
  if (!goal) return { ok: false, error: 'goal text is empty' };
  if (/[\r\n]/.test(goal)) return { ok: false, error: 'goal must be a single line' };
  const k = String(kind || 'checkpoint').toLowerCase();
  if (!GOAL_KINDS.includes(k)) return { ok: false, error: `invalid kind: ${kind}` };
  const projNote = listMarkdown('Projects')
    .map(readNote)
    .find((n) => n.data.type === 'project' && (n.data.name || n.name) === project);
  if (!projNote) return { ok: false, error: `project not found: ${project}` };
  if (projectGoals(project).some((g) => g.text.toLowerCase() === goal.toLowerCase())) {
    return { ok: false, error: 'that goal already exists' };
  }

  const line = `- [ ] ${goal}${k === 'improvement' ? ' #improvement' : ''}`;
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

const goalTextOf = (line) => { const g = parseGoalLine(line); return g ? g.text : null; };

/**
 * Parse a plan note's `## Steps` section into goal-BLOCKS — each a top-level checkbox line PLUS
 * its following indented/sub-bullet lines (e.g. `_Delivered…_`) — so a goal's done state, meta,
 * and Delivered note always travel together. Returns { lines, si, end, preamble, blocks, suffix }
 * or null if there's no Steps section. Shared by reorder + delete.
 */
function parseSteps(pl) {
  const lines = pl.body.split(/\r?\n/);
  const si = lines.findIndex((l) => /^##\s+Steps\b/i.test(l));
  if (si === -1) return null;
  let end = lines.length;
  for (let i = si + 1; i < lines.length; i++) { if (/^##\s/.test(lines[i])) { end = i; break; } }

  const region = lines.slice(si + 1, end);
  const suffix = [];
  while (region.length && region[region.length - 1].trim() === '') suffix.unshift(region.pop());

  // Lines before the first checkbox are a preamble kept up top.
  const preamble = [];
  const blocks = [];
  let cur = null;
  for (const ln of region) {
    const text = goalTextOf(ln);
    if (text !== null) { cur = { text, lines: [ln] }; blocks.push(cur); }
    else if (cur) cur.lines.push(ln);
    else preamble.push(ln);
  }
  return { lines, si, end, preamble, blocks, suffix };
}

/** Rewrite a plan's `## Steps` from the given ordered blocks (preamble/suffix preserved). */
function writeSteps(pl, parsed, blocks) {
  const { lines, si, end, preamble, suffix } = parsed;
  const newRegion = [];
  for (const b of blocks) newRegion.push(...b.lines);
  const newBody = [...lines.slice(0, si + 1), ...preamble, ...newRegion, ...suffix, ...lines.slice(end)].join('\n');
  upsertNote('Plans', pl.name, pl.data, newBody);
}

/**
 * Reorder a project's roadmap goals to match `orderedTexts` (drag-to-reorder in the HUD).
 * Rewrites the `## Steps` goal-blocks in the given order. Refuses (no write) unless `orderedTexts`
 * is exactly the current set of goal texts — no add/drop/duplicate. Returns { ok, error? }.
 */
export function reorderProjectGoals(project, orderedTexts) {
  if (!Array.isArray(orderedTexts) || !orderedTexts.length) return { ok: false, error: 'no order given' };
  const pl = readFolder('Plans', 'plan').find((p) => (p.data.project || '') === project);
  if (!pl) return { ok: false, error: `no roadmap for ${project}` };
  const parsed = parseSteps(pl);
  if (!parsed) return { ok: false, error: 'no Steps section' };

  // No-loss guard: the requested order must be exactly the existing goal set.
  const have = parsed.blocks.map((b) => b.text);
  const want = orderedTexts.map(String);
  if (want.length !== have.length || new Set(want).size !== want.length
      || !want.every((t) => have.includes(t))) {
    return { ok: false, error: 'order must be a permutation of the existing goals' };
  }

  const byText = new Map(parsed.blocks.map((b) => [b.text, b]));
  writeSteps(pl, parsed, want.map((t) => byText.get(t)));
  return { ok: true };
}

/**
 * Delete one roadmap goal from a project (the ✕ in the goals board). Removes the `## Steps`
 * goal-BLOCK whose top-level text matches `text` — taking its indented sub-lines (Delivered note,
 * meta) with it — and leaves the rest untouched. Refuses (no write) if the goal isn't found. Plan
 * notes are git-tracked, so a delete is recoverable. Returns { ok, error? }.
 */
export function deleteProjectGoal(project, text) {
  const want = String(text || '').trim();
  if (!want) return { ok: false, error: 'no goal given' };
  const pl = readFolder('Plans', 'plan').find((p) => (p.data.project || '') === project);
  if (!pl) return { ok: false, error: `no roadmap for ${project}` };
  const parsed = parseSteps(pl);
  if (!parsed) return { ok: false, error: 'no Steps section' };

  const idx = parsed.blocks.findIndex((b) => b.text === want);
  if (idx === -1) return { ok: false, error: `goal not found: ${want}` };
  writeSteps(pl, parsed, parsed.blocks.filter((_, i) => i !== idx));
  return { ok: true };
}

/**
 * Re-classify one roadmap goal as a 'checkpoint' or 'improvement' (the kind toggle in the goals
 * board). Rewrites just that goal's checkbox line — strips any existing `#checkpoint`/`#improvement`
 * tag and re-adds one only for an improvement (checkpoint is the tagless default) — while leaving the
 * goal's meta, Delivered sub-lines, done state, and position untouched. Refuses (no write) on an
 * unknown goal or an invalid kind. Returns { ok, error? }.
 */
export function setProjectGoalKind(project, text, kind) {
  const want = String(text || '').trim();
  const k = String(kind || '').toLowerCase();
  if (!want) return { ok: false, error: 'no goal given' };
  if (!GOAL_KINDS.includes(k)) return { ok: false, error: `invalid kind: ${kind}` };
  const pl = readFolder('Plans', 'plan').find((p) => (p.data.project || '') === project);
  if (!pl) return { ok: false, error: `no roadmap for ${project}` };
  const parsed = parseSteps(pl);
  if (!parsed) return { ok: false, error: 'no Steps section' };

  const block = parsed.blocks.find((b) => b.text === want);
  if (!block) return { ok: false, error: `goal not found: ${want}` };
  const base = block.lines[0].replace(KIND_TAG_RX, '').replace(/\s+$/, '');
  block.lines[0] = k === 'improvement' ? `${base} #improvement` : base;
  writeSteps(pl, parsed, parsed.blocks);
  return { ok: true };
}

/**
 * Rename one roadmap goal in place (the ✎ inline edit in the goals board). Rewrites just the text
 * portion of the matching `## Steps` checkbox line — preserving its bullet marker, done state, meta
 * (` — horizon · priority`), `#improvement`/`#checkpoint` kind tag, and indented Delivered sub-lines.
 * Refuses (no write) on an unknown goal, an empty/multi-line new text, or a collision with a DIFFERENT
 * existing goal (a same-text/-case no-op is allowed). Plan notes are git-tracked, so an edit is
 * recoverable. Returns { ok, error? }.
 */
export function editProjectGoal(project, oldText, newText) {
  const from = String(oldText || '').trim();
  const to = String(newText || '').trim();
  if (!from) return { ok: false, error: 'no goal given' };
  if (!to) return { ok: false, error: 'goal text is empty' };
  if (/[\r\n]/.test(to)) return { ok: false, error: 'goal must be a single line' };
  const pl = readFolder('Plans', 'plan').find((p) => (p.data.project || '') === project);
  if (!pl) return { ok: false, error: `no roadmap for ${project}` };
  const parsed = parseSteps(pl);
  if (!parsed) return { ok: false, error: 'no Steps section' };

  const block = parsed.blocks.find((b) => b.text === from);
  if (!block) return { ok: false, error: `goal not found: ${from}` };
  // A different goal can't already own the new text (case-insensitive); a no-op rename is fine.
  if (to.toLowerCase() !== from.toLowerCase()
      && parsed.blocks.some((b) => b !== block && b.text.toLowerCase() === to.toLowerCase())) {
    return { ok: false, error: 'that goal already exists' };
  }

  // Rebuild line 0 from its parts, keeping the original bullet marker + checkbox char and re-attaching
  // the meta and kind tag so done-state, group, and horizon travel with the rename.
  const g = parseGoalLine(block.lines[0]);
  const prefix = block.lines[0].match(/^([-*])\s+\[([ xX])\]/);
  const marker = prefix ? prefix[1] : '-';
  const check = prefix ? prefix[2] : ' ';
  const meta = g && g.meta ? ` — ${g.meta}` : '';
  const tag = g && g.kind === 'improvement' ? ' #improvement' : '';
  block.lines[0] = `${marker} [${check}] ${to}${meta}${tag}`;
  writeSteps(pl, parsed, parsed.blocks);
  return { ok: true };
}

/**
 * Set, replace, or clear one roadmap goal's description (the ≡ editor in the goals board). Writes a
 * single `  - _Description: …_` sub-line directly under the goal's checkbox line — replacing an
 * existing Description (or legacy `_Goal:`) line in place — and removes it when `description` is
 * empty. Every other line (done state, meta, kind tag, Delivered notes) is untouched. Refuses (no
 * write) on an unknown goal or multi-line text. Returns { ok, error? }.
 */
export function setProjectGoalDescription(project, text, description) {
  const want = String(text || '').trim();
  const d = String(description ?? '').trim();
  if (!want) return { ok: false, error: 'no goal given' };
  if (/[\r\n]/.test(d)) return { ok: false, error: 'description must be a single line' };
  const pl = readFolder('Plans', 'plan').find((p) => (p.data.project || '') === project);
  if (!pl) return { ok: false, error: `no roadmap for ${project}` };
  const parsed = parseSteps(pl);
  if (!parsed) return { ok: false, error: 'no Steps section' };

  const block = parsed.blocks.find((b) => b.text === want);
  if (!block) return { ok: false, error: `goal not found: ${want}` };
  const at = block.lines.findIndex((l, i) => i > 0 && DESC_RX.test(l));
  if (at === -1) { if (d) block.lines.splice(1, 0, descLine(d)); }
  else if (d) block.lines[at] = descLine(d);
  else block.lines.splice(at, 1);
  writeSteps(pl, parsed, parsed.blocks);
  return { ok: true };
}

// CLI: `node skills/vault/vault.js` → prints the normalized projects as JSON.
if (isMain(import.meta.url)) {
  getProjects().then((p) => console.log(JSON.stringify(p, null, 2)));
}
