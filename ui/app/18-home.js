/* exported buildHomeTile, updateFirstSeenMap */
/* global PLAT_LABEL, allGames, escapeHtml, findCoverForActivity, formatHours, launchGame, steamPlaytimeMap, syncCoverSlot, viewMode */
/* ================= Inicio (dashboard de aterrizaje) =================
   Reusa allGames (ya cargado por rescan()) y activityLog.js — sin escaneo ni
   IPC nuevo salvo 2 lecturas ya expuestas (companionGetRecentlyPlayed y
   companionGetWeeklyActivity). Cada sección se apaga sola si no hay datos
   para mostrarla — nunca una franja vacía o un placeholder falso. */

// Mismo click que ya usa primaryAction() en el dock: jugar si está instalado,
// instalar si no — nada nuevo, solo reutilizado acá para no duplicar el
// criterio de qué hace un clic sobre un juego.
function homeCardAction(game) {
  if (game.installed) launchGame(game);
  else window.megahub.installGame(game);
}

// Tarjeta = el mismo .dock-icon del modo Dock (icon-face + icon-label),
// reconstruido a mano en vez de reusar buildDockIcon() porque ese wrapper
// ata el clic a selectById()/primaryAction(), que dependen de la lista
// filtrada de la biblioteca (visible/activeChildren) — acá el juego puede no
// estar en esa lista para nada (viene de activityLog, no de los filtros
// activos). Comparte clase y estructura con el dock real así que hereda
// forma/hover/skin sin CSS nuevo.
function buildHomeTile(game) {
  const wrap = document.createElement('div');
  wrap.className = 'dock-icon' + (game.installed ? ' installed' : ' not-installed');
  wrap.dataset.platform = game.platform;
  wrap.dataset.id = game.id;
  wrap.tabIndex = -1; // enfocable por script (navegación por mando, ver pollGamepad) sin sumarse al Tab normal
  const face = document.createElement('div');
  face.className = 'icon-face';
  wrap.appendChild(face);
  const label = document.createElement('div');
  label.className = 'icon-label';
  label.textContent = game.title;
  wrap.appendChild(label);
  syncCoverSlot(face, game);
  wrap.addEventListener('click', () => homeCardAction(game));
  return wrap;
}

// El log de actividad guarda título/plataforma, no el id del juego — se
// resuelve por título contra allGames (mismo criterio que
// findCoverForActivity). Si no resuelve (ej. una ROM suelta que no pasa por
// RetroArch) esa fila simplemente no se muestra: mejor omitirla que mostrar
// una tarjeta sin forma de lanzarse.
function findGameForActivity(a) {
  const t = a.title.toLowerCase();
  return allGames.find(g => g.title && g.title.toLowerCase() === t) || null;
}

// "Agregado recién" necesita saber CUÁNDO se vio cada juego por primera vez
// — allGames no trae esa fecha (se reconstruye entero en cada rescan() desde
// cero, cruzando los launchers). Se guarda un mapa propio en localStorage,
// una vez por id, la primera vez que aparece. Si el mapa estaba vacío antes
// de este escaneo (primera vez que corre esta instalación), TODO el catálogo
// se marcaría "recién agregado" a la vez, que no dice nada — homeFirstScanEver
// deja que renderHomeRecent() se quede callado hasta el próximo escaneo real.
const HOME_FIRST_SEEN_KEY = 'megahub-first-seen';
let homeFirstScanEver = false;
function loadFirstSeenMap() {
  try { return JSON.parse(localStorage.getItem(HOME_FIRST_SEEN_KEY) || '{}'); }
  catch { return {}; }
}
function updateFirstSeenMap(games) {
  const map = loadFirstSeenMap();
  homeFirstScanEver = Object.keys(map).length === 0;
  let dirty = false;
  const now = Date.now();
  for (const g of games) {
    if (!(g.id in map)) { map[g.id] = now; dirty = true; }
  }
  if (dirty) localStorage.setItem(HOME_FIRST_SEEN_KEY, JSON.stringify(map));
}

const HOME_RECENT_WINDOW_MS = 14 * 24 * 60 * 60 * 1000;

function renderHomeContinue(recentlyPlayed) {
  const section = document.getElementById('home-continue');
  const grid = document.getElementById('home-continue-grid');
  const games = (recentlyPlayed || []).map(findGameForActivity).filter(Boolean);
  grid.innerHTML = '';
  if (!games.length) { section.hidden = true; return false; }
  section.hidden = false;
  games.forEach(g => grid.appendChild(buildHomeTile(g)));
  return true;
}

function renderHomeRecent() {
  const section = document.getElementById('home-recent');
  const grid = document.getElementById('home-recent-grid');
  grid.innerHTML = '';
  if (homeFirstScanEver) { section.hidden = true; return false; }
  const map = loadFirstSeenMap();
  const cutoff = Date.now() - HOME_RECENT_WINDOW_MS;
  const games = allGames
    .filter(g => g.installed && map[g.id] && map[g.id] >= cutoff)
    .sort((a, b) => map[b.id] - map[a.id])
    .slice(0, 8);
  if (!games.length) { section.hidden = true; return false; }
  section.hidden = false;
  games.forEach(g => grid.appendChild(buildHomeTile(g)));
  return true;
}

