const { app, BrowserWindow, ipcMain, shell, dialog, screen } = require('electron');
const path = require('path');
const fs = require('fs');
const os = require('os');
const { spawn } = require('child_process');

const scanSteam = require('./scanners/steam');
const scanEpic = require('./scanners/epic');
const scanGog = require('./scanners/gog');
const scanBattlenet = require('./scanners/battlenet');
const scanRiot = require('./scanners/riot');
const scanXbox = require('./scanners/xbox');
const scanRockstar = require('./scanners/rockstar');
const scanUbisoft = require('./scanners/ubisoft');
const scanEa = require('./scanners/ea');
const scanRetroArch = require('./scanners/retroarch');
const steamOwned = require('./library/steamOwned');
const gogAccount = require('./library/gog');
const epicAccount = require('./library/epic');
const getSpecs = require('./services/specs');
const { getSteamMeta } = require('./services/metadata');
const analyzeRequirements = require('./services/requirements');
const steamGridDb = require('./services/steamgriddb');
const retroThumbnails = require('./services/retroThumbnails');
const theGamesDb = require('./services/thegamesdb');
const retroFolders = require('./services/retroFolders');
const emulatorDownload = require('./services/emulatorDownload');
const textureDownload = require('./services/textureDownload');
const retroCoreInstall = require('./services/retroCoreInstall');
const wikipediaCover = require('./services/wikipediaCover');
const biosInfo = require('./services/biosInfo');
const resolutionPresets = require('./services/resolutionPresets');
const retroAchievements = require('./services/retroAchievements');
const achievementEngine = require('./services/achievementEngine');
const xeniaAchievements = require('./services/xeniaAchievements');
const rpcs3Trophies = require('./services/rpcs3Trophies');
const backup = require('./services/backup');
const derivaBridge = require('./services/derivaBridge');
const companionBridge = require('./services/companionBridge');
const companionOverlay = require('./services/companionOverlay');
const steamPlaytimeSvc = require('./services/steamPlaytime');
const romMetadata = require('./services/romMetadata');
const installSizeSvc = require('./services/installSize');
const steamMatch = require('./services/steamMatch');
const retroSkins = require('./services/retroSkins');
const riotRequirements = require('./services/riotRequirements');

let mainWindow = null;

function createWindow() {
  // Sin x/y, Electron debería centrar en la pantalla primaria — pero en
  // monitores más chicos que el 1500x900 fijo (o con la posición de una
  // sesión previa en otro monitor) la ventana terminaba naciendo con medio
  // cuerpo fuera de la pantalla: el sidebar derecho (#details) y el botón de
  // mando de la topbar quedaban recortados/invisibles sin que pareciera un
  // problema de la app. Se ajusta al área de trabajo real y se centra a mano.
  const work = screen.getPrimaryDisplay().workArea;
  const winWidth = Math.min(1500, work.width - 40);
  const winHeight = Math.min(900, work.height - 40);
  const x = work.x + Math.round((work.width - winWidth) / 2);
  const y = work.y + Math.round((work.height - winHeight) / 2);

  mainWindow = new BrowserWindow({
    width: winWidth,
    height: winHeight,
    x, y,
    minWidth: 980,
    minHeight: 600,
    backgroundColor: '#0b0d12',
    autoHideMenuBar: true,
    // Sin marco nativo: la barra de título (icono + wordmark DERIVA MegaHUB +
    // botones min/max/cerrar) la dibuja ui/index.html — ver #titlebar en
    // app.css. Sin esto, la ventana quedaba con el marco gris de Windows y el
    // icono por defecto de Electron en vez de la identidad DERIVA.
    frame: false,
    icon: path.join(__dirname, '..', 'build', 'icon.ico'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });
  // Los enlaces <a target="_blank"> (descarga de emulador, alta en SteamGridDB/
  // TheGamesDB) sin esto quedan bloqueados por Electron en vez de abrir el
  // navegador real del usuario.
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });
  mainWindow.loadFile(path.join(__dirname, '..', 'ui', 'index.html'));

  // El botón de maximizar/restaurar de la titlebar propia necesita saber el
  // estado real de la ventana (también cambia con doble-clic en la titlebar,
  // Win+Up, snap, etc. — no solo con el botón), así que se avisa al renderer
  // cada vez que cambia en vez de asumir que solo lo dispara el botón.
  const notifyMaximized = () => mainWindow.webContents.send('window-maximized-change', mainWindow.isMaximized());
  mainWindow.on('maximize', notifyMaximized);
  mainWindow.on('unmaximize', notifyMaximized);
}

/* ---------- Titlebar propia (frame:false) ---------- */

ipcMain.handle('win-minimize', () => mainWindow?.minimize());
ipcMain.handle('win-maximize-toggle', () => {
  if (!mainWindow) return false;
  if (mainWindow.isMaximized()) mainWindow.unmaximize();
  else mainWindow.maximize();
  return mainWindow.isMaximized();
});
ipcMain.handle('win-close', () => mainWindow?.close());
ipcMain.handle('win-is-maximized', () => !!mainWindow?.isMaximized());

