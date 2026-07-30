// Integración con RetroAchievements (retroachievements.org): perfil de logros
// para las ROMs que el usuario juega en RetroArch — el mismo servicio que ya
// usa el propio RetroArch para trackear logros al jugar, solo que aquí se usa
// SOLO su Web API (de solo lectura, con la API key propia del usuario, la
// misma UX que ya tienen SteamGridDB/TheGamesDB en este proyecto) para armar
// un panel de logros al estilo Xbox 360/Steam dentro de MegaHUB.
//
// IMPORTANTE: MegaHUB nunca pide ni guarda la CONTRASEÑA de RetroAchievements
// — eso se sigue haciendo dentro del propio menú de RetroArch (Ajustes >
// Logros), como con cualquier otro login. Aquí solo se guarda el usuario y la
// "Web API key" (un token de solo lectura de su Panel de control, no es la
// contraseña de la cuenta).
const fs = require('fs');
const path = require('path');
const store = require('../util/store');
const scanRetroArch = require('../scanners/retroarch');

const API_BASE = 'https://retroachievements.org/API';
const MEDIA_BASE = 'https://i.retroachievements.org';

function getAccount() {
  return store.load('ra-account', { username: null, apiKey: null });
}
function setAccount(username, apiKey) {
  store.save('ra-account', { username: username || null, apiKey: apiKey || null });
}
function hasAccount() {
  const acc = getAccount();
  return !!(acc.username && acc.apiKey);
}

function mediaUrl(p) {
  if (!p) return null;
  return p.startsWith('http') ? p : `${MEDIA_BASE}${p.startsWith('/') ? '' : '/'}${p}`;
}
function badgeUrl(badgeName, locked) {
  if (!badgeName) return null;
  return `${MEDIA_BASE}/Badge/${badgeName}${locked ? '_lock' : ''}.png`;
}

async function callApi(method, params = {}) {
  const acc = getAccount();
  if (!acc.username || !acc.apiKey) throw new Error('Falta configurar usuario/API key de RetroAchievements.');
  const qs = new URLSearchParams({ y: acc.apiKey, u: acc.username, ...params });
  const res = await fetch(`${API_BASE}/${method}.php?${qs.toString()}`);
  if (!res.ok) throw new Error(`RetroAchievements API HTTP ${res.status}`);
  return res.json();
}

async function getUserSummary() {
  const data = await callApi('API_GetUserSummary', { g: 0, a: 0 });
  return {
    username: data.User || data.user,
    points: data.TotalPoints ?? data.totalPoints ?? 0,
    truePoints: data.TotalTruePoints ?? data.totalTruePoints ?? 0,
    rank: data.Rank ?? data.rank ?? null,
  };
}

// Progreso por juego (todos los que el usuario ha jugado, tenga o no el 100%)
// — es la base de la pestaña "Mis juegos", con barra de progreso por título.
async function getCompletionProgress() {
  const data = await callApi('API_GetUserCompletionProgress', { c: 500 });
  const results = data.Results || data.results || [];
  return results.map(g => ({
    gameId: g.GameID,
    title: g.Title,
    consoleName: g.ConsoleName,
    icon: mediaUrl(g.ImageIcon),
    numAwarded: g.NumAwarded,
    numAwardedHardcore: g.NumAwardedHardcore,
    maxPossible: g.MaxPossible,
    mostRecentAwardedDate: g.MostRecentAwardedDate,
    highestAwardKind: g.HighestAwardKind, // "mastered" | "completed" | null
    highestAwardDate: g.HighestAwardDate,
  }));
}

