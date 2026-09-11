/* input.js — real Super (Meta/Mod4) handler with Alt shadow fallback.
   True Omarchy binding is always displayed as Super, even when Alt is used.
   On Omarchy the native GTK host injects Super chords while the window is
   focused (Hyprland submap omarchy-escape). */
(function () {
  const Game = () => window.OmarchyGame;
  let metaSeen = false;
  let altSeen = false;
  let superHeld = false;
  let superGrabbed = true;

  function modifierSuper(e) {
    try {
      return !!(e.metaKey || e.getModifierState('Meta') || e.getModifierState('OS') || e.getModifierState('Super'));
    } catch (_) {
      return !!e.metaKey;
    }
  }

  function superActive(e) {
    return modifierSuper(e) || superHeld || e.altKey;
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

  function nativeHost() {
    return !!(window.OmarchyNative && window.OmarchyNative.platform === 'omarchy');
  }

  function canControlSuper() {
    return nativeHost() || !!(window.electronAPI && window.electronAPI.unlockSuper);
  }

  function nativeCall(cmd) {
    try {
      if (window.OmarchyNative && typeof window.OmarchyNative[cmd] === 'function') {
        window.OmarchyNative[cmd]();
        return true;
      }
    } catch (_) {}
    try {
      if (window.webkit && window.webkit.messageHandlers && window.webkit.messageHandlers.omarchy) {
        window.webkit.messageHandlers.omarchy.postMessage(cmd);
        return true;
      }
    } catch (_) {}
    try {
      if (window.electronAPI && typeof window.electronAPI[cmd] === 'function') {
        window.electronAPI[cmd]();
        return true;
      }
    } catch (_) {}
    return false;
  }

  function updateSuperButtons() {
    const label = superGrabbed ? 'Unlock Super' : 'Grab Super';
    const title = superGrabbed
      ? 'Release Super so Super+W closes this window'
      : 'Give Super back to the trainer';
    ['btn-super', 'btn-unlock-title', 'btn-unlock-help'].forEach((id) => {
      const el = document.getElementById(id);
      if (!el) return;
      el.textContent = label;
      el.title = title;
      el.classList.toggle('released', !superGrabbed);
    });
  }

  function setGrabbed(on, opts) {
    const next = !!on;
    const changed = next !== superGrabbed;
    superGrabbed = next;
    if (window.OmarchyNative) window.OmarchyNative.superGrabbed = superGrabbed;
    setSuperStatus();
    updateSuperButtons();
    if (changed && opts && opts.toast) {
      const g = Game();
      if (g && g.toast) {
        g.toast(superGrabbed
          ? 'Super grabbed — chords go to the trainer'
          : 'Super restored — Super+W closes this window');
      }
    }
  }

  function setSuperStatus() {
    const el = document.getElementById('super-status');
    if (!el) return;
    if (canControlSuper() && !superGrabbed) {
      el.textContent = '○ Super released — Super+W closes this window. Grab Super to train again.';
      el.className = 'released';
    } else if (nativeHost() && metaSeen) {
      el.textContent = '● Super is yours — Unlock Super (or Super+Escape), then Super+W closes the app';
      el.className = 'ok';
    } else if (metaSeen) {
      el.textContent = '● real Super detected — authentic Omarchy mode';
      el.className = 'ok';
    } else if (altSeen) {
      el.textContent = '○ using Alt as Super fallback (HUD still teaches Super)';
      el.className = 'warn';
    } else if (nativeHost()) {
      el.textContent = 'waiting for Super… Unlock Super or Super+Escape, then Super+W closes this window';
      el.className = 'warn';
    } else {
      el.textContent = 'waiting for Super… (Alt works as fallback)';
      el.className = 'warn';
    }
    const cal = document.getElementById('calib-status');
    if (cal) {
      if (metaSeen) { cal.textContent = '✓ Super detected — authentic Omarchy mode.'; cal.style.color = 'var(--ok, #3ee08a)'; }
      else if (altSeen) { cal.textContent = 'Alt detected as fallback — HUD still teaches Super.'; cal.style.color = 'var(--warn, #ffb454)'; }
    }
  }

  function match(e) {
    if (e.key === 'Meta' || e.key === 'OS' || e.key === 'Super' || e.code === 'MetaLeft' || e.code === 'MetaRight' || e.code === 'OSLeft' || e.code === 'OSRight') {
      superHeld = true;
      metaSeen = true;
      setSuperStatus();
      return null;
    }
    if (!superActive(e)) return null;
    if (modifierSuper(e) || superHeld) metaSeen = true;
    if (e.altKey && !modifierSuper(e) && !superHeld) altSeen = true;
    setSuperStatus();

    const shift = e.shiftKey;
    const k = e.key;
    if (canControlSuper() && !superGrabbed) {
      if ((k || '').toLowerCase() === 'w') nativeCall('quit');
      return null;
    }

    // Arrows
    if (k === 'ArrowLeft' || k === 'ArrowRight' || k === 'ArrowUp' || k === 'ArrowDown') {
      const dir = k.replace('Arrow', '').toLowerCase();
      return shift ? { act: 'swap', dir, label: 'Super + Shift + ' + k } : { act: 'focus', dir, label: 'Super + ' + k };
    }
    // Super+Shift+2 is movetoworkspace. Shift+2 types @/" so e.key is not "2";
    // physical Digit/Numpad codes still are.
    const wsChord = window.OmarchyChords && window.OmarchyChords.workspaceChord(e);
    if (wsChord) return wsChord;
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

  window.addEventListener('keyup', (e) => {
    if (e.key === 'Meta' || e.key === 'OS' || e.key === 'Super' || e.code === 'MetaLeft' || e.code === 'MetaRight' || e.code === 'OSLeft' || e.code === 'OSRight') {
      superHeld = false;
    }
  }, { capture: true });

  window.addEventListener('blur', () => { superHeld = false; });

  window.addEventListener('keydown', (e) => {
    const g = Game();
    // Super+Escape releases Super to Hyprland so Super+W can close the app.
    if (e.key === 'Escape' && superActive(e) && canControlSuper()) {
      nativeCall('unlockSuper');
      setGrabbed(false, { toast: true });
      try { e.preventDefault(); e.stopPropagation(); } catch (_) {}
      return;
    }
    // Launcher input / help typing: let plain keys through, but Esc closes
    if (e.key === 'Escape') { if (g) g.onEscape(); return; }
    if (document.activeElement && document.activeElement.id === 'launch-input') {
      if (e.key === 'Enter') { if (g) g.onLauncherSubmit(document.activeElement.value); e.preventDefault(); }
      return; // don't hijack typing numbers
    }
    const m = match(e);
    if (!m) return;
    try { e.preventDefault(); e.stopPropagation(); } catch (_) {}
    dispatch(m);
  }, { capture: true });

  // Fallback pad buttons + workspace pills
  window.__omarchyDispatch = function (m) {
    if (!m) return;
    if (m.fromNative || m.super) {
      metaSeen = true;
      setSuperStatus();
    }
    dispatch(m);
  };

  window.__omarchySuperGrab = function (on) {
    setGrabbed(on);
  };

  window.addEventListener('DOMContentLoaded', () => {
    if (canControlSuper()) {
      document.querySelectorAll('.native-only').forEach((el) => el.classList.remove('hidden'));
    }
    const toggleGrab = () => {
      if (superGrabbed) {
        nativeCall('unlockSuper');
        setGrabbed(false, { toast: true });
      } else {
        nativeCall('lockSuper');
        setGrabbed(true, { toast: true });
      }
    };
    ['btn-super', 'btn-unlock-title', 'btn-unlock-help'].forEach((id) => {
      const el = document.getElementById(id);
      if (el) el.addEventListener('click', toggleGrab);
    });
    const quit = () => nativeCall('quit');
    const q1 = document.getElementById('btn-quit');
    const q2 = document.getElementById('btn-quit-title');
    if (q1) q1.addEventListener('click', quit);
    if (q2) q2.addEventListener('click', quit);

    setGrabbed(superGrabbed);
    if (nativeHost()) {
      const cal = document.getElementById('calib-status');
      if (cal) {
        cal.textContent = 'Native Omarchy window. Hold Super and press → to confirm. Unlock Super then Super+W to quit.';
        cal.style.color = 'var(--ok, #3ee08a)';
      }
    }
    if (window.electronAPI && window.electronAPI.onShortcut) {
      metaSeen = true;
      window.electronAPI.onShortcut((m) => dispatch(m));
    }
    document.querySelectorAll('#pad button').forEach(b => {
      b.addEventListener('click', () => {
        const g = Game(); if (!g) return;
        const a = b.dataset.act;
        const map = {
          'focus-left': { act: 'focus', dir: 'left' },
          'focus-right': { act: 'focus', dir: 'right' },
          'focus-up': { act: 'focus', dir: 'up' },
          'focus-down': { act: 'focus', dir: 'down' },
          'focus-cycle': { act: 'focus-cycle' },
          swap: { act: 'swap-fwd' },
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
