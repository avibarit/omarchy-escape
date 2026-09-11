# ◈ OMARCHY ESCAPE — Hyprland survival trainer

Self-contained game that teaches the **Core 12 Omarchy/Hyprland tiling shortcuts** by putting you inside a real dwindle session.

You are the **focused window**. Workspaces are binary-tree layouts. `Super+Enter` splits the focused pane. `Super+W` kills it and the tree reflows. Unused clients rot. Leaky ones fork.

## Install on Omarchy

One line from GitHub (clones to `~/.local/share/omarchy-escape`):

```bash
curl -fsSL https://raw.githubusercontent.com/avibarit/omarchy-escape/main/install.sh | bash
omarchy-escape
```

From a local clone: `./install.sh`

That installs a desktop entry, an `omarchy-escape` launcher on `PATH`, and a Hyprland submap so **real Super chords reach the game** while its window is focused.

- GTK3 + WebKitGTK host (`org.omarchy.escape`) — no Electron, no browser tabs.
- Colors follow the current Omarchy theme.
- **Unlock Super** (header button, or `Super+Escape`) gives Super back to Hyprland. Then `Super+W` closes the app.
- `Quit` in the header also exits without Super.

### Why a submap?

Hyprland owns `Super`. A browser or Electron window never sees `Super+1` / `Super+W` / `Super+Enter` on Omarchy. While this window is focused the compositor switches to an empty `omarchy-escape` submap, so those binds pass through. Focus anything else and the desktop bindings come back. Unlock Super (or Super+Escape) leaves the submap *and stays left* until you click Grab Super — so Super+W is Hyprland's close-window again.

## Browser fallback

Open `index.html` in a browser if you just want to read the UI. Super will not work there on Omarchy — use `Alt` as Super or the Fallback pad.

## True bindings taught

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
| `Super + Escape` | Release Super to the desktop (then Super+W quits) |

## How it tiles (Hyprland dwindle)

Each workspace is a **binary space partition**. The first `exec` splits the focused window along its longer axis (wide pane → side-by-side, tall pane → stacked). `togglesplit` flips that parent. Scrolling layout ignores the tree and puts every client in a single row.

The Shrink always corrupts the **least-recently-focused** client, not a grid edge — so cycling windows is how you stay alive. Combo (chained dispatchers) slows the rot.

## Levels

- **L0 Calibration** — movefocus + `Super+K`, no collapse
- **L1 Unused windows rot** — cycle focus, two keys
- **L2 Kill or swap** — leaky client in the tree
- **L3 Jump workspace** — `Super+2/Tab`
- **L4 movetoworkspace** — `Super+Shift+2`
- **L5 Spawn & togglesplit** — `Super+J`, `Super+Enter`
- **L6 Full session** — 4 workspaces; requires `Super+F` fullscreen and `Super+L` scrolling, then `W` / exit on ws 4

Death screen tells you which dispatcher would have saved you. End screen shows per-key accuracy.

## Files

```
omarchy-escape          — native GTK/WebKit host
hypr/omarchy-escape.lua — Super passthrough submap
install.sh              — desktop entry + Hyprland hook
index.html              — Waybar, desktop, overlays
css/style.css
js/input.js             — Super/Alt matcher, native inject, pad
js/tiling.js            — dwindle BSP + scrolling compositor
js/levels.js            — L0–L6 session setups
js/game.js              — state, dispatchers, loop, render
test/tiling.test.js
```

Verified against Omarchy 4 / Hyprland 0.56 Core 12 (`Super+K` sheet, Navigation page).