/* ---------- Companion (pill "DERIVA Companion") ---------- */
ipcMain.handle('companion-get-status', () => companionBridge.getCompanionStatus());
ipcMain.handle('companion-send-command', (_ev, cmd, value) => companionBridge.sendCommand(cmd, value));

/* ---------- Escaneo ---------- */

ipcMain.handle('scan-games', async () => {
  const results = await Promise.allSettled([
    scanSteam(), scanEpic(), scanGog(), scanBattlenet(), scanRiot(), scanXbox(),
    scanRockstar(), scanUbisoft(), scanEa(), scanRetroArch(),
  ]);
  const installed = results
    .flatMap(r => (r.status === 'fulfilled' ? r.value : []))
    .map(g => ({ installed: true, ...g }));

  const installedIds = new Set(installed.map(g => g.id));

  // Biblioteca (no instalados): Steam local + GOG/Epic si hay sesión conectada
  const ownedResults = await Promise.allSettled([
    steamOwned(getSteamPathSafe(), installedIds),
    gogAccount.ownedGames(),
    epicAccount.ownedGames(),
  ]);
  const owned = ownedResults
    .flatMap(r => (r.status === 'fulfilled' ? r.value : []))
    .filter(g => !installedIds.has(g.id));

  const games = [...installed, ...owned];
  games.sort((a, b) => a.title.localeCompare(b.title, 'es'));
  return {
    games,
    accounts: { gog: gogAccount.isConnected(), epic: epicAccount.isConnected() },
  };
});

function getSteamPathSafe() {
  try {
    const fs = require('fs');
    const { execFileSync } = require('child_process');
    const out = execFileSync('reg', ['query', 'HKCU\\Software\\Valve\\Steam', '/v', 'SteamPath'],
      { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] });
    const m = out.match(/SteamPath\s+REG_SZ\s+(.+)/);
    if (m) return m[1].trim().replace(/\//g, '\\');
    const fb = 'C:\\Program Files (x86)\\Steam';
    return fs.existsSync(fb) ? fb : null;
  } catch { return null; }
}

/* ---------- Lanzar / Instalar ---------- */

ipcMain.handle('launch-game', async (_ev, game) => {
  try {
    let ok = false;
    if (game.platform === 'battlenet') { scanBattlenet.launch(game); ok = true; }
    else if (game.platform === 'riot') { scanRiot.launch(game); ok = true; }
    else if (game.platform === 'xbox') { scanXbox.launch(game); ok = true; }
    else if (game.platform === 'retroarch') { companionOverlay.ensureRetroArchBorderless(); scanRetroArch.launch(game); ok = true; }
    else if (game.launchUri) { await shell.openExternal(game.launchUri); ok = true; }
    else if (game.exePath) {
      spawn(game.exePath, [], { cwd: game.workDir || path.dirname(game.exePath), detached: true, stdio: 'ignore' }).unref();
      ok = true;
    }
    if (!ok) return { ok: false, error: 'Sin método de lanzamiento' };
    // Solo contamos QUE se lanzó (para rachas/logros globales) — para la
    // mayoría de estas plataformas el proceso real lo corre un launcher
    // externo, así que MegaHUB nunca ve cuánto duró la sesión.
    achievementEngine.recordGenericLaunch(game.platform);
    // Puente Deriva MegaHUB (Fase 1) — "se lanzó", no "sigue jugando": sin
    // proceso propio no hay forma de saber cuándo termina, ver derivaBridge.js.
    derivaBridge.setNowPlaying({
      title: game.title, platform: game.platform,
      coverUrl: game.coverUrl || game.heroUrl || null,
      startedAt: new Date().toISOString(), source: 'launch',
    });
    return { ok: true };
  } catch (e) {
    return { ok: false, error: String(e.message || e) };
  }
});

ipcMain.handle('install-game', async (_ev, game) => {
  try {
    if (game.installUri) { await shell.openExternal(game.installUri); return { ok: true }; }
    if (game.storeUrl) { await shell.openExternal(game.storeUrl); return { ok: true }; }
    return { ok: false, error: 'Sin método de instalación' };
  } catch (e) {
    return { ok: false, error: String(e.message || e) };
  }
});

/* ---------- Cuentas ---------- */

ipcMain.handle('connect-account', async (_ev, platform) => {
  try {
    if (platform === 'gog') {
      const games = await gogAccount.login(mainWindow);
      return { ok: true, count: games.length };
    }
    if (platform === 'epic') {
      const games = await epicAccount.login(mainWindow);
      return { ok: true, count: games.length };
    }
  } catch (e) {
    return { ok: false, error: String(e.message || e) };
  }
  return { ok: false, error: 'Plataforma no soportada todavía' };
});

/* ---------- Metadata + requisitos ---------- */

ipcMain.handle('get-meta', async (_ev, game, force) => {
  if (game.platform === 'steam') {
    const appid = game.id.replace('steam-', '');
    return getSteamMeta(appid, { force: !!force });
  }
  return null;
});

