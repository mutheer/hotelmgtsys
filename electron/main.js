'use strict';

const { app, BrowserWindow, dialog, shell } = require('electron');
const { fork, execFileSync } = require('child_process');
const path = require('path');
const http = require('http');
const fs = require('fs');

const PORT = 5000;
let serverProcess = null;
let mainWindow = null;

// Resolve a path inside the app's resource bundle (or project root in dev mode)
function resourcePath(...parts) {
  return path.join(
    app.isPackaged ? process.resourcesPath : path.join(__dirname, '..'),
    ...parts
  );
}

// SQLite database stored in OS user-data folder — survives app updates
function dbPath() {
  return path.join(app.getPath('userData'), 'hotel.db');
}

// Run Prisma migrations (creates tables on first run, applies new ones on updates)
function runMigrations() {
  const db = dbPath();
  const schema = resourcePath('backend', 'prisma', 'schema.prisma');
  const ext = process.platform === 'win32' ? '.cmd' : '';
  const prismaBin = resourcePath('backend', 'node_modules', '.bin', `prisma${ext}`);

  if (!fs.existsSync(prismaBin)) {
    console.warn('[migrations] prisma binary not found, skipping');
    return;
  }
  try {
    execFileSync(prismaBin, ['migrate', 'deploy', '--schema', schema], {
      env: { ...process.env, DATABASE_URL: `file:${db}` },
      stdio: 'pipe',
      cwd: resourcePath('backend')
    });
    console.log('[migrations] up to date');
  } catch (err) {
    // Log but don't crash — migrations may have already been applied
    console.error('[migrations]', err.stderr?.toString() || err.message);
  }
}

// Seed rooms, room types, settings, and default owner on first run
function runSeedIfFresh() {
  const markerFile = path.join(app.getPath('userData'), '.seeded_v1');
  if (fs.existsSync(markerFile)) return;

  const seedScript = resourcePath('backend', 'dist', 'seed.js');
  if (!fs.existsSync(seedScript)) {
    console.warn('[seed] seed.js not found');
    return;
  }

  const db = dbPath();
  const child = fork(seedScript, [], {
    env: { ...process.env, DATABASE_URL: `file:${db}` },
    cwd: resourcePath('backend'),
    stdio: ['ignore', 'pipe', 'pipe']
  });
  child.stdout?.on('data', d => console.log('[seed]', d.toString().trim()));
  child.stderr?.on('data', d => console.error('[seed]', d.toString().trim()));
  child.on('exit', code => {
    if (code === 0) {
      fs.writeFileSync(markerFile, new Date().toISOString());
      console.log('[seed] complete');
    }
  });
}

// Start the Express backend as a child process
function startServer() {
  const serverEntry = resourcePath('backend', 'dist', 'src', 'index.js');
  const db = dbPath();

  serverProcess = fork(serverEntry, [], {
    env: {
      ...process.env,
      DATABASE_URL: `file:${db}`,
      JWT_SECRET: 'melva_hotel_secure_key_change_in_production',
      NODE_ENV: 'production',
      PORT: String(PORT)
    },
    cwd: resourcePath('backend'),
    stdio: ['ignore', 'pipe', 'pipe']
  });

  serverProcess.stdout?.on('data', d => console.log('[server]', d.toString().trim()));
  serverProcess.stderr?.on('data', d => console.error('[server]', d.toString().trim()));
  serverProcess.on('exit', code => {
    if (code !== 0 && code !== null) console.error('[server] exited with code', code);
  });
}

// Poll the health endpoint until the server is ready
function waitForServer(maxMs = 20000) {
  return new Promise((resolve, reject) => {
    const deadline = Date.now() + maxMs;
    const attempt = () => {
      const req = http.get(`http://localhost:${PORT}/api/health`, res => {
        if (res.statusCode === 200) return resolve();
        tryAgain();
      });
      req.on('error', tryAgain);
      req.setTimeout(800, () => { req.destroy(); tryAgain(); });
    };
    const tryAgain = () => {
      if (Date.now() >= deadline) return reject(new Error('Server did not start within 20 seconds'));
      setTimeout(attempt, 400);
    };
    attempt();
  });
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 1100,
    minHeight: 680,
    title: 'The Melva — Hotel Management',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true
    }
  });

  mainWindow.loadURL(`http://localhost:${PORT}`);
  mainWindow.setMenuBarVisibility(false);

  // Open any external links in the default OS browser instead of inside the app
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });

  mainWindow.on('closed', () => { mainWindow = null; });
}

// ─── App Lifecycle ───────────────────────────────────────────────────────────

app.whenReady().then(async () => {
  // Show a minimal splash screen while the server starts
  const splash = new BrowserWindow({
    width: 420,
    height: 240,
    frame: false,
    alwaysOnTop: true,
    center: true,
    resizable: false,
    webPreferences: { nodeIntegration: false }
  });
  splash.loadFile(path.join(__dirname, 'loading.html'));

  try {
    runMigrations();
    runSeedIfFresh();
    startServer();
    await waitForServer();
    splash.close();
    createWindow();
  } catch (err) {
    splash.close();
    dialog.showErrorBox(
      'Startup Failed',
      `The Melva could not start:\n\n${err.message}\n\nPlease contact your IT support.`
    );
    app.quit();
  }
});

app.on('window-all-closed', () => {
  if (serverProcess) {
    serverProcess.kill('SIGTERM');
    serverProcess = null;
  }
  app.quit();
});

app.on('activate', () => {
  if (mainWindow === null) createWindow();
});
