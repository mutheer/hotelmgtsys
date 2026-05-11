'use strict';

const { app, BrowserWindow, dialog, shell, utilityProcess, ipcMain } = require('electron');
const { execFileSync } = require('child_process');
const path = require('path');
const http = require('http');
const fs = require('fs');

const PORT = 5000;
let serverProcess = null;
let mainWindow = null;
let logStream = null;
let isStartingUp = true;
const serverErrors = [];

function log(...args) {
  const line = args.join(' ');
  console.log(line);
  try { logStream?.write(line + '\n'); } catch (_) {}
}

function initLog() {
  try {
    const logFile = path.join(app.getPath('userData'), 'startup.log');
    logStream = fs.createWriteStream(logFile, { flags: 'a' });
    log(`\n===== STARTUP ${new Date().toISOString()} =====`);
    log(`resourcesPath: ${process.resourcesPath}`);
    log(`userData: ${app.getPath('userData')}`);
    log(`execPath: ${process.execPath}`);
    log(`isPackaged: ${app.isPackaged}`);
  } catch (_) {}
}

function resourcePath(...parts) {
  return path.join(
    app.isPackaged ? process.resourcesPath : path.join(__dirname, '..'),
    ...parts
  );
}

function dbPath() {
  return path.join(app.getPath('userData'), 'hotel.db');
}

// ─── Backup ─────────────────────────────────────────────────────────────────
// Reads/writes a small JSON config so the user can change the backup folder
// later (point it at a OneDrive-synced folder, etc.) without rebuilding.
const BACKUP_RETENTION_DAYS = 30;

function backupConfigPath() {
  return path.join(app.getPath('userData'), 'backup-config.json');
}

function getBackupConfig() {
  const cfgFile = backupConfigPath();
  let cfg = {};
  try {
    if (fs.existsSync(cfgFile)) cfg = JSON.parse(fs.readFileSync(cfgFile, 'utf8'));
  } catch (_) {}
  if (!cfg.folder) {
    // Default: Desktop\Melva Backups — user moves/edits the JSON to point elsewhere
    cfg.folder = path.join(app.getPath('desktop'), 'Melva Backups');
  }
  if (!cfg.enabled && cfg.enabled !== false) cfg.enabled = true;
  // Persist defaults so the file shows up after first run for the user to edit
  try {
    fs.writeFileSync(cfgFile, JSON.stringify(cfg, null, 2));
  } catch (_) {}
  return cfg;
}

function runBackup() {
  try {
    const cfg = getBackupConfig();
    if (!cfg.enabled) {
      log('[backup] disabled in config — skipping');
      return;
    }
    const src = dbPath();
    if (!fs.existsSync(src)) {
      log('[backup] no database file yet — skipping');
      return;
    }
    fs.mkdirSync(cfg.folder, { recursive: true });

    const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    const dst = path.join(cfg.folder, `hotel-${stamp}.db`);
    fs.copyFileSync(src, dst);

    // Copy SQLite journal/WAL files alongside if they exist (write safety)
    for (const ext of ['-journal', '-wal', '-shm']) {
      const sidecar = src + ext;
      if (fs.existsSync(sidecar)) {
        try { fs.copyFileSync(sidecar, dst + ext); } catch (_) {}
      }
    }

    log(`[backup] wrote ${dst}`);

    // Retention: delete backups older than N days
    const cutoff = Date.now() - BACKUP_RETENTION_DAYS * 24 * 60 * 60 * 1000;
    for (const f of fs.readdirSync(cfg.folder)) {
      if (!/^hotel-.*\.db(-journal|-wal|-shm)?$/.test(f)) continue;
      const full = path.join(cfg.folder, f);
      try {
        if (fs.statSync(full).mtimeMs < cutoff) {
          fs.unlinkSync(full);
          log(`[backup] removed old ${f}`);
        }
      } catch (_) {}
    }
  } catch (err) {
    log('[backup] error:', err.message);
  }
}