ipcMain.handle('get-specs', () => getSpecs());

/* ---------- Portadas (SteamGridDB) ---------- */

ipcMain.handle('sgdb-has-key', () => steamGridDb.hasKey());
ipcMain.handle('sgdb-set-key', (_ev, key) => { steamGridDb.setKey(key); return true; });
ipcMain.handle('get-cover', (_ev, game) => steamGridDb.getCover(game.title));
ipcMain.handle('get-wikipedia-cover', (_ev, title) => wikipediaCover.getGameCover(title));

/* ---------- Consolas retro (catálogo libretro-thumbnails) ---------- */

ipcMain.handle('get-retro-catalog', async (_ev, repo) => {
  // Antes devolvía [] tanto si el catálogo genuinamente no tiene nada como si
  // la petición a GitHub falló (repo renombrado, sin conexión, rate-limit) —
  // el renderer no podía distinguir "sin resultados" de "algo se rompió".
  try { return { catalog: await retroThumbnails.listCatalog(repo) }; }
  catch (e) { return { error: String(e.message || e) }; }
});

ipcMain.handle('get-retro-cover', async (_ev, { system, title }) => {
  try {
    const repo = retroThumbnails.repoFromSystem(system);
    const catalog = await retroThumbnails.listCatalog(repo);
    return retroThumbnails.matchCoverInCatalog(catalog, title);
  } catch { return null; }
});

ipcMain.handle('tgdb-has-key', () => theGamesDb.hasKey());
ipcMain.handle('tgdb-set-key', (_ev, key) => { theGamesDb.setKey(key); return true; });
ipcMain.handle('get-retro-game-info', (_ev, title) => theGamesDb.getGameInfo(title));

/* ---------- Carpetas locales de emuladores/ROMs ---------- */

ipcMain.handle('retro-create-folders', (_ev, { id, name, emulator }) => {
  try { return retroFolders.ensureConsoleFolders(id, name, emulator); }
  catch (e) { return { error: String(e.message || e) }; }
});
ipcMain.handle('retro-open-folder', (_ev, folderPath) => { retroFolders.openFolder(folderPath); });
// Conteo liviano (solo fs.readdir, sin cotejar contra el catálogo online) para
// la grilla de selección de consolas — sin esto, "obtenido" ahí solo miraba
// las playlists de RetroArch, así que sistemas con emulador standalone
// (Xbox/Xbox 360/PS2/GameCube/Wii/PS3, que nunca pasan por RetroArch) SIEMPRE
// mostraban "Ninguno detectado" aunque el usuario ya tuviera ROMs puestas en
// su carpeta roms/<consola>/.
ipcMain.handle('retro-get-local-rom-counts', (_ev, ids) => {
  const counts = {};
  for (const id of ids) {
    try { counts[id] = retroFolders.listRomFiles(id).length; }
    catch { counts[id] = 0; }
  }
  return counts;
});
ipcMain.handle('retro-scan-roms', async (_ev, { id, repo }) => {
  const files = retroFolders.listRomFiles(id);
  if (!files.length) return [];
  const romDir = retroFolders.getRomDir(id);

  // Si el propio archivo/carpeta trae su título real en una cabecera interna
  // (SNES, PS3, PSP…) se usa ESE para buscar la carátula y como nombre
  // mostrado, en vez del nombre de archivo/carpeta — que puede venir mal
  // puesto, o ser directamente el nombre genérico de la estructura de disco
  // (ej. "PS3_GAME" en vez de "Demon's Souls"). Ver romMetadata.js.
  const detectedTitles = {};
  for (const f of files) {
    const detected = romMetadata.detectTitle(id, path.join(romDir, f));
    if (detected) detectedTitles[f] = detected;
  }
  const matchInput = files.map(f => (detectedTitles[f] ? `${detectedTitles[f]}${path.extname(f)}` : f));

  // Casi siempre un archivo suelto (stat instantáneo); en las pocas consolas
  // con ROM-como-carpeta (PS3/PSP) suma el contenido recursivamente.
  const sizesByFile = {};
  await Promise.all(files.map(async (f) => { sizesByFile[f] = await installSizeSvc.pathSize(path.join(romDir, f)); }));

  try {
    const matched = await retroThumbnails.matchLocalRoms(repo, matchInput);
    return matched.map((m, i) => ({
      ...m,
      filename: files[i], // el archivo/carpeta real en disco, no el título sintético usado para buscar
      title: detectedTitles[files[i]] || m.title,
      path: path.join(romDir, files[i]),
      sizeBytes: sizesByFile[files[i]] ?? null,
    }));
  } catch {
    // Si falla el cotejo contra el catálogo online (límite de peticiones de
    // GitHub, sin conexión, etc.) los archivos igual están en el disco: se
    // listan sin reconocer en vez de desaparecer como si la carpeta estuviera
    // vacía — eso ocultaba ROMs reales y hacía parecer que MegaHUB no las leía.
    return files.map(filename => ({
      filename,
      recognized: !!detectedTitles[filename],
      title: detectedTitles[filename] || filename.replace(/\.[^.]+$/, ''),
      coverUrl: null,
      path: path.join(romDir, filename),
      sizeBytes: sizesByFile[filename] ?? null,
    }));
  }
});

