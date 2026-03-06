import { app, BrowserWindow, dialog } from 'electron';
import path from 'node:path';
import started from 'electron-squirrel-startup';
import { initializeServices, registerIpcHandlers, cleanupServices } from './main/ipc-handlers';

if (started) app.quit();

// Show native error dialog for uncaught exceptions in main process
process.on('uncaughtException', (err) => {
  console.error('Main process uncaught exception:', err);
  dialog.showErrorBox('RetroCast Error', `${err.message}\n\n${err.stack}`);
});

const createWindow = () => {
  const mainWindow = new BrowserWindow({
    width: 900,
    height: 680,
    minWidth: 700,
    minHeight: 500,
    title: 'RetroCast',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      webSecurity: false,
    },
  });

  if (MAIN_WINDOW_VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(MAIN_WINDOW_VITE_DEV_SERVER_URL);
  } else {
    mainWindow.loadFile(
      path.join(__dirname, `../renderer/${MAIN_WINDOW_VITE_NAME}/index.html`),
    );
  }
};

app.on('ready', async () => {
  registerIpcHandlers();
  try {
    await initializeServices();
  } catch (err: any) {
    console.error('Failed to initialize services:', err);
    dialog.showErrorBox('RetroCast Startup Error', `Failed to initialize: ${err.message}`);
  }
  createWindow();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

app.on('before-quit', () => {
  cleanupServices();
});
