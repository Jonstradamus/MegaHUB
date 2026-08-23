// Motor de logros PROPIO de MegaHUB — para todo lo que no tiene (o no
// podemos leer) un sistema de logros real: Epic, GOG, Battle.net, Riot,
// Rockstar, Ubisoft, EA, y el modo Retro (por juego Y por consola).
//
// Límite honesto: solo podemos medir tiempo jugado con precisión donde
// tenemos un dato real —
//   - Steam: horas reales desde localconfig.vdf (steamPlaytime.js), Valve ya
//     las mide con precisión, no hace falta inventar nada.
//   - Modo Retro: MegaHUB lanza el proceso del emulador él mismo, así que SÍ
//     puede medir la sesión real (inicio→cierre, incluida la hora exacta de
//     inicio) — ver recordRetroSession*.
//   - El resto de launchers (Epic/GOG/Battle.net/Riot/Rockstar/Ubisoft/EA):
//     se abren vía protocolo (steam://, com.epicgames://...) y el propio
//     launcher externo corre el juego — MegaHUB no recibe ningún proceso que
//     vigilar, así que ahí solo se cuenta CUÁNDO lanzaste algo (para rachas y
//     logros globales), nunca cuánto duró la sesión. Prometer horas exactas
//     ahí sería inventar un dato que no tenemos.
//
// No existe un "banco de logros genéricos" de referencia de otros proyectos
// para copiar contenido (se investigó: Playnite y sus plugins —
// PlayniteAchievements, SuccessStory, Local Achievements— son todos
// AGREGADORES de logros reales de Steam/GOG/RA/etc, ninguno inventa logros
// propios a partir de estadísticas). La escala de tiers y las categorías de
// abajo son diseño propio.
const store = require('../util/store');
const steamPlaytime = require('./steamPlaytime');
const { NON_GAME_APPIDS } = require('./steamKnownApps');

// Tiers de horas con nombre propio (mismo eje 0.5h→500h se reutiliza para
// logros globales, por consola y por juego — el título de cada uno se arma
// distinto según el ámbito, ver más abajo).
const HOUR_TIERS = [
  { h: 0.5, label: 'Le diste una oportunidad' },
  { h: 1, label: 'Enganchado' },
  { h: 2, label: 'Con curiosidad' },
  { h: 5, label: 'En serio' },
  { h: 10, label: 'Comprometido' },
  { h: 25, label: 'Fanático' },
  { h: 50, label: 'Veterano' },
  { h: 100, label: 'Leyenda personal' },
  { h: 200, label: 'Adicto (con cariño)' },
  { h: 500, label: 'Vives ahí' },
];
const CONSOLE_GAME_TIERS = [1, 3, 5, 10, 25, 50];
const CONSOLE_COLLECTOR_TIERS = [5, 10, 20, 50, 100];
const LIBRARY_TIERS = [10, 25, 50, 100, 250];
const MULTIPLATFORM_TIERS = [2, 3, 5, 7];
const STREAK_TIERS = [2, 3, 7, 14, 30];
const GENRE_TIERS = [1, 5]; // juegos distintos de ese género con playtime>0

function todayKey(ts = Date.now()) {
  return new Date(ts).toISOString().slice(0, 10);
}

function romKey(consoleId, romPath) {
  return `${consoleId}::${romPath.replace(/\\/g, '/').split('/').pop()}`;
}

/* ---------- Lectura/escritura de stats crudas ---------- */

function getRetroStats() {
  return store.load('ach-retro-stats', { byConsole: {}, byGame: {} });
}
function saveRetroStats(s) { store.save('ach-retro-stats', s); }

function getGenericActivity() {
  return store.load('ach-generic-activity', {
    launchCount: 0, platformsUsed: [], daysPlayed: [], firstLaunchAt: null,
    nightSessions: 0, weekendSessions: 0, // solo alimentado por sesiones retro reales, ver endRetroSession
  });
}
function saveGenericActivity(a) { store.save('ach-generic-activity', a); }

function getUnlocked() {
  return store.load('ach-unlocked', {});
}
function saveUnlocked(u) { store.save('ach-unlocked', u); }

/* ---------- Eventos que alimentan el motor ---------- */

// Se llama en CADA lanzamiento exitoso desde main.js (launch-game), sea cual
// sea la plataforma — es lo único que podemos garantizar universalmente.
function recordGenericLaunch(platform) {
  const a = getGenericActivity();
  a.launchCount = (a.launchCount || 0) + 1;
  if (!a.platformsUsed.includes(platform)) a.platformsUsed.push(platform);
  const today = todayKey();
  if (!a.daysPlayed.includes(today)) a.daysPlayed.push(today);
  if (!a.firstLaunchAt) a.firstLaunchAt = Date.now();
  saveGenericActivity(a);
}