// Lanza una ROM local (la que el usuario colocó a mano, sin pasar por una
// playlist de RetroArch): para consolas con core, arranca RetroArch con
// -L <core> <rom>; para las standalone, abre el emulador con la ROM como
// argumento. Si falta el emulador o el core, avisa qué falta en vez de fallar
// en silencio.
ipcMain.handle('retro-launch-rom', async (_ev, { consoleId, consoleName, emulatorName, romPath }) => {
  try {
    if (!romPath || !fs.existsSync(romPath)) return { error: 'No se encontró el archivo de la ROM.' };
    const title = romMetadata.detectTitle(consoleId, romPath) || path.basename(romPath).replace(/\.[^.]+$/, '');
    // MegaHUB SÍ lanza el proceso del emulador él mismo aquí (a diferencia de
    // Steam/Epic/etc., que delegan en un launcher externo) — así que puede
    // medir la sesión real de juego para los logros por juego/por consola.
    const trackSession = (child) => {
      const session = achievementEngine.startRetroSession(consoleId, romPath, title);
      // Acá SÍ hay proceso real de principio a fin, así que el puente Deriva
      // MegaHUB puede marcar la sesión como "retro" (a diferencia de
      // 'launch' en launch-game) y limpiarla con certeza al cerrar.
      derivaBridge.setNowPlaying({
        title, platform: 'retro', consoleId, coverUrl: null,
        startedAt: new Date().toISOString(), source: 'retro',
      });
      child.on('exit', () => {
        achievementEngine.endRetroSession(session);
        derivaBridge.setNowPlaying(null);
      });
    };

    // Con stdio:'ignore' + detached, un crash del emulador (core incompatible,
    // BIOS mala, ROM corrupta) era invisible: MegaHUB ya había respondido
    // {ok:true} apenas lo lanzó, y el proceso podía morir un instante después
    // sin que nadie se enterara — parecía que "no pasó nada". Este chequeo NO
    // bloquea la respuesta (sigue siendo instantánea), solo avisa después si
    // el proceso muere sospechosamente rápido.
    const watchForInstantCrash = (child, label, logPath) => {
      child.on('error', (err) => {
        if (mainWindow) mainWindow.webContents.send('retro-launch-issue', { message: `No se pudo iniciar ${label}: ${err.message}` });
      });
      setTimeout(() => {
        if (child.exitCode !== null && child.exitCode !== 0 && mainWindow) {
          // El log real de RetroArch dice la razón de verdad (BIOS faltante,
          // romset no reconocido, core incompatible...) en vez de que
          // adivinemos — se lee, se filtra a las líneas que importan, y se
          // borra: es solo para este diagnóstico puntual, no queda acumulando.
          let detail = '';
          if (logPath) {
            try {
              const log = fs.readFileSync(logPath, 'utf8');
              const relevant = log.split(/\r?\n/).filter(l => /\[(error|warn)\]|missing|not found|cannot|invalid|fail/i.test(l)).slice(-5);
              if (relevant.length) detail = '\n\n' + relevant.join('\n');
              fs.unlinkSync(logPath);
            } catch {}
          }
          mainWindow.webContents.send('retro-launch-issue', {
            message: `${label} se cerró casi enseguida (código ${child.exitCode}).` +
              (detail || ' Probablemente el romset, la BIOS o el core no coinciden con lo que espera.'),
          });
        }
      }, 2500);
    };

    const coreName = retroCoreInstall.CORE_MAP[consoleId];
    if (coreName) {
      const exe = scanRetroArch.findRetroArch();
      if (!exe) return { error: 'RetroArch no está instalado — instálalo primero.' };
      const dllPath = retroCoreInstall.coreDllPath(path.dirname(exe), coreName);
      if (!fs.existsSync(dllPath)) return { error: `Falta instalar el core "${coreName}" — usa el botón "Instalar core" primero.` };
      // Ventana sin bordes en vez de fullscreen exclusivo: así el gato del
      // DERIVA Companion (si está instalado) puede seguir mostrándose encima
      // durante la partida — ver services/companionOverlay.js.
      companionOverlay.ensureRetroArchBorderless();
      const logPath = path.join(os.tmpdir(), `megahub-retroarch-${Date.now()}.log`);
      const child = spawn(exe, ['-L', dllPath, romPath, '-v', `--log-file=${logPath}`], { detached: true, stdio: 'ignore' });
      trackSession(child);
      watchForInstantCrash(child, 'RetroArch', logPath);
      child.unref();
      return { ok: true };
    }
    const status = await emulatorDownload.getEmulatorStatus(consoleId, consoleName, emulatorName);
    if (!status || !status.installed) return { error: 'El emulador de esta consola no está instalado todavía.' };
    if (consoleId === 'gamecube' || consoleId === 'wii') {
      companionOverlay.ensureDolphinBorderless(path.dirname(status.exePath));
    }
    // Xemu es QEMU por dentro: pasarle la ROM como argumento suelto la hace
    // pisar el disco duro que ya arma desde su config (ver
    // retroFolders.setXemuDvdPath) y muere al instante con código 1 — por
    // eso se le escribe el disco en su config real y se lanza sin argumentos.
    if (consoleId === 'xbox') retroFolders.setXemuDvdPath(path.dirname(status.exePath), romPath);
    const child = spawn(status.exePath, consoleId === 'xbox' ? [] : [romPath], { cwd: path.dirname(status.exePath), detached: true, stdio: 'ignore' });
    trackSession(child);
    watchForInstantCrash(child, emulatorName || 'El emulador');
    child.unref();
    return { ok: true };
  } catch (e) {
    return { error: String(e.message || e) };
  }
});

