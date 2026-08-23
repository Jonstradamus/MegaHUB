// Historial de actividad semanal (reemplaza la radio del pill de Companion —
// ver ui/app.js). Combina varias fuentes de datos, cada una con la precisión
// que realmente tiene disponible; nunca se inventa una duración:
//   - Steam: horas EXACTAS, vía diffing de snapshots diarios del total que
//     ya lee steamPlaytime.js (Steam solo expone el acumulado, no por semana,
//     y encima NO lo actualiza mientras estás jugando — solo al cerrar el
//     juego). Por eso Steam TAMBIÉN está en el monitor de procesos
//     (processWatcher.js): detecta la sesión en cuanto cierra el juego, sin
//     esperar a que Steam decida sincronizar su archivo por su cuenta.
//     refreshSteamSnapshot() evita que esa misma sesión se cuente dos veces.
//   - Retro: sesiones EXACTAS — MegaHUB corre el emulador y mide el proceso
//     (ver endRetroSession en achievementEngine.js).
//   - Battle.net/Riot/Xbox/Rockstar/Ubisoft/EA: sesiones por detección de
//     proceso corriendo (ver processWatcher.js) o por cierre del proceso que
//     MegaHUB mismo lanzó (Rockstar/Ubisoft/EA) — precisión de muestreo, no
//     al segundo, pero real, no launch counts disfrazados de horas.
const store = require('../util/store');
const steamPlaytimeSvc = require('./steamPlaytime');
const derivaBridge = require('./derivaBridge');
const { NON_GAME_APPIDS } = require('./steamKnownApps');

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;
const LOG_RETENTION_MS = 60 * 24 * 60 * 60 * 1000; // 60 días, de sobra para "esta semana"
const SNAPSHOT_RETENTION = 10; // días de snapshots de Steam a conservar

function todayKey(ts = Date.now()) {
  return new Date(ts).toISOString().slice(0, 10);
}

/* ---------- Sesiones (retro + procesos detectados) ---------- */
// Un registro por sesión cerrada: { at, platform, title, minutes }.
function loadSessions() {
  return store.load('activity-log', []);
}
function saveSessions(list) {
  store.save('activity-log', list);
}

function logSession({ platform, title, minutes }) {
  if (!title || !minutes || minutes < 1) return; // sesiones de <1min son ruido (clic accidental, crash instantáneo)
  const list = loadSessions();
  list.push({ at: Date.now(), platform, title, minutes: Math.round(minutes) });
  const cutoff = Date.now() - LOG_RETENTION_MS;
  saveSessions(list.filter(s => s.at >= cutoff));
}

/* ---------- Snapshots diarios de Steam (para diffear "esta semana") ---------- */
function loadSteamSnapshots() {
  return store.load('steam-playtime-snapshots', {}); // { [appid]: [{at, totalMinutes}, ...] }
}
function saveSteamSnapshots(data) {
  store.save('steam-playtime-snapshots', data);
}

// Se llama al arrancar (ver main.js) — si hoy todavía no hay snapshot para un
// appid, guarda su total actual. Sin esto no hay forma de saber cuánto se
// jugó ESTA semana (Steam solo da el acumulado de toda la vida).
//
// Acá también se cierra el hueco de "jugué con MegaHUB cerrado": si el total
// de Steam subió desde el último snapshot (de un día distinto a hoy) y el
// monitor de procesos NUNCA vio esa sesión (porque MegaHUB no estaba
// corriendo para verla empezar), esos minutos jamás se logueaban ni llegaban
// a DERIVA — solo alimentaban el diff local de "esta semana" en el pill de
// MegaHUB. Ahora esa diferencia se loguea como una sesión más (logSession +
// setLastSession), igual que cualquier otra plataforma. Si el monitor de
// procesos SÍ la vio y ya avanzó el snapshot (refreshSteamSnapshot), acá no
// hay diferencia que contar — sin doble conteo.
async function recordSteamSnapshotsIfNeeded() {
  const totals = await steamPlaytimeSvc.getAllPlaytimes(); // { [appid]: { playtimeMinutes, lastPlayed } }
  const snapshots = loadSteamSnapshots();
  const steamMetaCache = store.load('steam-meta', {});
  const today = todayKey();
  let dirty = false;
  for (const [appid, info] of Object.entries(totals)) {
    // localconfig.vdf trackea Playtime hasta para apps internas de Steam sin
    // ficha de juego real (ej. 480 = Spacewar, la app de pruebas del SDK) —
    // mismo filtro que ya usa achievementEngine.js/steamOwned.js para no
    // mostrarlas en logros/biblioteca. Sin este filtro acá, un delta de
    // tiempo en una de esas apps se logueaba como una sesión real de "Steam
    // App 480" (visto real: 12h en una semana que el usuario no jugó eso).
    if (NON_GAME_APPIDS.has(appid)) continue;
    const list = snapshots[appid] || [];
    const last = list[list.length - 1];
    if (last && todayKey(last.at) === today) continue; // ya hay uno de hoy

    const current = info.playtimeMinutes || 0;
    if (last) {
      const untracked = current - last.totalMinutes;
      // Bug real (visto con captura): si MegaHUB estuvo cerrado varios días
      // (viaje, semana sin abrirlo...), `last` puede ser de hace 2+ semanas —
      // el diff completo de ESE hueco entero se logueaba con `at: Date.now()`
      // (HOY), así que getWeeklyActivity() lo mostraba como "jugado esta
      // semana" aunque las horas reales fueran de semanas atrás (Path of
      // Exile 20h / World War Z 5h que el usuario no tocó en 7 días). No hay
      // forma de saber CUÁNDO dentro de ese hueco se jugó, así que atribuirlo
      // entero a "ahora" es inventar el dato — mismo criterio de honestidad
      // que el resto de este módulo. Solo se loguea como sesión "reciente" si
      // el hueco es chico (≤2 días, variación normal de uso diario); un hueco
      // más grande solo actualiza la base del snapshot en silencio, sin
      // sesión falsa — se pierde precisión sobre ESE tramo, pero no se miente.
      const gapDays = (Date.now() - last.at) / 86_400_000;
      if (untracked >= 1 && gapDays <= 2) {
        const title = (steamMetaCache[appid] && steamMetaCache[appid].meta && steamMetaCache[appid].meta.name) || `Steam App ${appid}`;
        logSession({ platform: 'steam', title, minutes: untracked });
        derivaBridge.setLastSession({ platform: 'steam', title, minutes: untracked });
      }
    }
    list.push({ at: Date.now(), totalMinutes: current });
    snapshots[appid] = list.slice(-SNAPSHOT_RETENTION);
    dirty = true;
  }
  if (dirty) saveSteamSnapshots(snapshots);
}

