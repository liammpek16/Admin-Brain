#!/usr/bin/env node
/*
 * plan.js — scaffold a plan note at vault/Plans/<slug>.md from a stated goal
 * for a project, per docs/DATA-CONTRACT.md.
 *
 * Reuses the vault skill's helper for IO/slug/serialization. The agent (per
 * SKILL.md) supplies the real steps/risks; this helper turns arguments into a
 * contract-valid plan file, filling sensible placeholders when steps/risks are
 * omitted so the file is always valid.
 *
 * Usage:
 *   node plan.js --project "Admin Brain" --goal "Ship HUD v1" \
 *     --horizon week \
 *     --step "Wire skills to vault" --step "Build command deck" \
 *     --risk "Scope creep"
 *
 *   node plan.js --project "Dota Analysis" --goal "Fix parser" --json '{...}'
 *
 * Flags:
 *   --project <name>     required — project this plan advances
 *   --goal <text>        required — the outcome to reach
 *   --horizon <h>        day | week | month | quarter   (default week)
 *   --status <s>         draft | active | done          (default draft)
 *   --step <text>        repeatable — a checkbox step (order preserved)
 *   --risk <text>        repeatable — a risk bullet
 *   --slug <text>        override the filename slug (default derived from goal)
 *   --force              overwrite if the plan file already exists
 *   --dry                print the note, do not write
 *
 * Env: ADMIN_BRAIN_VAULT (default C:\Users\liamm\Admin-Brain\vault)
 */

'use strict';

const fs = require('fs');
const path = require('path');
const vault = require(path.join(__dirname, '..', 'vault', 'vault.js'));

const HORIZONS = ['day', 'week', 'month', 'quarter'];
const STATUSES = ['draft', 'active', 'done'];

function todayISO(d = new Date()) {
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

// Parse repeatable + valued flags from argv.
function parseArgs(argv) {
  const out = { steps: [], risks: [] };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    const next = () => argv[++i];
    switch (a) {
      case '--project': out.project = next(); break;
      case '--goal': out.goal = next(); break;
      case '--horizon': out.horizon = next(); break;
      case '--status': out.status = next(); break;
      case '--slug': out.slug = next(); break;
      case '--step': out.steps.push(next()); break;
      case '--risk': out.risks.push(next()); break;
      case '--json': Object.assign(out, JSON.parse(next())); break;
      case '--force': out.force = true; break;
      case '--dry': out.dry = true; break;
      default: break;
    }
  }
  return out;
}

function buildPlan(opts) {
  const project = opts.project;
  const goal = opts.goal;
  if (!project) throw new Error('--project is required');
  if (!goal) throw new Error('--goal is required');

  const horizon = HORIZONS.includes(opts.horizon) ? opts.horizon : 'week';
  const status = STATUSES.includes(opts.status) ? opts.status : 'draft';
  const slug = opts.slug ? vault.slugify(opts.slug) : vault.slugify(goal);

  const steps = (opts.steps && opts.steps.length) ? opts.steps.slice()
    : ['Define the first concrete action', 'Do the work', 'Verify and close out'];
  const risks = (opts.risks && opts.risks.length) ? opts.risks.slice()
    : ['(none identified yet)'];

  const lines = [];
  lines.push('## Goal');
  lines.push(goal);
  lines.push('');
  lines.push('## Steps');
  steps.forEach((s) => lines.push(`- [ ] ${s}`));
  lines.push('');
  lines.push('## Risks');
  risks.forEach((r) => lines.push(`- ${r}`));
  lines.push('');

  const data = {
    type: 'plan',
    created: todayISO(),
    project,
    horizon,
    status,
  };
  return { data, body: lines.join('\n'), slug };
}

function main() {
  const opts = parseArgs(process.argv.slice(2));
  let plan;
  try {
    plan = buildPlan(opts);
  } catch (e) {
    console.error('Error:', e.message);
    console.error('See header of plan.js for usage.');
    process.exit(1);
  }
  const rel = path.join(vault.FOLDERS.plan, `${plan.slug}.md`);
  const full = path.isAbsolute(rel) ? rel : path.join(vault.VAULT, rel);

  if (opts.dry) {
    console.log(`# would write -> ${full}`);
    console.log(vault.stringifyFrontmatter(plan.data, plan.body));
    return;
  }
  if (fs.existsSync(full) && !opts.force) {
    console.error(`Refusing to overwrite existing plan: ${full}`);
    console.error('Pass --force to overwrite, or --slug to choose a new name.');
    process.exit(2);
  }
  const res = vault.upsertNote(rel, plan.data, plan.body);
  console.log(`${res.created ? 'Created' : 'Updated'} plan "${plan.slug}"`);
  console.log(`  -> ${res.path}`);
  console.log('---');
  console.log(vault.stringifyFrontmatter(plan.data, plan.body));
}

module.exports = { buildPlan, parseArgs };

if (require.main === module) main();