// "Ubicador de instalación": el usuario señala una carpeta que YA tiene (su
// propio emulador portable, o su carpeta de ROMs ya organizada) en vez de
// dejar que MegaHUB cree/descargue la suya. Queda guardado por consola.
ipcMain.handle('retro-get-locations', (_ev, consoleId) => retroFolders.getLocationInfo(consoleId));
ipcMain.handle('retro-pick-emulator-folder', async (_ev, consoleId) => {
  const res = await dialog.showOpenDialog(mainWindow, { title: 'Selecciona la carpeta donde ya tienes el emulador instalado', properties: ['openDirectory'] });
  if (res.canceled || !res.filePaths[0]) return null;
  retroFolders.setCustomEmuDir(consoleId, res.filePaths[0]);
  return retroFolders.getLocationInfo(consoleId);
});
ipcMain.handle('retro-pick-roms-folder', async (_ev, consoleId) => {
  const res = await dialog.showOpenDialog(mainWindow, { title: 'Selecciona tu carpeta de ROMs existente', properties: ['openDirectory'] });
  if (res.canceled || !res.filePaths[0]) return null;
  retroFolders.setCustomRomDir(consoleId, res.filePaths[0]);
  return retroFolders.getLocationInfo(consoleId);
});
ipcMain.handle('retro-clear-emulator-location', (_ev, consoleId) => { retroFolders.clearCustomEmuDir(consoleId); return retroFolders.getLocationInfo(consoleId); });
ipcMain.handle('retro-clear-roms-location', (_ev, consoleId) => { retroFolders.clearCustomRomDir(consoleId); return retroFolders.getLocationInfo(consoleId); });

// Presets de resolución/rendimiento (1080p/2K/4K/nativo): escriben directamente
// en el archivo de configuración real de cada emulador — ver resolutionPresets.js.
ipcMain.handle('retro-apply-resolution-preset', (_ev, { id, tier }) => resolutionPresets.applyPreset(id, tier));

// RetroAchievements: perfil de logros dentro de MegaHUB — solo lectura vía Web
// API (usuario + API key propia, nunca la contraseña). Ver retroAchievements.js.
ipcMain.handle('ra-has-account', () => retroAchievements.hasAccount());
ipcMain.handle('ra-get-account', () => retroAchievements.getAccount());
ipcMain.handle('ra-set-account', (_ev, { username, apiKey }) => { retroAchievements.setAccount(username, apiKey); return true; });
ipcMain.handle('ra-get-summary', async () => {
  try { return await retroAchievements.getUserSummary(); }
  catch (e) { return { error: String(e.message || e) }; }
});
ipcMain.handle('ra-get-completion-progress', async () => {
  try { return await retroAchievements.getCompletionProgress(); }
  catch (e) { return { error: String(e.message || e) }; }
});
ipcMain.handle('ra-get-game-progress', async (_ev, gameId) => {
  try { return await retroAchievements.getGameProgress(gameId); }
  catch (e) { return { error: String(e.message || e) }; }
});
ipcMain.handle('ra-get-history', () => retroAchievements.getLocalHistory());
ipcMain.handle('ra-refresh-history', async () => {
  try { return await retroAchievements.refreshHistory(); }
  catch (e) { return { error: String(e.message || e) }; }
});
ipcMain.handle('ra-get-cheevos-status', () => retroAchievements.getCheevosStatus());
ipcMain.handle('ra-enable-cheevos', () => retroAchievements.enableCheevos());

// Logros de Xenia (Xbox 360, vía .gpd locales) y trofeos de RPCS3 (PS3, vía
// TROPCONF.SFM local) — ver comentarios de cabecera de cada servicio para el
// alcance real de cada uno (RPCS3 aún no puede confirmar el estado
// desbloqueado, solo el catálogo).
ipcMain.handle('xenia-get-achievements', async () => {
  try { return await xeniaAchievements.getProfilesAchievements(); }
  catch (e) { return { error: String(e.message || e) }; }
});
ipcMain.handle('rpcs3-get-trophies', async () => {
  try { return await rpcs3Trophies.getTrophyCatalog(); }
  catch (e) { return { error: String(e.message || e) }; }
});

