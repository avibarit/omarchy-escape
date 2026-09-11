/* preload.js — safe IPC bridge (contextIsolated renderer) */
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  onShortcut: (cb) => ipcRenderer.on('omarchy-shortcut', (_event, payload) => cb(payload)),
  platform: process.platform,
  unlockSuper: () => ipcRenderer.send('unlock-super'),
  lockSuper: () => ipcRenderer.send('lock-super'),
  quit: () => ipcRenderer.send('quit-app'),
});
