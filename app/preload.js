const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
  startDownload: (options, onProgress) => {
    if (onProgress) {
      ipcRenderer.on('download-progress', (event, progress) => onProgress(progress));
    }
    return ipcRenderer.invoke('start-download', options);
  },
  showMessage: (opts) => ipcRenderer.invoke('show-message', opts)
});