// Respaldo manual de ajustes (.json) — ver services/backup.js para el
// alcance exacto (qué se incluye y qué no).
ipcMain.handle('backup-export', async (_ev, localStorageData) => {
  const res = await dialog.showSaveDialog(mainWindow, {
    title: 'Exportar ajustes de MegaHUB',
    defaultPath: `megahub-backup-${new Date().toISOString().slice(0, 10)}.json`,
    filters: [{ name: 'JSON', extensions: ['json'] }],
  });
  if (res.canceled || !res.filePath) return { canceled: true };
  try {
    const data = backup.buildExport(localStorageData);
    fs.writeFileSync(res.filePath, JSON.stringify(data, null, 2));
    return { ok: true, path: res.filePath };
  } catch (e) { return { error: String(e.message || e) }; }
});
ipcMain.handle('backup-import', async () => {
  const res = await dialog.showOpenDialog(mainWindow, {
    title: 'Importar ajustes de MegaHUB',
    filters: [{ name: 'JSON', extensions: ['json'] }],
    properties: ['openFile'],
  });
  if (res.canceled || !res.filePaths[0]) return { canceled: true };
  try {
    const parsed = JSON.parse(fs.readFileSync(res.filePaths[0], 'utf8'));
    const localStorageData = backup.applyImport(parsed);
    return { ok: true, localStorage: localStorageData, path: res.filePaths[0] };
  } catch (e) { return { error: String(e.message || e) }; }
});

// Motor de logros propio de MegaHUB (ver achievementEngine.js): global +
// por-juego de Steam (horas reales) + por-juego/por-consola de Retro
// (sesiones reales medidas por MegaHUB) + "coleccionista" por consola.
ipcMain.handle('mh-ach-get-progress', async (_ev, { libraryGamesCount, consoleNames, consoles }) => {
  try {
    // Título + ícono + género de cada juego de Steam con horas reales — la
    // metadata normalmente ya está cacheada (MegaHUB la pide igual para la
    // biblioteca de PC), así que esto casi nunca golpea la red de verdad.
    const steamTimes = steamPlaytimeSvc.getAllPlaytimes();
    const steamAppids = Object.keys(steamTimes);
    const titles = {};
    const icons = {};
    const genreCounts = {};
    for (const appid of steamAppids) {
      const meta = await getSteamMeta(appid);
      titles[appid] = (meta && meta.name) || `Steam App ${appid}`;
      icons[appid] = `https://steamcdn-a.akamaihd.net/steam/apps/${appid}/header.jpg`;
      for (const genre of (meta && meta.genres) || []) {
        genreCounts[genre] = (genreCounts[genre] || 0) + 1;
      }
    }

    // Todas las ROMs que el usuario ya tiene en cada carpeta (jugadas o no),
    // para que "Por juego (Retro)" no se quede vacío solo porque nunca
    // lanzaste esa ROM desde MegaHUB.
    const retroLibrary = {};
    if (Array.isArray(consoles)) {
      for (const c of consoles) {
        const files = retroFolders.listRomFiles(c.id);
        if (!files.length) continue;
        const romDir = retroFolders.getRomDir(c.id);
        retroLibrary[c.id] = files.map(f => ({
          key: `${c.id}::${f}`,
          title: romMetadata.detectTitle(c.id, path.join(romDir, f)) || f.replace(/\.[^.]+$/, ''),
        }));
      }
    }

    const achievements = achievementEngine.evaluate({ libraryGamesCount, consoleNames, genreCounts, retroLibrary });
    const enriched = achievements.map(a => a.scope === 'steamgame'
      ? { ...a, gameTitle: titles[a.appid], gameIcon: icons[a.appid] }
      : a);

    const collector = [];
    if (Array.isArray(consoles)) {
      for (const c of consoles) {
        const count = retroFolders.listRomFiles(c.id).length;
        if (count > 0) collector.push(...achievementEngine.evaluateCollectorAchievements(c.id, c.name, count));
      }
    }
    const full = [...enriched, ...collector];

    // Puente Deriva MegaHUB (Fase 1): resumen liviano para la tarjeta de
    // "logros secundarios" del perfil de DERIVA — solo el total y los últimos
    // 3, nunca la lista completa ni la lógica de tiers.
    const earned = full.filter(a => a.earned && a.earnedAt).sort((a, b) => b.earnedAt - a.earnedAt);
    derivaBridge.setAchievementsSummary({
      unlockedTotal: full.filter(a => a.earned).length,
      recentlyUnlocked: earned.slice(0, 3).map(a => ({ title: a.title, earnedAt: new Date(a.earnedAt).toISOString() })),
    });

    return full;
  } catch (e) { return { error: String(e.message || e) }; }
});

