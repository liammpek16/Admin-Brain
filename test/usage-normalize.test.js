import assert from 'node:assert/strict';
import test from 'node:test';
import { normalizeUsage } from '../skills/usage/usage.js';

const NOW = Date.parse('2026-09-04T12:00:00Z');
const iso = (min) => new Date(NOW + min * 60000).toISOString();

test('native shape: computes msUntil + status and sorts soonest-first', () => {
  const u = normalizeUsage({ limits: [
    { name: 'weekly', resetsAt: iso(60 * 24) },   // ok  (1 day out)
    { name: '5h', resetsAt: iso(10), used: 120, limit: 200 }, // soon (<=15m)
    { name: 'passed', resetsAt: iso(-5) },         // reset (already past)
  ] }, NOW);
  assert.equal(u.configured, true);
  assert.deepEqual(u.limits.map((l) => l.name), ['passed', '5h', 'weekly']); // sorted by msUntil
  assert.deepEqual(u.limits.map((l) => l.status), ['reset', 'soon', 'ok']);
  const five = u.limits.find((l) => l.name === '5h');
  assert.equal(five.used, 120);
  assert.equal(five.limit, 200);
  assert.ok(Math.abs(five.msUntil - 10 * 60000) < 5);
});

test('status thresholds: exactly-now is reset, within 15m is soon, beyond is ok', () => {
  const u = normalizeUsage({ limits: [
    { name: 'now', resetsAt: iso(0) },
    { name: 'edge', resetsAt: iso(15) },
    { name: 'far', resetsAt: iso(16) },
  ] }, NOW);
  const s = Object.fromEntries(u.limits.map((l) => [l.name, l.status]));
  assert.equal(s.now, 'reset');
  assert.equal(s.edge, 'soon');
  assert.equal(s.far, 'ok');
});

test('Anthropic rate-limit header shape is accepted', () => {
  const u = normalizeUsage({
    'anthropic-ratelimit-5h-reset': iso(30),
    'anthropic-ratelimit-weekly-reset': iso(60 * 24 * 3),
    'x-other-header': 'ignored',
  }, NOW);
  assert.equal(u.configured, true);
  assert.deepEqual(u.limits.map((l) => l.name).sort(), ['5h', 'weekly']);
  assert.equal(u.limits.every((l) => typeof l.resetsAt === 'string'), true);
});

test('epoch seconds and epoch millis both parse', () => {
  const secs = Math.floor((NOW + 60000) / 1000);
  const u = normalizeUsage({ limits: [
    { name: 'secs', resetsAt: secs },
    { name: 'ms', resetsAt: NOW + 120000 },
  ] }, NOW);
  const secLimit = u.limits.find((l) => l.name === 'secs');
  assert.equal(secLimit.resetsAt, new Date(secs * 1000).toISOString());
});

test('empty / invalid / unparseable → not configured (never a fabricated time)', () => {
  assert.equal(normalizeUsage(null, NOW).configured, false);
  assert.equal(normalizeUsage(undefined, NOW).configured, false);
  assert.equal(normalizeUsage('nope', NOW).configured, false);
  assert.equal(normalizeUsage({ limits: [] }, NOW).configured, false);
  assert.equal(normalizeUsage({ limits: [{ name: 'x', resetsAt: 'not-a-date' }] }, NOW).configured, false);
  // a valid one alongside an invalid one keeps only the valid limit
  const mixed = normalizeUsage({ limits: [{ name: 'bad', resetsAt: 'zzz' }, { name: 'good', resetsAt: iso(5) }] }, NOW);
  assert.equal(mixed.configured, true);
  assert.deepEqual(mixed.limits.map((l) => l.name), ['good']);
});
