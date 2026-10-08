// orchestrate skill (Plan 2, between ② and ③/④) — the deterministic half of the master agent.
// The master agent (the Claude Code session driving the loop, following SKILL.md) JUDGES: it scores
// a refined spec's feasibility and breaks it into sub-tasks with declared attributes. This harness does
// the ARITHMETIC: feasibility verdict, per-task complexity tier, tier → model alias, and the verify-
// independence rule — then records the plan in the cycle note. Pure functions are exported + unit-
// tested; no LLM, no network, $0. Feasibility is ADVISORY: it informs the human gates, never replaces them.

import fs from 'node:fs';
import path from 'node:path';
import { vaultPath, readNote, upsertNote, isMain } from '../../adapters/obsidian/index.js';

// ---- Feasibility ----
// Each dimension is scored 0–2 by the master agent (2 = good). A 0 on a BLOCKER is a no-go.
export const FEAS_DIMENSIONS = ['clarity', 'size', 'cost', 'risk', 'testability'];
const BLOCKERS = {
  clarity: 'spec is unclear — send back to REFINE',
  cost: 'needs a paid/external service — breaks $0/local-first',
  risk: 'unacceptable risk to main or vault data',
  testability: 'no way to verify it — VERIFY could not gate it',
};
export const GO_THRESHOLD = 7; // total (0–10) at or above this, with no zeros, is a clean go

/** Pure. `{ clarity, size, cost, risk, testability }` (ints 0–2) → `{ verdict, total, reasons }`. */
export function assessFeasibility(scores) {
  if (!scores || typeof scores !== 'object' || Array.isArray(scores)) throw new Error('feasibility scores must be an object');
  const extra = Object.keys(scores).filter((k) => !FEAS_DIMENSIONS.includes(k));
  if (extra.length) throw new Error(`unknown feasibility dimension(s): ${extra.join(', ')}`);
  for (const d of FEAS_DIMENSIONS) {
    const v = scores[d];
    if (!Number.isInteger(v) || v < 0 || v > 2) throw new Error(`feasibility.${d} must be an integer 0–2 (got ${JSON.stringify(v)})`);
  }
  const total = FEAS_DIMENSIONS.reduce((s, d) => s + scores[d], 0);
  const blocked = Object.keys(BLOCKERS).filter((d) => scores[d] === 0);
  if (blocked.length) return { verdict: 'no-go', total, reasons: blocked.map((d) => `${d}=0: ${BLOCKERS[d]}`) };
  if (scores.size === 0) return { verdict: 'go-with-split', total, reasons: ['size=0: not branch-sized — split before IMPLEMENT'] };
  if (total < GO_THRESHOLD) {
    const weak = FEAS_DIMENSIONS.filter((d) => scores[d] === 1);
    return { verdict: 'go-with-split', total, reasons: [`total ${total}/10 < ${GO_THRESHOLD}: weak on ${weak.join(', ')} — consider splitting/tightening`] };
  }
  return { verdict: 'go', total, reasons: [`total ${total}/10, no blockers`] };
}

// ---- Complexity → tier → model ----
export const TASK_KINDS = ['mechanical', 'feature', 'design', 'verify'];
export const TIERS = ['light', 'standard', 'heavy'];
const LEVELS = { low: 0, med: 1, high: 2 };
const KIND_BASE = { mechanical: 0, feature: 1, design: 3, verify: 1 };
const KIND_FLOOR = { design: 'heavy', verify: 'standard' };
// Aliases, not pinned model IDs — routing keeps working as model versions move.
export const TIER_MODELS = { light: 'haiku', standard: 'sonnet', heavy: 'opus' };
const MODEL_RANK = { haiku: 0, sonnet: 1, opus: 2 }; // known aliases only; unknown IDs are not ranked
const ALIAS_RE = /^[A-Za-z0-9._:[\]-]+$/; // model alias/ID charset — nothing that can break the note table

const tierRank = (t) => TIERS.indexOf(t);
const maxTier = (...ts) => ts.reduce((a, b) => (tierRank(b) > tierRank(a) ? b : a));

/**
 * Pure. Task attributes → `{ tier, score, breakdown }`.
 * attrs: { kind, files (int ≥ 0), novel_design (bool), ambiguity, risk (low|med|high) }.
 * score ≤ 1 → light · ≤ 4 → standard · else heavy; then kind floors (design ≥ heavy, verify ≥ standard).
 */