// Descarga automática del emulador (solo consolas con fuente verificada — ver
// emulatorDownload.js). El renderer SIEMPRE confirma con el usuario antes de
// llamar a retro-download-emulator; aquí no se ejecuta nada, solo se descarga
// y (si es un .zip portable) se descomprime.
ipcMain.handle('retro-get-download-info', (_ev, consoleId) => emulatorDownload.getDownloadInfo(consoleId));
ipcMain.handle('retro-get-emulator-status', (_ev, { id, name, emulator }) => emulatorDownload.getEmulatorStatus(id, name, emulator));
ipcMain.handle('retro-download-emulator', async (_ev, { id, name, emulator }) => {
  try { return await emulatorDownload.downloadEmulator(id, name, emulator); }
  catch (e) { return { error: String(e.message || e) }; }
});

// Paquetes de texturas HD (GameCube/Wii/PSP, vía GameBanana — ver
// textureDownload.js). Mismo patrón de seguridad que retro-download-emulator:
// el renderer YA mostró nombre/tamaño y el usuario confirmó antes de llegar
// a texture-download-install.
ipcMain.handle('texture-search-game', (_ev, title) => textureDownload.searchGame(title));
ipcMain.handle('texture-list-mods', (_ev, { gameId, page }) => textureDownload.listMods(gameId, page));
ipcMain.handle('texture-get-download-info', (_ev, modId) => textureDownload.getModDownloadInfo(modId));
ipcMain.handle('texture-download-install', async (_ev, { consoleId, romPath, modId }) => {
  try { return await textureDownload.downloadAndInstall(consoleId, romPath, modId); }
  catch (e) { return { error: String(e.message || e) }; }
});
// Para el badge "Texturas HD disponibles" en el catálogo de juegos NO
// obtenidos — ver textureDownload.checkAvailability (cacheado en disco).
ipcMain.handle('texture-check-availability', (_ev, title) => textureDownload.checkAvailability(title));
ipcMain.handle('retro-open-emulator', (_ev, exePath) => {
  if (!exePath || !fs.existsSync(exePath)) return false;
  spawn(exePath, [], { cwd: path.dirname(exePath), detached: true, stdio: 'ignore' }).unref();
  return true;
});

/* ---------- RetroArch: detección + instalación de cores ---------- */

ipcMain.handle('retro-get-retroarch-status', async (_ev, consoleId) => {
  const exe = scanRetroArch.findRetroArch();
  if (!exe) return { installed: false };
  const dir = path.dirname(exe);
  const core = await retroCoreInstall.getCoreInfo(consoleId, dir);
  const systemFiles = await retroCoreInstall.getCoreSystemFilesInfo(consoleId, dir);
  const romDir = retroFolders.getRomDir(consoleId);
  const bios = biosInfo.checkBiosStatus(consoleId, path.join(dir, 'system'), romDir);
  return { installed: true, exe, core, systemFiles, bios };
});

// Abre (creándola si hace falta) la carpeta exacta donde va la BIOS de esta
// consola — el mismo checkedDir que ya calcula checkBiosStatus, para no
// duplicar la lógica de "dónde va cada BIOS" en dos lugares.
ipcMain.handle('retro-open-bios-folder', (_ev, consoleId) => {
  const exe = scanRetroArch.findRetroArch();
  if (!exe) return { error: 'RetroArch no está instalado.' };
  const dir = path.dirname(exe);
  const romDir = retroFolders.getRomDir(consoleId);
  const status = biosInfo.checkBiosStatus(consoleId, path.join(dir, 'system'), romDir);
  if (!status.required) return { error: 'Esta consola no necesita BIOS.' };
  try {
    fs.mkdirSync(status.checkedDir, { recursive: true });
    shell.openPath(status.checkedDir);
    return { ok: true, dir: status.checkedDir };
  } catch (e) {
    return { error: String(e.message || e) };
  }
});

// Botón "MULTIJUGADOR" del sidebar retro: crea (o refresca) el LEEME.txt con
// instrucciones de cómo activar el online de ESE emulador, y lo abre. La
// clave es fija (whitelist), nunca un nombre de archivo que venga del
// renderer, para no poder abrir cualquier ruta arbitraria del disco.
//
// Por qué "crea" y no solo "abre" la copia que ya viene con la app: esa copia
// vive empaquetada dentro de app.asar (de solo lectura) — shell.openPath()
// llama directo al Explorador/Notepad de Windows, que no sabe qué es un
// .asar, así que intentar abrir esa ruta fallaba en silencio ya instalado
// (el mismo tipo de bug que retroFolders.js con emulators/roms). La solución
// es la misma: se LEE el contenido desde dentro del asar (eso sí lo puede
// hacer Node/Electron) y se ESCRIBE una copia real, al lado de emulators/ y
// roms/ (mismo ROOT que retroFolders.js), y se abre esa copia real.
const MULTIPLAYER_README = {
  retroarch: 'LEEME-RetroArch-Netplay.txt',
  dolphin: 'LEEME-Dolphin-Netplay.txt',
  rpcs3: 'LEEME-RPCS3-RPCN.txt',
  pcsx2: 'LEEME-PCSX2-Red.txt',
  xemu: 'LEEME-Xemu-XLinkKai.txt',
};
ipcMain.handle('open-multiplayer-readme', (_ev, key) => {
  const filename = MULTIPLAYER_README[key];
  if (!filename) return { error: 'No hay guía de multijugador para este emulador.' };
  try {
    const source = path.join(__dirname, '..', 'docs', 'multiplayer', filename);
    const content = fs.readFileSync(source, 'utf8');
    const outDir = path.join(retroFolders.ROOT, 'multijugador');
    fs.mkdirSync(outDir, { recursive: true });
    const outPath = path.join(outDir, filename);
    fs.writeFileSync(outPath, content);
    shell.openPath(outPath);
    return { ok: true };
  } catch (e) {
    return { error: String(e.message || e) };
  }
});

