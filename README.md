# ◈ OMARCHY ESCAPE — Hyprland survival trainer

Self-contained game (no deps, works via `file://`) that teaches the **Core 12 Omarchy/Hyprland tiling shortcuts** by putting you inside a real dwindle session:

You are the **focused window**. Workspaces are binary-tree layouts. `Super+Enter` splits the focused pane. `Super+W` kills it and the tree reflows. Unused clients rot. Leaky ones fork.

## Run

**Native app (recommended — real Super works):**

```
npm install
npm start
```

The Electron wrapper has no tabs and no close-tab binding, so `Super+1..4`,
`Super+W/F/J/K/L`, `Super+Arrows` etc. reach the game directly. Shortcuts are
also registered as system hotkeys while the window is focused and forwarded
over IPC (renderer dedups the echo).

Still OS-reserved — use the Fallback pad for these: macOS `Cmd+Tab`
(app switcher), `Cmd+Space` (Spotlight). Same story on Omarchy/Hyprland
itself: the compositor grabs `Super+...` before any client sees it.

**Browser fallback (no install):**

Open `index.html` in Chrome/Firefox. No server needed.

```
open index.html
```

## True bindings taught (real Super)

| Omarchy | In-game |
|---|---|
| `Super + Arrows` | `movefocus` — geometric neighbor in the tree |
| `Super + Shift + Arrows` | `swapwindow` with neighbor |
| `Super + 1–4` | `workspace N` |
| `Super + Shift + 1–4` | `movetoworkspace N` (carry focused client + follow) |
| `Super + Tab / Shift+Tab` | Next / prev workspace |
| `Super + J` | `togglesplit` (dwindle only — stack ↔ side) |
| `Super + F` | `fullscreen` shield 3s (cd 20s) |
| `Super + W` | `killactive` — close focused, reflow |
| `Super + Enter` | `exec kitty` — split focused pane (25⚡) |
| `Super + Space` | Launcher (type 1–4) |
| `Super + L` | dwindle ↔ scrolling (slow Shrink 10s) |
| `Super + K` | This cheat sheet (pauses) |

The game listens for the **real `Super` key** (`e.metaKey` = Win/Cmd).

### Browser caveat (important)

Browsers/OS reserve some `Super` combos (`Super+1/W/Tab/Space` switch tabs, close tabs, Spotlight…).
`preventDefault()` is attempted, but may fail depending on browser/OS. Therefore:

- Hold **`Alt` as Super fallback** — accepted silently everywhere. HUD always displays the true `Super` binding.
- Click workspace pills `1–4` or the **Fallback pad** — same actions, for when the browser eats the key.
- Calibration on the title screen tells you whether real `Super` was seen.

This keeps muscle-memory teaching correct (`Super` labels) while staying playable.

## How it tiles (Hyprland dwindle)

Each workspace is a **binary space partition**. The first `exec` splits the focused window along its longer axis (wide pane → side-by-side, tall pane → stacked). `togglesplit` flips that parent. Scrolling layout ignores the tree and puts every client in a single row.

The Shrink always corrupts the **least-recently-focused** client, not a grid edge — so cycling windows is how you stay alive. Combo (chained dispatchers) slows the rot.

## Levels

- **L0 Calibration** — movefocus + `Super+K`, no collapse
- **L1 Unused windows rot** — cycle focus, two keys
- **L2 Kill or swap** — leaky client in the tree
- **L3 Jump workspace** — fast collapse, `Super+2/Tab`
- **L4 movetoworkspace** — `Super+Shift+2`
- **L5 Spawn & togglesplit** — `Super+J`, `Super+Enter`
- **L6 Full session** — 4 workspaces; requires `Super+F` fullscreen and `Super+L` scrolling, then `W` / exit on ws 4

Death screen tells you which dispatcher would have saved you. End screen shows per-key accuracy.

## Files

```
index.html  — Waybar, desktop, overlays
css/style.css
js/input.js   — Meta/Alt combo matcher, pad wiring
js/tiling.js  — dwindle BSP + scrolling compositor
js/levels.js  — L0–L6 session setups
js/game.js    — state, dispatchers, loop, render
test/tiling.test.js
```

Verified against Omarchy manual hotkeys (`Super+K` sheet, Navigation page) Aug 2026.
