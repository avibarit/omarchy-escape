# ◈ OMARCHY ESCAPE — Tiling Survival Trainer

Self-contained game (no deps, works via `file://`) that teaches the **Core 12 Omarchy/Hyprland tiling shortcuts** by making you survive them:

Rooms (workspaces 1–4) close in via **The Shrink**. Move focus, swap glitches, jump rooms, carry fragments, re-tile splits, spawn terminals, shield.

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
| `Super + Arrows` | Move focus |
| `Super + Shift + Arrows` | Swap window |
| `Super + 1–4` | Jump to Room |
| `Super + Shift + 1–4` | Carry fragment to Room (movetoworkspace + follow) |
| `Super + Tab / Shift+Tab` | Next / prev Room |
| `Super + J` | Toggle split H↔V (repairs 1 edge tile) |
| `Super + F` | Fullscreen shield 3s (cd 20s) |
| `Super + W` | Close adjacent glitch |
| `Super + Enter` | Spawn safe tile, repairs 3×3 (25⚡) |
| `Super + Space` | Launcher (type 1–4) |
| `Super + L` | dwindle ↔ scrolling (slow collapse 10s) |
| `Super + K` | This cheat sheet (pauses) |

The game listens for the **real `Super` key** (`e.metaKey` = Win/Cmd).

### Browser caveat (important)

Browsers/OS reserve some `Super` combos (`Super+1/W/Tab/Space` switch tabs, close tabs, Spotlight…).
`preventDefault()` is attempted, but may fail depending on browser/OS. Therefore:

- Hold **`Alt` as Super fallback** — accepted silently everywhere. HUD always displays the true `Super` binding.
- Click workspace pills `1–4` or the **Fallback pad** — same actions, for when the browser eats the key.
- Calibration on the title screen tells you whether real `Super` was seen.

This keeps muscle-memory teaching correct (`Super` labels) while staying playable.

## Levels

- **L0 Calibration** — arrows + `Super+K`, no collapse
- **L1 Shrink wakes** — slow collapse, focus only
- **L2 Swap it away** — glitches block, swap/close
- **L3 Jump, the room dies** — fast collapse, `Super+2/Tab`
- **L4 Carry the key** — `Super+Shift+2`
- **L5 Split & spawn** — `Super+J`, `Super+Enter`
- **L6 Full escape** — 4 rooms, everything + `F/L/Space/W`

Death screen tells you which shortcut would have saved you. End screen shows per-key accuracy.

## Files

```
index.html  — shell, Waybar topbar, board, overlays
css/style.css
js/input.js   — Meta/Alt combo matcher, pad wiring
js/tiling.js  — Room model, Shrink, split toggle
js/levels.js  — L0–L6 data
js/game.js    — state, loop, render, objectives
```

Verified against Omarchy manual hotkeys (`Super+K` sheet, Navigation page) Aug 2026.