export function classifyTask(attrs) {
  if (!attrs || typeof attrs !== 'object') throw new Error('task attributes must be an object');
  const { kind, files, novel_design: novel, ambiguity, risk } = attrs;
  if (!TASK_KINDS.includes(kind)) throw new Error(`kind must be one of ${TASK_KINDS.join('|')} (got ${JSON.stringify(kind)})`);
  if (!Number.isInteger(files) || files < 0) throw new Error(`files must be an integer ≥ 0 (got ${JSON.stringify(files)})`);
  if (typeof novel !== 'boolean') throw new Error(`novel_design must be true/false (got ${JSON.stringify(novel)})`);
  for (const [k, v] of [['ambiguity', ambiguity], ['risk', risk]]) {
    if (typeof v !== 'string' || !Object.hasOwn(LEVELS, v)) throw new Error(`${k} must be low|med|high (got ${JSON.stringify(v)})`);
  }
  const breakdown = {
    kind: KIND_BASE[kind],
    files: files <= 1 ? 0 : files <= 4 ? 1 : 2,
    novel_design: novel ? 2 : 0,
    ambiguity: LEVELS[ambiguity],
    risk: LEVELS[risk],
  };
  const score = Object.values(breakdown).reduce((a, b) => a + b, 0);
  let tier = score <= 1 ? 'light' : score <= 4 ? 'standard' : 'heavy';
  if (KIND_FLOOR[kind]) tier = maxTier(tier, KIND_FLOOR[kind]);
  return { tier, score, breakdown };
}

/** Parse `ADMIN_BRAIN_TIER_MODELS` (JSON `{ tier: alias }`). Empty → {}. Bad JSON/keys → throws. */
export function parseTierOverrides(raw) {
  if (raw == null || String(raw).trim() === '') return {};
  let o;
  try { o = JSON.parse(raw); } catch { throw new Error('ADMIN_BRAIN_TIER_MODELS is not valid JSON'); }
  if (!o || typeof o !== 'object' || Array.isArray(o)) throw new Error('ADMIN_BRAIN_TIER_MODELS must be a JSON object');
  for (const [k, v] of Object.entries(o)) {
    if (!TIERS.includes(k)) throw new Error(`ADMIN_BRAIN_TIER_MODELS: unknown tier "${k}"`);
    if (typeof v !== 'string' || !ALIAS_RE.test(v.trim())) throw new Error(`ADMIN_BRAIN_TIER_MODELS.${k} must be a model alias/ID (letters, digits, . _ : - [ ])`);
  }
  return o;
}

/** Pure. tier → model alias, from TIER_MODELS with optional overrides. */
export function routeModel(tier, overrides = {}) {
  if (!TIERS.includes(tier)) throw new Error(`unknown tier: ${JSON.stringify(tier)}`);
  return (overrides[tier] || TIER_MODELS[tier]).trim();
}

// ---- Whole plan ----
const STATUSES = ['pending', 'running', 'done', 'failed', 'skipped'];

/**
 * Pure. Validate + route a master-agent plan:
 *   { feasibility: {…scores}, tasks: [{ id, title, kind, files, novel_design, ambiguity, risk, status?, note? }] }
 * Returns { feasibility: {verdict,total,reasons,scores}, tasks: [{…, tier, score, model}] }.
 * Verify independence: needs ≥ 1 implement task and ≥ 1 verify task; every verify task is lifted to
 * at least the highest implement tier (and never below standard).
 */
