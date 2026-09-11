/* preload.js — safe IPC bridge (contextIsolated renderer) */
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  onShortcut: (cb) => ipcRenderer.on('omarchy-shortcut', (_event, payload) => cb(payload)),
  platform: process.platform,
});