// Inicio de una sesión de ROM retro — MegaHUB sí tiene el proceso del
// emulador, así que esto se cierra con datos reales al detectar su salida.
function startRetroSession(consoleId, romPath, title) {
  return { consoleId, key: romKey(consoleId, romPath), title, startedAt: Date.now() };
}

function endRetroSession(session) {
  if (!session) return;
  const durationMs = Date.now() - session.startedAt;
  if (durationMs < 5000) return; // sesiones de segundos (crash al abrir, etc.) no cuentan
  const stats = getRetroStats();

  const c = stats.byConsole[session.consoleId] || { playtimeMs: 0, sessions: 0, gamesPlayed: [], lastPlayed: null };
  c.playtimeMs += durationMs;
  c.sessions += 1;
  if (!c.gamesPlayed.includes(session.key)) c.gamesPlayed.push(session.key);
  c.lastPlayed = Date.now();
  stats.byConsole[session.consoleId] = c;

  const g = stats.byGame[session.key] || { consoleId: session.consoleId, title: session.title, playtimeMs: 0, sessions: 0, firstPlayed: Date.now(), lastPlayed: null };
  g.playtimeMs += durationMs;
  g.sessions += 1;
  g.lastPlayed = Date.now();
  g.title = session.title; // por si el archivo se renombró/reconoció distinto después
  stats.byGame[session.key] = g;

  saveRetroStats(stats);

  const a = getGenericActivity();
  const today = todayKey();
  if (!a.daysPlayed.includes(today)) a.daysPlayed.push(today);
  // Únicos datos con hora real de sesión que tenemos (Steam solo da el total
  // acumulado, no cuándo empezó cada sesión) — de ahí que estos dos logros
  // solo puedan alimentarse desde el modo Retro.
  const startDate = new Date(session.startedAt);
  const hour = startDate.getHours();
  const day = startDate.getDay(); // 0=domingo, 6=sábado
  if (hour >= 0 && hour < 5) a.nightSessions = (a.nightSessions || 0) + 1;
  if (day === 0 || day === 6) a.weekendSessions = (a.weekendSessions || 0) + 1;
  saveGenericActivity(a);
}

/* ---------- Cálculo de rachas ---------- */

function longestStreak(days) {
  if (!days.length) return 0;
  const sorted = [...new Set(days)].sort();
  let best = 1, cur = 1;
  for (let i = 1; i < sorted.length; i++) {
    const prev = new Date(sorted[i - 1]);
    const curDate = new Date(sorted[i]);
    const diffDays = Math.round((curDate - prev) / 86400000);
    cur = diffDays === 1 ? cur + 1 : 1;
    if (cur > best) best = cur;
  }
  return best;
}

/* ---------- Generación + evaluación de logros ---------- */

function hoursOf(ms) { return ms / 3600000; }

// Evita generar los 10 tiers completos para un juego con 2 minutos jugados:
// se corta en el primer tier no alcanzado (+1 de "próximo objetivo" para que
// el front pueda mostrar hacia dónde va, sin listar los otros 8 inútiles).
function relevantTiers(hours) {
  const idx = HOUR_TIERS.findIndex(t => hours < t.h);
  return idx === -1 ? HOUR_TIERS : HOUR_TIERS.slice(0, idx + 1);
}