ipcMain.handle('retro-install-core', async (_ev, consoleId) => {
  try {
    const exe = scanRetroArch.findRetroArch();
    if (!exe) return { error: 'RetroArch no está instalado o no se detectó en tu equipo.' };
    return await retroCoreInstall.installCore(consoleId, path.dirname(exe));
  } catch (e) {
    return { error: String(e.message || e) };
  }
});

ipcMain.handle('retro-install-core-system-files', async (_ev, consoleId) => {
  try {
    const exe = scanRetroArch.findRetroArch();
    if (!exe) return { error: 'RetroArch no está instalado o no se detectó en tu equipo.' };
    return await retroCoreInstall.installCoreSystemFiles(consoleId, path.dirname(exe));
  } catch (e) {
    return { error: String(e.message || e) };
  }
});

ipcMain.handle('retro-open-retroarch', () => {
  const exe = scanRetroArch.findRetroArch();
  if (!exe) return false;
  spawn(exe, [], { detached: true, stdio: 'ignore' }).unref();
  return true;
});

/* ---------- Skins de RetroArch ---------- */
ipcMain.handle('retro-get-skins', () => {
  const status = new Map(retroSkins.getSkinsStatus().map(s => [s.id, s]));
  return retroSkins.listSkins().map(s => ({ ...s, ...status.get(s.id) }));
});
ipcMain.handle('retro-install-skin', (_ev, id) => retroSkins.installSkin(id));
ipcMain.handle('retro-restore-skin-slot', (_ev, id) => retroSkins.restoreSlot(id));

ipcMain.handle('analyze-game', async (_ev, game) => {
  // Riot no está en Steam (League/VALORANT/TFT/LoR/2XKO son exclusivos de su
  // propio launcher) — el truco de "buscar el mismo juego en Steam" no aplica
  // acá, así que se usan requisitos curados a mano en su lugar (ver
  // riotRequirements.js, solo 5 juegos, cambian poco).
  if (game.platform === 'riot') {
    const data = riotRequirements.getRiotGameData(game.riotProduct);
    const specs = await getSpecs();
    if (!data || (!data.requirements.minimum && !data.requirements.recommended)) return { noData: true, specs: specs || null };
    if (!specs) return { noSpecs: true };
    return analyzeRequirements(data.requirements, specs);
  }

  let appid, viaMatch = null;
  if (game.platform === 'steam') {
    appid = game.id.replace('steam-', '');
  } else {
    // No hay una fuente pública de requisitos por launcher que no sea Steam,
    // así que se busca el mismo juego en la tienda de Steam por título y se
    // reusan SUS requisitos publicados — el hardware necesario no cambia
    // según dónde se compró el juego.
    const match = await steamMatch.searchSteamAppId(game.title);
    if (!match) return { noMatch: true };
    appid = match.appid;
    viaMatch = { title: match.title, exact: match.exact };
  }
  const [meta, specs] = await Promise.all([getSteamMeta(appid), getSpecs()]);
  if (!meta || (!meta.requirements.minimum && !meta.requirements.recommended)) {
    return { noData: true, specs: specs || null, viaMatch };
  }
  if (!specs) return { noSpecs: true };
  const result = analyzeRequirements(meta.requirements, specs);
  if (viaMatch) result.viaMatch = viaMatch;
  return result;
});

const installSizeCache = new Map(); // dir -> bytes, solo en memoria de este proceso
ipcMain.handle('get-install-size', async (_ev, dir) => {
  if (!dir) return null;
  if (installSizeCache.has(dir)) return installSizeCache.get(dir);
  const bytes = await installSizeSvc.dirSize(dir);
  installSizeCache.set(dir, bytes);
  return bytes;
});

app.whenReady().then(() => {
  createWindow();
  // Puente Deriva MegaHUB (Fase 4): anuncia cómo relanzarme, para el botón
  // "Abrir MegaHUB" de DERIVA Companion.
  derivaBridge.setAppInfo({ exePath: app.isPackaged ? process.execPath : null });
});
app.on('window-all-closed', () => app.quit());
