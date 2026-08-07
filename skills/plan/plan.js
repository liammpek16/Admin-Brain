// plan skill — scaffold a plan note at vault/Plans/<slug>.md (type: plan) from a
// stated goal. Deterministic, refuses to overwrite without --force. No LLM, $0.

import fs from 'node:fs';
import path from 'node:path';
import { today } from '../vault/vault.js';
import { vaultPath, upsertNote, isMain } from '../../adapters/obsidian/index.js';

const slugify = (s) =>
  s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60);

/** Parse `--key value`, with repeatable --step / --risk and a boolean --force. */
export function parseArgs(argv) {
  const out = { step: [], risk: [] };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--force') { out.force = true; continue; }
    if (a.startsWith('--')) {
      const key = a.slice(2);
      const val = argv[++i];
      if (key === 'step') out.step.push(val);
      else if (key === 'risk') out.risk.push(val);
      else out[key] = val;
    }
  }
  return out;
}

// CLI
if (isMain(import.meta.url)) {
  const a = parseArgs(process.argv.slice(2));
  if (!a.goal) {
    console.error(
      'Usage: node skills/plan/plan.js --goal "..." [--project "..."] [--horizon week] ' +
        '[--step "..."]... [--risk "..."]... [--force]'
    );
    process.exit(1);
  }
  const slug = slugify(a.project ? `${a.project}-${a.goal}` : a.goal);
  const file = path.join(vaultPath(), 'Plans', `${slug}.md`);
  if (fs.existsSync(file) && !a.force) {
    console.error(`Refusing to overwrite ${file} (pass --force to replace).`);
    process.exit(2);
  }
  const body = [
    '## Goal',
    a.goal,
    '',
    '## Steps',
    ...(a.step.length ? a.step.map((s) => `- [ ] ${s}`) : ['- [ ] (define the steps)']),
    '',
    '## Risks',
    ...(a.risk.length ? a.risk.map((r) => `- ${r}`) : ['- (none noted)']),
  ].join('\n');
  const written = upsertNote(
    'Plans',
    slug,
    { type: 'plan', created: today(), project: a.project || '', horizon: a.horizon || 'week', status: 'draft' },
    body
  );
  console.log(`Created plan -> ${written}`);
}
