/* tiling.js — Hyprland-style dwindle (BSP) + scrolling compositor.
   Works in the browser (window.Tiling) and in Node (module.exports). */
(function (root) {
  let _seq = 1;
  const DIRS = { left: [-1, 0], right: [1, 0], up: [0, -1], down: [0, 1] };
  const APPS = [
    { app: 'kitty', title: '~/omarchy' },
    { app: 'nvim', title: 'hyprland.conf' },
    { app: 'chromium', title: 'omarchy.org' },
    { app: 'btop', title: 'btop' },
    { app: 'yazi', title: '~/' },
    { app: 'signal', title: 'Signal' },
    { app: 'spotify', title: 'Spotify' },
    { app: 'obsidian', title: 'notes' },
  ];

  function uid() { return 'w' + (_seq++); }
  function pickApp(i) { return APPS[(i == null ? Math.floor(Math.random() * APPS.length) : i) % APPS.length]; }

  function makeWindow(opts) {
    opts = opts || {};
    const fallback = pickApp(opts.appIndex);
    return {
      id: opts.id || uid(),
      app: opts.app || fallback.app,
      title: opts.title || fallback.title,
      frag: !!opts.frag,
      exit: !!opts.exit,
      glitch: !!opts.glitch,
      corrupt: !!opts.corrupt,
      lastFocus: opts.lastFocus || 0,
      focus: !!opts.focus,
    };
  }

  function leaf(win) { return { type: 'leaf', win: win }; }
  function split(a, b, splitTop, ratio) {
    return { type: 'split', a: a, b: b, splitTop: !!splitTop, ratio: ratio == null ? 0.5 : ratio };
  }

  function leaves(room) {
    const out = [];
    function walk(n) {
      if (!n) return;
      if (n.type === 'leaf') out.push(n.win);
      else { walk(n.a); walk(n.b); }
    }
    walk(room && room.root);
    return out;
  }

  function focused(room) {
    if (!room || !room.focused) return null;
    return leaves(room).find(w => w.id === room.focused) || null;
  }

  function findLeaf(node, winId) {
    if (!node) return null;
    if (node.type === 'leaf') return node.win.id === winId ? node : null;
    return findLeaf(node.a, winId) || findLeaf(node.b, winId);
  }

  function findParent(node, child, parent) {
    if (!node) return null;
    if (node === child) return parent || null;
    if (node.type === 'leaf') return null;
    return findParent(node.a, child, node) || findParent(node.b, child, node);
  }

  function replaceChild(parent, oldNode, newNode) {
    if (parent.a === oldNode) parent.a = newNode;
    else parent.b = newNode;
  }

  function layoutBoxes(room, bounds) {
    bounds = bounds || { x: 0, y: 0, w: 1200, h: 700, gap: 8 };
    const gap = bounds.gap == null ? 8 : bounds.gap;
    const out = [];
    if (!room || !room.root) {
      room && (room._boxes = out);
      return out;
    }
    if (room.layout === 'scrolling') {
      const wins = leaves(room);
      const n = Math.max(1, wins.length);
      const inner = bounds.w - gap * (n - 1);
      const ww = inner / n;
      wins.forEach((win, i) => {
        out.push({
          win: win,
          x: bounds.x + i * (ww + gap),
          y: bounds.y,
          w: ww,
          h: bounds.h,
        });
      });
      room._boxes = out;
      return out;
    }
    function walk(n, box) {
      if (!n) return;
      if (n.type === 'leaf') {
        out.push({ win: n.win, x: box.x, y: box.y, w: box.w, h: box.h });
        return;
      }
      const g = gap;
      if (n.splitTop) {
        const h1 = Math.max(24, (box.h - g) * n.ratio);
        const h2 = Math.max(24, box.h - g - h1);
        walk(n.a, { x: box.x, y: box.y, w: box.w, h: h1 });
        walk(n.b, { x: box.x, y: box.y + h1 + g, w: box.w, h: h2 });
      } else {
        const w1 = Math.max(24, (box.w - g) * n.ratio);
        const w2 = Math.max(24, box.w - g - w1);
        walk(n.a, { x: box.x, y: box.y, w: w1, h: box.h });
        walk(n.b, { x: box.x + w1 + g, y: box.y, w: w2, h: box.h });
      }
    }
    walk(room.root, { x: bounds.x, y: bounds.y, w: bounds.w, h: bounds.h });
    room._boxes = out;
    return out;
  }

  function overlap(a1, a2, b1, b2) {
    return Math.min(a2, b2) - Math.max(a1, b1);
  }

  function neighbor(room, dir, bounds) {
    const boxes = layoutBoxes(room, bounds);
    const cur = boxes.find(b => b.win.id === room.focused);
    if (!cur) return null;
    const cx = cur.x + cur.w / 2, cy = cur.y + cur.h / 2;
    let best = null, bestScore = Infinity;
    for (const b of boxes) {
      if (b.win.id === cur.win.id) continue;
      const bx = b.x + b.w / 2, by = b.y + b.h / 2;
      let aligned = 0, ahead = false;
      if (dir === 'left') { ahead = bx < cx - 1; aligned = overlap(cur.y, cur.y + cur.h, b.y, b.y + b.h); }
      else if (dir === 'right') { ahead = bx > cx + 1; aligned = overlap(cur.y, cur.y + cur.h, b.y, b.y + b.h); }
      else if (dir === 'up') { ahead = by < cy - 1; aligned = overlap(cur.x, cur.x + cur.w, b.x, b.x + b.w); }
      else if (dir === 'down') { ahead = by > cy + 1; aligned = overlap(cur.x, cur.x + cur.w, b.x, b.x + b.w); }
      if (!ahead) continue;
      const dist = (bx - cx) * (bx - cx) + (by - cy) * (by - cy);
      const score = (aligned > 0 ? 0 : 1e9) + dist;
      if (score < bestScore) { bestScore = score; best = b.win; }
    }
    return best;
  }

  function focus(room, win, now) {
    if (!room || !win) return null;
    room.focused = win.id;
    win.lastFocus = now == null ? (win.lastFocus || 0) : now;
    return win;
  }

  function focusDir(room, dir, bounds, now) {
    const n = neighbor(room, dir, bounds);
    if (!n) return null;
    return focus(room, n, now);
  }

  function swapDir(room, dir, bounds) {
    const other = neighbor(room, dir, bounds);
    const curLeaf = findLeaf(room.root, room.focused);
    if (!other || !curLeaf) return false;
    const otherLeaf = findLeaf(room.root, other.id);
    if (!otherLeaf) return false;
    const tmp = curLeaf.win;
    curLeaf.win = otherLeaf.win;
    otherLeaf.win = tmp;
    room.focused = tmp.id;
    return true;
  }

  function splitTopFor(box) {
    if (!box) return false;
    return box.h > box.w;
  }

  function spawn(room, newWin, bounds) {
    newWin = newWin || makeWindow({ app: 'kitty' });
    if (!room.root) {
      room.root = leaf(newWin);
      room.focused = newWin.id;
      return newWin;
    }
    const curLeaf = findLeaf(room.root, room.focused) || findLeaf(room.root, leaves(room)[0].id);
    if (!curLeaf) {
      room.root = leaf(newWin);
      room.focused = newWin.id;
      return newWin;
    }
    const boxes = layoutBoxes(room, bounds);
    const box = boxes.find(b => b.win.id === curLeaf.win.id);
    const node = split(leaf(curLeaf.win), leaf(newWin), splitTopFor(box), 0.5);
    const parent = findParent(room.root, curLeaf, null);
    if (!parent) room.root = node;
    else replaceChild(parent, curLeaf, node);
    room.focused = newWin.id;
    return newWin;
  }

  function close(room, winId) {
    if (!room || !room.root) return false;
    const target = findLeaf(room.root, winId || room.focused);
    if (!target) return false;
    const parent = findParent(room.root, target, null);
    if (!parent) {
      room.root = null;
      room.focused = null;
      return true;
    }
    const sibling = parent.a === target ? parent.b : parent.a;
    const grand = findParent(room.root, parent, null);
    if (!grand) room.root = sibling;
    else replaceChild(grand, parent, sibling);
    const remain = leaves(room);
    if (!remain.length) room.focused = null;
    else if (!remain.some(w => w.id === room.focused) || room.focused === target.win.id) {
      const pick = sibling.type === 'leaf' ? sibling.win : remain[0];
      room.focused = pick.id;
    }
    return true;
  }

  function toggleSplit(room) {
    if (!room || !room.root || room.root.type === 'leaf') return false;
    const curLeaf = findLeaf(room.root, room.focused);
    if (!curLeaf) return false;
    const parent = findParent(room.root, curLeaf, null);
    if (!parent) return false;
    parent.splitTop = !parent.splitTop;
    return true;
  }

  function setLayout(room, layout) {
    room.layout = layout === 'scrolling' ? 'scrolling' : 'dwindle';
    return room.layout;
  }

  function moveWindow(src, dst, winId, opts) {
    opts = opts || {};
    const win = leaves(src).find(w => w.id === winId);
    if (!win) return false;
    close(src, winId);
    spawn(dst, win, opts.bounds);
    if (opts.follow === false) {
      /* stay on src; dst.focused already the moved window */
    }
    return true;
  }

  function corruptOldest(room) {
    const wins = leaves(room).filter(w => !w.exit);
    if (!wins.length) return null;
    const unfocused = wins.filter(w => w.id !== room.focused);
    const cleanUnfocused = unfocused.filter(w => !w.corrupt);
    if (cleanUnfocused.length) {
      cleanUnfocused.sort((a, b) => a.lastFocus - b.lastFocus);
      cleanUnfocused[0].corrupt = true;
      return cleanUnfocused[0];
    }
    if (unfocused.length) {
      unfocused.sort((a, b) => a.lastFocus - b.lastFocus);
      const v = unfocused[0];
      if (v.corrupt) v.glitch = true;
      else v.corrupt = true;
      return v;
    }
    const v = wins[0];
    if (v.corrupt) v.glitch = true;
    else v.corrupt = true;
    return v;
  }

  function findWin(rooms, pred) {
    for (const id of Object.keys(rooms || {})) {
      const room = rooms[id];
      const win = leaves(room).find(pred);
      if (win) return { room: room, win: win };
    }
    return null;
  }

  function makeRoom(id, opts) {
    opts = opts || {};
    const raw = (opts.windows && opts.windows.length)
      ? opts.windows
      : [makeWindow({ app: 'kitty' })];
    const windows = raw.map(w => (w && w.id) ? w : makeWindow(w));
    const room = {
      id: id,
      root: leaf(windows[0]),
      layout: opts.layout || 'dwindle',
      focused: windows[0].id,
    };
    const bounds = opts.bounds || { x: 0, y: 0, w: 1920, h: 1080, gap: 8 };
    for (let i = 1; i < windows.length; i++) {
      room.focused = windows[i - 1].id;
      spawn(room, windows[i], bounds);
    }
    const prefer = windows.find(w => w.focus) || windows[0];
    room.focused = prefer.id;
    prefer.lastFocus = 1;
    return room;
  }

  const Tiling = {
    APPS, DIRS,
    makeWindow, makeRoom, leaves, focused,
    layoutBoxes, focus, focusDir, neighbor, swapDir,
    spawn, close, toggleSplit, setLayout,
    moveWindow, corruptOldest, findWin,
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = Tiling;
  root.Tiling = Tiling;
})(typeof window !== 'undefined' ? window : (typeof globalThis !== 'undefined' ? globalThis : this));
