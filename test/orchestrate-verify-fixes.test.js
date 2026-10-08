// Regression tests for the VERIFY findings on the orchestrate skill (report
// vault/Reports/2026-10-08-feature-loop-model-optimization.md): fence-aware sections (F1),
// overrides can't weaken the verifier (F2), alias charset (F3), writable-cycle pick (F4),
// and end-to-end CLI behaviour against a throwaway vault (F5).

import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync, spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { buildPlan, upsertSection, parseTierOverrides, classifyTask } from '../skills/orchestrate/orchestrate.js';

const SCRIPT = fileURLToPath(new URL('../skills/orchestrate/orchestrate.js', import.meta.url));
const GO = { clarity: 2, size: 2, cost: 2, risk: 2, testability: 2 };
const impl = (o = {}) => ({ id: 'T1', title: 'build', kind: 'feature', files: 1, novel_design: false, ambiguity: 'low', risk: 'low', ...o });
const ver = (o = {}) => ({ id: 'T2', title: 'verify', kind: 'verify', files: 1, novel_design: false, ambiguity: 'low', risk: 'low', ...o });

test('F1: headings inside a code fence are never matched or replaced', () => {
  const body = ['## Project goal', '```', '# README', '## Implementation', '## Feasibility', 'readme text', '```', '', '## Implementation', '- log'].join('\n');
  const out = upsertSection(body, 'Feasibility', 'NEW');
  const lines = out.split('\n');
  assert.ok(lines.includes('readme text'), 'README content inside the fence is preserved');
  assert.equal(lines.filter((l) => l === '```').length, 2, 'both fence markers survive');
  const newAt = lines.indexOf('NEW');
  assert.ok(newAt > lines.lastIndexOf('```'), 'section inserted after the fence, before the real Implementation');
  assert.ok(newAt < lines.lastIndexOf('## Implementation'));
  assert.equal(upsertSection(out, 'Feasibility', 'NEW'), out, 'idempotent');
});

test('F1: CRLF bodies are normalised, no mixed line endings', () => {
  const out = upsertSection('## A\r\nx\r\n## Implementation\r\n- log', 'Feasibility', 'NEW');
  assert.ok(!out.includes('\r'));
});

test('F2: an override cannot route the verifier below its implementer or below sonnet', () => {
  const plan = { feasibility: GO, tasks: [impl({ kind: 'design' }), ver()] };
  assert.throws(() => buildPlan(plan, { heavy: 'haiku' }), /weaker than its implementer or below sonnet/);
  const plan2 = { feasibility: GO, tasks: [impl(), ver()] }; // impl light, verify standard
  assert.throws(() => buildPlan(plan2, { light: 'opus', standard: 'haiku' }), /verify task T2/);
  assert.equal(buildPlan(plan2, { standard: 'opus' }).tasks[1].model, 'opus', 'strengthening is fine');
  assert.equal(buildPlan(plan2, { standard: 'claude-sonnet-5' }).tasks[1].model, 'claude-sonnet-5', 'unknown IDs are not ranked');
});

test('F3: override values must be plain alias/ID strings', () => {
  assert.throws(() => parseTierOverrides('{"light":"haiku\\n## Injected"}'), /model alias/);
  assert.throws(() => parseTierOverrides('{"standard":"son|net"}'), /model alias/);
  assert.throws(() => parseTierOverrides('{"heavy":"`opus`"}'), /model alias/);
  assert.deepEqual(parseTierOverrides('{"heavy":"claude-opus-5-5"}'), { heavy: 'claude-opus-5-5' });
});

test('ambiguity/risk must be strings, not coercible look-alikes', () => {
  assert.throws(() => classifyTask(impl({ ambiguity: ['low'] })), /ambiguity/);
  assert.throws(() => classifyTask(impl({ risk: { toString: () => 'low' } })), /risk/);
});

