/* exported steamPlaytimeMap */
/* global allGames:writable, buildPlatformChips, enrichCovers, formatHours, initAchievementsView, initDealsView, initHomeView, initProfileView, initRetroView, loadDeals, markConnected, rebuildGenreChips, render, searchInput, showToast, updateFirstSeenMap, viewMode */
/* ================= Init ================= */

// Restaura la vista con la que se cerró la app la última vez, si no es
// 'dock'/'list' (esas no necesitan init propio). Tiene que ir en ESTE
// archivo (el último <script> clásico que carga) y no en 05-view-mode.js
// (donde se detecta viewMode al arrancar): initRetroView/initAchievementsView/
// initDealsView/initHomeView/initProfileView viven en archivos que cargan
// DESPUÉS de 05-view-mode.js, así que llamarlas ahí tiraba un ReferenceError
// que cortaba en seco el resto de ese archivo — initWidgetMode(), definida más
// abajo en el mismo archivo, nunca llegaba a registrar sus listeners, y el
// botón de modo widget quedaba muerto sin ningún aviso visible.
if (viewMode === 'retro') initRetroView();
else if (viewMode === 'achievements') initAchievementsView();
else if (viewMode === 'deals') initDealsView();
else if (viewMode === 'home') initHomeView();
else if (viewMode === 'profile') initProfileView();

// Horas reales de Steam por appid — se pide una sola vez por rescan, no por
// tile (evita 1 IPC por juego). Ver auditoría UX: antes ningún .dock-icon
// mostraba playtime, había que abrir el panel de detalle para saberlo.
let steamPlaytimeMap = {};

let lastScanAt = 0;

// enrichCovers() busca portada externa (SGDB/Wikipedia) para Battle.net/
// Riot/Xbox/Ubisoft/EA/Rockstar, que nunca traen una URL de fábrica. Se
// llama una vez al terminar CADA rescan (no solo el del arranque) — antes
// solo corría en el boot inicial, así que en cuanto `rescan()` reemplazaba
// `allGames` (reescaneo al recuperar foco tras 20 min, o "Escanear" a mano),
// esas portadas ya conseguidas se perdían para siempre y nada las volvía a
// pedir: el panel "Esta semana" (Inicio y la pill de Companion) se quedaba
// sin carátula en cuanto la sesión llevaba un rato abierta. El guard evita
// dos pasadas superpuestas si un rescan dispara antes de que la anterior
// termine.
let enrichingCovers = false;
async function enrichCoversSafe() {
  if (enrichingCovers) return;
  enrichingCovers = true;
  try { await enrichCovers(); }
  finally {
    enrichingCovers = false;
    // Los covers recién resueltos pueden ser justo los que "Esta semana"
    // necesitaba — sin esto, el panel se queda con el placeholder hasta el
    // próximo render por otro motivo (cambiar de pestaña, etc).
    document.dispatchEvent(new Event('megahub:covers-updated'));
  }
}

async function rescan() {
  const { games, accounts } = await window.megahub.scanGames();
  lastScanAt = Date.now();
  allGames = games;
  updateFirstSeenMap(allGames);
  if (accounts.gog) markConnected('gog');
  if (accounts.epic) markConnected('epic');
  try { steamPlaytimeMap = await window.megahub.getSteamPlaytimeMap() || {}; } catch { steamPlaytimeMap = {}; }
  buildPlatformChips();
  rebuildGenreChips();
  render();
  enrichCoversSafe();
  // El modo widget (ver initWidgetMode) mantiene su propia lista aparte —
  // si el usuario lo activó ANTES de que este scan inicial terminara, se
  // quedaba mostrando "sin juegos" para siempre porque nada lo avisaba
  // cuando allGames por fin se llenaba.
  document.dispatchEvent(new Event('megahub:games-updated'));
}

// Reescaneo en segundo plano al recuperar el foco de la ventana — antes la
// biblioteca solo se actualizaba con el botón "Escanear" a mano, así que
// instalar/desinstalar algo desde Steam mientras MegaHUB estaba minimizado
// podía dejarla desactualizada sin ningún aviso (ver auditoría UX). No
// interrumpe nada: rescan() reemplaza allGames y vuelve a renderizar, mismo
// camino que un escaneo manual.
const RESCAN_STALE_MS = 20 * 60 * 1000; // 20 min
window.addEventListener('focus', () => {
  if (lastScanAt && Date.now() - lastScanAt > RESCAN_STALE_MS) rescan().catch(() => {});
});

// Aviso asíncrono desde main.js cuando un emulador lanzado se cierra casi
// enseguida (crash) — la respuesta de retroLaunchRom ya volvió {ok:true} en
// ese momento (el proceso sí arrancó), así que sin esto un crash instantáneo
// no dejaba ningún rastro visible.
window.megahub.onRetroLaunchIssue(({ message }) => showToast(message, 'error', 9000));
window.megahub.onAutostartIssue(({ message }) => showToast(message, 'error', 9000));
// Resumen de sesión al cerrar un juego — antes este dato (minutos jugados,
// total de la semana) solo se veía entrando a Perfil, nunca en el momento en
// que más importa (ver auditoría UX).
// Buscador rápido global (Ctrl+Shift+M, ver main.js) — mismo comportamiento
// que ya tiene el atajo "/" adentro de la app, solo que también funciona con
// la ventana minimizada o sin foco (main.js la restaura antes de mandar esto).
window.megahub.onFocusQuickSearch(() => { searchInput.select(); searchInput.focus(); });
// Aviso silencioso de main.js cuando el chequeo periódico de juegos gratis
// (checkFreeGamesAndNotify, corre en segundo plano cada 2h) encuentra algo
// nuevo — refresca el estado de Ofertas ya en memoria (silent:true, sin
// mostrar skeletons) para que la campanita/sección se actualicen sin esperar
// a que el usuario reabra la vista.
window.megahub.onDealsFreeUpdated(() => { loadDeals({ silent: true }).catch(() => {}); });
window.megahub.onGameSessionEnded(({ title, minutes, weeklyMinutes }) => {
  const same = weeklyMinutes <= minutes; // primera sesión de la semana con este juego
  const msg = same
    ? `Jugaste ${formatHours(minutes)} a ${title}`
    : `Jugaste ${formatHours(minutes)} a ${title} · van ${formatHours(weeklyMinutes)} esta semana`;
  showToast(msg, 'success', 6000);
  setNowPlaying(null);
});

// "Jugando ahora" en el widget (chip expandido / anillo retraído, ver CSS) —
// solo Steam/Battle.net/Riot/Xbox/Rockstar/Ubisoft/EA (vía processWatcher) y
// Retro (proceso propio) avisan inicio de sesión; Epic/GOG no tienen forma de
// saber si siguen corriendo, así que simplemente nunca disparan esto.
function setNowPlaying(title) {
  document.body.classList.toggle('now-playing', !!title);
  const label = document.getElementById('widget-now-playing-text');
  if (label) label.textContent = title || '';
}
window.megahub.onGameSessionStarted(({ title }) => setNowPlaying(title));

