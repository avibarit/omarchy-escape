/* tiling.test.js — Hyprland-style dwindle/scrolling compositor */
'use strict';
const assert = require('assert');
const T = require('../js/tiling.js');

const WIDE = { x: 0, y: 0, w: 1200, h: 700, gap: 8 };

function ids(room) { return T.leaves(room).map(w => w.id); }
function boxOf(room, winId, bounds) {
  return T.layoutBoxes(room, bounds || WIDE).find(b => b.win.id === winId);
}

let passed = 0, failed = 0;
function test(name, fn) {
  try { fn(); passed++; process.stdout.write('ok  ' + name + '\n'); }
  catch (err) { failed++; process.stdout.write('FAIL  ' + name + '\n  ' + err.stack + '\n'); }
}

test('makeRoom tiles two windows side-by-side on a wide monitor (dwindle)', () => {
  const a = T.makeWindow({ app: 'kitty', title: 'term' });
  const b = T.makeWindow({ app: 'nvim', title: 'conf' });
  const room = T.makeRoom(1, { windows: [a, b] });
  assert.strictEqual(T.leaves(room).length, 2);
  const boxes = T.layoutBoxes(room, WIDE);
  assert.strictEqual(boxes.length, 2);
  const left = boxes.find(x => x.win.id === a.id);
  const right = boxes.find(x => x.win.id === b.id);
  assert.ok(left.w < WIDE.w * 0.7, 'first window is not full-width');
  assert.ok(Math.abs(left.x + left.w + WIDE.gap - right.x) < 2, 'windows share a vertical split');
  assert.ok(Math.abs(left.h - right.h) < 2, 'same height');
});

test('spawn splits the focused window and focuses the new client', () => {
  const a = T.makeWindow({ app: 'kitty' });
  const room = T.makeRoom(1, { windows: [a] });
  const spawned = T.spawn(room, T.makeWindow({ app: 'btop' }), WIDE);
  assert.ok(spawned);
  assert.strictEqual(T.leaves(room).length, 2);
  assert.strictEqual(room.focused, spawned.id);
});

test('close reflows: sibling takes the vacated space', () => {
  const a = T.makeWindow({ app: 'kitty' });
  const b = T.makeWindow({ app: 'nvim' });
  const room = T.makeRoom(1, { windows: [a, b] });
  T.close(room, b.id);
  assert.strictEqual(T.leaves(room).length, 1);
  const box = boxOf(room, a.id);
  assert.ok(box.w > WIDE.w * 0.9, 'remaining window is nearly full-width');
  assert.strictEqual(room.focused, a.id);
});

test('close of last window leaves an empty workspace', () => {
  const a = T.makeWindow({ app: 'kitty' });
  const room = T.makeRoom(1, { windows: [a] });
  T.close(room, a.id);
  assert.strictEqual(T.leaves(room).length, 0);
  assert.strictEqual(room.focused, null);
});

test('toggleSplit flips the parent from side-by-side to stacked', () => {
  const a = T.makeWindow({ app: 'kitty' });
  const b = T.makeWindow({ app: 'nvim' });
  const room = T.makeRoom(1, { windows: [a, b] });
  const before = T.layoutBoxes(room, WIDE);
  assert.ok(Math.abs(before[0].y - before[1].y) < 2, 'start side-by-side');
  const ok = T.toggleSplit(room);
  assert.ok(ok);
  const after = T.layoutBoxes(room, WIDE);
  assert.ok(Math.abs(after[0].x - after[1].x) < 2, 'after toggle they stack');
  assert.ok(Math.abs(after[0].y - after[1].y) > 20, 'different y');
});

test('focusDir picks the geometric neighbor, not tree order', () => {
  const a = T.makeWindow({ app: 'kitty' });
  const b = T.makeWindow({ app: 'nvim' });
  const room = T.makeRoom(1, { windows: [a, b] });
  room.focused = a.id;
  const next = T.focusDir(room, 'right', WIDE);
  assert.ok(next);
  assert.strictEqual(next.id, b.id);
  assert.strictEqual(room.focused, b.id);
});

test('focusDir returns null at the edge of the workspace', () => {
  const a = T.makeWindow({ app: 'kitty' });
  const room = T.makeRoom(1, { windows: [a] });
  const next = T.focusDir(room, 'left', WIDE);
  assert.strictEqual(next, null);
  assert.strictEqual(room.focused, a.id);
});

