/* tiling.js — Room model: dwindle grid, corruption (Shrink), swap/spawn/split */
(function () {
  const DIRS = { left: [-1, 0], right: [1, 0], up: [0, -1], down: [0, 1] };

  function makeRoom(id, cols, rows, opts) {
    opts = opts || {};
    const tiles = [];
    for (let y = 0; y < rows; y++) {
      const row = [];
      for (let x = 0; x < cols; x++) row.push({ corrupt: false, glitch: false, frag: false, exit: false });
      tiles.push(row);
    }
    return { id, cols, rows, tiles, split: opts.split || 'h', layout: 'dwindle', edgeStep: 0 };
  }

  function inBounds(room, x, y) { return x >= 0 && y >= 0 && x < room.cols && y < room.rows; }
  function tile(room, x, y) { return inBounds(room, x, y) ? room.tiles[y][x] : null; }

  // The Shrink: corrupt the next outer ring edge. Returns count newly corrupted.
  function collapseStep(room) {
    // order depends on split to make Super+J meaningful: h eats L/R first, v eats T/B first
    const orders = room.split === 'h'
      ? ['right', 'left', 'bottom', 'top']
      : ['bottom', 'top', 'right', 'left'];
    const idx = room.edgeStep % 4;
    // find first edge with any safe tile in the preferred order, else any edge
    const candidates = [...orders.slice(idx), ...orders.slice(0, idx)];
    for (const edge of candidates) {
      let newly = 0;
      if (edge === 'right') { const x = rightEdge(room); if (x >= 0) newly = corruptCol(room, x); }
      if (edge === 'left') { const x = leftEdge(room); if (x >= 0) newly = corruptCol(room, x); }
      if (edge === 'bottom') { const y = bottomEdge(room); if (y >= 0) newly = corruptRow(room, y); }
      if (edge === 'top') { const y = topEdge(room); if (y >= 0) newly = corruptRow(room, y); }
      if (newly > 0) { room.edgeStep++; return newly; }
    }
    // everything corrupt: eat random safe tile if any left
    room.edgeStep++;
    return 0;
  }
  function rightEdge(r) { for (let x = r.cols - 1; x >= 0; x--) if (colHasSafe(r, x)) return x; return -1; }
  function leftEdge(r) { for (let x = 0; x < r.cols; x++) if (colHasSafe(r, x)) return x; return -1; }
  function bottomEdge(r) { for (let y = r.rows - 1; y >= 0; y--) if (rowHasSafe(r, y)) return y; return -1; }
  function topEdge(r) { for (let y = 0; y < r.rows; y++) if (rowHasSafe(r, y)) return y; return -1; }
  function colHasSafe(r, x) { for (let y = 0; y < r.rows; y++) if (!r.tiles[y][x].corrupt) return true; return false; }
  function rowHasSafe(r, y) { for (let x = 0; x < r.cols; x++) if (!r.tiles[y][x].corrupt) return true; return false; }
  function corruptCol(r, x) { let n = 0; for (let y = 0; y < r.rows; y++) if (!r.tiles[y][x].corrupt) { r.tiles[y][x].corrupt = true; n++; } return n; }
  function corruptRow(r, y) { let n = 0; for (let x = 0; x < r.cols; x++) if (!r.tiles[y][x].corrupt) { r.tiles[y][x].corrupt = true; n++; } return n; }

  // Super+J: toggle split + repair the least-corrupt edge (re-tile flavor)
  function toggleSplit(room) {
    room.split = room.split === 'h' ? 'v' : 'h';
    // repair one corrupt tile on the safest edge
    let best = null;
    for (let y = 0; y < room.rows; y++) for (let x = 0; x < room.cols; x++) {
      const t = room.tiles[y][x];
      if (t.corrupt) {
        const edgeDist = Math.min(x, y, room.cols - 1 - x, room.rows - 1 - y);
        if (!best || edgeDist > best.d) best = { x, y, d: edgeDist };
      }
    }
    if (best) { room.tiles[best.y][best.x].corrupt = false; return best; }
    return null;
  }

  function safeTiles(room) {
    const out = [];
    for (let y = 0; y < room.rows; y++) for (let x = 0; x < room.cols; x++)
      if (!room.tiles[y][x].corrupt) out.push({ x, y });
    return out;
  }

  window.Tiling = { makeRoom, tile, inBounds, collapseStep, toggleSplit, safeTiles, DIRS };
})();
