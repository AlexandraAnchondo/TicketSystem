const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const { spawn } = require('child_process');

const isDev = !app.isPackaged;

let mainWindow;
let backendProcess;

function startBackend() {
  const backendPath = isDev
    ? path.join(__dirname, '../backend/src/index.js')
    : path.join(process.resourcesPath, 'backend/src/index.js');

  const backendCwd = isDev
    ? path.join(__dirname, '../backend')
    : path.join(process.resourcesPath, 'backend');

  const nodeExecutable = isDev ? 'node' : process.execPath;

  backendProcess = spawn(nodeExecutable, [backendPath], {
    cwd: backendCwd,
    env: {
      ...process.env,
      ELECTRON_RUN_AS_NODE: isDev ? undefined : '1',
      PORT: '3001',
      NODE_ENV: isDev ? 'development' : 'production',
    },
    shell: false,
    windowsHide: true,
    stdio: 'pipe',
  });

  backendProcess.stdout?.on('data', (data) => {
    console.log(`[backend] ${data.toString().trim()}`);
  });

  backendProcess.stderr?.on('data', (data) => {
    console.error(`[backend error] ${data.toString().trim()}`);
  });

  backendProcess.on('error', (error) => {
    console.error('Error al iniciar backend:', error);
  });

  backendProcess.on('exit', (code) => {
    console.log('Backend cerrado con código:', code);
    backendProcess = null;
  });
}

function stopBackend() {
  if (!backendProcess) return;

  try {
    if (process.platform === 'win32') {
      spawn('taskkill', ['/pid', backendProcess.pid, '/f', '/t'], {
        windowsHide: true,
        stdio: 'ignore',
      });
    } else {
      backendProcess.kill('SIGTERM');
    }
  } catch (error) {
    console.error('Error al cerrar backend:', error);
  } finally {
    backendProcess = null;
  }
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 900,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
    },
  });

 const startUrl = isDev
  ? 'http://localhost:5173/tickets'
  : `file://${path.join(__dirname, 'dist/index.html')}`;

  mainWindow.loadURL(startUrl);

  if (isDev) {
    mainWindow.webContents.openDevTools();
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.on('ready', () => {
  startBackend();
  createWindow();
});

app.on('before-quit', () => {
  stopBackend();
});

app.on('will-quit', () => {
  stopBackend();
});

app.on('window-all-closed', () => {
  stopBackend();

  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (mainWindow === null) {
    createWindow();
  }
});

ipcMain.handle('api-request', async () => {
  return { success: true };
});