function scheduleNightlyBackup() {
  function msUntilNextMidnight() {
    const now = new Date();
    const next = new Date(now);
    next.setDate(next.getDate() + 1);
    next.setHours(0, 0, 0, 0);
    return next.getTime() - now.getTime();
  }
  function tick() {
    runBackup();
    setTimeout(tick, msUntilNextMidnight());
  }
  setTimeout(tick, msUntilNextMidnight());
  log(`[backup] scheduled — next run in ${Math.round(msUntilNextMidnight() / 60000)} minutes`);
}

// On startup, take a backup if the most recent one is more than 24h old.
// Catches the case where the app is closed at midnight and reopened later.
function backupIfStale() {
  try {
    const cfg = getBackupConfig();
    if (!cfg.enabled) return;
    if (!fs.existsSync(cfg.folder)) {
      runBackup();
      return;
    }
    const files = fs.readdirSync(cfg.folder).filter(f => /^hotel-.*\.db$/.test(f));
    if (files.length === 0) {
      runBackup();
      return;
    }
    const newestMs = Math.max(...files.map(f => fs.statSync(path.join(cfg.folder, f)).mtimeMs));
    if (Date.now() - newestMs > 24 * 60 * 60 * 1000) {
      log('[backup] last backup >24h old — running now');
      runBackup();
    } else {
      log('[backup] recent backup found — skipping startup backup');
    }
  } catch (_) {}
}

// Run Prisma migrations by invoking the prisma CLI's JS entry directly via Electron-as-Node.
// We can't use prisma.cmd because execFileSync rejects .cmd on Node 20+ with EINVAL.
function runMigrations() {
  const db = dbPath();
  const schema = resourcePath('backend', 'prisma', 'schema.prisma');
  const prismaJs = resourcePath('backend', 'node_modules', 'prisma', 'build', 'index.js');

  log(`[migrations] prismaJs: ${prismaJs}`);
  log(`[migrations] exists: ${fs.existsSync(prismaJs)}`);
  log(`[migrations] schema exists: ${fs.existsSync(schema)}`);

  if (!fs.existsSync(prismaJs)) {
    log('[migrations] prisma CLI not found, skipping');
    return;
  }
  try {
    const out = execFileSync(
      process.execPath,
      [prismaJs, 'migrate', 'deploy', '--schema', schema],
      {
        env: {
          ...process.env,
          DATABASE_URL: `file:${db}`,
          ELECTRON_RUN_AS_NODE: '1'
        },
        cwd: resourcePath('backend'),
        stdio: 'pipe'
      }
    );
    log('[migrations] ok:', out.toString().trim());
  } catch (err) {
    log('[migrations] error:', err.stderr?.toString() || err.stdout?.toString() || err.message);
  }
}

function runSeedIfFresh() {
  const markerFile = path.join(app.getPath('userData'), '.seeded_v1');
  if (fs.existsSync(markerFile)) return;

  const seedScript = resourcePath('backend', 'dist', 'seed.js');
  log(`[seed] script: ${seedScript} exists=${fs.existsSync(seedScript)}`);
  if (!fs.existsSync(seedScript)) return;

  const db = dbPath();
  const child = utilityProcess.fork(seedScript, [], {
    env: { ...process.env, DATABASE_URL: `file:${db}` },
    cwd: resourcePath('backend'),
    stdio: 'pipe'
  });
  child.stdout?.on('data', d => log('[seed]', d.toString().trim()));
  child.stderr?.on('data', d => log('[seed-err]', d.toString().trim()));
  child.on('exit', code => {
    if (code === 0) {
      fs.writeFileSync(markerFile, new Date().toISOString());
      log('[seed] complete');
    } else {
      log(`[seed] exited with code ${code}`);
    }
  });
}

function startServer() {
  const serverEntry = resourcePath('backend', 'dist', 'src', 'index.js');
  const db = dbPath();

  log(`[server] entry: ${serverEntry} exists=${fs.existsSync(serverEntry)}`);
  log(`[server] db: ${db}`);

  serverProcess = utilityProcess.fork(serverEntry, [], {
    env: {
      ...process.env,
      DATABASE_URL: `file:${db}`,
      JWT_SECRET: 'melva_hotel_secure_key_change_in_production',
      NODE_ENV: 'production',
      PORT: String(PORT),
      HOST: '127.0.0.1'
    },
    cwd: resourcePath('backend'),
    stdio: 'pipe'
  });

  serverProcess.stdout?.on('data', d => log('[server]', d.toString().trim()));
  serverProcess.stderr?.on('data', d => {
    const msg = d.toString().trim();
    log('[server-err]', msg);
    serverErrors.push(msg);
  });
  serverProcess.on('exit', code => {
    log(`[server] exited with code ${code}`);
  });
}

