const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');

function createWindow() {
  const win = new BrowserWindow({
    width: 773,
    height: 430,
    frame: false,
    resizable: false,
    webPreferences: {
      preload: path.join(__dirname, 'renderer.js'),
      nodeIntegration: true,
      contextIsolation: false,
    },
  });

  win.loadFile(path.join(__dirname, 'index.html'));
  win.setAlwaysOnTop(true);

  ipcMain.on('set-topmost', (event, value) => {
    win.setAlwaysOnTop(value);
  });

  ipcMain.on('window-control', (event, action) => {
    switch (action) {
      case 'close': win.close(); break;
      case 'minimize': win.minimize(); break;
      case 'maximize':
        if (win.isMaximized()) win.unmaximize();
        else win.maximize();
        break;
    }
  });
}

app.whenReady().then(createWindow);
