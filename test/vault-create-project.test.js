import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';

const tempVault = fs.mkdtempSync(path.join(os.tmpdir(), 'admin-brain-vault-'));
process.env.ADMIN_BRAIN_VAULT = tempVault;

const { createProject, getProjects } = await import('../skills/vault/vault.js');

function resetVault() {
  fs.rmSync(tempVault, { recursive: true, force: true });
  fs.mkdirSync(path.join(tempVault, 'Projects'), { recursive: true });
}

test.beforeEach(resetVault);
test.after(() => fs.rmSync(tempVault, { recursive: true, force: true }));

test('creates a planned project with safe defaults through the vault accessor', async () => {
  const result = createProject({ name: 'Research Lab' });

  assert.deepEqual(result, { ok: true, project: 'Research Lab' });
  const note = fs.readFileSync(path.join(tempVault, 'Projects', 'research-lab.md'), 'utf8');
  assert.match(note, /type: project/);
  assert.match(note, /name: Research Lab/);
  assert.match(note, /status: planned/);
  assert.match(note, /health: gray/);
  assert.match(note, /priority: med/);
  assert.deepEqual((await getProjects()).map((project) => project.name), ['Research Lab']);
});

test('rejects empty, multiline, and duplicate project names without overwriting a note', () => {
  assert.equal(createProject({ name: '' }).ok, false);
  assert.equal(createProject({ name: 'One\nTwo' }).ok, false);
  assert.equal(createProject({ name: 'Research Lab' }).ok, true);
  assert.deepEqual(createProject({ name: 'research lab' }), { ok: false, error: 'a project with that name already exists' });
  assert.equal(fs.readdirSync(path.join(tempVault, 'Projects')).length, 1);
});
