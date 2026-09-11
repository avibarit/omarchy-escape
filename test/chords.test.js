'use strict';
const assert = require('assert');
const { workspaceChord } = require('../js/chords.js');

let passed = 0, failed = 0;
function test(name, fn) {
  try { fn(); passed++; process.stdout.write('ok  ' + name + '\n'); }
  catch (err) { failed++; process.stdout.write('FAIL  ' + name + '\n  ' + err.stack + '\n'); }
}

test('Super+2 is workspace 2', () => {
  const r = workspaceChord({ key: '2', code: 'Digit2', shiftKey: false });
  assert.strictEqual(r.act, 'goto');
  assert.strictEqual(r.ws, 2);
});

test('Super+Shift+2 with key @ is movetoworkspace 2', () => {
  const r = workspaceChord({ key: '@', code: 'Digit2', shiftKey: true });
  assert.strictEqual(r.act, 'carry');
  assert.strictEqual(r.ws, 2);
});

test('Super+Shift+2 still carries when Shift is consumed into @', () => {
  const r = workspaceChord({ key: '@', code: 'Digit2', shiftKey: false });
  assert.strictEqual(r.act, 'carry');
  assert.strictEqual(r.ws, 2);
});

test('UK Super+Shift+2 with quotedbl is movetoworkspace 2', () => {
  const r = workspaceChord({ key: '"', code: 'Digit2', shiftKey: true });
  assert.strictEqual(r.act, 'carry');
  assert.strictEqual(r.ws, 2);
});

test('plain Super+Shift+2 with key 2 is movetoworkspace 2', () => {
  const r = workspaceChord({ key: '2', code: 'Digit2', shiftKey: true });
  assert.strictEqual(r.act, 'carry');
  assert.strictEqual(r.ws, 2);
});

process.stdout.write(passed + ' passed, ' + failed + ' failed\n');
if (failed) process.exit(1);
