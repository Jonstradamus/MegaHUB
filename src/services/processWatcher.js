// Detecta si un juego está corriendo AHORA MISMO sondeando la lista de
// procesos de Windows — funciona sin importar CÓMO se abrió el juego (desde
// MegaHUB, desde el launcher nativo, desde un acceso directo), a diferencia
// de escuchar el "exit" de un proceso que lanzó MegaHUB mismo (que solo
// cuenta si el usuario le dio "Jugar" acá). Cubre:
//   - Battle.net/Riot/Xbox: el juego lo corre siempre un launcher externo
//     (Battle.net.exe/RiotClientServices.exe/explorer.exe) — nunca hay
//     proceso propio de MegaHUB al que escucharle el cierre, así que esta
//     es la ÚNICA forma posible de medir su duración.
//   - Rockstar/Ubisoft/EA: acá SÍ hay un exePath conocido y MegaHUB podría
//     lanzarlo él mismo, pero eso solo mide si se jugó desde acá — sumarlos
//     acá también los deja igual de "a prueba de cómo se abrió" que el resto.
//   - Steam: tiene su propio tracking exacto (steamPlaytime.js/activityLog.js),
//     pero Steam solo escribe el acumulado nuevo en localconfig.vdf AL CERRAR
//     el juego, nunca mientras está corriendo (visto real: 0 minutos nuevos
//     con una sesión de horas en curso) — así que también se vigila acá para
//     no depender de que Steam decida sincronizar por su cuenta. Ver
//     refreshSteamSnapshot() en activityLog.js para cómo se evita el doble conteo.
// Precisión de muestreo (según INTERVAL_MS), no al segundo.
const { execFile } = require('child_process');
const https = require('https');
const fs = require('fs');
const path = require('path');
const activityLog = require('./activityLog');
const derivaBridge = require('./derivaBridge');

const INTERVAL_MS = 20 * 1000;

// League of Legends y Teamfight Tactics corren dentro del MISMO
// "League of Legends.exe" — no hay forma de distinguirlos por proceso. El
// propio cliente de Riot expone una API HTTPS local (LCU) con credenciales
// en un "lockfile" junto al ejecutable del juego (formato
// "nombre:pid:puerto:password:protocolo") que sí dice qué cola se está
// jugando. Si el lockfile no existe o el cliente no responde (versión vieja,
// timing al arrancar la partida), se cae de vuelta a "League of Legends" sin
// registro roto — esto es un AGREGADO, nunca puede dejar el tracking peor
// de lo que estaba.
const LEAGUE_LOCKFILE_CANDIDATES = ['C:\\Riot Games\\League of Legends\\lockfile'];

function readLeagueLockfile() {
  for (const p of LEAGUE_LOCKFILE_CANDIDATES) {
    try {
      const raw = fs.readFileSync(p, 'utf8').trim();
      const [, , port, password, protocol] = raw.split(':');
      if (port && password) return { port, password, protocol: protocol || 'https' };
    } catch { /* probamos el siguiente candidato */ }
  }
  return null;
}

// Devuelve el gameMode actual ("CLASSIC", "TFT", "ARAM", ...) o null si no
// se pudo determinar (fuera de partida, cliente no responde, etc.).
function queryLeagueGameMode() {
  return new Promise((resolve) => {
    const auth = readLeagueLockfile();
    if (!auth) return resolve(null);
    const req = https.request({
      host: '127.0.0.1', port: auth.port, path: '/lol-gameflow/v1/session', method: 'GET',
      rejectUnauthorized: false, timeout: 3000,
      headers: { Authorization: 'Basic ' + Buffer.from('riot:' + auth.password).toString('base64') },
    }, (res) => {
      let body = '';
      res.on('data', (chunk) => { body += chunk; });
      res.on('end', () => {
        try {
          const json = JSON.parse(body);
          resolve((json && json.gameData && json.gameData.queue && json.gameData.queue.gameMode) || null);
        } catch { resolve(null); }
      });
    });
    req.on('error', () => resolve(null));
    req.on('timeout', () => { req.destroy(); resolve(null); });
    req.end();
  });
}