// Se llama justo cuando el monitor de procesos (processWatcher.js) detecta
// que un juego de Steam SE CERRÓ — para ese momento Steam ya escribió el
// nuevo acumulado en localconfig.vdf (lo hace al cerrar, no mientras juegas,
// visto real: 0 minutos nuevos con una sesión en curso). Sin esto, esos mismos
// minutos se contarían DOS VECES: una por la sesión que acaba de loguear el
// watcher, y otra más adelante cuando el diff de snapshots "alcance" el nuevo
// total. Adelantar el snapshot de HOY al valor fresco evita el doble conteo.
async function refreshSteamSnapshot(appid) {
  const totals = await steamPlaytimeSvc.getAllPlaytimes();
  const info = totals[appid];
  if (!info) return;
  const snapshots = loadSteamSnapshots();
  const list = snapshots[appid] || [];
  const today = todayKey();
  if (list.length && todayKey(list[list.length - 1].at) === today) {
    list[list.length - 1] = { at: Date.now(), totalMinutes: info.playtimeMinutes || 0 };
  } else {
    list.push({ at: Date.now(), totalMinutes: info.playtimeMinutes || 0 });
  }
  snapshots[appid] = list.slice(-SNAPSHOT_RETENTION);
  saveSteamSnapshots(snapshots);
}

/* ---------- Resumen semanal combinado ---------- */
// Steam ya no se recalcula acá por diff semanal: recordSteamSnapshotsIfNeeded()
// loguea los deltas diarios como sesiones normales (logSession), así que
// sumarlos otra vez acá duplicaría las horas de Steam.
function getWeeklyActivity() {
  const cutoff = Date.now() - WEEK_MS;
  const sessions = loadSessions().filter(s => s.at >= cutoff);

  const byKey = new Map(); // `${platform}::${title}` -> minutos
  const add = (platform, title, minutes) => {
    const key = `${platform}::${title}`;
    byKey.set(key, { platform, title, minutes: (byKey.get(key)?.minutes || 0) + minutes });
  };

  for (const s of sessions) add(s.platform, s.title, s.minutes);

  return [...byKey.values()].sort((a, b) => b.minutes - a.minutes);
}

// Para el dashboard de Inicio ("Seguir jugando"): a diferencia de
// getWeeklyActivity() (agrega TOTAL de la semana, ordenado por horas), acá
// interesa el orden real de "qué toqué más recientemente" — usa retención
// completa de 60 días (no solo la semana) para que cerrar la app unos días
// no vacíe la fila de "seguir jugando".
function getRecentlyPlayed(limit = 8) {
  const sessions = loadSessions();
  const byKey = new Map(); // `${platform}::${title}` -> sesión más reciente de ese juego
  for (const s of sessions) {
    const key = `${s.platform}::${s.title}`;
    const existing = byKey.get(key);
    if (!existing || s.at > existing.at) byKey.set(key, { platform: s.platform, title: s.title, at: s.at, minutes: s.minutes });
  }
  return [...byKey.values()].sort((a, b) => b.at - a.at).slice(0, limit);
}

module.exports = { logSession, recordSteamSnapshotsIfNeeded, refreshSteamSnapshot, getWeeklyActivity, getRecentlyPlayed };
