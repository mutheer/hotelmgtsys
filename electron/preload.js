'use strict';

const { contextBridge, ipcRenderer } = require('electron');

// Expose a tiny, safe API to the renderer for saving printable documents as PDF.
contextBridge.exposeInMainWorld('melvaApi', {
  saveDocumentPdf: (opts) => ipcRenderer.invoke('melva:save-pdf', opts),
  listBackups:     ()      => ipcRenderer.invoke('melva:list-backups'),
  runBackupNow:    ()      => ipcRenderer.invoke('melva:run-backup-now'),
  restoreBackup:   (opts)  => ipcRenderer.invoke('melva:restore-backup', opts)
});