// Use 127.0.0.1 explicitly — on Windows, "localhost" can resolve to ::1 (IPv6)
// while Express binds to IPv4 only, causing ECONNREFUSED.
function waitForServer(maxMs = 30000) {
  return new Promise((resolve, reject) => {
    const deadline = Date.now() + maxMs;
    const attempt = () => {
      const req = http.get(`http://127.0.0.1:${PORT}/api/health`, res => {
        // Any HTTP response — even 401/404 — means the server is reachable.
        // We only retry on connection errors / timeouts.
        res.resume();
        return resolve();
      });
      req.on('error', tryAgain);
      req.setTimeout(800, () => { req.destroy(); tryAgain(); });
    };
    const tryAgain = () => {
      if (Date.now() >= deadline) {
        const errDetail = serverErrors.length
          ? '\n\nServer errors:\n' + serverErrors.slice(-5).join('\n')
          : '';
        return reject(new Error(`Server did not respond within 30 seconds.${errDetail}`));
      }
      setTimeout(attempt, 400);
    };
    attempt();
  });
}

function createWindow(splash) {
  log('[main] creating main window');
  mainWindow = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 1100,
    minHeight: 680,
    title: 'The Melva — Hotel Management',
    icon: path.join(__dirname, 'assets', 'icon.png'),
    show: false,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: false,
      preload: path.join(__dirname, 'preload.js')
    }
  });

  mainWindow.setMenuBarVisibility(false);

  mainWindow.webContents.on('did-finish-load', () => {
    log('[main] page loaded');
    mainWindow.show();
    if (splash && !splash.isDestroyed()) splash.destroy();
    isStartingUp = false;
  });

  mainWindow.webContents.on('did-fail-load', (_e, code, desc) => {
    log(`[main] page load FAILED: ${code} ${desc}`);
  });

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });

  mainWindow.on('closed', () => { mainWindow = null; });

  log(`[main] loading http://127.0.0.1:${PORT}`);
  mainWindow.loadURL(`http://127.0.0.1:${PORT}`);
}

app.whenReady().then(async () => {
  initLog();

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
    log('[startup] waitForServer resolved — server is up');
    backupIfStale();
    scheduleNightlyBackup();
    createWindow(splash);
  } catch (err) {
    log('[startup] FATAL:', err.message);
    const logFile = path.join(app.getPath('userData'), 'startup.log');
    if (!splash.isDestroyed()) splash.destroy();
    isStartingUp = false;
    dialog.showErrorBox(
      'Startup Failed',
      `The Melva could not start:\n\n${err.message}\n\nLog file: ${logFile}`
    );
    app.quit();
  }
});

app.on('window-all-closed', () => {
  if (isStartingUp) {
    log('[lifecycle] window-all-closed fired during startup — ignoring');
    return;
  }
  log('[lifecycle] all windows closed — shutting down');
  if (serverProcess) {
    try { serverProcess.kill(); } catch (_) {}
    serverProcess = null;
  }
  app.quit();
});

app.on('activate', () => {
  if (mainWindow === null) createWindow();
});

// ─── PDF Saving ────────────────────────────────────────────────────────────
// Default storage: Desktop\Melva Documents\<receipts|invoices|quotations>\
// User can edit %APPDATA%\melva-hotel-management\pdf-config.json to redirect
// it (e.g. point at a OneDrive folder so soft copies sync automatically).
function pdfConfigPath() {
  return path.join(app.getPath('userData'), 'pdf-config.json');
}

