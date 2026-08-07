// inbox skill — generates a deterministic morning brief and persists it to
// vault/Daily/<date>.md (type: daily). No LLM, no network, $0.

import { getProjects, needsAttention, healthCounts, today } from '../vault/vault.js';
import { readFolder, upsertNote, isMain } from '../../adapters/obsidian/index.js';

/** Open inbox captures (type: inbox, status: open). */
export function openInbox() {
  return readFolder('Inbox', 'inbox')
    .filter((n) => (n.data.status || 'open') === 'open')
    .map((n) => ({
      text: n.body || n.data.text || n.name,
      urgency: (n.data.urgency || 'normal').toLowerCase(),
      project: n.data.project || '',
    }));
}

/** One-paragraph portfolio summary. */
export function summaryParagraph(projects, inbox) {
  const h = healthCounts(projects);
  const n = (s) => projects.filter((p) => p.status === s).length;
  const attn = needsAttention(projects).length;
  const openHigh = inbox.filter((i) => i.urgency === 'high').length;
  const plural = (x, w) => `${x} ${w}${x === 1 ? '' : 's'}`;
  return (
    `${plural(n('active'), 'active project')}, ${n('planned')} planned, ${n('blocked')} blocked. ` +
    `Health ${h.green} green / ${h.yellow} yellow / ${h.red} red. ` +
    (attn ? `${plural(attn, 'item')} ${attn === 1 ? 'needs' : 'need'} attention. ` : 'Nothing urgent. ') +
    (openHigh ? `${plural(openHigh, 'high-urgency capture')} to triage.` : '')
  ).trim();
}

/** Top-3 focus items: high-urgency captures → active next actions → high-priority planned. */
export function focusToday(projects, inbox) {
  const focus = [];
  for (const i of inbox.filter((x) => x.urgency === 'high')) focus.push(`Triage: ${i.text}`);
  for (const p of projects.filter((p) => p.status === 'active')) if (p.next) focus.push(`${p.name}: ${p.next}`);
  for (const p of projects.filter((p) => p.status === 'planned' && p.priority === 'high'))
    focus.push(`Start ${p.name}: ${p.next || 'define scope'}`);
  return focus.slice(0, 3);
}

/** Build the Daily note { data, body } for a given date. */
export function buildDailyNote(projects, inbox, date = today()) {
  const focus = focusToday(projects, inbox);
  const attn = needsAttention(projects);
  const body = [
    '## Morning Brief',
    summaryParagraph(projects, inbox),
    '',
    '## Focus today',
    ...(focus.length ? focus.map((f) => `- ${f}`) : ['- (nothing queued)']),
    '',
    '## Needs attention',
    ...(attn.length ? attn.map((a) => `- ${a}`) : ['- none']),
  ].join('\n');
  return { data: { type: 'daily', date, brief_generated: new Date().toISOString().slice(0, 16) }, body };
}

// CLI: write today's morning brief to vault/Daily/<date>.md
if (isMain(import.meta.url)) {
  const projects = await getProjects();
  const { data, body } = buildDailyNote(projects, openInbox());
  const file = upsertNote('Daily', data.date, data, body);
  console.log(`Wrote morning brief -> ${file}\n`);
  console.log(body);
}
