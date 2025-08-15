const { ipcRenderer } = require('electron');

window.startDownload = async (options) => {
  const response = await ipcRenderer.invoke('start-download', options);
  return response;
};