function getPdfRoot() {
  const cfgFile = pdfConfigPath();
  let cfg = {};
  try {
    if (fs.existsSync(cfgFile)) cfg = JSON.parse(fs.readFileSync(cfgFile, 'utf8'));
  } catch (_) {}
  if (!cfg.folder) cfg.folder = path.join(app.getPath('desktop'), 'Melva Documents');
  try { fs.writeFileSync(cfgFile, JSON.stringify(cfg, null, 2)); } catch (_) {}
  return cfg.folder;
}

ipcMain.handle('melva:list-backups', async () => {
  try {
    const cfg = getBackupConfig();
    if (!fs.existsSync(cfg.folder)) return { ok: true, folder: cfg.folder, items: [] };
    const items = fs.readdirSync(cfg.folder)
      .filter(f => /^hotel-.*\.db$/.test(f))
      .map(f => {
        const full = path.join(cfg.folder, f);
        const st = fs.statSync(full);
        return { name: f, path: full, size: st.size, mtimeMs: st.mtimeMs };
      })
      .sort((a, b) => b.mtimeMs - a.mtimeMs);
    return { ok: true, folder: cfg.folder, items };
  } catch (err) {
    return { ok: false, error: err.message };
  }
});

ipcMain.handle('melva:run-backup-now', async () => {
  try {
    runBackup();
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err.message };
  }
});

// Restore a backup: kill the server, archive current DB as a safety copy,
// overwrite hotel.db with the chosen backup, restart the server.
ipcMain.handle('melva:restore-backup', async (_evt, opts) => {
  try {
    const { fileName } = opts || {};
    if (!fileName) return { ok: false, error: 'fileName is required' };
    const cfg = getBackupConfig();
    const src = path.join(cfg.folder, fileName);
    if (!fs.existsSync(src)) return { ok: false, error: 'Backup file not found' };

    const liveDb = dbPath();
    // Make a safety copy of the live DB before we overwrite it
    const safetyName = `hotel-pre-restore-${new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)}.db`;
    const safety = path.join(cfg.folder, safetyName);
    if (fs.existsSync(liveDb)) {
      fs.mkdirSync(cfg.folder, { recursive: true });
      fs.copyFileSync(liveDb, safety);
    }

    // Stop the server so SQLite isn't holding the DB
    if (serverProcess) {
      try { serverProcess.kill(); } catch (_) {}
      serverProcess = null;
    }

    // Wait a beat for handles to release on Windows
    await new Promise(r => setTimeout(r, 800));

    fs.copyFileSync(src, liveDb);
    // Also restore sidecars if they came with the backup
    for (const ext of ['-journal', '-wal', '-shm']) {
      const side = src + ext;
      const target = liveDb + ext;
      if (fs.existsSync(side)) fs.copyFileSync(side, target);
      else if (fs.existsSync(target)) {
        // remove stale sidecar that doesn't match restored DB
        try { fs.unlinkSync(target); } catch (_) {}
      }
    }

    log(`[restore] restored ${fileName} (pre-restore safety = ${safetyName})`);

    // Restart server in the background
    startServer();
    // Don't await waitForServer — let renderer reload bookings on demand
    return { ok: true, safetyCopy: safetyName };
  } catch (err) {
    log('[restore] error:', err.message);
    return { ok: false, error: err.message };
  }
});

ipcMain.handle('melva:save-pdf', async (_evt, opts) => {
  try {
    const { kind = 'document', number = String(Date.now()) } = opts || {};
    const folder = path.join(getPdfRoot(), kind);
    fs.mkdirSync(folder, { recursive: true });

    const fileName = `${kind.toUpperCase().replace(/S$/, '')}-${number}.pdf`;
    const filePath = path.join(folder, fileName);

    if (!mainWindow || mainWindow.isDestroyed()) {
      return { ok: false, error: 'No window available' };
    }

    const pdf = await mainWindow.webContents.printToPDF({
      printBackground: true,
      pageSize: 'A4',
      marginsType: 1
    });
    fs.writeFileSync(filePath, pdf);
    log(`[pdf] saved ${filePath}`);
    return { ok: true, path: filePath };
  } catch (err) {
    log('[pdf] save error:', err.message);
    return { ok: false, error: err.message };
  }
});
