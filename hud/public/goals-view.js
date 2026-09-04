// Pure, framework-free goal-view helpers shared by the HUD board and its tests.
// Loaded as a classic <script> before app.js (so `sortGoalsForDisplay` is a global there); the
// node test loads this same file in a `vm` sandbox and calls the functions directly. No DOM, no
// fetch — just data in, data out — so the sort/partition rule is verifiable without a browser.

// Stable partition of a goal list into { open, done } preserving each goal's input order.
function partitionCompleted(goals) {
  const open = [];
  const done = [];
  for (const g of Array.isArray(goals) ? goals : []) (g && g.done ? done : open).push(g);
  return { open, done };
}

// Display order: all OPEN goals first (in their stored order), then all COMPLETED goals last —
// a stable sort that never reorders within a bucket. Display-only; the roadmap file is untouched.
function sortGoalsForDisplay(goals) {
  const { open, done } = partitionCompleted(goals);
  return open.concat(done);
}

// Expose on window for the classic-script HUD; harmless under the test's vm sandbox (window:{}).
if (typeof window !== 'undefined') {
  window.partitionCompleted = partitionCompleted;
  window.sortGoalsForDisplay = sortGoalsForDisplay;
}
