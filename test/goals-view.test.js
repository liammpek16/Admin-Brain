import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';
import test from 'node:test';

// The board sort/partition rule ships in the browser file hud/public/goals-view.js. Load that exact
// file in a sandbox (window:{}) and exercise the functions it exposes — no DOM/fetch needed.
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const src = fs.readFileSync(path.join(__dirname, '..', 'hud', 'public', 'goals-view.js'), 'utf8');
const ctx = { window: {} };
vm.runInContext(src, vm.createContext(ctx));
const { sortGoalsForDisplay, partitionCompleted } = ctx.window;

const g = (text, done) => ({ text, done, kind: 'checkpoint' });
// The helpers run in the vm realm, so their arrays are a different realm's Array — rebuild the
// projected texts in THIS realm (via Array.from) so strict deepEqual compares by value cleanly.
const texts = (arr) => Array.from(arr, (x) => x.text);

test('the browser file exposes the helpers', () => {
  assert.equal(typeof sortGoalsForDisplay, 'function');
  assert.equal(typeof partitionCompleted, 'function');
});

test('partitionCompleted splits into open/done, preserving input order in each bucket', () => {
  const { open, done } = partitionCompleted([g('a', false), g('b', true), g('c', false), g('d', true)]);
  assert.deepEqual(texts(open), ['a', 'c']);
  assert.deepEqual(texts(done), ['b', 'd']);
});

test('sortGoalsForDisplay puts all open goals first, all completed last — stably', () => {
  const input = [g('done1', true), g('open1', false), g('done2', true), g('open2', false)];
  assert.deepEqual(texts(sortGoalsForDisplay(input)), ['open1', 'open2', 'done1', 'done2']);
});

test('already-sorted and all-one-bucket inputs are unchanged; order within a bucket is stable', () => {
  assert.deepEqual(texts(sortGoalsForDisplay([g('o1', false), g('o2', false), g('d1', true)])), ['o1', 'o2', 'd1']);
  assert.deepEqual(texts(sortGoalsForDisplay([g('o1', false), g('o2', false)])), ['o1', 'o2']);
  assert.deepEqual(texts(sortGoalsForDisplay([g('d1', true), g('d2', true)])), ['d1', 'd2']);
});

test('empty / non-array input is handled without throwing', () => {
  // (vm-sandbox arrays are a different realm, so assert on shape/length, not deepEqual against [])
  assert.equal(sortGoalsForDisplay([]).length, 0);
  assert.equal(sortGoalsForDisplay(undefined).length, 0);
  const parts = partitionCompleted(null);
  assert.equal(parts.open.length, 0);
  assert.equal(parts.done.length, 0);
});
