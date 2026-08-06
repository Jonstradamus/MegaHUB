const { app, BrowserWindow, Tray, Menu, nativeImage, ipcMain, shell, dialog, screen } = require('electron');
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
const dealsEngine = require('./services/dealsEngine');
const activityLog = require('./services/activityLog');
const processWatcher = require('./services/processWatcher');
const store = require('./util/store');

let mainWindow = null;
let tray = null;
let isQuitting = false; // solo true cuando se elige "Salir" del tray — un close normal de ventana solo la oculta
// Modo widget: MISMA ventana (mainWindow) se encoge a un tamaño chico en vez de
// abrir una segunda ventana — evita re-escanear toda la biblioteca dos veces
// (lo que causaba el "se congela por un rato prolongado" reportado) y
// mantiene un solo proceso/estado. Ver win-enter-widget-mode más abajo.
let normalBounds = null;   // bounds a restaurar al salir del modo widget
let inWidgetMode = false;
let widgetShape = 'rect';
// 3 formas — ver ui/app.js initWidgetMode para qué muestra cada una:
// cuadro (grid de iconos), rectángulo (lista con títulos, la de por defecto),
// vertical (dock angosto de una sola columna, lanza directo al hacer clic).
const WIDGET_SHAPES = {
  square:   { width: 236, height: 256 },
  rect:     { width: 260, height: 400 },
  // 124px (antes 110): a 110 la barra superior (tabs PC/RETRO + selector de
  // forma) no entraba de canto y se salía por el borde derecho de la
  // ventana — ver el bloque de #widget-bar en column para esta forma en
  // app.css, que además necesita este ancho mínimo para quedar centrado.
  vertical: { width: 124, height: 440 },
};

/* ---- Auto-ocultar pegado al borde (estilo barra de tareas de Windows) ----
   Al soltar el widget cerca de un borde de la pantalla, queda "pegado" (ver
   el listener 'moved' en createWindow). Mientras esté pegado, sacar el mouse
   de la ventana lo retrae a una tira fina (PEEK_SIZE) contra ese borde; volver
   a pasar el mouse por esa tira lo despliega de nuevo — el hover lo maneja el
   renderer (mouseenter/mouseleave sobre #widget-view, ver initWidgetMode en
   ui/app.js) avisando acá por IPC, porque una ventana frameless no recibe
   eventos de mouse del sistema fuera de sus propios bounds. */
const SNAP_THRESHOLD = 28;
const PEEK_SIZE = 10;
const RETRACT_DELAY_MS = 260;
let edgeSnap = null;        // 'left' | 'right' | 'top' | 'bottom' | null (no pegado a ningún borde)
let retracted = false;      // true = actualmente reducido a la tira fina
let retractTimer = null;
let boundsAnimTimer = null; // tween en curso de doRetract()/doExpand() — ver animateBounds()
let suppressMoveHandling = false; // evita que nuestros propios setBounds() se reinterpreten como un drag del usuario
// Preferencia del usuario (Ajustes → Apariencia → "Auto-ocultar al pegarlo a
// un borde"), la manda el renderer por IPC — ver win-widget-set-autohide más
// abajo. Con esto en false el widget SIGUE pudiéndose pegar a un borde (es
// solo una ayuda de posicionado, no molesta) pero nunca se retrae solo: se
// queda fijo como un dock normal, tal como pidió el usuario.
let autoHideEnabled = true;

function clamp(v, min, max) { return Math.max(min, Math.min(v, max)); }

function detectSnapEdge(bounds) {
  const work = screen.getPrimaryDisplay().workArea;
  const distances = {
    left: bounds.x - work.x,
    right: (work.x + work.width) - (bounds.x + bounds.width),
    top: bounds.y - work.y,
    bottom: (work.y + work.height) - (bounds.y + bounds.height),
  };
  let best = null, bestDist = SNAP_THRESHOLD + 1;
  for (const [edge, d] of Object.entries(distances)) {
    if (d >= 0 && d < bestDist) { bestDist = d; best = edge; }
  }
  return bestDist <= SNAP_THRESHOLD ? best : null;
}