export function buildPlan(plan, overrides = {}) {
  if (!plan || typeof plan !== 'object' || Array.isArray(plan)) throw new Error('plan must be a JSON object');
  const feasibility = { ...assessFeasibility(plan.feasibility), scores: plan.feasibility };
  if (!Array.isArray(plan.tasks) || plan.tasks.length === 0) throw new Error('plan.tasks must be a non-empty array');
  const seen = new Set();
  const tasks = plan.tasks.map((t, i) => {
    const where = `tasks[${i}]`;
    if (!t || typeof t !== 'object') throw new Error(`${where} must be an object`);
    const id = String(t.id ?? '').trim();
    const title = String(t.title ?? '').trim();
    if (!id || /[|\r\n]/.test(id)) throw new Error(`${where}.id must be a non-empty single-line string without "|"`);
    if (!title || /[\r\n]/.test(title)) throw new Error(`${where}.title must be a non-empty single-line string`);
    if (seen.has(id)) throw new Error(`duplicate task id: ${id}`);
    seen.add(id);
    const status = t.status ?? 'pending';
    if (!STATUSES.includes(status)) throw new Error(`${where}.status must be one of ${STATUSES.join('|')}`);
    let c;
    try { c = classifyTask(t); } catch (e) { throw new Error(`${where} (${id}): ${e.message}`); }
    return { id, title, kind: t.kind, files: t.files, novel_design: t.novel_design, ambiguity: t.ambiguity, risk: t.risk,
      status, note: String(t.note ?? '').replace(/[\r\n|]+/g, ' ').trim(), tier: c.tier, score: c.score };
  });
  const impl = tasks.filter((t) => t.kind !== 'verify');
  if (!impl.length) throw new Error('plan needs at least one implement (non-verify) task');
  if (!tasks.some((t) => t.kind === 'verify')) throw new Error('plan needs a separate verify task (verify independence)');
  const top = maxTier(...impl.map((t) => t.tier));
  for (const t of tasks) {
    if (t.kind === 'verify') {
      const lifted = maxTier(t.tier, top, 'standard');
      if (lifted !== t.tier) { t.liftedFrom = t.tier; t.tier = lifted; }
    }
    t.model = routeModel(t.tier, overrides);
  }
  // Overrides map tiers → aliases, so they could undo the tier lift. Guard on the routed MODEL too:
  // a verifier on a known alias must be ≥ sonnet and ≥ the strongest known implementer alias.
  const rank = (m) => MODEL_RANK[m] ?? null;
  const implTop = Math.max(-1, ...impl.map((t) => rank(t.model) ?? -1));
  for (const t of tasks.filter((x) => x.kind === 'verify')) {
    const r = rank(t.model);
    if (r !== null && (r < MODEL_RANK.sonnet || r < implTop)) {
      throw new Error(`verify task ${t.id} routes to "${t.model}", weaker than its implementer or below sonnet — check ADMIN_BRAIN_TIER_MODELS`);
    }
  }
  return { feasibility, tasks };
}

// ---- Rendering + idempotent note sections ----
export function renderFeasibility(f) {
  const s = FEAS_DIMENSIONS.map((d) => `${d} ${f.scores[d]}`).join(' · ');
  return [`**Verdict: ${f.verdict}** (${f.total}/10) — advisory; the human gates decide.`, `- scores: ${s}`,
    ...f.reasons.map((r) => `- ${r}`)].join('\n');
}

export function renderPlan(tasks) {
  const rows = tasks.map((t) => {
    const attrs = `${t.kind}, ${t.files}f, ${t.novel_design ? 'novel' : 'known'}, amb ${t.ambiguity}, risk ${t.risk}`;
    const tier = t.liftedFrom ? `${t.tier} (lifted from ${t.liftedFrom})` : t.tier;
    return `| ${t.id} | ${t.title.replace(/\|/g, '/')} | ${attrs} | ${tier} [${t.score}] | \`${t.model}\` | ${t.status} | ${t.note} |`;
  });
  return ['| # | task | attributes | tier [score] | model | status | note |', '|---|---|---|---|---|---|---|', ...rows].join('\n');
}

/**
 * Pure. Replace `## heading` (up to the next `## `) or insert it before `## Implementation` / at the end.
 * Fence-aware: headings inside ``` blocks (e.g. the README embedded by REFINE) are never matched.
 */
