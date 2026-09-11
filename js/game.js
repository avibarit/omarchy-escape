/* game.js — Hyprland session survival: state, dispatchers, loop, render */
(function () {
  const T = () => window.Tiling;
  const MAX_CLIENTS = 8;
  const GAP = 8;
  let S = null;

  const $ = (id) => document.getElementById(id);
  function log(msg) {
    const el = $('log'); if (!el) return;
    const d = document.createElement('div');
    d.innerHTML = msg;
    el.prepend(d);
    while (el.children.length > 30) el.lastChild.remove();
  }
  function toast(msg, ms) {
    const t = $('toast'); if (!t) return;
    t.textContent = msg; t.classList.remove('hidden');
    clearTimeout(t._h); t._h = setTimeout(() => t.classList.add('hidden'), ms || 2200);
  }
  function bounds() {
    const el = $('board');
    if (!el) return { x: 0, y: 0, w: 1200, h: 700, gap: GAP };
    const r = el.getBoundingClientRect();
    return { x: 0, y: 0, w: Math.max(240, r.width), h: Math.max(160, r.height), gap: GAP };
  }
  function curRoom() { return S.rooms[S.player.ws]; }
  function dsp(name) { log('<b>wm:</b> dispatcher <span class="dsp">' + name + '</span>'); }

  function use(name, ok) {
    S.uses[name] = (S.uses[name] || 0) + 1;
    if (!ok) {
      S.fails[name] = (S.fails[name] || 0) + 1;
      S.combo = 0;
    } else if (name !== 'help') {
      if (S.time - S.comboT < 1.4) S.combo++;
      else S.combo = 1;
      S.comboT = S.time;
      S.comboBest = Math.max(S.comboBest || 0, S.combo);
    }
  }

  function newGame(levelIdx) {
    const L = window.LEVELS[levelIdx];
    const rooms = {};
    L.rooms.forEach(ws => {
      const windows = (L.setup && L.setup[ws]) ? L.setup[ws].map(w => T().makeWindow(w)) : [T().makeWindow({ app: 'kitty' })];
      rooms[ws] = T().makeRoom(ws, { windows: windows, bounds: { x: 0, y: 0, w: 1600, h: 900, gap: GAP } });
    });
    S = {
      levelIdx, L, rooms,
      player: { ws: L.startWs || L.rooms[0] },
      hp: 100, energy: 100, time: 0,
      fragsGot: 0, fragsTotal: L.frags ? L.frags.length : countFrags(rooms),
      collapseT: 0, tickCount: 0,
      shieldT: 0, shieldCD: 0, scrollT: 0, scrollCD: 0,
      over: false, paused: false,
      uses: {}, fails: {},
      exitPlaced: false,
      combo: 0, comboT: -99, comboBest: 0,
    };
    resetTasks();
    ['overlay-title', 'overlay-end', 'overlay-help', 'overlay-launch'].forEach(id => $(id).classList.add('hidden'));
    S.paused = false;
    log('<b>wm:</b> session ' + L.name + ' — ' + L.objective);
    toast(L.name);
    window.Sfx.good();
    afterFocus();
  }

  function countFrags(rooms) {
    let n = 0;
    Object.keys(rooms).forEach(id => {
      T().leaves(rooms[id]).forEach(w => { if (w.frag) n++; });
    });
    return n;
  }

  function resetTasks() {
    S.L.tasks.forEach(t => t.count = 0);
    renderTasks();
  }
  function bumpTask(id, n) {
    const t = S.L.tasks.find(t => t.id === id);
    if (!t) return;
    t.count = Math.min(t.need, t.count + (n || 1));
    renderTasks();
    checkComplete();
  }
  function renderTasks() {
    const ul = $('tasks'); ul.innerHTML = '';
    S.L.tasks.forEach(t => {
      const li = document.createElement('li');
      li.textContent = t.text + ' (' + t.count + '/' + t.need + ')';
      if (t.count >= t.need) li.className = 'done';
      ul.appendChild(li);
    });
    $('objective-text').textContent = S.L.objective;
    $('level-label').textContent = S.L.name.split(' ')[0];
  }

  function afterFocus() {
    const r = curRoom();
    const w = T().focused(r);
    if (!w) { renderAll(); checkComplete(); return; }
    w.lastFocus = S.time;
    if (w.frag) {
      w.frag = false; S.fragsGot++;
      use('frag', true); window.Sfx.good();
      dsp('exec grab-key (' + S.fragsGot + '/' + S.fragsTotal + ')');
      bumpTask('frag');
      if (S.fragsGot >= S.fragsTotal && S.L.tasks.some(t => t.id === 'exit')) placeExit();
    }
    if (w.exit) bumpTask('exit');
    renderAll();
    checkComplete();
  }

  function placeExit() {
    if (S.exitPlaced) return;
    S.exitPlaced = true;
    const targetWs = S.L.exitRoom || S.player.ws;
    const r = S.rooms[targetWs];
    if (!r) return;
    const exitWin = T().makeWindow({ app: 'wlogout', title: 'exit session', exit: true });
    if (T().leaves(r).length >= MAX_CLIENTS) {
      const host = T().leaves(r).find(w => !w.glitch) || T().leaves(r)[0];
      if (host) { host.exit = true; host.title = 'wlogout'; host.app = 'wlogout'; }
    } else {
      const keep = r.focused;
      T().spawn(r, exitWin, bounds());
      if (S.player.ws !== targetWs) r.focused = keep;
    }
    const msg = 'wlogout opened on workspace ' + targetWs;
    toast(msg); dsp('exec wlogout');
  }

  function checkComplete() {
    if (!S || S.over) return;
    if (S.L.tasks.every(t => t.count >= t.need)) levelComplete();
  }

  function levelComplete() {
    S.over = true; S.paused = true;
    window.Sfx.good();
    const last = S.levelIdx >= window.LEVELS.length - 1;
    showEnd(true, last ? 'Session locked in. You think in dwindle trees now.' : S.L.name + ' cleared.');
  }

  function died(reason) {
    if (S.over) return;
    S.over = true; S.paused = true;
    window.Sfx.alarm();
    showEnd(false, reason);
  }

  function showEnd(won, sub) {
    $('overlay-help').classList.add('hidden');
    $('overlay-launch').classList.add('hidden');
    $('overlay-end').classList.remove('hidden');
    $('end-title').textContent = won ? '◈ Session survived' : '▓ killactive — The Shrink';
    $('end-sub').textContent = sub;
    const acc = Object.keys(S.uses).map(k => {
      const u = S.uses[k], f = S.fails[k] || 0;
      return k + ': ' + (u - f) + '/' + u + ' clean';
    }).join('\n') || 'no dispatchers fired';
    const hint = S.hp <= 0
      ? 'Tip: unused windows rot. Super+Arrows to cycle, Super+2 to flee, Super+W to kill leaks.'
      : 'Tip: Super+K anytime. Super+Enter splits. Super+J togglesplit.';
    $('end-stats').textContent = S.L.name + ' · ' + Math.floor(S.time) + 's · HP ' + Math.max(0, Math.round(S.hp)) +
      ' · combo best ×' + (S.comboBest || 0) + '\n' + acc + '\n' + hint;
    $('btn-next').textContent = (S.levelIdx >= window.LEVELS.length - 1) ? 'Replay L6' : 'Next →';
  }

  // ---------- dispatchers ----------
  function doFocus(dir) {
    const r = curRoom();
    if (!T().leaves(r).length) {
      use('focus', false); window.Sfx.bad();
      toast('Empty workspace — Super+Enter to exec kitty');
      return;
    }
    const n = T().focusDir(r, dir, bounds(), S.time);
    if (!n) {
      use('focus', false); window.Sfx.bad();
      toast('No client ' + dir + ' — Super+1–4 to change workspace');
      return;
    }
    use('focus', true); window.Sfx.move();
    dsp('movefocus ' + dir[0]);
    const mv = S.L.tasks.find(t => t.id === 'move4');
    if (mv && mv.count < mv.need) bumpTask('move4');
    afterFocus();
  }

  function doSwap(dir) {
    const r = curRoom();
    const face = dir || 'right';
    const neighbor = T().neighbor(r, face, bounds());
    const hadGlitch = !!(neighbor && neighbor.glitch);
    const ok = T().swapDir(r, face, bounds());
    if (!ok) {
      use('swap', false); window.Sfx.bad();
      toast('Nothing to swap ' + face + ' — face a neighbor first');
      return;
    }
    use('swap', true); window.Sfx.jump();
    dsp('swapwindow ' + face[0]);
    if (hadGlitch) bumpTask('swap');
    else if (S.L.tasks.find(t => t.id === 'swap') && S.L.tasks.find(t => t.id === 'swap').count < 1) {
      toast('Swapped — aim at the leaky client (dashed border)');
    }
    afterFocus();
  }

  function gotoRoom(ws, viaCarry) {
    if (!S.rooms[ws]) {
      use(viaCarry ? 'carry' : 'goto', false); window.Sfx.bad();
      toast('Workspace ' + ws + ' not in this session');
      return;
    }
    const from = S.player.ws;
    const src = S.rooms[from];
    if (viaCarry) {
      const moving = T().focused(src);
      if (!moving) {
        use('carry', false); window.Sfx.bad();
        toast('No focused window to move');
        return;
      }
      if (from === ws) {
        use('carry', false); toast('Already on workspace ' + ws);
        return;
      }
      T().moveWindow(src, S.rooms[ws], moving.id, { follow: true, bounds: bounds() });
      S.player.ws = ws;
      use('carry', true); window.Sfx.jump();
      dsp('movetoworkspace ' + ws);
      bumpTask('carry');
      if (from !== ws) bumpTask('jump');
      S.collapseT = 0;
      afterFocus();
      return;
    }
    S.player.ws = ws;
    S.collapseT = 0;
    use('goto', true); window.Sfx.jump();
    dsp('workspace ' + ws);
    if (from !== ws) bumpTask('jump');
    else toast('Already on workspace ' + ws);
    afterFocus();
  }

  function doClose() {
    const r = curRoom();
    const w = T().focused(r);
    if (!w) {
      use('close', false); window.Sfx.bad();
      toast('Empty workspace — Super+Enter to spawn');
      return;
    }
    if (w.frag) {
      w.frag = false; S.fragsGot++;
      bumpTask('frag');
      if (S.fragsGot >= S.fragsTotal && S.L.tasks.some(t => t.id === 'exit')) placeExit();
    }
    const wasGlitch = w.glitch;
    const wasExit = w.exit;
    T().close(r, w.id);
    use('close', true); window.Sfx.good();
    dsp('killactive');
    if (wasGlitch) bumpTask('swap');
    if (wasExit) bumpTask('exit');
    toast(wasGlitch ? 'Leaked client killed — tree reflowed' : 'killactive — layout reflowed');
    afterFocus();
  }

  function doSpawn() {
    if (S.energy < 25) { use('spawn', false); window.Sfx.bad(); toast('Not enough ⚡ (need 25)'); return; }
    const r = curRoom();
    if (T().leaves(r).length >= MAX_CLIENTS) {
      use('spawn', false); window.Sfx.bad(); toast('Workspace packed (8 clients) — Super+W to close one');
      return;
    }
    const prev = T().focused(r);
    let repaired = false;
    if (prev && prev.corrupt) { prev.corrupt = false; repaired = true; }
    S.energy -= 25;
    const n = T().leaves(r).length + 1;
    T().spawn(r, T().makeWindow({ app: 'kitty', title: 'tty' + n }), bounds());
    use('spawn', true); window.Sfx.good();
    dsp('exec kitty');
    toast(repaired ? 'kitty tiled — repaired the pane you split' : 'kitty tiled — dwindle split the focused pane');
    bumpTask('spawn');
    afterFocus();
  }

  function doSplit() {
    const r = curRoom();
    if (r.layout === 'scrolling') {
      use('split', false); window.Sfx.bad();
      toast('togglesplit is dwindle-only — Super+L back to dwindle');
      return;
    }
    const ok = T().toggleSplit(r);
    if (!ok) {
      use('split', false); window.Sfx.bad();
      toast('Need two clients to togglesplit — Super+Enter');
      return;
    }
    use('split', true); window.Sfx.jump();
    dsp('layoutmsg togglesplit');
    toast('togglesplit — stacked ↔ side');
    bumpTask('split');
    renderAll();
  }

  function doShield() {
    if (S.shieldCD > 0) { use('shield', false); toast('Fullscreen cooldown ' + Math.ceil(S.shieldCD) + 's'); window.Sfx.bad(); return; }
    const w = T().focused(curRoom());
    if (!w) { use('shield', false); window.Sfx.bad(); toast('No window to fullscreen'); return; }
    S.shieldT = 3; S.shieldCD = 20;
    use('shield', true); bumpTask('fullscreen'); bumpTask('util'); window.Sfx.good();
    dsp('fullscreen 0');
    toast('Fullscreen — Shrink paused 3s');
    renderAll();
  }

  function doLayout() {
    const r = curRoom();
    const next = r.layout === 'dwindle' ? 'scrolling' : 'dwindle';
    T().setLayout(r, next);
    if (next === 'scrolling') { S.scrollT = 10; S.scrollCD = 25; }
    use('layout', true); bumpTask('layout'); bumpTask('util'); window.Sfx.jump();
    dsp('exec omarchy-workspace-layout-toggle');
    toast('Layout → ' + next + (next === 'scrolling' ? ' (Shrink slowed 10s)' : ''));
    renderAll();
  }

  function handleShortcut(m) {
    if (!S) return;
    if (!$('overlay-title').classList.contains('hidden') && m.act !== 'help') return;
    if (m.act === 'help') { toggleHelp(); if (S) { use('help', true); bumpTask('help'); } return; }
    if (!$('overlay-help').classList.contains('hidden')) { toggleHelp(); return; }
    if (!$('overlay-launch').classList.contains('hidden')) return;
    if (!$('overlay-end').classList.contains('hidden')) return;
    if (S.over || S.paused) return;

    switch (m.act) {
      case 'focus': doFocus(m.dir); break;
      case 'focus-cycle': doFocus('right'); toast('Pad: movefocus r (real: Super+Arrow)'); break;
      case 'swap': doSwap(m.dir); break;
      case 'swap-fwd': doSwap('right'); break;
      case 'goto': gotoRoom(m.ws, false); break;
      case 'carry': gotoRoom(m.ws, true); break;
      case 'next': case 'prev': {
        const rooms = S.L.rooms.slice().sort((a, b) => a - b);
        let i = rooms.indexOf(S.player.ws);
        i = m.act === 'next' ? (i + 1) % rooms.length : (i - 1 + rooms.length) % rooms.length;
        gotoRoom(rooms[i], false);
        break;
      }
      case 'split': doSplit(); break;
      case 'fullscreen': doShield(); break;
      case 'close': doClose(); break;
      case 'spawn': doSpawn(); break;
      case 'launcher': openLauncher(); bumpTask('util'); use('launcher', true); break;
      case 'layout': doLayout(); break;
    }
    renderAll();
  }

  function toggleHelp() {
    const h = $('overlay-help');
    const opening = h.classList.contains('hidden');
    h.classList.toggle('hidden');
    if (S) S.paused = !h.classList.contains('hidden') || !$('overlay-end').classList.contains('hidden');
    if (opening) window.Sfx.jump();
  }
  function openLauncher() {
    $('overlay-launch').classList.remove('hidden');
    S.paused = true;
    const inp = $('launch-input');
    inp.value = '';
    setTimeout(() => inp.focus(), 0);
    window.Sfx.jump();
    dsp('exec omarchy-launch-walker');
  }
  function onEscape() {
    if (!S) { $('overlay-help').classList.add('hidden'); $('overlay-launch').classList.add('hidden'); return; }
    if (!$('overlay-launch').classList.contains('hidden')) { $('overlay-launch').classList.add('hidden'); S.paused = false; }
    else if (!$('overlay-help').classList.contains('hidden')) toggleHelp();
  }
  function onLauncherSubmit(v) {
    const n = parseInt(String(v).trim(), 10);
    $('overlay-launch').classList.add('hidden');
    S.paused = false;
    if ([1, 2, 3, 4].includes(n)) { gotoRoom(n, false); renderAll(); }
    else toast('Launcher: type 1–4');
  }

  function focusClient(id) {
    if (!S || S.over || S.paused) return;
    const r = curRoom();
    const w = T().leaves(r).find(x => x.id === id);
    if (!w) return;
    T().focus(r, w, S.time);
    use('focus', true); window.Sfx.move();
    dsp('movefocus (click)');
    const mv = S.L.tasks.find(t => t.id === 'move4');
    if (mv && mv.count < mv.need) bumpTask('move4');
    afterFocus();
  }

  // ---------- loop ----------
  let lastT = 0;
  function loop(ts) {
    requestAnimationFrame(loop);
    if (!S || S.over || S.paused) { lastT = ts; return; }
    const dt = Math.min(0.1, (ts - lastT) / 1000 || 0.016);
    lastT = ts;
    S.time += dt;
    if (S.shieldT > 0) S.shieldT -= dt;
    if (S.shieldCD > 0) S.shieldCD -= dt;
    if (S.scrollT > 0) S.scrollT -= dt;
    if (S.scrollCD > 0) S.scrollCD -= dt;
    S.energy = Math.min(100, S.energy + (6 + Math.min(8, S.combo)) * dt);

    const L = S.L;
    if (L.collapseEvery > 0 && S.shieldT <= 0) {
      const speed = (S.scrollT > 0 ? 0.5 : 1) * (S.combo >= 4 ? 0.75 : 1);
      S.collapseT += dt * speed;
      if (S.collapseT >= L.collapseEvery) {
        S.collapseT = 0;
        S.tickCount++;
        Object.values(S.rooms).forEach(r => {
          if (!L.rooms.includes(r.id)) return;
          if (r.id === S.player.ws || S.tickCount % 2 === 0) {
            const victim = T().corruptOldest(r);
            if (victim && r.id === S.player.ws) {
              window.Sfx.alarm();
              log('<b>shrink:</b> ' + victim.app + ' ' + (victim.glitch ? 'forked' : 'corrupted'));
            }
            const glitches = T().leaves(r).filter(w => w.glitch);
            if (glitches.length && T().leaves(r).length < MAX_CLIENTS && S.tickCount % 3 === 0 && r.id === S.player.ws) {
              const keep = r.focused;
              T().spawn(r, T().makeWindow({ app: 'zsh', title: 'fork-' + S.tickCount, glitch: true }), bounds());
              r.focused = keep;
              if (r.id === S.player.ws) toast('Leaky client forked — Super+W');
            }
          }
        });
      }
    }

    const r = curRoom();
    const f = T().focused(r);
    if (!f) {
      S.hp -= 4 * dt;
    } else if (f.glitch) {
      S.hp -= 10 * dt;
      if (Math.random() < dt * 3) window.Sfx.bad();
    } else if (f.corrupt) {
      S.hp -= 8 * dt;
      if (Math.random() < dt * 2) window.Sfx.bad();
    } else {
      S.hp = Math.min(100, S.hp + 3 * dt);
    }
    if (S.hp <= 0) {
      S.hp = 0; renderAll();
      died(!f
        ? 'Empty workspace. Super+Enter to spawn, Super+2 to flee.'
        : (f.glitch
          ? 'You stayed on a leaky client. Super+W killactive, or Super+Arrows off it.'
          : 'You stayed on a rotting window. Cycle focus, spawn a clean kitty, or jump workspaces.'));
      return;
    }
    renderHUD(dt);
    const mm = String(Math.floor(S.time / 60)).padStart(2, '0');
    const ss = String(Math.floor(S.time % 60)).padStart(2, '0');
    $('clock').textContent = mm + ':' + ss;
  }

  // ---------- render ----------
  function renderAll() { renderBoard(); renderHUD(0); renderTasks(); renderWsBar(); }

  function renderWsBar() {
    document.querySelectorAll('#workspaces .ws').forEach(b => {
      const ws = +b.dataset.ws;
      b.classList.toggle('active', S && S.player.ws === ws);
      const inLevel = S && S.L.rooms.includes(ws);
      b.style.opacity = inLevel ? '1' : '0.3';
      const r = S && S.rooms[ws];
      let dots = '';
      if (r && inLevel) {
        const wins = T().leaves(r);
        const bad = wins.filter(w => w.corrupt || w.glitch).length;
        b.classList.toggle('doom', wins.length && bad / Math.max(1, wins.length) > 0.5);
        b.classList.toggle('occupied', wins.length > 0);
        const f = wins.filter(w => w.frag).length;
        dots = (wins.length ? String(wins.length) : '·') + (f ? ' ◆' : '') + (S.player.ws === ws ? '' : '');
      }
      b.querySelector('.ws-dots').textContent = dots;
    });
    if (S) {
      const r = curRoom();
      const f = T().focused(r);
      $('layout-badge').textContent = r.layout;
      $('split-badge').textContent = r.layout === 'scrolling' ? 'scrolling row' : 'dwindle bsp';
      $('room-name').textContent = 'workspace ' + S.player.ws + ' · ' + S.L.name;
      const wt = $('win-title');
      if (wt) wt.textContent = f ? (f.app + '  —  ' + f.title) : '(empty workspace)';
    }
  }

  function clientBody(win) {
    if (win.glitch) {
      return '<pre class="noise">SIGSEGV in wayland\n0x7fff' + win.id + '\nleak leak leak\n&lt;defunct&gt;</pre>';
    }
    if (win.exit) {
      return '<div class="exit-body"><div class="exit-mark">⏻</div><div>wlogout</div><div class="dim">focus to end session</div></div>';
    }
    const bodies = {
      kitty: '<pre>avi@omarchy:~$\n<span class="acc">❯</span> </pre>',
      nvim: '<pre><span class="ln"> 1</span> <span class="kw">dwindle</span> {\n<span class="ln"> 2</span>   preserve_split = <span class="acc">true</span>\n<span class="ln"> 3</span> }</pre>',
      chromium: '<div class="chrome"><div class="url">https://omarchy.org</div><div class="page">Omarchy · Hyprland desktop</div></div>',
      btop: '<pre>cpu  <span class="bar"></span> 34%\nmem  <span class="bar dim"></span> 61%\n<span class="acc">●</span> hyprland</pre>',
      yazi: '<pre>~/ \n  hypr/\n  <span class="acc">key.frag</span>\n  bin/</pre>',
      signal: '<pre>Signal\n  · 2 unread</pre>',
      spotify: '<pre>Spotify\n▶ tiling playlist</pre>',
      obsidian: '<pre># notes\n- Super+J togglesplit</pre>',
      wlogout: '<div class="exit-body"><div class="exit-mark">⏻</div><div>wlogout</div></div>',
      zsh: '<pre>zsh: abort</pre>',
    };
    let html = bodies[win.app] || ('<pre>' + win.app + '</pre>');
    if (win.corrupt) html = '<pre class="rot">I/O error\nclient unresponsive\nSuper+Enter to respawn</pre>';
    return html;
  }

  function renderBoard() {
    const board = $('board');
    const r = curRoom();
    const empty = $('empty-ws');
    const wins = T().leaves(r);
    board.classList.toggle('shield', S.shieldT > 0);
    board.classList.toggle('scrolling', r.layout === 'scrolling' || S.scrollT > 0);
    if (empty) empty.classList.toggle('hidden', wins.length > 0);

    const existing = new Map();
    board.querySelectorAll('.client').forEach(el => existing.set(el.dataset.id, el));

    let boxes;
    const b = bounds();
    if (S.shieldT > 0 && T().focused(r)) {
      const f = T().focused(r);
      boxes = [{ win: f, x: 0, y: 0, w: b.w, h: b.h }];
    } else {
      boxes = T().layoutBoxes(r, b);
    }

    const seen = new Set();
    boxes.forEach(box => {
      const win = box.win;
      seen.add(win.id);
      let el = existing.get(win.id);
      if (!el) {
        el = document.createElement('article');
        el.className = 'client';
        el.dataset.id = win.id;
        el.setAttribute('role', 'group');
        board.appendChild(el);
      }
      el.classList.toggle('focused', r.focused === win.id);
      el.classList.toggle('corrupt', !!win.corrupt && !win.glitch);
      el.classList.toggle('glitch', !!win.glitch);
      el.classList.toggle('exit', !!win.exit);
      el.classList.toggle('has-frag', !!win.frag);
      el.style.left = (box.x / b.w * 100) + '%';
      el.style.top = (box.y / b.h * 100) + '%';
      el.style.width = (box.w / b.w * 100) + '%';
      el.style.height = (box.h / b.h * 100) + '%';
      const badge = win.frag ? '<span class="frag-badge" title="key fragment">◆</span>' : '';
      el.innerHTML =
        '<header class="client-bar"><span class="app">' + win.app + '</span>' +
        '<span class="title">' + win.title + '</span>' + badge + '</header>' +
        '<div class="client-body">' + clientBody(win) + '</div>';
    });
    existing.forEach((el, id) => { if (!seen.has(id)) el.remove(); });
  }

  function renderHUD(dt) {
    if (!S) return;
    $('hp').textContent = Math.max(0, Math.round(S.hp));
    $('energy').textContent = Math.round(S.energy);
    $('frags').textContent = S.fragsGot + '/' + S.fragsTotal;
    const combo = $('combo');
    if (combo) {
      combo.textContent = S.combo >= 2 ? '×' + S.combo : '';
      combo.classList.toggle('hot', S.combo >= 4);
    }
    const L = S.L;
    const pct = L.collapseEvery > 0 ? Math.min(100, (S.collapseT / L.collapseEvery) * 100) : 0;
    $('collapse-bar').style.width = pct + '%';
    const wrap = $('collapse-bar-wrap');
    if (wrap) {
      wrap.title = L.collapseEvery > 0
        ? ('Shrink in ' + Math.max(0, L.collapseEvery - S.collapseT).toFixed(1) + 's')
        : 'Shrink off';
    }
    if ((S._wsT = (S._wsT || 0) + (dt || 0)) > 0.4 || !dt) { renderWsBar(); S._wsT = 0; }
  }

  window.addEventListener('DOMContentLoaded', () => {
    $('btn-start').addEventListener('click', () => { newGame(0); });
    $('btn-how').addEventListener('click', () => $('how-text').classList.toggle('hidden'));
    $('btn-close-help').addEventListener('click', () => handleShortcut({ act: 'help' }));
    $('btn-help').addEventListener('click', () => handleShortcut({ act: 'help' }));
    $('btn-mute').addEventListener('click', (e) => {
      const m = window.Sfx.toggleMute();
      e.target.textContent = m ? 'sound off' : 'sound on';
    });
    $('btn-next').addEventListener('click', () => {
      const n = S.levelIdx >= window.LEVELS.length - 1 ? window.LEVELS.length - 1 : S.levelIdx + 1;
      newGame(n);
    });
    $('btn-retry').addEventListener('click', () => newGame(S.levelIdx));
    $('board').addEventListener('click', (e) => {
      const el = e.target.closest('.client');
      if (el) focusClient(el.dataset.id);
    });
    window.addEventListener('resize', () => { if (S && !S.over) renderBoard(); });
    requestAnimationFrame(loop);
  });

  window.OmarchyGame = { handleShortcut, onEscape, onLauncherSubmit, newGame, toast, get state() { return S; } };
})();
