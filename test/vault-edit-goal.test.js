import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';

// editProjectGoal renames a roadmap goal in place. Drive it through a temp vault (same pattern as
// vault-goal-kind) and assert both the returned result and the persisted plan-note text.
const tempVault = fs.mkdtempSync(path.join(os.tmpdir(), 'admin-brain-edit-'));
process.env.ADMIN_BRAIN_VAULT = tempVault;

const { projectGoals, editProjectGoal } = await import('../skills/vault/vault.js');

const PROJECTS = path.join(tempVault, 'Projects');
const PLANS = path.join(tempVault, 'Plans');

function seed(stepsBody) {
  fs.rmSync(tempVault, { recursive: true, force: true });
  fs.mkdirSync(PROJECTS, { recursive: true });
  fs.mkdirSync(PLANS, { recursive: true });
  fs.writeFileSync(path.join(PROJECTS, 'demo.md'), `---\ntype: project\nname: Demo\n---\n`);
  fs.writeFileSync(path.join(PLANS, 'demo-roadmap.md'),
    `---\ntype: plan\nkind: roadmap\nproject: Demo\n---\n\n## Steps\n${stepsBody}\n`);
}
const goal = (t) => projectGoals('Demo').find((g) => g.text === t);
const planText = () => fs.readFileSync(path.join(PLANS, 'demo-roadmap.md'), 'utf8');
test.after(() => fs.rmSync(tempVault, { recursive: true, force: true }));

test('renames a goal, preserving done state, meta, kind tag, and Delivered sub-lines', () => {
  seed([
    '- [x] Old improvement — near · high #improvement',
    '  - _Delivered (PR #9): the thing._',
    '- [ ] A checkpoint',
  ].join('\n'));
  assert.equal(editProjectGoal('Demo', 'Old improvement', 'New improvement').ok, true);
  const g = goal('New improvement');
  assert.ok(g, 'renamed goal is found by its new text');
  assert.equal(g.done, true);                 // done state kept
  assert.equal(g.meta, 'near · high');        // meta kept
  assert.equal(g.kind, 'improvement');        // kind tag kept
  const body = planText();
  assert.match(body, /- \[x\] New improvement — near · high #improvement$/m);
  assert.match(body, /_Delivered \(PR #9\): the thing\._/); // sub-line traveled with the goal
  assert.equal(goal('Old improvement'), undefined);
});

test('a same-text / same-case-different no-op rename is allowed; whitespace is trimmed', () => {
  seed('- [ ] Keepme');
  assert.equal(editProjectGoal('Demo', 'Keepme', 'Keepme').ok, true);   // exact no-op
  assert.equal(editProjectGoal('Demo', 'Keepme', '  Kept  ').ok, true); // trims
  assert.match(planText(), /- \[ \] Kept$/m);
});

test('rejects empty / multi-line new text and a collision with a DIFFERENT goal', () => {
  seed(['- [ ] Alpha', '- [ ] Beta'].join('\n'));
  assert.equal(editProjectGoal('Demo', 'Alpha', '   ').ok, false);        // empty
  assert.equal(editProjectGoal('Demo', 'Alpha', 'x\ny').ok, false);       // multi-line
  assert.equal(editProjectGoal('Demo', 'Alpha', 'Beta').ok, false);       // dup of another goal
  assert.equal(editProjectGoal('Demo', 'Alpha', 'BETA').ok, false);       // dup, case-insensitive
  // none of the rejects mutated the file
  assert.match(planText(), /- \[ \] Alpha$/m);
  assert.match(planText(), /- \[ \] Beta$/m);
});

test('rejects an unknown goal and an unknown project without writing', () => {
  seed('- [ ] Only');
  const before = planText();
  assert.equal(editProjectGoal('Demo', 'Missing', 'Whatever').ok, false);
  assert.equal(editProjectGoal('Nope', 'Only', 'Whatever').ok, false);
  assert.equal(planText(), before);
});