// Bounds pegados al borde `edge` con las dimensiones dadas, conservando la
// posición del otro eje (clampeada para que no se salga de la pantalla).
function flushBoundsForEdge(edge, width, height, anchorBounds) {
  const work = screen.getPrimaryDisplay().workArea;
  if (edge === 'left' || edge === 'right') {
    const y = clamp(anchorBounds.y, work.y, work.y + work.height - height);
    const x = edge === 'left' ? work.x : work.x + work.width - width;
    return { x, y, width, height };
  }
  const x = clamp(anchorBounds.x, work.x, work.x + work.width - width);
  const y = edge === 'top' ? work.y : work.y + work.height - height;
  return { x, y, width, height };
}

function withProgrammaticMove(fn) {
  suppressMoveHandling = true;
  fn();
  setImmediate(() => { suppressMoveHandling = false; });
}

function notifyRetractChange() {
  mainWindow?.webContents.send('widget-retract-change', retracted, edgeSnap);
}

// Anima el redimensionado/movimiento de la ventana en varios pasos en vez de
// un solo setBounds() instantáneo — el segundo argumento `true` de
// setBounds() solo anima en macOS, en Windows lo ignora por completo y el
// widget se plegaba/desplegaba de un salto seco. Se interpola x/y/width/
// height a mano con easeOutCubic (rápido al arrancar, se frena al llegar),
// el mismo gesto que cualquier panel/drawer nativo.
function animateBounds(target, duration = 190) {
  if (!mainWindow) return;
  clearTimeout(boundsAnimTimer);
  const start = mainWindow.getBounds();
  const startTime = Date.now();
  suppressMoveHandling = true;
  // Sin límites de tamaño durante el tween — min=max ya fijados al tamaño
  // ANTERIOR bloquearían los frames intermedios apenas se aparta de ese valor.
  mainWindow.setMinimumSize(1, 1);
  mainWindow.setMaximumSize(0, 0);
  function tick() {
    if (!mainWindow) return;
    const t = Math.min(1, (Date.now() - startTime) / duration);
    const eased = 1 - Math.pow(1 - t, 3);
    mainWindow.setBounds({
      x: Math.round(start.x + (target.x - start.x) * eased),
      y: Math.round(start.y + (target.y - start.y) * eased),
      width: Math.round(start.width + (target.width - start.width) * eased),
      height: Math.round(start.height + (target.height - start.height) * eased),
    });
    if (t < 1) {
      boundsAnimTimer = setTimeout(tick, 16);
    } else {
      mainWindow.setMinimumSize(target.width, target.height);
      mainWindow.setMaximumSize(target.width, target.height);
      mainWindow.setBounds(target);
      setImmediate(() => { suppressMoveHandling = false; });
    }
  }
  tick();
}

function doRetract() {
  if (!mainWindow || !edgeSnap || retracted) return;
  const b = mainWindow.getBounds();
  const vertical = edgeSnap === 'left' || edgeSnap === 'right';
  const width = vertical ? PEEK_SIZE : b.width;
  const height = vertical ? b.height : PEEK_SIZE;
  animateBounds(flushBoundsForEdge(edgeSnap, width, height, b));
  retracted = true;
  notifyRetractChange();
}

function doExpand() {
  if (!mainWindow || !edgeSnap || !retracted) return;
  const { width, height } = WIDGET_SHAPES[widgetShape] || WIDGET_SHAPES.rect;
  const b = mainWindow.getBounds();
  animateBounds(flushBoundsForEdge(edgeSnap, width, height, b));
  retracted = false;
  notifyRetractChange();
}