// ---- CLI against a throwaway vault (F4, F5) ----
function tmpVault(cycles) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'orch-'));
  fs.mkdirSync(path.join(dir, 'Cycles'));
  for (const [name, fm] of Object.entries(cycles)) {
    const yaml = Object.entries(fm).map(([k, v]) => `${k}: ${v}`).join('\n');
    fs.writeFileSync(path.join(dir, 'Cycles', `${name}.md`), `---\n${yaml}\n---\n\n## Task\nx\n\n## Implementation\n- log\n`);
  }
  return dir;
}
function run(vault, args, planObj) {
  const planFile = path.join(vault, 'plan.json');
  if (planObj !== undefined) fs.writeFileSync(planFile, typeof planObj === 'string' ? planObj : JSON.stringify(planObj));
  return spawnSync(process.execPath, [SCRIPT, '--project', 'P', '--plan', planFile, ...args],
    { env: { ...process.env, ADMIN_BRAIN_VAULT: vault, ADMIN_BRAIN_TIER_MODELS: '' }, encoding: 'utf8' });
}
const read = (v, n) => fs.readFileSync(path.join(v, 'Cycles', `${n}.md`), 'utf8');
const PLAN = { feasibility: GO, tasks: [impl(), ver()] };

test('CLI: writes an implement/active cycle idempotently, preserving frontmatter', () => {
  const v = tmpVault({ '2026-01-01-a': { project: 'P', stage: 'implement', status: 'active', branch: 'auto/a' } });
  assert.equal(run(v, [], PLAN).status, 0);
  const once = read(v, '2026-01-01-a');
  assert.match(once, /branch: auto\/a/);
  assert.match(once, /orchestrated: true/);
  assert.match(once, /## Orchestration plan/);
  run(v, [], PLAN);
  assert.equal(read(v, '2026-01-01-a'), once);
});

test('CLI: wrong-stage cycle, malformed plan and --dry-run write nothing', () => {
  const v = tmpVault({ '2026-01-01-a': { project: 'P', stage: 'verify', status: 'verifying' } });
  const before = read(v, '2026-01-01-a');
  assert.equal(run(v, [], PLAN).status, 2);
  assert.equal(run(v, [], '{not json').status, 3);
  assert.equal(run(v, [], { feasibility: GO, tasks: [impl()] }).status, 3);
  assert.equal(run(v, ['--dry-run'], PLAN).status, 0);
  assert.equal(read(v, '2026-01-01-a'), before);
});

test('CLI: a BOM-prefixed plan (PowerShell 5.1) is accepted', () => {
  const v = tmpVault({ '2026-01-01-a': { project: 'P', stage: 'refine', status: 'approved' } });
  assert.equal(run(v, [], `﻿${JSON.stringify(PLAN)}`).status, 0);
});

test('F4: a newer non-writable cycle does not hide an older active one', () => {
  const v = tmpVault({
    '2026-01-01-old': { project: 'P', stage: 'implement', status: 'active' },
    '2026-02-01-new': { project: 'P', stage: 'refine', status: 'awaiting-approval' },
  });
  assert.equal(run(v, [], PLAN).status, 0);
  assert.match(read(v, '2026-01-01-old'), /## Orchestration plan/);
  assert.doesNotMatch(read(v, '2026-02-01-new'), /## Orchestration plan/);
});

test('CLI: --cycle for another project or a traversal path is refused', () => {
  const v = tmpVault({ '2026-01-01-q': { project: 'Q', stage: 'implement', status: 'active' } });
  assert.equal(run(v, ['--cycle', '2026-01-01-q'], PLAN).status, 2);
  assert.equal(run(v, ['--cycle', '../plan'], PLAN).status, 2);
  assert.doesNotMatch(read(v, '2026-01-01-q'), /Orchestration/);
});

test('CLI: env override is applied end to end', () => {
  const v = tmpVault({ '2026-01-01-a': { project: 'P', stage: 'implement', status: 'active' } });
  const planFile = path.join(v, 'plan.json');
  fs.writeFileSync(planFile, JSON.stringify(PLAN));
  execFileSync(process.execPath, [SCRIPT, '--project', 'P', '--plan', planFile],
    { env: { ...process.env, ADMIN_BRAIN_VAULT: v, ADMIN_BRAIN_TIER_MODELS: '{"standard":"opus"}' } });
  assert.match(read(v, '2026-01-01-a'), /\| T2 \|.*`opus`/);
});
