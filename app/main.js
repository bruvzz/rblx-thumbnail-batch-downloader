const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const { startDownload } = require('./utils');

function createWindow() {
  const win = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      preload: path.join(__dirname, 'renderer.js'),
      nodeIntegration: true,
      contextIsolation: false,
    },
  });

  win.loadFile('index.html');
}

app.whenReady().then(createWindow);

ipcMain.handle('start-download', async (event, options) => {
  try {
    const result = await startDownload(options);
    return { success: true, result };
  } catch (err) {
    return { success: false, error: err.message };
  }
});