function resetEdgeSnapState() {
  clearTimeout(retractTimer);
  retractTimer = null;
  clearTimeout(boundsAnimTimer);
  boundsAnimTimer = null;
  suppressMoveHandling = false;
  edgeSnap = null;
  retracted = false;
}

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

  // Cerrar la ventana (X de la titlebar propia o win-close) ya NO mata la app:
  // la oculta y sigue viva en la bandeja, igual que DERIVA Companion ("el
  // gato") — así el monitor de procesos (processWatcher.js) sigue detectando
  // sesiones aunque no se esté viendo la ventana. Solo "Salir" desde el tray
  // realmente cierra.
  mainWindow.on('close', (e) => {
    if (isQuitting) return;
    e.preventDefault();
    mainWindow.hide();
  });

  // El botón de maximizar/restaurar de la titlebar propia necesita saber el
  // estado real de la ventana (también cambia con doble-clic en la titlebar,
  // Win+Up, snap, etc. — no solo con el botón), así que se avisa al renderer
  // cada vez que cambia en vez de asumir que solo lo dispara el botón.
  const notifyMaximized = () => mainWindow.webContents.send('window-maximized-change', mainWindow.isMaximized());
  mainWindow.on('maximize', notifyMaximized);
  mainWindow.on('unmaximize', notifyMaximized);

  // Detecta cuando el usuario suelta el widget cerca de un borde de la
  // pantalla y lo deja pegado ahí (ver bloque "Auto-ocultar" más arriba).
  // 'moved' (no 'move') dispara una sola vez al terminar el arrastre, no en
  // cada pixel — evita pelearse con el drag del usuario mientras todavía
  // está en curso.
  mainWindow.on('moved', () => {
    if (!inWidgetMode || suppressMoveHandling || retracted) return;
    const bounds = mainWindow.getBounds();
    const edge = detectSnapEdge(bounds);
    edgeSnap = edge;
    if (edge) {
      const flush = flushBoundsForEdge(edge, bounds.width, bounds.height, bounds);
      if (flush.x !== bounds.x || flush.y !== bounds.y) {
        withProgrammaticMove(() => mainWindow.setBounds(flush, true));
      }
    }
    notifyRetractChange();
  });
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

/* ---------- Modo widget (MegaHUB compacto en la misma ventana) ---------- */
ipcMain.handle('win-enter-widget-mode', () => {
  if (!mainWindow) return false;
  if (!inWidgetMode) {
    normalBounds = mainWindow.getBounds();
    inWidgetMode = true;
  }
  resetEdgeSnapState();
  const { width, height } = WIDGET_SHAPES[widgetShape] || WIDGET_SHAPES.rect;
  const work = screen.getPrimaryDisplay().workArea;
  const b = mainWindow.getBounds();
  // Mantiene la esquina donde ya estaba la ventana en vez de saltar al centro.
  const x = Math.max(work.x, Math.min(b.x, work.x + work.width - width));
  const y = Math.max(work.y, Math.min(b.y, work.y + work.height - height));
  // Tamaño fijo por forma: el widget es un panel chico "de un vistazo", no
  // una ventana normal — si se pudiera arrastrar del borde para agrandarlo,
  // la grilla de iconos (auto-fill/1fr) los infla hasta ocupar el hueco en
  // vez de simplemente mostrar más, dejando cuadros gigantes con solo la
  // letra de respaldo. Min = max = tamaño de la forma → resizable a secas
  // ni hace falta, pero se deja también por las dudas (snap de Windows, etc).
  mainWindow.setMinimumSize(width, height);
  mainWindow.setMaximumSize(width, height);
  mainWindow.setResizable(false);
  mainWindow.setBounds({ x, y, width, height }, true);
  mainWindow.setAlwaysOnTop(true);
  mainWindow.setSkipTaskbar(true);
  return true;
});
ipcMain.handle('win-set-widget-shape', (_ev, shape) => {
  if (!mainWindow || !inWidgetMode || !WIDGET_SHAPES[shape]) return false;
  widgetShape = shape;
  const { width, height } = WIDGET_SHAPES[shape];
  const b = mainWindow.getBounds();
  clearTimeout(retractTimer);
  retracted = false; // una forma nueva siempre entra expandida
  const bounds = edgeSnap ? flushBoundsForEdge(edgeSnap, width, height, b) : { x: b.x, y: b.y, width, height };
  withProgrammaticMove(() => {
    mainWindow.setMinimumSize(width, height);
    mainWindow.setMaximumSize(width, height);
    mainWindow.setBounds(bounds, true);
  });
  notifyRetractChange();
  return true;
});
ipcMain.handle('win-exit-widget-mode', () => {
  if (!mainWindow) return false;
  inWidgetMode = false;
  resetEdgeSnapState();
  mainWindow.setAlwaysOnTop(false);
  mainWindow.setSkipTaskbar(false);
  mainWindow.setResizable(true);
  mainWindow.setMinimumSize(980, 600);
  mainWindow.setMaximumSize(0, 0); // 0,0 = Electron: sin límite máximo
  if (normalBounds) mainWindow.setBounds(normalBounds, true);
  normalBounds = null;
  return true;
});
ipcMain.handle('win-widget-hover-enter', () => {
  clearTimeout(retractTimer);
  if (edgeSnap && retracted) doExpand();
  return true;
});
ipcMain.handle('win-widget-hover-leave', () => {
  if (!edgeSnap || retracted || !autoHideEnabled) return false;
  clearTimeout(retractTimer);
  retractTimer = setTimeout(doRetract, RETRACT_DELAY_MS);
  return true;
});
ipcMain.handle('win-widget-set-autohide', (_ev, enabled) => {
  autoHideEnabled = !!enabled;
  if (!autoHideEnabled) {
    clearTimeout(retractTimer);
    if (retracted) doExpand();
  }
  return true;
});

