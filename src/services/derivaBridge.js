// Puente de estado local con el ecosistema DERIVA (Companion Desktop) — ver
// el plan "Deriva MegaHUB", Fase 1. Un único archivo JSON, sin servidor ni
// socket: MegaHUB lo escribe, Companion lo lee en su propio sondeo. Si
// Companion no está instalado, este archivo simplemente nunca se lee —
// ninguna de las dos apps depende de la otra.
//
// Honesto sobre sus límites (mismo criterio que achievementEngine.js): para
// "ahora mismo estoy jugando esto" (setNowPlaying), solo Retro tiene proceso
// propio que avisa CUÁNDO termina — el resto de plataformas solo se sabe que
// se lanzó (campo "source"). Para la DURACIÓN ya cerrada de una sesión
// (setLastSession) la precisión es mejor: Retro y Rockstar/Ubisoft/EA vía
// proceso propio, Battle.net/Riot/Xbox vía el monitor de procesos de
// activityLog.js/processWatcher.js — todas reales, ninguna inventada.
const fs = require('fs');
const path = require('path');
const os = require('os');

const BRIDGE_DIR = path.join(process.env.LOCALAPPDATA || path.join(os.homedir(), 'AppData', 'Local'), 'DerivaMegaHUB');
const BRIDGE_FILE = path.join(BRIDGE_DIR, 'status.json');

function readBridge() {
  try { return JSON.parse(fs.readFileSync(BRIDGE_FILE, 'utf8')); }
  catch { return {}; }
}

// Nunca debe poder romper MegaHUB (permisos, disco lleno, carpeta bloqueada,
// lo que sea) — es un canal opcional, cualquier fallo se ignora en silencio.
function writeBridge(patch) {
  try {
    fs.mkdirSync(BRIDGE_DIR, { recursive: true });
    const next = { ...readBridge(), ...patch, updatedAt: new Date().toISOString() };
    fs.writeFileSync(BRIDGE_FILE, JSON.stringify(next, null, 2));
  } catch {}
}

// info: { title, platform, coverUrl, startedAt, source: 'retro'|'launch' } — o
// null para limpiar (solo se puede limpiar con certeza al cerrar una sesión
// retro real; para el resto, quien lea esto debe aplicar su propia ventana de
// vigencia en vez de asumir que sigue jugando para siempre).
function setNowPlaying(info) {
  writeBridge({ nowPlaying: info });
}

// summary: { unlockedTotal, recentlyUnlocked: [{ title, earnedAt }] }
function setAchievementsSummary(summary) {
  writeBridge({ achievements: summary });
}

// Sesión de juego recién CERRADA (no "ahora mismo", eso es setNowPlaying) —
// mismo patrón que setAchievementsSummary: Companion dedupe por
// `title+endedAt` (ver megahubBridge.js del lado de Companion) y solo
// reenvía la más nueva, no un historial completo — DERIVA no pretende
// conocer todas las sesiones de MegaHUB, solo la actividad reciente.
function setLastSession({ title, platform, minutes }) {
  writeBridge({ lastSession: { title, platform, minutes: Math.round(minutes), endedAt: new Date().toISOString() } });
}

// Se llama una sola vez al arrancar (ver main.js) — así el botón "Abrir
// MegaHUB" de DERIVA Companion sabe qué ejecutar. exePath solo viene poblado
// cuando MegaHUB corre ya empaquetado (electron-builder); en desarrollo
// (`npm start`) queda null a propósito — relanzar un proyecto en modo dev
// desde otra app no es algo que se pueda hacer de forma fiable.
function setAppInfo({ exePath }) {
  writeBridge({ app: { exePath: exePath || null } });
}

module.exports = { setNowPlaying, setAchievementsSummary, setAppInfo, setLastSession, BRIDGE_FILE };
