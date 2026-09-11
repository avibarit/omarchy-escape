/* game.js — state, loop, rendering, objectives */
(function () {
  const COLS = 7, ROWS = 5;
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

  function newGame(levelIdx) {
    const L = window.LEVELS[levelIdx];
    const rooms = {};
    L.rooms.forEach(ws => { rooms[ws] = window.Tiling.makeRoom(ws, COLS, ROWS, { split: ws % 2 ? 'h' : 'v' }); });
    S = {
      levelIdx, L, rooms,
      player: { ws: L.start.ws, x: L.start.x, y: L.start.y, face: 'right' },
      hp: 100, energy: 100, time: 0,
      fragsGot: 0, fragsTotal: L.frags.length,
      collapseT: 0, tickCount: 0,
      shieldT: 0, shieldCD: 0, scrollT: 0, scrollCD: 0,
      over: false, paused: false,
      uses: {}, fails: {},
      exitPlaced: false,
    };
    // place frags + glitches
    L.frags.forEach(f => { const t = window.Tiling.tile(rooms[f.ws], f.x, f.y); if (t) t.frag = true; });
    (L.glitches || []).forEach(g => { const t = window.Tiling.tile(rooms[g.ws], g.x, g.y); if (t) t.glitch = true; });
    if (L.preCorrupt) {
      const r = rooms[1];
      for (let y = 0; y < ROWS; y++) { r.tiles[y][0].corrupt = true; }
      r.tiles[0][6].corrupt = true; r.tiles[4][6].corrupt = true;
    }
    resetTasks();
    $('overlay-title').classList.add('hidden');
    $('overlay-end').classList.add('hidden');
    $('overlay-help').classList.add('hidden');
    $('overlay-launch').classList.add('hidden');
    S.paused = false;
    log('<b>wm:</b> entered ' + L.name + ' — ' + L.objective);
    toast(L.name);
    window.Sfx.good();
    renderAll();
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

  function curRoom() { return S.rooms[S.player.ws]; }
  function use(name, ok) {
    S.uses[name] = (S.uses[name] || 0) + 1;
    if (!ok) S.fails[name] = (S.fails[name] || 0) + 1;
  }

  // ---------- actions ----------
  function doFocus(dir) {
    const d = window.Tiling.DIRS[dir]; if (!d) return;
    S.player.face = dir;
    const nx = S.player.x + d[0], ny = S.player.y + d[1];
    const r = curRoom();
    if (!window.Tiling.inBounds(r, nx, ny)) { use('focus', false); window.Sfx.bad(); toast('Edge of workspace — jump rooms instead'); return; }
    const t = window.Tiling.tile(r, nx, ny);
    if (t.glitch) { use('focus', false); window.Sfx.bad(); toast('👾 blocks focus — swap (Super+Shift+' + dir + ') or close (Super+W)'); return; }
    S.player.x = nx; S.player.y = ny;
    use('focus', true); window.Sfx.move();
    const mv = S.L.tasks.find(t => t.id === 'move4'); if (mv && mv.count < mv.need) bumpTask('move4');
    afterStep();
  }

  function doSwap(dir) {
    const d = window.Tiling.DIRS[dir || S.player.face]; if (!d) return;
    S.player.face = dir || S.player.face;
    const r = curRoom();
    const nx = S.player.x + d[0], ny = S.player.y + d[1];
    if (!window.Tiling.inBounds(r, nx, ny)) { use('swap', false); window.Sfx.bad(); return; }
    const a = window.Tiling.tile(r, S.player.x, S.player.y);
    const b = window.Tiling.tile(r, nx, ny);
    // swap contents (glitch/frag/exit/corrupt stay with tile? swap entities: glitch & frag move)
    const hadGlitch = b.glitch;
    const tmpG = a.glitch, tmpF = a.frag;
    a.glitch = b.glitch; a.frag = b.frag;
    b.glitch = tmpG; b.frag = tmpF;
    S.player.x = nx; S.player.y = ny;
    use('swap', true); window.Sfx.jump();
    log('<b>wm:</b> swapped window ' + (dir || 'fwd'));
    // swapping onto frag picks it up via afterStep; swapping a glitch away counts
    if (hadGlitch) bumpTask('swap');
    else if (S.L.tasks.find(t => t.id === 'swap') && !(S.L.tasks.find(t => t.id === 'swap').count >= 1)) {
      // allow swap movement to count too in L2? require glitch involvement — else hint
      toast('Swapped empty tiles — aim at 👾');
    }
    afterStep(true);
  }

  function gotoRoom(ws, viaCarry) {
    if (!S.rooms[ws]) { use(viaCarry ? 'carry' : 'goto', false); window.Sfx.bad(); toast('Room ' + ws + ' not in this level'); return; }
    const from = S.player.ws;
    S.player.ws = ws;
    // land on safest tile near center
    const r = curRoom();
    const safe = window.Tiling.safeTiles(r).filter(p => !window.Tiling.tile(r, p.x, p.y).glitch);
    let best = safe[0] || { x: 3, y: 2 };
    let bd = 1e9;
    safe.forEach(p => { const d = Math.abs(p.x - 3) + Math.abs(p.y - 2); if (d < bd) { bd = d; best = p; } });
    S.player.x = best.x; S.player.y = best.y;
    S.collapseT = 0;
    use(viaCarry ? 'carry' : 'goto', true); window.Sfx.jump();
    log('<b>wm:</b> ' + (viaCarry ? 'moved window to' : 'switched to') + ' workspace ' + ws);
    if (viaCarry && S.fragsGot > 0) bumpTask('carry');
    else if (viaCarry) toast('Carried window — grab ◆ first for full credit');
    if (from !== ws) {
      bumpTask('jump');
    } else if (!viaCarry) {
      toast('Already in Room ' + ws);
    }
    afterStep(true);
  }

  function doClose() {
    const r = curRoom();
    const d = window.Tiling.DIRS[S.player.face] || [1, 0];
    const spots = [
      { x: S.player.x, y: S.player.y },
      { x: S.player.x + d[0], y: S.player.y + d[1] },
    ];
    for (const p of spots) {
      const t = window.Tiling.tile(r, p.x, p.y);
      if (t && t.glitch) {
        t.glitch = false;
        use('close', true); window.Sfx.good();
        log('<b>wm:</b> closed window (killed glitch)');
        bumpTask('swap'); // L2 accepts swap OR close
        renderAll();
        checkComplete();
        return;
      }
    }
    use('close', false); window.Sfx.bad();
    toast('No 👾 here — face it first (Super+Arrow), then Super+W');
  }

  function doSpawn() {
    if (S.energy < 25) { use('spawn', false); window.Sfx.bad(); toast('Not enough ⚡ (need 25)'); return; }
    const r = curRoom();
    let fixed = 0;
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
      const t = window.Tiling.tile(r, S.player.x + dx, S.player.y + dy);
      if (t && t.corrupt) { t.corrupt = false; fixed++; }
    }
    S.energy -= 25;
    use('spawn', true); window.Sfx.good();
    log('<b>wm:</b> spawned terminal here (' + fixed + ' tiles repaired)');
    toast(fixed ? 'New window tiled +' + fixed + ' repaired' : 'New window tiled (area already clean)');
    bumpTask('spawn');
    renderAll();
  }

  function doSplit() {
    const fixed = window.Tiling.toggleSplit(curRoom());
    use('split', true); window.Sfx.jump();
    $('split-badge').textContent = 'split: ' + (curRoom().split === 'h' ? '══' : '║');
    log('<b>wm:</b> togglesplit → ' + curRoom().split);
    toast(fixed ? 'Split toggled, re-tiled 1 edge tile' : 'Split toggled');
    bumpTask('split');
    renderAll();
  }

  function doShield() {
    if (S.shieldCD > 0) { use('shield', false); toast('Shield cooldown ' + Math.ceil(S.shieldCD) + 's'); window.Sfx.bad(); return; }
    S.shieldT = 3; S.shieldCD = 20;
    use('shield', true); bumpTask('util'); window.Sfx.good();
    toast('Fullscreen shield — collapse frozen 3s');
    log('<b>wm:</b> fullscreen (shield 3s)');
  }

  function doLayout() {
    const r = curRoom();
    r.layout = r.layout === 'dwindle' ? 'scrolling' : 'dwindle';
    if (r.layout === 'scrolling') { S.scrollT = 10; S.scrollCD = 25; }
    use('layout', true); bumpTask('util'); window.Sfx.jump();
    $('layout-badge').textContent = r.layout;
    toast('Layout → ' + r.layout + (r.layout === 'scrolling' ? ' (collapse slowed 10s)' : ''));
    log('<b>wm:</b> workspace layout → ' + r.layout);
    renderAll();
  }

  function afterStep(skipPickup) {
    const r = curRoom();
    const t = window.Tiling.tile(r, S.player.x, S.player.y);
    if (t.frag) {
      t.frag = false; S.fragsGot++;
      use('frag', true); window.Sfx.good();
      log('<b>wm:</b> picked up fragment ' + S.fragsGot + '/' + S.fragsTotal);
      bumpTask('frag');
      if (S.fragsGot >= S.fragsTotal) placeExit();
    }
    if (t.exit) { bumpTask('exit'); }
    renderAll();
    checkComplete();
  }

  function placeExit() {
    if (S.exitPlaced) return;
    S.exitPlaced = true;
    const targetWs = S.L.exitRoom || S.player.ws;
    const r = S.rooms[targetWs];
    if (!r) return;
    // farthest safe non-glitch tile from player
    const safe = window.Tiling.safeTiles(r).filter(p => {
      const t = window.Tiling.tile(r, p.x, p.y);
      return !t.glitch && !t.frag;
    });
    let best = safe[0], bd = -1;
    safe.forEach(p => {
      const d = Math.abs(p.x - S.player.x) + Math.abs(p.y - S.player.y) + (p.ws === targetWs ? 0 : 0);
      if (d > bd) { bd = d; best = p; }
    });
    if (best) window.Tiling.tile(r, best.x, best.y).exit = true;
    const msg = S.L.exitRoom ? 'Exit open in Room ' + S.L.exitRoom + ' 🚪' : 'Exit open 🚪';
    toast(msg); log('<b>wm:</b> ' + msg);
  }

  function checkComplete() {
    if (!S || S.over) return;
    const done = S.L.tasks.every(t => t.count >= t.need);
    if (done) levelComplete();
  }

  function levelComplete() {
    S.over = true; S.paused = true;
    window.Sfx.good();
    const last = S.levelIdx >= window.LEVELS.length - 1;
    showEnd(true, last ? 'System secured — you think in tiles now.' : S.L.name + ' cleared.');
  }

  function died(reason) {
    if (S.over) return;
    S.over = true; S.paused = true;
    window.Sfx.alarm();
    showEnd(false, reason);
  }

  function showEnd(won, sub) {
    $('overlay-end').classList.remove('hidden');
    $('end-title').textContent = won ? '◈ Room survived' : '▓ Window closed by The Shrink';
    $('end-sub').textContent = sub;
    const acc = Object.keys(S.uses).map(k => {
      const u = S.uses[k], f = S.fails[k] || 0;
      return k + ': ' + (u - f) + '/' + u + ' clean';
    }).join('\n') || 'no shortcuts used?!';
    const hint = S.hp <= 0 ? 'Tip: don\'t stand on red — Super+Arrows early, Super+2 to flee.' : 'Tip: press Super+K anytime to review.';
    $('end-stats').textContent = S.L.name + ' · ' + Math.floor(S.time) + 's · HP ' + Math.max(0, Math.round(S.hp)) +
      '\n' + acc + '\n' + hint;
    $('btn-next').textContent = (S.levelIdx >= window.LEVELS.length - 1) ? 'Replay L6' : 'Next →';
  }

  // ---------- public shortcut entry ----------
  function handleShortcut(m) {
    if (!S) return;
    if (!$('overlay-title').classList.contains('hidden') && m.act !== 'help') {
      // allow starting via keyboard? require button for calibration honesty
      return;
    }
    if (m.act === 'help') { toggleHelp(); if (S) { use('help', true); bumpTask('help'); } return; }
    if (!$('overlay-help').classList.contains('hidden')) { toggleHelp(); return; }
    if (!$('overlay-launch').classList.contains('hidden')) return; // typing
    if (!$('overlay-end').classList.contains('hidden')) return;
    if (S.over || S.paused) return;

    switch (m.act) {
      case 'focus': doFocus(m.dir); break;
      case 'focus-cycle': doFocus(S.player.face === 'right' ? 'down' : 'right'); toast('Pad: used focus ' + S.player.face + ' (real: Super+Arrow)'); break;
      case 'swap': doSwap(m.dir); break;
      case 'swap-fwd': doSwap(S.player.face); break;
      case 'goto': gotoRoom(m.ws, false); break;
      case 'carry': gotoRoom(m.ws, true); break;
      case 'next': case 'prev': {
        const rooms = S.L.rooms.slice().sort();
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

  // ---------- loop ----------
  let lastT = 0;
  function loop(ts) {
    requestAnimationFrame(loop);
    if (!S || S.over || S.paused) { lastT = ts; return; }
    const dt = Math.min(0.1, (ts - lastT) / 1000 || 0.016);
    lastT = ts;
    S.time += dt;
    // cooldowns
    if (S.shieldT > 0) S.shieldT -= dt;
    if (S.shieldCD > 0) S.shieldCD -= dt;
    if (S.scrollT > 0) S.scrollT -= dt;
    if (S.scrollCD > 0) S.scrollCD -= dt;
    S.energy = Math.min(100, S.energy + 6 * dt);
    // collapse
    const L = S.L;
    if (L.collapseEvery > 0 && S.shieldT <= 0) {
      const speed = S.scrollT > 0 ? 0.5 : 1;
      S.collapseT += dt * speed;
      if (S.collapseT >= L.collapseEvery) {
        S.collapseT = 0;
        S.tickCount++;
        // current room always; others every 2nd tick (pressure follows you, home still rots)
        Object.values(S.rooms).forEach(r => {
          if (!L.rooms.includes(r.id)) return;
          if (r.id === S.player.ws || S.tickCount % 2 === 0) {
            const n = window.Tiling.collapseStep(r);
            if (n > 0 && r.id === S.player.ws) { window.Sfx.alarm(); log('<b>shrink:</b> room ' + r.id + ' lost ' + n + ' tiles'); }
          }
        });
        // doom markers
      }
    }
    // damage / regen
    const t = window.Tiling.tile(curRoom(), S.player.x, S.player.y);
    if (t && t.corrupt) {
      S.hp -= 18 * dt;
      if (Math.random() < dt * 4) window.Sfx.bad();
      if (S.hp <= 0) { S.hp = 0; renderAll(); died('You stood in corruption too long. Flee earlier: Super+Arrows, Super+2.'); return; }
    } else {
      S.hp = Math.min(100, S.hp + 2 * dt);
    }
    renderHUD(dt);
    // clock
    const mm = String(Math.floor(S.time / 60)).padStart(2, '0'), ss = String(Math.floor(S.time % 60)).padStart(2, '0');
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
        const total = r.cols * r.rows;
        const bad = r.tiles.flat().filter(t => t.corrupt).length;
        const pct = bad / total;
        b.classList.toggle('doom', pct > 0.5);
        const f = r.tiles.flat().filter(t => t.frag).length;
        dots = '◆'.repeat(f) + (S.player.ws === ws ? ' ◉' : '');
      }
      b.querySelector('.ws-dots').textContent = dots;
    });
    if (S) {
      $('layout-badge').textContent = curRoom().layout;
      $('split-badge').textContent = 'split: ' + (curRoom().split === 'h' ? '══ horizontal' : '║ vertical');
      $('room-name').textContent = 'Room ' + S.player.ws + ' — Workspace ' + S.player.ws + ' · ' + S.L.name;
    }
  }
  function renderBoard() {
    const board = $('board');
    const r = curRoom();
    board.style.setProperty('--cols', r.cols);
    board.style.setProperty('--rows', r.rows);
    board.classList.toggle('shield', S.shieldT > 0);
    board.classList.toggle('scrolling', S.scrollT > 0);
    board.innerHTML = '';
    for (let y = 0; y < r.rows; y++) for (let x = 0; x < r.cols; x++) {
      const t = r.tiles[y][x];
      const d = document.createElement('div');
      d.className = 'tile' + (t.corrupt ? ' corrupt' : '') + (t.exit ? ' exit' : '') + (t.glitch ? ' glitch-tile' : '');
      if (S.player.x === x && S.player.y === y) d.classList.add('player');
      d.setAttribute('role', 'gridcell');
      let s = '';
      if (S.player.x === x && S.player.y === y) s += '◉';
      if (t.glitch) s += '👾';
      else if (t.frag) s += '◆';
      else if (t.exit) s += '🚪';
      else if (t.corrupt) s += '▓';
      d.textContent = s;
      board.appendChild(d);
    }
  }
  function renderHUD(dt) {
    if (!S) return;
    $('hp').textContent = Math.max(0, Math.round(S.hp));
    $('energy').textContent = Math.round(S.energy);
    $('frags').textContent = S.fragsGot + '/' + S.fragsTotal;
    const L = S.L;
    const pct = L.collapseEvery > 0 ? Math.min(100, (S.collapseT / L.collapseEvery) * 100) : 0;
    $('collapse-bar').style.width = pct + '%';
    if ((S._wsT = (S._wsT || 0) + (dt || 0)) > 0.5 || !dt) { renderWsBar(); S._wsT = 0; }
    if (S.shieldCD > 0 || S.shieldT > 0) { /* could show */ }
  }

  // ---------- wire ----------
  window.addEventListener('DOMContentLoaded', () => {
    $('btn-start').addEventListener('click', () => { newGame(0); });
    $('btn-how').addEventListener('click', () => $('how-text').classList.toggle('hidden'));
    $('btn-close-help').addEventListener('click', toggleHelp);
    $('btn-help').addEventListener('click', toggleHelp);
    $('btn-mute').addEventListener('click', (e) => {
      const m = window.Sfx.toggleMute();
      e.target.textContent = m ? '🔇' : '🔊';
    });
    $('btn-next').addEventListener('click', () => {
      const n = S.levelIdx >= window.LEVELS.length - 1 ? window.LEVELS.length - 1 : S.levelIdx + 1;
      newGame(n);
    });
    $('btn-retry').addEventListener('click', () => newGame(S.levelIdx));
    requestAnimationFrame(loop);
  });

  window.OmarchyGame = { handleShortcut, onEscape, onLauncherSubmit, newGame, get state() { return S; } };
})();