// Battle.net y Riot no exponen el .exe real del juego (solo el del launcher)
// — mapa curado a mano, mismo criterio que PRODUCT_CODES en scanners/battlenet.js.
const KNOWN_PROCESS_NAMES = [
  // Un solo balde para Retail + Classic + PTR (wowt.exe) — pedido explícito
  // del mantenedor: da igual qué cliente de WoW se abra, cuenta como el
  // mismo consumo. Antes Classic tenía su propia entrada separada; con
  // nombres de proceso disjuntos, dedupeByProcessOverlap() (ver abajo) no
  // los fusionaba — cada cliente generaba su propia sesión/entrada.
  [/world of warcraft/i, ['wow.exe', 'wow-64.exe', 'wowt.exe', 'wowclassic.exe', 'wowclassict.exe']],
  [/overwatch/i, ['overwatch.exe']],
  [/diablo iv|diablo 4/i, ['diablo iv.exe']],
  [/diablo iii|diablo 3/i, ['diablo iii64.exe', 'diablo iii.exe']],
  [/diablo ii.*resurrected/i, ['d2r.exe']],
  [/diablo immortal/i, ['abyss.exe', 'diabloimmortal.exe']],
  [/hearthstone/i, ['hearthstone.exe']],
  [/starcraft ii|starcraft 2/i, ['sc2_x64.exe', 'sc2.exe']],
  [/starcraft.*remastered|^starcraft$/i, ['starcraft.exe']],
  [/heroes of the storm/i, ['heroesofthestorm_x64.exe', 'heroesofthestorm.exe']],
  [/warcraft.*(iii|3).*reforged/i, ['warcraft iii.exe']],
  // "Teamfight Tactics" NO tiene entrada acá a propósito: corre dentro del
  // mismo "League of Legends.exe" (no existe un .exe propio de TFT), así que
  // por nombre de proceso es indistinguible de una partida normal — ver
  // queryLeagueGameMode() más arriba, que sí logra diferenciarlas preguntando
  // al cliente. "leagueclientux.exe" (el launcher/menú/lobby del cliente)
  // tampoco entra: está corriendo todo el rato con solo tener el cliente
  // abierto, sin estar jugando — contarlo sumaba tiempo de menú como si
  // fuera partida.
  [/^league of legends$/i, ['league of legends.exe']],
  [/^teamfight tactics$/i, []], // ver nota arriba: se detecta vía el target de LoL, no el propio
  [/valorant/i, ['valorant-win64-shipping.exe', 'valorant.exe']],
  [/legends of runeterra/i, ['lor.exe']],
  [/2xko/i, ['2xko.exe']],
];

// Busca .exe hasta 3 niveles de profundidad (visto real: el ejecutable de
// Albion Online vive en <install>/game/Albion-Online.exe, no en la raíz —
// muy común en juegos Unity/Unreal con su Binaries/ propia). Topes generosos
// pero acotados (300 archivos vistos, 200 carpetas) para no colgarse en una
// instalación gigante con cientos de miles de archivos (assets, DLC, etc.).
function findExesRecursive(dir, depth = 3, seenDirs = { n: 0 }, seenFiles = { n: 0 }) {
  if (depth < 0 || seenDirs.n > 200 || seenFiles.n > 300) return [];
  seenDirs.n++;
  let entries;
  try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch { return []; }
  const exes = [];
  for (const entry of entries) {
    if (seenFiles.n > 300) break;
    if (entry.isFile() && entry.name.toLowerCase().endsWith('.exe')) {
      exes.push(entry.name.toLowerCase());
      seenFiles.n++;
    } else if (entry.isDirectory() && depth > 0) {
      exes.push(...findExesRecursive(path.join(dir, entry.name), depth - 1, seenDirs, seenFiles));
    }
  }
  return exes;
}

function candidateNamesFor(game) {
  // Xbox/Steam no tienen un mapa curado posible (miles de juegos) — en
  // cambio, cualquier .exe dentro de su carpeta de instalación es un
  // candidato razonable a "es este juego corriendo".
  if ((game.platform === 'xbox' || game.platform === 'steam') && game.installDir) {
    return [...new Set(findExesRecursive(game.installDir))];
  }
  // Rockstar/Ubisoft/EA: el exePath ya lo conocemos exacto (scanners/rockstar.js,
  // ubisoft.js, ea.js) — no hace falta ningún mapa curado, solo su nombre de archivo.
  if (game.exePath) return [path.basename(game.exePath).toLowerCase()];
  const match = KNOWN_PROCESS_NAMES.find(([re]) => re.test(game.title));
  return match ? match[1] : [];
}

function getRunningProcessNames() {
  return new Promise((resolve) => {
    execFile('tasklist', ['/fo', 'csv', '/nh'], { encoding: 'utf8', maxBuffer: 4 * 1024 * 1024 }, (err, stdout) => {
      if (err || !stdout) return resolve(new Set());
      const names = new Set();
      for (const line of stdout.split('\n')) {
        const m = line.match(/^"([^"]+)"/);
        if (m) names.add(m[1].toLowerCase());
      }
      resolve(names);
    });
  });
}

let watchTargets = []; // [{ key, title, platform, names: [...] }]
const activeSessions = new Map(); // key -> startedAt
// Suscriptores para "una sesión de juego recién terminó" (ver
// notifySessionEnded en main.js, resumen de sesión al cerrar) — este módulo
// no tiene mainWindow propio, así que en vez de acoplarse a Electron acá
// mismo, main.js se suscribe una vez y decide qué hacer con el aviso.
const sessionEndListeners = [];
function onSessionEnd(fn) { sessionEndListeners.push(fn); }
// Mismo patrón para "arrancó una sesión" (widget: estado "jugando ahora",
// ver auditoría UX) — separado de onSessionEnd porque son momentos distintos
// del mismo ciclo, no todo suscriptor quiere ambos.
const sessionStartListeners = [];
function onSessionStart(fn) { sessionStartListeners.push(fn); }
// Último gameMode visto durante la sesión activa de League (ver
// queryLeagueGameMode) — se consulta en cada tick mientras la sesión sigue
// abierta y se usa recién al cerrarla para decidir el título final.
const leagueSessionModes = new Map(); // key -> 'CLASSIC' | 'TFT' | ...