export function upsertSection(body, heading, content) {
  const block = `## ${heading}\n${content.trim()}\n`;
  const lines = body.replace(/\r\n/g, '\n').split('\n');
  let inFence = false;
  const isHeading = lines.map((l) => {
    if (/^\s*(```|~~~)/.test(l)) { inFence = !inFence; return false; }
    return !inFence && /^## /.test(l);
  });
  const start = lines.findIndex((l, i) => isHeading[i] && l.trim() === `## ${heading}`);
  if (start >= 0) {
    let end = lines.findIndex((l, i) => i > start && isHeading[i]);
    if (end < 0) end = lines.length;
    return [...lines.slice(0, start), ...block.split('\n'), ...lines.slice(end)].join('\n').replace(/\n{3,}/g, '\n\n');
  }
  const impl = lines.findIndex((l, i) => isHeading[i] && l.trim() === '## Implementation');
  if (impl >= 0) return [...lines.slice(0, impl), ...block.split('\n'), ...lines.slice(impl)].join('\n').replace(/\n{3,}/g, '\n\n');
  return `${body.trimEnd()}\n\n${block}`;
}

// Cycles orchestrate may write to: spec approved (before IMPLEMENT) or IMPLEMENT under way.
const WRITABLE = (d) => (d.stage === 'refine' && d.status === 'approved') || (d.stage === 'implement' && d.status === 'active');

/** Find the open cycle note for a project (or by explicit base name). Returns { file, note } or an { error }. */
export function findCycle(project, base = null) {
  const dir = path.join(vaultPath(), 'Cycles');
  const files = fs.existsSync(dir) ? fs.readdirSync(dir).filter((f) => f.endsWith('.md')).sort().reverse() : [];
  const data = (f) => { try { return readNote(path.join(dir, f)).data; } catch { return {}; } }; // skip unparseable siblings
  let pick;
  if (base) pick = files.filter((f) => f === `${base.replace(/\.md$/, '')}.md`);
  else {
    const mine = files.filter((f) => data(f).project === project);
    // Prefer the newest WRITABLE cycle, so a newer done/awaiting note never hides an active one.
    const writable = mine.filter((f) => WRITABLE(data(f)));
    if (writable.length > 1) console.warn(`Warning: ${writable.length} writable cycles for "${project}" — using ${writable[0]} (pass --cycle to choose)`);
    pick = writable.length ? writable : mine.filter((f) => !['done', 'abandoned'].includes(String(data(f).status)));
  }
  if (!pick.length) return { error: base ? `No cycle note named ${base}` : `No open cycle for "${project}"` };
  const file = path.join(dir, pick[0]);
  const note = readNote(file);
  if (base && project && note.data.project !== project) return { error: `Cycle ${base} belongs to "${note.data.project}", not "${project}"` };
  if (!WRITABLE(note.data)) return { error: `Cycle ${pick[0]} is ${note.data.stage}/${note.data.status} — orchestrate needs refine/approved or implement/active` };
  return { file, note };
}

// CLI: node skills/orchestrate/orchestrate.js --project "<name>" --plan <plan.json> [--cycle <base>] [--dry-run]
if (isMain(import.meta.url)) {
  const args = process.argv.slice(2);
  const get = (f) => { const i = args.indexOf(f); return i >= 0 ? args[i + 1] : null; };
  const project = get('--project');
  const planPath = get('--plan');
  if (!project || !planPath) {
    console.error('Usage: node skills/orchestrate/orchestrate.js --project "<name>" --plan <plan.json> [--cycle <base>] [--dry-run]');
    process.exit(1);
  }
  let result;
  try {
    const overrides = parseTierOverrides(process.env.ADMIN_BRAIN_TIER_MODELS);
    result = buildPlan(JSON.parse(fs.readFileSync(planPath, 'utf8').replace(/^﻿/, '')), overrides); // tolerate a BOM (PowerShell 5.1)
  } catch (e) {
    console.error(`Plan rejected (nothing written): ${e.message}`);
    process.exit(3);
  }
  const feas = renderFeasibility(result.feasibility);
  const table = renderPlan(result.tasks);
  console.log(`Feasibility: ${result.feasibility.verdict} (${result.feasibility.total}/10)`);
  if (result.feasibility.verdict !== 'go') console.warn(`⚠ ${result.feasibility.verdict}: ${result.feasibility.reasons.join('; ')} — needs a human decision before dispatch.`);
  for (const t of result.tasks) console.log(`  ${t.id.padEnd(4)} ${t.tier.padEnd(8)} → ${t.model.padEnd(7)} ${t.title}`);
  if (args.includes('--dry-run')) process.exit(0);

  const found = findCycle(project, get('--cycle'));
  if (found.error) { console.error(found.error); process.exit(2); }
  let body = upsertSection(found.note.body, 'Feasibility', feas);
  body = upsertSection(body, 'Orchestration plan', table);
  upsertNote('Cycles', path.basename(found.file, '.md'), { ...found.note.data, orchestrated: true }, body.trim());
  console.log(`Orchestration recorded -> ${found.file}`);
}