// Se guarda la última lista para poder re-pintar cuando lleguen portadas
// nuevas (ver 'megahub:covers-updated') sin tener que re-pedir la actividad.
let lastWeeklyActivity = null;

function renderHomeWeek(weeklyActivity) {
  const section = document.getElementById('home-week');
  const list = document.getElementById('home-week-list');
  if (weeklyActivity) lastWeeklyActivity = weeklyActivity;
  const items = (lastWeeklyActivity || []).slice(0, 6);
  if (!items.length) { section.hidden = true; list.innerHTML = ''; return false; }
  section.hidden = false;
  list.innerHTML = items.map(a => {
    const cover = findCoverForActivity(a);
    const isRetro = a.platform === 'retro' || a.platform === 'retroarch';
    return `
    <div class="home-week-row${isRetro ? ' home-week-retro' : ''}">
      <span class="home-week-cover">${cover ? `<img src="${escapeHtml(cover)}" alt="" loading="lazy">` : ''}</span>
      <span class="home-week-info">
        <span class="home-week-name">${escapeHtml(a.title)}</span>
        <span class="home-week-plat">${escapeHtml(PLAT_LABEL[a.platform] || a.platform)}</span>
      </span>
      <span class="home-week-hours">${formatHours(a.minutes)}</span>
    </div>`;
  }).join('');
  return true;
}
document.addEventListener('megahub:covers-updated', () => { if (lastWeeklyActivity) renderHomeWeek(); });

// "Qué jugar hoy" — cruza datos que MegaHUB ya calculaba por separado
// (biblioteca instalada + horas reales de Steam) en vez de elegir al azar.
// Prioridad: nunca lo probaste > hace mucho que no lo juegas > lo jugaste
// hace poco pero no tanto > cualquier instalado, como último recurso.
function computeTodayPick() {
  const installed = allGames.filter(g => g.installed);
  if (!installed.length) return null;
  const now = Date.now();
  let best = null, bestReason = null, bestScore = -1;
  for (const g of installed) {
    let score = 0, reason = null;
    if (g.platform === 'steam') {
      const info = steamPlaytimeMap[String(g.id).replace(/^steam-/, '')];
      const minutes = info?.playtimeMinutes || 0;
      if (minutes === 0) { score = 3; reason = 'Nunca lo probaste'; }
      else if (info?.lastPlayed) {
        const days = Math.floor((now - info.lastPlayed) / 86400000);
        if (days >= 21) { score = 2.5; reason = `Hace ${days} días que no lo juegas`; }
        else if (days >= 7) { score = 1.5; reason = `Hace ${days} días que no lo juegas`; }
      }
    }
    if (score > bestScore) { bestScore = score; best = g; bestReason = reason; }
  }
  if (!best) {
    // Nada calificó por horas (biblioteca sin datos de Steam, o todo jugado
    // recién) — mejor un pick al azar entre lo instalado que no mostrar nada.
    best = installed[Math.floor(Math.random() * installed.length)];
    bestReason = 'Elegido para ti';
  }
  return { game: best, reason: bestReason };
}

function renderHomePick() {
  const section = document.getElementById('home-pick');
  const card = document.getElementById('home-pick-card');
  const pick = computeTodayPick();
  if (!pick) { section.hidden = true; card.innerHTML = ''; return; }
  section.hidden = false;
  card.innerHTML = '';
  card.appendChild(buildHomeTile(pick.game));
  const info = document.createElement('div');
  info.className = 'home-pick-info';
  info.innerHTML = `<span class="home-pick-reason"></span><span class="home-pick-title"></span>`;
  info.querySelector('.home-pick-reason').textContent = pick.reason;
  info.querySelector('.home-pick-title').textContent = pick.game.title;
  card.appendChild(info);
  const btn = document.createElement('button');
  btn.className = 'home-pick-btn';
  btn.textContent = 'Jugar';
  btn.addEventListener('click', () => launchGame(pick.game));
  card.appendChild(btn);
}

let homeLoaded = false;
async function initHomeView() {
  const [recentlyPlayed, weeklyActivity] = await Promise.all([
    window.megahub.companionGetRecentlyPlayed(8).catch(() => []),
    window.megahub.companionGetWeeklyActivity().catch(() => []),
  ]);
  homeLoaded = true;
  renderHomePick();
  const hasContinue = renderHomeContinue(recentlyPlayed);
  const hasRecent = renderHomeRecent();
  const hasWeek = renderHomeWeek(weeklyActivity);
  document.getElementById('home-empty').hidden = hasContinue || hasRecent || hasWeek;
}
// El rescan inicial (o uno manual) puede terminar mientras el usuario ya
// está parado en Inicio — sin esto, "Agregado recién" se quedaba con la
// biblioteca de la primera carga hasta que el usuario cambiaba de vista y
// volvía.
document.addEventListener('megahub:games-updated', () => { if (viewMode === 'home' && homeLoaded) renderHomeRecent(); });

