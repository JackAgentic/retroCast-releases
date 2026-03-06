import { app, BrowserWindow, dialog } from 'electron';
import path from 'node:path';
import started from 'electron-squirrel-startup';
import { initializeServices, registerIpcHandlers, cleanupServices, stopAllCasters } from './main/ipc-handlers';
import { IPC } from './shared/types';

if (started) app.quit();

// Enforce single instance — reuse existing window when a second file is opened
const gotLock = app.requestSingleInstanceLock();
if (!gotLock) {
  app.quit();
} else {
  // Track file opened via macOS "Open With" before the window is ready
  let pendingOpenFile: string | null = null;

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

    mainWindow.webContents.on('did-finish-load', () => {
      if (pendingOpenFile) {
        mainWindow.webContents.send(IPC.OPEN_FILE, pendingOpenFile);
        pendingOpenFile = null;
      }
    });
  };

  // Second instance tried to launch — focus existing window and forward file
  app.on('second-instance', (_event, argv) => {
    const filePath = argv.find((arg) => !arg.startsWith('-') && arg !== process.execPath && arg.includes('.'));
    const win = BrowserWindow.getAllWindows()[0];
    if (win) {
      if (win.isMinimized()) win.restore();
      win.focus();
      if (filePath) {
        win.webContents.send(IPC.OPEN_FILE, filePath);
      }
    }
  });

  // macOS: file opened via Finder / "Open With"
  app.on('open-file', (event, filePath) => {
    event.preventDefault();
    const win = BrowserWindow.getAllWindows()[0];
    if (win && !win.isDestroyed()) {
      win.webContents.send(IPC.OPEN_FILE, filePath);
    } else {
      pendingOpenFile = filePath;
    }
  });

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

  let isQuitting = false;
  app.on('before-quit', (event) => {
    if (isQuitting) return;
    isQuitting = true;
    // Stop all Chromecast sessions before quitting (async, so we defer quit)
    event.preventDefault();
    stopAllCasters().finally(() => {
      cleanupServices();
      app.exit(0);
    });
  });
}
