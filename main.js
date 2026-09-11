/* main.js — optional Electron wrapper (macOS / non-Omarchy).
 *
 * On Omarchy the real host is ./omarchy-escape (GTK + WebKitGTK) plus
 * hypr/omarchy-escape.lua, which hands Super to the game while focused.
 * Electron cannot beat Hyprland's Super binds; keep this file only as a
 * fallback where Super == Cmd and there is no compositor grab.
 */
const { app, BrowserWindow, globalShortcut, Menu, ipcMain } = require('electron');
const path = require('path');

let win = null;

// [accelerator suffix, payload] — MOD expands to both CommandOrControl
// (Cmd on mac, Ctrl on Linux/Win) and Super (Super/Meta on Linux/Win,
// Cmd on mac where the two are identical and the 2nd registration no-ops).
const BASE = [
  ['Left', { act: 'focus', dir: 'left' }],
  ['Right', { act: 'focus', dir: 'right' }],
  ['Up', { act: 'focus', dir: 'up' }],
  ['Down', { act: 'focus', dir: 'down' }],
  ['Shift+Left', { act: 'swap', dir: 'left' }],
  ['Shift+Right', { act: 'swap', dir: 'right' }],
  ['Shift+Up', { act: 'swap', dir: 'up' }],
  ['Shift+Down', { act: 'swap', dir: 'down' }],
  ['1', { act: 'goto', ws: 1 }],
  ['2', { act: 'goto', ws: 2 }],
  ['3', { act: 'goto', ws: 3 }],
  ['4', { act: 'goto', ws: 4 }],
  ['Shift+1', { act: 'carry', ws: 1 }],
  ['Shift+2', { act: 'carry', ws: 2 }],
  ['Shift+3', { act: 'carry', ws: 3 }],
  ['Shift+4', { act: 'carry', ws: 4 }],
  ['Tab', { act: 'next' }],
  ['Shift+Tab', { act: 'prev' }],
  ['J', { act: 'split' }],
  ['F', { act: 'fullscreen' }],
  ['W', { act: 'close' }],
  ['K', { act: 'help' }],
  ['L', { act: 'layout' }],
  ['Enter', { act: 'spawn' }],
  ['Space', { act: 'launcher' }],
];

const SHORTCUTS = [];
// macOS: CommandOrControl IS Cmd IS Super — one registration covers it.
// Linux/Win: register Ctrl too as a bonus fallback alongside real Super.
// (Registering both on mac would just log false-duplicate noise.)
const MODS = process.platform === 'darwin' ? ['CommandOrControl'] : ['CommandOrControl', 'Super'];
for (const mod of MODS) {
  for (const [suffix, payload] of BASE) SHORTCUTS.push([`${mod}+${suffix}`, payload]);
}

function forward(payload) {
  if (win && !win.isDestroyed()) win.webContents.send('omarchy-shortcut', payload);
}

function registerAll() {
  globalShortcut.unregisterAll();
  for (const [acc, payload] of SHORTCUTS) {
    try {
      const ok = globalShortcut.register(acc, () => forward(payload));
      if (!ok) console.log(`[keys] OS/compositor kept ${acc} (fallback pad covers it)`);
    } catch (err) {
      console.log(`[keys] cannot register ${acc}: ${err.message}`);
    }
  }
}

function createWindow() {
  // No application menu => no browser-style Cmd+W / Cmd+1..4 bindings to fight.
  Menu.setApplicationMenu(null);

  win = new BrowserWindow({
    width: 1220,
    height: 860,
    title: 'Omarchy Escape',
    backgroundColor: '#0d1117',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  // Belt-and-suspenders: stop Chromium from consuming Super combos as
  // accelerators; the keydown still reaches the page (and input.js dedups
  // against the globalShortcut IPC echo).
  win.webContents.on('before-input-event', (event, input) => {
    if ((input.control || input.meta || input.alt) && !input.isAutoRepeat) {
      const k = (input.key || '').toLowerCase();
      const ours = ['arrowleft', 'arrowright', 'arrowup', 'arrowdown', 'tab', ' ', 'spacebar', 'enter', 'j', 'f', 'w', 'k', 'l', '1', '2', '3', '4'];
      if (ours.includes(k)) event.preventDefault();
    }
  });

  win.on('focus', registerAll);
  win.on('blur', () => globalShortcut.unregisterAll());
  win.on('closed', () => { win = null; });

  win.loadFile(path.join(__dirname, 'index.html'));
}

app.whenReady().then(() => {
  createWindow();
  registerAll();
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('browser-window-focus', registerAll);
app.on('browser-window-blur', () => globalShortcut.unregisterAll());

ipcMain.on('unlock-super', () => globalShortcut.unregisterAll());
ipcMain.on('lock-super', () => registerAll());
ipcMain.on('quit-app', () => app.quit());

app.on('will-quit', () => globalShortcut.unregisterAll());

app.on('window-all-closed', () => {
  // Game, not a document editor: last window closed => release hotkeys
  // immediately and quit on every platform (no macOS dock lingering).
  // window-all-closed only fires when zero windows remain, so nothing
  // else can be using the app at this point.
  globalShortcut.unregisterAll();
  app.quit();
});

// Exported for the node smoke test (npm test does not boot Electron).
module.exports = { SHORTCUTS, BASE };