/* ---------- Companion (pill "DERIVA Companion") ---------- */
// Solo el estado de conexión — la radio se sacó del pill (ver ui/app.js), así
// que ya no hace falta exponer companion-send-command a la UI. La función de
// enviar comandos sigue viva en companionBridge.js por si vuelve a usarse.
ipcMain.handle('companion-get-status', () => companionBridge.getCompanionStatus());
ipcMain.handle('companion-get-weekly-activity', () => activityLog.getWeeklyActivity());
ipcMain.handle('companion-get-recently-played', (_ev, limit) => activityLog.getRecentlyPlayed(limit));

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
  // La lista de juegos de battlenet/riot/xbox instalados puede cambiar entre
  // escaneos — el watcher de procesos (historial semanal del pill de
  // Companion) necesita saber a qué .exe prestarle atención ahora.
  processWatcher.setWatchTargets(installed);
  activityLog.recordSteamSnapshotsIfNeeded();
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
      // La sesión de Rockstar/Ubisoft/EA la mide el watcher de procesos (ver
      // processWatcher.js) por su nombre de .exe, no un listener acá — así
      // cuenta la duración real sin importar si se abrió desde MegaHUB o
      // desde el launcher nativo, y no se cuenta doble.
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
ipcMain.handle('retro-launch-rom', async (_ev, { consoleId, consoleName, emulatorName, romPath, title: providedTitle }) => {
  try {
    if (!romPath || !fs.existsSync(romPath)) return { error: 'No se encontró el archivo de la ROM.' };
    // El renderer manda el título ya cotejado contra el catálogo libretro-
    // thumbnails (el mismo que muestra la biblioteca) cuando lo tiene — evita
    // que la sesión/logro se guarde con el nombre crudo del archivo (ej.
    // "hotd2") en vez del real ("The House of the Dead 2").
    const title = providedTitle || romMetadata.detectTitle(consoleId, romPath) || path.basename(romPath).replace(/\.[^.]+$/, '');
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
        const minutes = (Date.now() - session.startedAt) / 60000;
        activityLog.logSession({ platform: 'retro', title: session.title, minutes });
        derivaBridge.setLastSession({ platform: 'retro', title: session.title, minutes });
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

// Raíz por defecto para TODAS las consolas que no tengan su propio ubicador
// (ver arriba) — por defecto Documentos\MegaHUB, cambiable desde Ajustes
// generales (Modo Retro) para quien prefiera otro disco/carpeta.
ipcMain.handle('retro-get-default-root', () => ({ root: retroFolders.ROOT, isDefault: retroFolders.ROOT === retroFolders.DOCUMENTS_ROOT, defaultRoot: retroFolders.DOCUMENTS_ROOT }));
ipcMain.handle('retro-pick-default-root', async () => {
  const res = await dialog.showOpenDialog(mainWindow, { title: 'Selecciona dónde guardar emuladores y ROMs por defecto', properties: ['openDirectory', 'createDirectory'] });
  if (res.canceled || !res.filePaths[0]) return null;
  return retroFolders.setDefaultRoot(res.filePaths[0]);
});
ipcMain.handle('retro-reset-default-root', () => retroFolders.resetDefaultRoot());

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

// Ofertas de Steam/GOG/Epic (CheapShark) + recomendación personalizada según
// microgénero más jugado — ver services/dealsEngine.js.
ipcMain.handle('deals-get-top', async (_ev, force) => {
  try { return await dealsEngine.getTopDeals({ force }); }
  catch (e) { return { error: String(e.message || e), steam: [], gog: [], epic: [], other: [] }; }
});
ipcMain.handle('deals-get-recommendation', async (_ev, force) => {
  try { return { recommendation: await dealsEngine.getRecommendations({ force }) }; }
  catch (e) { return { error: String(e.message || e) }; }
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
      // scope/consoleId/appid/gameTitle (cuando el logro es "por juego", no
      // global — ver evaluate() en achievementEngine.js) viajan también, para
      // que DERIVA pueda agrupar logros por juego (misma idea que ya hace
      // Steam en su propia sección de logros) en vez de solo mostrar el total.
      recentlyUnlocked: earned.slice(0, 3).map(a => ({
        title: a.title, description: a.description || null, earnedAt: new Date(a.earnedAt).toISOString(),
        scope: a.scope || null, consoleId: a.consoleId ?? null, appid: a.appid ?? null, gameTitle: a.gameTitle ?? null,
      })),
    });

    return full;
  } catch (e) { return { error: String(e.message || e) }; }
});