// Detalle de un juego: lista completa de logros, marcando cuáles ya se
// desbloquearon (para el grid expandido al hacer click en un juego).
async function getGameProgress(gameId) {
  const data = await callApi('API_GetGameInfoAndUserProgress', { g: gameId });
  const achievements = Object.values(data.Achievements || data.achievements || {}).map(a => ({
    id: a.ID ?? a.id,
    title: a.Title ?? a.title,
    description: a.Description ?? a.description,
    points: a.Points ?? a.points,
    earned: !!(a.DateEarned ?? a.dateEarned),
    earnedHardcore: !!(a.DateEarnedHardcore ?? a.dateEarnedHardcore),
    dateEarned: a.DateEarned ?? a.dateEarned ?? null,
    badgeUrl: badgeUrl(a.BadgeName ?? a.badgeName, !(a.DateEarned ?? a.dateEarned)),
  })).sort((a, b) => (b.earned - a.earned) || 0);
  return {
    gameId,
    title: data.Title ?? data.title,
    consoleName: data.ConsoleName ?? data.consoleName,
    icon: mediaUrl(data.ImageIcon ?? data.imageIcon),
    boxArt: mediaUrl(data.ImageBoxArt ?? data.imageBoxArt),
    numAchievements: data.NumAchievements ?? data.numAchievements ?? achievements.length,
    userCompletion: data.UserCompletion ?? data.userCompletion ?? null,
    achievements,
  };
}

// Historial GLOBAL acumulado localmente: la API solo da una ventana reciente
// (por defecto 60 min), así que cada vez que se abre la pestaña de logros se
// pide una ventana amplia y se fusiona con lo ya guardado — así queda un
// historial que crece con el tiempo en vez de perderse entre sesiones.
function getLocalHistory() {
  return store.load('ra-history', []);
}

async function refreshHistory() {
  const data = await callApi('API_GetUserRecentAchievements', { m: 43200 }); // ventana de 30 días
  const list = Array.isArray(data) ? data : [];
  const fresh = list.map(a => ({
    key: `${a.AchievementID}-${a.Date}`,
    achievementId: a.AchievementID,
    gameId: a.GameID,
    gameTitle: a.GameTitle,
    consoleName: a.ConsoleName,
    title: a.Title,
    description: a.Description,
    points: a.Points,
    hardcore: !!a.HardcoreMode,
    date: a.Date,
    badgeUrl: mediaUrl(a.BadgeURL) || badgeUrl(a.BadgeName, false),
  }));

  const existing = getLocalHistory();
  const seen = new Set(existing.map(e => e.key));
  const merged = existing.concat(fresh.filter(e => !seen.has(e.key)));
  merged.sort((a, b) => new Date(b.date) - new Date(a.date));
  store.save('ra-history', merged.slice(0, 2000)); // tope razonable de almacenamiento local
  return merged;
}

// Activa el flag de logros de RetroArch (cheevos_enable) para que trackee
// logros de verdad al jugar — SOLO el interruptor, nunca la contraseña: el
// login de la cuenta se hace dentro del propio RetroArch (Ajustes > Logros),
// igual que cualquier otro login, MegaHUB nunca la ve ni la guarda.
function getCheevosStatus() {
  const exe = scanRetroArch.findRetroArch();
  if (!exe) return { installed: false, enabled: false };
  const cfgPath = path.join(path.dirname(exe), 'retroarch.cfg');
  if (!fs.existsSync(cfgPath)) return { installed: true, enabled: false };
  const text = fs.readFileSync(cfgPath, 'utf8');
  const m = text.match(/^cheevos_enable\s*=\s*"?(\w+)"?/m);
  return { installed: true, enabled: !!m && m[1] === 'true' };
}

function enableCheevos() {
  const exe = scanRetroArch.findRetroArch();
  if (!exe) return { error: 'RetroArch no está instalado todavía.' };
  const cfgPath = path.join(path.dirname(exe), 'retroarch.cfg');
  if (!fs.existsSync(cfgPath)) return { error: 'No se encontró retroarch.cfg — abre RetroArch al menos una vez.' };
  let text = fs.readFileSync(cfgPath, 'utf8');
  const re = /^cheevos_enable\s*=.*$/m;
  text = re.test(text) ? text.replace(re, 'cheevos_enable = "true"') : text.replace(/\s*$/, '') + '\ncheevos_enable = "true"\n';
  fs.writeFileSync(cfgPath, text);
  return { ok: true, message: 'Logros activados en RetroArch — inicia sesión en Ajustes > Logros dentro de RetroArch con tu cuenta (MegaHUB nunca ve tu contraseña).' };
}

module.exports = {
  getAccount, setAccount, hasAccount,
  getUserSummary, getCompletionProgress, getGameProgress,
  getLocalHistory, refreshHistory,
  getCheevosStatus, enableCheevos,
};
