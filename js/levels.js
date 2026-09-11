/* levels.js — L0..L6 data-driven tutorial */
(function () {
  // pos helpers: {x,y}
  const LEVELS = [
    {
      id: 0, name: 'L0 — Calibration', collapseEvery: 0,
      rooms: [1],
      start: { ws: 1, x: 3, y: 2 },
      frags: [{ ws: 1, x: 4, y: 2 }],
      glitches: [],
      exitAfterFrags: false,
      objective: 'Learn to move. Hold Super and use ←↑↓→ to step onto ◆.',
      tasks: [
        { id: 'move4', text: 'Move focus 4 times (Super+Arrows)', need: 4, count: 0 },
        { id: 'help', text: 'Open the cheat sheet (Super+K) and close it', need: 1, count: 0 },
        { id: 'frag', text: 'Pick up 1 fragment ◆', need: 1, count: 0 },
      ]
    },
    {
      id: 1, name: 'L1 — The Shrink wakes', collapseEvery: 6.0,
      rooms: [1],
      start: { ws: 1, x: 3, y: 2 },
      frags: [{ ws: 1, x: 5, y: 1 }, { ws: 1, x: 1, y: 3 }],
      glitches: [],
      objective: 'Edges corrupt every 6s. Grab 2 ◆ with Super+Arrows, then reach the green exit.',
      tasks: [
        { id: 'frag', text: 'Collect 2 fragments', need: 2, count: 0 },
        { id: 'exit', text: 'Reach the exit tile', need: 1, count: 0 },
      ]
    },
    {
      id: 2, name: 'L2 — Swap it away', collapseEvery: 7.0,
      rooms: [1],
      start: { ws: 1, x: 1, y: 2 },
      frags: [{ ws: 1, x: 5, y: 2 }],
      // wall of glitches with one swappable gap logic: glitches block focus
      glitches: [{ ws: 1, x: 3, y: 1 }, { ws: 1, x: 3, y: 2 }, { ws: 1, x: 3, y: 3 }],
      objective: 'Glitches (👾) block focus. Face one and press Super+Shift+Arrow to swap, or Super+W to close.',
      tasks: [
        { id: 'swap', text: 'Swap OR close a glitch (Super+Shift+Arrow / Super+W)', need: 1, count: 0 },
        { id: 'frag', text: 'Collect 1 fragment', need: 1, count: 0 },
        { id: 'exit', text: 'Reach the exit', need: 1, count: 0 },
      ]
    },
    {
      id: 3, name: 'L3 — Jump, the room dies', collapseEvery: 3.5,
      rooms: [1, 2],
      start: { ws: 1, x: 3, y: 2 },
      frags: [{ ws: 2, x: 3, y: 2 }],
      glitches: [],
      objective: 'Room 1 collapses fast. Jump with Super+2 (or Super+Tab) before it eats you.',
      tasks: [
        { id: 'jump', text: 'Jump to Room 2 (Super+2 / Super+Tab)', need: 1, count: 0 },
        { id: 'frag', text: 'Collect 1 fragment in Room 2', need: 1, count: 0 },
        { id: 'exit', text: 'Reach the exit', need: 1, count: 0 },
      ]
    },
    {
      id: 4, name: 'L4 — Carry the key', collapseEvery: 5.0,
      rooms: [1, 2],
      start: { ws: 1, x: 2, y: 2 },
      frags: [{ ws: 1, x: 4, y: 2 }],
      glitches: [],
      exitRoom: 2,
      objective: 'Pick up ◆ in Room 1, then carry it: Super+Shift+2 (you follow, like movetoworkspace). Exit is in Room 2.',
      tasks: [
        { id: 'frag', text: 'Pick up fragment', need: 1, count: 0 },
        { id: 'carry', text: 'Carry to Room 2 (Super+Shift+2)', need: 1, count: 0 },
        { id: 'exit', text: 'Reach exit in Room 2', need: 1, count: 0 },
      ]
    },
    {
      id: 5, name: 'L5 — Split & spawn', collapseEvery: 5.0,
      rooms: [1],
      start: { ws: 1, x: 3, y: 2 },
      frags: [{ ws: 1, x: 6, y: 0 }],
      glitches: [{ ws: 1, x: 4, y: 1 }, { ws: 1, x: 4, y: 2 }, { ws: 1, x: 4, y: 3 }],
      preCorrupt: ['col0', 'col6b'], // flavor: edges already eaten
      objective: 'Blocked? Super+J re-tiles (repairs 1 edge tile). Super+Enter spawns safe ground (25⚡).',
      tasks: [
        { id: 'split', text: 'Toggle split (Super+J)', need: 1, count: 0 },
        { id: 'spawn', text: 'Spawn/repair a tile (Super+Enter)', need: 1, count: 0 },
        { id: 'frag', text: 'Collect 1 fragment', need: 1, count: 0 },
        { id: 'exit', text: 'Reach the exit', need: 1, count: 0 },
      ]
    },
    {
      id: 6, name: 'L6 — Full escape', collapseEvery: 4.0,
      rooms: [1, 2, 3, 4],
      start: { ws: 1, x: 3, y: 2 },
      frags: [{ ws: 1, x: 1, y: 1 }, { ws: 3, x: 5, y: 3 }],
      glitches: [{ ws: 1, x: 4, y: 2 }, { ws: 3, x: 3, y: 3 }],
      exitRoom: 4,
      objective: 'Two ◆ across rooms, glitches, fast Shrink. Use everything: F shield, L scrolling, Space launcher, W close.',
      tasks: [
        { id: 'frag', text: 'Collect 2 fragments (any rooms)', need: 2, count: 0 },
        { id: 'util', text: 'Use a utility: F shield / L layout / Space launcher', need: 1, count: 0 },
        { id: 'exit', text: 'Reach exit in Room 4', need: 1, count: 0 },
      ]
    },
  ];
  window.LEVELS = LEVELS;
})();