// Perfil — estadísticas unificadas (Fase 2 del plan de Inicio/Perfil). Cruza
// las DOS únicas fuentes con horas reales de por vida (Steam vía
// localconfig.vdf y Retro vía las sesiones que MegaHUB mismo mide) — el
// resto de launchers (Epic/GOG/Battle.net/Riot/Rockstar/Ubisoft/EA/Xbox) se
// abren por protocolo y MegaHUB nunca ve cuánto duró la sesión, así que acá
// se listan como "sin datos de horas" en vez de inventar un número (mismo
// criterio que ya documenta activityLog.js). consoleNames viene del
// renderer, igual que en mh-ach-get-progress — main.js no tiene el
// CONSOLE_REGISTRY.
ipcMain.handle('get-profile-stats', async (_ev, { consoleNames = {} } = {}) => {
  try {
    const steamTimes = steamPlaytimeSvc.getAllPlaytimes(); // { appid: { playtimeMinutes, lastPlayed } }
    const steamTitles = {};
    for (const appid of Object.keys(steamTimes)) {
      const meta = await getSteamMeta(appid);
      steamTitles[appid] = (meta && meta.name) || `Steam App ${appid}`;
    }
    const topSteamGames = Object.entries(steamTimes)
      .map(([appid, info]) => ({ appid, title: steamTitles[appid], minutes: info.playtimeMinutes || 0 }))
      .filter(g => g.minutes > 0)
      .sort((a, b) => b.minutes - a.minutes)
      .slice(0, 8);
    const totalSteamMinutes = Object.values(steamTimes).reduce((s, g) => s + (g.playtimeMinutes || 0), 0);

    const retro = achievementEngine.getRetroStats(); // { byConsole, byGame }
    const topRetroGames = Object.entries(retro.byGame)
      .map(([key, g]) => ({ key, title: g.title, consoleId: g.consoleId, minutes: Math.round(g.playtimeMs / 60000) }))
      .filter(g => g.minutes > 0)
      .sort((a, b) => b.minutes - a.minutes)
      .slice(0, 8);
    const byConsole = Object.entries(retro.byConsole)
      .map(([consoleId, c]) => ({ consoleId, name: consoleNames[consoleId] || consoleId, minutes: Math.round(c.playtimeMs / 60000) }))
      .filter(c => c.minutes > 0)
      .sort((a, b) => b.minutes - a.minutes);
    const totalRetroMinutes = byConsole.reduce((s, c) => s + c.minutes, 0);

    const generic = achievementEngine.getGenericActivity(); // { platformsUsed, launchCount, daysPlayed, ... }
    const untrackedPlatforms = (generic.platformsUsed || []).filter(p => p !== 'steam' && p !== 'retroarch');

    return {
      totalSteamMinutes, totalRetroMinutes,
      topSteamGames, topRetroGames, byConsole,
      untrackedPlatforms,
      daysPlayed: (generic.daysPlayed || []).length,
    };
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
ipcMain.handle('texture-list-mods', (_ev, { gameId, page, sort, perPage }) => textureDownload.listMods(gameId, page, sort, perPage));
ipcMain.handle('texture-get-download-info', (_ev, modId) => textureDownload.getModDownloadInfo(modId));
ipcMain.handle('texture-download-install', async (_ev, { consoleId, romPath, mod }) => {
  try { return await textureDownload.downloadAndInstall(consoleId, romPath, mod); }
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

/* ---------- Bandeja del sistema + inicio con Windows ("como el gato") ----------
   MegaHUB necesita seguir corriendo en segundo plano para que processWatcher.js
   detecte sesiones aunque la ventana esté cerrada/oculta — sin esto, cerrar la
   ventana mataba el proceso y con él todo el monitor de actividad semanal. */
function buildTray() {
  if (!tray) {
    let icon;
    try { icon = nativeImage.createFromPath(path.join(__dirname, '..', 'build', 'icon.ico')); } catch { icon = null; }
    tray = new Tray(icon && !icon.isEmpty() ? icon : nativeImage.createEmpty());
    tray.setToolTip('DERIVA MegaHUB');
    tray.on('double-click', () => { mainWindow?.show(); mainWindow?.focus(); });
  }
  const autostart = app.getLoginItemSettings().openAtLogin;
  tray.setContextMenu(Menu.buildFromTemplate([
    { label: 'Abrir MegaHUB', click: () => { mainWindow?.show(); mainWindow?.focus(); } },
    { label: 'Iniciar con Windows', type: 'checkbox', checked: autostart,
      click: (item) => app.setLoginItemSettings({ openAtLogin: item.checked }) },
    { type: 'separator' },
    { label: 'Salir', click: () => { isQuitting = true; app.quit(); } },
  ]));
}

// Sin esto, cada login de Windows (autostart) o doble-click accidental lanza
// OTRO proceso encima del anterior en vez de reusar el que ya corre — cada uno
// vigila procesos y logros por su cuenta (processWatcher.js/achievementEngine.js)
// y reporta a DERIVA por separado, viéndose ahí como logros/sesiones duplicadas
// de la MISMA partida real. Solo el primer proceso se queda; los siguientes se
// cierran solos y le piden al primero que muestre su ventana.
const gotSingleInstanceLock = app.requestSingleInstanceLock();
if (!gotSingleInstanceLock) {
  app.quit();
  return;
}
app.on('second-instance', () => {
  if (!mainWindow) return;
  if (mainWindow.isMinimized()) mainWindow.restore();
  mainWindow.show();
  mainWindow.focus();
});

app.whenReady().then(() => {
  // Primera vez que corre esta versión con soporte de bandeja: activa el
  // inicio automático por defecto una sola vez — después el usuario decide
  // libremente desde el menú del tray, sin que un reinicio de MegaHUB se lo
  // vuelva a pisar.
  const autostartDefault = store.load('autostart-default-applied', { applied: false });
  if (!autostartDefault.applied) {
    try { app.setLoginItemSettings({ openAtLogin: true }); } catch { /* no soportado */ }
    store.save('autostart-default-applied', { applied: true });
  }

  createWindow();
  buildTray();
  // Si Windows lanzó MegaHUB al iniciar sesión, se queda en segundo plano en
  // la bandeja en vez de abrir la ventana de golpe — igual que el gato.
  if (app.getLoginItemSettings().wasOpenedAtLogin) mainWindow.hide();

  // Puente Deriva MegaHUB (Fase 4): anuncia cómo relanzarme, para el botón
  // "Abrir MegaHUB" de DERIVA Companion.
  derivaBridge.setAppInfo({ exePath: app.isPackaged ? process.execPath : null });
  // Historial semanal del pill de Companion (ver activityLog.js/processWatcher.js) —
  // arranca ya con lo que haya en disco; setWatchTargets() se completa recién
  // con el primer scan-games.
  activityLog.recordSteamSnapshotsIfNeeded();
  processWatcher.start();
});
app.on('window-all-closed', () => { /* vive en el tray */ });
app.on('before-quit', () => { isQuitting = true; });
