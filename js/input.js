/* input.js — real Super (Meta) handler with Alt shadow fallback.
   True Omarchy binding is always displayed as Super, even when Alt is used. */
(function () {
  const Game = () => window.OmarchyGame;
  let metaSeen = false;
  let altSeen = false;

  function superActive(e) {
    return e.metaKey || e.altKey; // real Super OR Alt-as-Super fallback
  }

  function pretty(e, actionLabel) {
    const el = document.getElementById('key-visual');
    if (el) el.innerHTML = '<b>' + actionLabel + '</b>';
  }

  function labelFor(m) {
    if (m.label) return m.label;
    const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);
    switch (m.act) {
      case 'focus': return 'Super + Arrow' + cap(m.dir || '');
      case 'swap': return 'Super + Shift + Arrow' + cap(m.dir || '');
      case 'goto': return 'Super + ' + m.ws;
      case 'carry': return 'Super + Shift + ' + m.ws;
      case 'next': return 'Super + Tab';
      case 'prev': return 'Super + Shift + Tab';
      case 'split': return 'Super + J';
      case 'fullscreen': return 'Super + F';
      case 'close': return 'Super + W';
      case 'help': return 'Super + K';
      case 'layout': return 'Super + L';
      case 'spawn': return 'Super + Enter';
      case 'launcher': return 'Super + Space';
      default: return 'Super + …';
    }
  }

  // Dedup: in the native app a single press can arrive twice (DOM keydown
  // + globalShortcut IPC echo). Same action within 150ms = one press.
  const __seen = new Map();
  function dispatch(m) {
    const key = m.act + '|' + (m.dir || '') + '|' + (m.ws || '');
    const now = (window.performance && performance.now()) || Date.now();
    if (__seen.has(key) && now - __seen.get(key) < 150) return;
    __seen.set(key, now);
    pretty(null, labelFor(m));
    const g = Game();
    if (g) g.handleShortcut(m);
  }

  function setSuperStatus() {
    const el = document.getElementById('super-status');
    if (!el) return;
    if (metaSeen) { el.textContent = '● real Super detected — authentic Omarchy mode'; el.className = 'ok'; }
    else if (altSeen) { el.textContent = '○ using Alt as Super fallback (HUD still teaches Super)'; el.className = 'warn'; }
    else { el.textContent = 'waiting for Super… (Alt works as fallback)'; el.className = 'warn'; }
    const cal = document.getElementById('calib-status');
    if (cal) {
      if (metaSeen) { cal.textContent = '✓ Super detected! You are in authentic mode.'; cal.style.color = '#3ee08a'; }
      else if (altSeen) { cal.textContent = 'Alt detected as fallback — game will still teach Super bindings.'; cal.style.color = '#ffb454'; }
    }
  }

  function match(e) {
    if (!superActive(e)) return null;
    if (e.metaKey) metaSeen = true;
    if (e.altKey && !e.metaKey) altSeen = true;
    setSuperStatus();

    const shift = e.shiftKey;
    const k = e.key;

    // Arrows
    if (k === 'ArrowLeft' || k === 'ArrowRight' || k === 'ArrowUp' || k === 'ArrowDown') {
      const dir = k.replace('Arrow', '').toLowerCase();
      return shift ? { act: 'swap', dir, label: 'Super + Shift + ' + k } : { act: 'focus', dir, label: 'Super + ' + k };
    }
    // Numbers 1-4 (also Numpad)
    if (['1', '2', '3', '4'].includes(k)) {
      return shift
        ? { act: 'carry', ws: +k, label: 'Super + Shift + ' + k }
        : { act: 'goto', ws: +k, label: 'Super + ' + k };
    }
    const low = (k || '').toLowerCase();
    if (k === 'Tab') return shift ? { act: 'prev', label: 'Super + Shift + Tab' } : { act: 'next', label: 'Super + Tab' };
    if (low === 'j') return { act: 'split', label: 'Super + J' };
    if (low === 'f') return { act: 'fullscreen', label: 'Super + F' };
    if (low === 'w') return { act: 'close', label: 'Super + W' };
    if (low === 'k') return { act: 'help', label: 'Super + K' };
    if (low === 'l') return { act: 'layout', label: 'Super + L' };
    if (k === 'Enter') return { act: 'spawn', label: 'Super + Enter' };
    if (k === ' ') return { act: 'launcher', label: 'Super + Space' };
    return null;
  }

  window.addEventListener('keydown', (e) => {
    const g = Game();
    // Launcher input / help typing: let plain keys through, but Esc closes
    if (e.key === 'Escape') { if (g) g.onEscape(); return; }
    if (document.activeElement && document.activeElement.id === 'launch-input') {
      if (e.key === 'Enter') { if (g) g.onLauncherSubmit(document.activeElement.value); e.preventDefault(); }
      return; // don't hijack typing numbers
    }
    const m = match(e);
    if (!m) return;
    // Don't block F5/Cmd+R refresh etc.
    try { e.preventDefault(); e.stopPropagation(); } catch (_) {}
    dispatch(m);
  }, { capture: true });

  // Fallback pad buttons + workspace pills
  window.addEventListener('DOMContentLoaded', () => {
    setSuperStatus();
    // Native app bridge: main process forwards real Super combos via IPC.
    if (window.electronAPI && window.electronAPI.onShortcut) {
      metaSeen = true; // Super works here by construction — no browser in the way
      const el = document.getElementById('super-status');
      if (el) { el.textContent = '● native app — real Super captured outside the browser (Cmd/Win)'; el.className = 'ok'; }
      const cal = document.getElementById('calib-status');
      if (cal) { cal.textContent = '✓ Native mode: Super combos go straight to the game.'; cal.style.color = '#3ee08a'; }
      window.electronAPI.onShortcut((m) => dispatch(m));
    }
    document.querySelectorAll('#pad button').forEach(b => {
      b.addEventListener('click', () => {
        const g = Game(); if (!g) return;
        const a = b.dataset.act;
        const map = {
          'focus-up': { act: 'focus-cycle' }, swap: { act: 'swap-fwd' },
          ws1: { act: 'goto', ws: 1 }, ws2: { act: 'goto', ws: 2 },
          ws3: { act: 'goto', ws: 3 }, ws4: { act: 'goto', ws: 4 },
          'carry1': { act: 'carry', ws: 1 }, 'carry2': { act: 'carry', ws: 2 },
          next: { act: 'next' }, prev: { act: 'prev' },
          split: { act: 'split' }, fullscreen: { act: 'fullscreen' },
          close: { act: 'close' }, spawn: { act: 'spawn' },
          launcher: { act: 'launcher' }, layout: { act: 'layout' },
        };
        if (map[a]) g.handleShortcut(map[a]);
      });
    });
    document.querySelectorAll('#workspaces .ws').forEach(b => {
      b.addEventListener('click', () => { const g = Game(); if (g) g.handleShortcut({ act: 'goto', ws: +b.dataset.ws }); });
    });
  });
})();
