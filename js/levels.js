/* levels.js — L0..L6, each a tiny Hyprland session */
(function () {
  const LEVELS = [
    {
      id: 0, name: 'L0 — Calibration', collapseEvery: 0,
      rooms: [1], startWs: 1,
      setup: {
        1: [
          { app: 'kitty', title: '~/omarchy', focus: true },
          { app: 'nvim', title: 'README.md', frag: true },
        ],
      },
      objective: 'You are the focused window. Super+Arrows moves focus — Hyprland movefocus. Land on nvim to pick up ◆.',
      tasks: [
        { id: 'move4', text: 'Move focus 4 times (Super+Arrows)', need: 4, count: 0 },
        { id: 'help', text: 'Open the cheat sheet (Super+K) and close it', need: 1, count: 0 },
        { id: 'frag', text: 'Focus the nvim window and take its fragment', need: 1, count: 0 },
      ]
    },
    {
      id: 1, name: 'L1 — Unused windows rot', collapseEvery: 14,
      rooms: [1], startWs: 1,
      setup: {
        1: [
          { app: 'kitty', title: 'tty1', focus: true },
          { app: 'nvim', title: 'hyprland.conf', frag: true },
          { app: 'btop', title: 'btop', frag: true },
        ],
      },
      objective: 'The Shrink corrupts the window you have not focused. Keep cycling Super+Arrows, grab both ◆, then focus the exit client.',
      tasks: [
        { id: 'frag', text: 'Collect 2 fragments', need: 2, count: 0 },
        { id: 'exit', text: 'Focus the exit client (wlogout)', need: 1, count: 0 },
      ]
    },
    {
      id: 2, name: 'L2 — Kill or swap', collapseEvery: 16,
      rooms: [1], startWs: 1,
      setup: {
        1: [
          { app: 'kitty', title: 'tty1', focus: true },
          { app: 'zsh', title: 'wayland-leak', glitch: true },
          { app: 'nvim', title: 'init.lua', frag: true },
        ],
      },
      objective: 'A leaky client is in the tree. Super+Shift+Arrow swaps it (swapwindow). Super+W is killactive.',
      tasks: [
        { id: 'swap', text: 'Swap OR close the glitch client', need: 1, count: 0 },
        { id: 'frag', text: 'Collect 1 fragment', need: 1, count: 0 },
        { id: 'exit', text: 'Focus the exit client', need: 1, count: 0 },
      ]
    },
    {
      id: 3, name: 'L3 — Jump workspace', collapseEvery: 12,
      rooms: [1, 2], startWs: 1,
      setup: {
        1: [
          { app: 'kitty', title: 'tty1', focus: true },
          { app: 'chromium', title: 'status.local' },
        ],
        2: [
          { app: 'nvim', title: 'notes.md', frag: true },
          { app: 'yazi', title: '~/' },
        ],
      },
      objective: 'Workspace 1 is dying. Super+2 (or Super+Tab) jumps workspaces — the fragment lives on ws 2.',
      tasks: [
        { id: 'jump', text: 'Jump to workspace 2 (Super+2 / Super+Tab)', need: 1, count: 0 },
        { id: 'frag', text: 'Collect 1 fragment on ws 2', need: 1, count: 0 },
        { id: 'exit', text: 'Focus the exit client', need: 1, count: 0 },
      ]
    },
    {
      id: 4, name: 'L4 — movetoworkspace', collapseEvery: 14,
      rooms: [1, 2], startWs: 1, exitRoom: 2,
      setup: {
        1: [
          { app: 'kitty', title: 'tty1', focus: true },
          { app: 'nvim', title: 'key.lua', frag: true },
        ],
        2: [
          { app: 'btop', title: 'btop' },
        ],
      },
      objective: 'The key is in nvim. Super+Shift+2 moves that window to workspace 2 and follows (movetoworkspace). Exit opens there.',
      tasks: [
        { id: 'frag', text: 'Take the fragment from nvim', need: 1, count: 0 },
        { id: 'carry', text: 'Carry the focused window to ws 2 (Super+Shift+2)', need: 1, count: 0 },
        { id: 'exit', text: 'Focus the exit client on ws 2', need: 1, count: 0 },
      ]
    },
    {
      id: 5, name: 'L5 — Spawn & togglesplit', collapseEvery: 14,
      rooms: [1], startWs: 1,
      setup: {
        1: [
          { app: 'kitty', title: 'tty1', focus: true },
          { app: 'zsh', title: 'fork', glitch: true },
          { app: 'nvim', title: 'hyprland.conf', frag: true, corrupt: true },
        ],
      },
      objective: 'Super+Enter execs kitty and splits the focused pane (25⚡). Super+J togglesplit — stack vs side. Close the leak if it is in the way.',
      tasks: [
        { id: 'split', text: 'Toggle split (Super+J)', need: 1, count: 0 },
        { id: 'spawn', text: 'Spawn a terminal (Super+Enter)', need: 1, count: 0 },
        { id: 'frag', text: 'Collect 1 fragment', need: 1, count: 0 },
        { id: 'exit', text: 'Focus the exit client', need: 1, count: 0 },
      ]
    },
    {
      id: 6, name: 'L6 — Full session', collapseEvery: 12,
      rooms: [1, 2, 3, 4], startWs: 1, exitRoom: 4,
      setup: {
        1: [
          { app: 'kitty', title: 'tty1', focus: true },
          { app: 'nvim', title: 'escape.lua', frag: true },
          { app: 'zsh', title: 'leak-1', glitch: true },
        ],
        2: [
          { app: 'chromium', title: 'omarchy.org' },
          { app: 'spotify', title: 'Spotify' },
        ],
        3: [
          { app: 'btop', title: 'btop' },
          { app: 'yazi', title: '~/keys', frag: true },
          { app: 'zsh', title: 'leak-3', glitch: true },
        ],
        4: [
          { app: 'signal', title: 'Signal' },
        ],
      },
      objective: 'Four workspaces, two keys, leaky clients. Super+F fullscreen, Super+L scrolling, then wlogout on ws 4.',
      tasks: [
        { id: 'frag', text: 'Collect 2 fragments (any workspace)', need: 2, count: 0 },
        { id: 'fullscreen', text: 'Fullscreen the focused window (Super+F)', need: 1, count: 0 },
        { id: 'layout', text: 'Toggle dwindle ↔ scrolling (Super+L)', need: 1, count: 0 },
        { id: 'exit', text: 'Focus the exit client on ws 4', need: 1, count: 0 },
      ]
    },
  ];
  window.LEVELS = LEVELS;
})();