// consoleNames: { [consoleId]: nombre bonito } — viene del CONSOLE_REGISTRY
// del renderer (main.js no lo tiene). libraryGamesCount: tamaño total de la
// biblioteca de PC (todas las plataformas), también viene del renderer.
// genreCounts: { [genero]: cantidad de juegos de Steam jugados con ese
// género } — main.js lo arma con la metadata que ya tiene cacheada.
// retroLibrary: { [consoleId]: [{ key, title }] } — TODAS las ROMs que el
// usuario tiene en la carpeta de esa consola (jugadas o no), para que
// "Por juego (Retro)" liste también los juegos que todavía no ha estrenado.
async function evaluate({ libraryGamesCount = 0, consoleNames = {}, genreCounts = {}, retroLibrary = {} } = {}) {
  const unlocked = getUnlocked();
  const retro = getRetroStats();
  const generic = getGenericActivity();
  const steamTimes = await steamPlaytime.getAllPlaytimes();

  const list = [];
  const push = (id, def) => {
    const earned = def.reached;
    if (earned && !unlocked[id]) unlocked[id] = Date.now();
    list.push({
      id, scope: def.scope, title: def.title, description: def.description,
      earned, earnedAt: unlocked[id] || null,
      progressCurrent: def.current, progressTarget: def.target,
      // Campos opcionales usados por el front para agrupar/filtrar (por
      // consola, por appid de Steam, por ROM).
      ...(def.consoleId !== undefined ? { consoleId: def.consoleId } : {}),
      ...(def.appid !== undefined ? { appid: def.appid } : {}),
      ...(def.gameKey !== undefined ? { gameKey: def.gameKey } : {}),
      ...(def.gameTitle !== undefined ? { gameTitle: def.gameTitle } : {}),
    });
  };

  /* ---- Globales ---- */
  const totalRetroMs = Object.values(retro.byConsole).reduce((s, c) => s + c.playtimeMs, 0);
  const totalSteamMinutes = Object.values(steamTimes).reduce((s, g) => s + g.playtimeMinutes, 0);
  const totalHours = hoursOf(totalRetroMs) + totalSteamMinutes / 60;

  push('global:first_launch', {
    scope: 'global', title: 'Primeros pasos', description: 'Lanza tu primer juego desde MegaHUB.',
    reached: generic.launchCount > 0 || Object.keys(retro.byGame).length > 0, current: Math.min(generic.launchCount, 1), target: 1,
  });
  for (const t of relevantTiers(totalHours)) {
    push(`global:playtime_${t.h}h`, {
      scope: 'global', title: `${t.label} (${t.h}h en total)`, description: `Acumula ${t.h} horas jugadas en total (Steam + Retro).`,
      reached: totalHours >= t.h, current: Math.round(totalHours * 10) / 10, target: t.h,
    });
  }
  const streak = longestStreak(generic.daysPlayed);
  for (const n of STREAK_TIERS) {
    push(`global:streak_${n}`, {
      scope: 'global', title: `Racha de ${n} días`, description: `Juega ${n} días seguidos.`,
      reached: streak >= n, current: streak, target: n,
    });
  }
  for (const n of LIBRARY_TIERS) {
    push(`global:library_${n}`, {
      scope: 'global', title: `Colección de ${n}`, description: `Ten ${n} juegos en tu biblioteca (todas las plataformas).`,
      reached: libraryGamesCount >= n, current: libraryGamesCount, target: n,
    });
  }
  const platformsUsed = new Set(generic.platformsUsed);
  if (Object.keys(steamTimes).length) platformsUsed.add('steam');
  if (Object.keys(retro.byConsole).length) platformsUsed.add('retro');
  for (const n of MULTIPLATFORM_TIERS) {
    push(`global:multiplatform_${n}`, {
      scope: 'global', title: `Multiplataforma x${n}`, description: `Juega en ${n} plataformas/launchers distintos.`,
      reached: platformsUsed.size >= n, current: platformsUsed.size, target: n,
    });
  }
  // Basados en la HORA REAL de inicio de sesión — solo el modo Retro nos la
  // da (Steam solo reporta el total acumulado, no cuándo empezó cada sesión).
  push('global:night_owl', {
    scope: 'global', title: 'Ave nocturna', description: 'Juega una sesión de Retro entre medianoche y las 5am, 5 veces.',
    reached: (generic.nightSessions || 0) >= 5, current: generic.nightSessions || 0, target: 5,
  });
  push('global:weekend_warrior', {
    scope: 'global', title: 'Guerrero de fin de semana', description: 'Juega 10 sesiones de Retro en sábado o domingo.',
    reached: (generic.weekendSessions || 0) >= 10, current: generic.weekendSessions || 0, target: 10,
  });
  for (const [genre, count] of Object.entries(genreCounts)) {
    for (const n of GENRE_TIERS) {
      push(`global:genre_${genre}_${n}`, {
        scope: 'global', title: n === 1 ? `Primer juego de ${genre}` : `Explorador de ${genre} (${n})`,
        description: n === 1 ? `Juega un juego de género ${genre}.` : `Juega ${n} juegos distintos de género ${genre}.`,
        reached: count >= n, current: Math.min(count, n), target: n,
      });
    }
  }

  /* ---- Por juego de Steam (horas reales de localconfig.vdf) ---- */
  for (const [appid, info] of Object.entries(steamTimes)) {
    // localconfig.vdf trackea Playtime hasta para apps internas de Steam sin
    // ficha de juego real (ej. 480 = Spacewar, la app de pruebas del SDK) —
    // mismo filtro que ya usa steamOwned.js para no mostrarlas en la biblioteca.
    if (NON_GAME_APPIDS.has(appid)) continue;
    const hours = info.playtimeMinutes / 60;
    for (const t of relevantTiers(hours)) {
      push(`steamgame:${appid}:${t.h}h`, {
        scope: 'steamgame', title: t.label, description: `${t.h} horas jugadas.`,
        reached: hours >= t.h, current: Math.round(hours * 10) / 10, target: t.h,
        appid,
      });
    }
  }

  /* ---- Por consola retro ---- */
  const allConsoleIds = new Set([...Object.keys(retro.byConsole), ...Object.keys(retroLibrary)]);
  for (const consoleId of allConsoleIds) {
    const c = retro.byConsole[consoleId] || { playtimeMs: 0, gamesPlayed: [] };
    const name = consoleNames[consoleId] || consoleId;
    for (const n of CONSOLE_GAME_TIERS) {
      push(`retroconsole:${consoleId}:played_${n}`, {
        scope: 'retroconsole', title: n === 1 ? `Primer juego de ${name}` : `${n} juegos de ${name}`,
        description: n === 1 ? `Juega tu primer juego de ${name}.` : `Juega ${n} juegos distintos de ${name}.`,
        reached: c.gamesPlayed.length >= n, current: c.gamesPlayed.length, target: n, consoleId,
      });
    }
    for (const t of relevantTiers(hoursOf(c.playtimeMs))) {
      push(`retroconsole:${consoleId}:${t.h}h`, {
        scope: 'retroconsole', title: `${t.label} — ${name}`, description: `Acumula ${t.h} horas jugadas en ${name}.`,
        reached: hoursOf(c.playtimeMs) >= t.h, current: Math.round(hoursOf(c.playtimeMs) * 10) / 10, target: t.h, consoleId,
      });
    }
  }

  /* ---- Por juego retro (incluye ROMs que aún no se han jugado) ---- */
  const byGameKeys = new Set(Object.keys(retro.byGame));
  const virtualEntries = {};
  for (const [consoleId, roms] of Object.entries(retroLibrary)) {
    for (const rom of roms) {
      if (byGameKeys.has(rom.key)) continue; // ya tiene stats reales, no se pisa
      virtualEntries[rom.key] = { consoleId, title: rom.title, playtimeMs: 0, sessions: 0 };
    }
  }
  for (const [key, g] of Object.entries({ ...retro.byGame, ...virtualEntries })) {
    const hours = hoursOf(g.playtimeMs);
    // Para una ROM sin jugar todavía, solo se muestra el primer tier (bloqueado)
    // como "próximo objetivo" — listar los 10 sería puro ruido.
    const tiers = hours > 0 ? relevantTiers(hours) : [HOUR_TIERS[0]];
    for (const t of tiers) {
      push(`retrogame:${key}:${t.h}h`, {
        scope: 'retrogame', title: t.label, description: `${t.h} horas jugadas en ${g.title} (${consoleNames[g.consoleId] || g.consoleId}).`,
        reached: hours >= t.h, current: Math.round(hours * 10) / 10, target: t.h,
        consoleId: g.consoleId, gameKey: key, gameTitle: g.title,
      });
    }
  }

  saveUnlocked(unlocked);
  return list;
}

// Logros de "coleccionista" por consola (cuántas ROMs tiene en su carpeta) —
// se calcula aparte porque necesita listRomFiles (retroFolders), que
// dependería de un ciclo de imports si viviera dentro de evaluate().
function evaluateCollectorAchievements(consoleId, name, romCount) {
  const unlocked = getUnlocked();
  return CONSOLE_COLLECTOR_TIERS.map(n => {
    const id = `retroconsole:${consoleId}:collector_${n}`;
    const reached = romCount >= n;
    if (reached && !unlocked[id]) { unlocked[id] = Date.now(); saveUnlocked(unlocked); }
    return {
      id, scope: 'retroconsole', title: `Coleccionista de ${name} (${n})`,
      description: `Ten ${n} ROMs de ${name} en tu carpeta.`,
      earned: reached, earnedAt: unlocked[id] || null, progressCurrent: romCount, progressTarget: n, consoleId,
    };
  });
}

module.exports = {
  recordGenericLaunch, startRetroSession, endRetroSession,
  getRetroStats, getGenericActivity,
  evaluate, evaluateCollectorAchievements,
};