// Se llama cada vez que termina un scan-games (ver main.js) — la lista de
// juegos instalados puede cambiar entre escaneos.
function setWatchTargets(games) {
  const raw = games
    .filter(g => ['battlenet', 'riot', 'xbox', 'rockstar', 'ubisoft', 'ea', 'steam'].includes(g.platform))
    .map(g => ({ key: g.id, title: g.title, platform: g.platform, names: candidateNamesFor(g) }))
    .filter(t => t.names.length);
  watchTargets = dedupeByProcessOverlap(raw);
}

// Distintas entradas de biblioteca (sobre todo Battle.net, donde el mapeo es
// por regex sobre el título, ver KNOWN_PROCESS_NAMES) pueden compartir el
// MISMO set de nombres de proceso — p.ej. "World of Warcraft" y "World of
// Warcraft: Dragonflight" (u otra entrada vieja de un escaneo anterior)
// matchean ambas /world of warcraft/i → [wow.exe, wow-64.exe, wowt.exe].
// Sin deduplicar, tick() de abajo trata cada una como un target
// INDEPENDIENTE — cuando el usuario abre wow.exe UNA sola vez, las N
// entradas "ven" el mismo proceso corriendo y cada una loguea su PROPIA
// sesión con la MISMA duración real, multiplicando las horas (visto real:
// "World of Warcraft" 3 veces con exactamente 31h cada una en la misma
// semana). Fusiona cualquier par de targets que comparta al menos un nombre
// de proceso en uno solo — el título más corto gana (más probable de ser el
// genérico correcto, no una variante con sufijo de expansión).
function dedupeByProcessOverlap(targets) {
  const merged = [];
  for (const t of targets) {
    const overlap = merged.find((m) => m.names.some((n) => t.names.includes(n)));
    if (!overlap) { merged.push({ ...t, names: [...t.names] }); continue; }
    for (const n of t.names) if (!overlap.names.includes(n)) overlap.names.push(n);
    if (t.title.length < overlap.title.length) overlap.title = t.title;
  }
  return merged;
}

function finalTitleFor(target, key) {
  if (target.title !== 'League of Legends') return target.title;
  // Si en algún momento de la sesión el cliente reportó cola de TFT, esta
  // sesión completa se loguea como Teamfight Tactics — no se puede saber el
  // minuto exacto en que cambió, así que se atribuye entera a lo último que
  // se jugó (asume que no se alterna de cola sin cerrar el cliente, que es
  // como funciona en la práctica: cambiar de cola vuelve al lobby, no mata
  // el proceso del juego).
  return leagueSessionModes.get(key) === 'TFT' ? 'Teamfight Tactics' : target.title;
}

async function tick() {
  if (!watchTargets.length) return;
  const running = await getRunningProcessNames();
  const now = Date.now();
  for (const target of watchTargets) {
    const isRunning = target.names.some(n => running.has(n));
    const session = activeSessions.get(target.key);
    if (isRunning && !session) {
      activeSessions.set(target.key, now);
      if (target.title === 'League of Legends') leagueSessionModes.delete(target.key);
      for (const fn of sessionStartListeners) { try { fn({ platform: target.platform, title: target.title }); } catch {} }
    } else if (isRunning && session && target.title === 'League of Legends') {
      // Mientras la sesión sigue abierta: preguntarle al cliente qué cola es
      // ahora mismo. No se espera esta consulta (no bloquea el resto del
      // tick) — si tarda o falla, simplemente no hay dato nuevo este ciclo.
      queryLeagueGameMode().then((mode) => {
        if (mode === 'TFT') leagueSessionModes.set(target.key, 'TFT');
      });
    } else if (!isRunning && session) {
      activeSessions.delete(target.key);
      const minutes = (now - session) / 60000;
      const title = finalTitleFor(target, target.key);
      leagueSessionModes.delete(target.key);
      activityLog.logSession({ platform: target.platform, title, minutes });
      derivaBridge.setLastSession({ platform: target.platform, title, minutes });
      for (const fn of sessionEndListeners) { try { fn({ platform: target.platform, title, minutes }); } catch {} }
      // Evita el doble conteo con el diffing de snapshots de Steam (ver
      // activityLog.js) — sin esto, estos mismos minutos se sumarían otra vez
      // cuando el snapshot diario "alcance" el nuevo total de Steam.
      if (target.platform === 'steam') {
        const appid = target.key.replace(/^steam-/, '');
        activityLog.refreshSteamSnapshot(appid);
      }
    }
  }
}

let timer = null;
function start() {
  if (timer) return;
  timer = setInterval(tick, INTERVAL_MS);
}

module.exports = { setWatchTargets, start, onSessionEnd, onSessionStart };