test('swapDir exchanges two windows; focus rides with the same client', () => {
  const a = T.makeWindow({ app: 'kitty' });
  const b = T.makeWindow({ app: 'nvim' });
  const room = T.makeRoom(1, { windows: [a, b] });
  room.focused = a.id;
  const ok = T.swapDir(room, 'right', WIDE);
  assert.ok(ok);
  assert.strictEqual(room.focused, a.id);
  const boxA = boxOf(room, a.id);
  const boxB = boxOf(room, b.id);
  assert.ok(boxA.x > boxB.x, 'focused kitty moved to the right');
});

test('scrolling layout places leaves in a single row', () => {
  const wins = [0, 1, 2].map(i => T.makeWindow({ app: 'kitty', title: String(i) }));
  const room = T.makeRoom(1, { windows: wins, layout: 'scrolling' });
  const boxes = T.layoutBoxes(room, WIDE);
  assert.strictEqual(boxes.length, 3);
  const ys = new Set(boxes.map(b => Math.round(b.y)));
  assert.strictEqual(ys.size, 1, 'all same y');
  const xs = boxes.map(b => b.x).sort((p, q) => p - q);
  assert.ok(xs[0] < xs[1] && xs[1] < xs[2]);
});

test('moveWindow carries a client to another workspace and follows', () => {
  const a = T.makeWindow({ app: 'kitty' });
  const b = T.makeWindow({ app: 'nvim', frag: true });
  const src = T.makeRoom(1, { windows: [a, b] });
  const dst = T.makeRoom(2, { windows: [T.makeWindow({ app: 'btop' })] });
  src.focused = b.id;
  T.moveWindow(src, dst, b.id, { follow: true });
  assert.ok(!ids(src).includes(b.id));
  assert.ok(ids(dst).includes(b.id));
  assert.strictEqual(dst.focused, b.id);
});

test('corruptOldest never stabs the focused client while others exist', () => {
  const a = T.makeWindow({ app: 'kitty' });
  const b = T.makeWindow({ app: 'nvim' });
  const room = T.makeRoom(1, { windows: [a, b] });
  room.focused = a.id;
  a.lastFocus = 50; b.lastFocus = 1;
  T.corruptOldest(room);
  T.corruptOldest(room);
  T.corruptOldest(room);
  assert.strictEqual(a.corrupt, false, 'focused kitty stays clean');
  assert.strictEqual(b.corrupt, true);
  assert.strictEqual(b.glitch, true);
});

test('corruptOldest skips the focused window when another target exists', () => {
  const a = T.makeWindow({ app: 'kitty' });
  const b = T.makeWindow({ app: 'nvim' });
  const room = T.makeRoom(1, { windows: [a, b] });
  room.focused = a.id;
  a.lastFocus = 100;
  b.lastFocus = 1;
  const victim = T.corruptOldest(room);
  assert.ok(victim);
  assert.strictEqual(victim.id, b.id);
  assert.strictEqual(b.corrupt, true);
  assert.strictEqual(a.corrupt, false);
});

test('three-window dwindle nests the latest split inside the focused pane', () => {
  const a = T.makeWindow({ app: 'kitty' });
  const b = T.makeWindow({ app: 'nvim' });
  const c = T.makeWindow({ app: 'btop' });
  const room = T.makeRoom(1, { windows: [a, b] });
  room.focused = b.id;
  T.spawn(room, c, WIDE);
  assert.strictEqual(T.leaves(room).length, 3);
  const boxes = T.layoutBoxes(room, WIDE);
  const boxA = boxes.find(x => x.win.id === a.id);
  const boxB = boxes.find(x => x.win.id === b.id);
  const boxC = boxes.find(x => x.win.id === c.id);
  assert.ok(boxA.w * boxA.h > boxB.w * boxB.h, 'unfocused first pane stays larger');
  const stacked = Math.abs(boxB.x - boxC.x) < 2 && boxB.h + boxC.h < boxA.h + 80;
  const sided = Math.abs(boxB.y - boxC.y) < 2 && boxB.w + boxC.w < boxA.w + 80;
  assert.ok(stacked || sided, 'b and c share a nested split');
});

test('findWin locates a fragment across rooms', () => {
  const frag = T.makeWindow({ app: 'nvim', frag: true });
  const r1 = T.makeRoom(1, { windows: [T.makeWindow({ app: 'kitty' })] });
  const r2 = T.makeRoom(2, { windows: [frag] });
  const hit = T.findWin({ 1: r1, 2: r2 }, w => w.frag);
  assert.ok(hit);
  assert.strictEqual(hit.win.id, frag.id);
  assert.strictEqual(hit.room.id, 2);
});

console.log('\n' + passed + ' passed, ' + failed + ' failed');
process.exit(failed ? 1 : 0);
