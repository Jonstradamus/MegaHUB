/* exported activeChildren, buildDockIcon, buildListRow, refreshSelection, selectById, showToast, syncCoverSlot, toastNewlyUnlockedAchievements, updateDockIcon, updateListRow */
/* global PLAT_LABEL, dock, escapeHtml, filters, formatBytes, formatHours, gameGenres, highlightMatch, icon, isRecentlyEarned, list, makePlaceholder, metaById, primaryAction, renderDetails, retryCoverViaExternalFallback, selectedIndex:writable, steamPlaytimeMap, videoAllowedFor:writable, viewMode, visible */
/* ================= Toasts ================= */

const toastContainer = document.getElementById('toast-container');
const TOAST_ICON = { success: 'check', error: 'warning', info: 'zap' };
function showToast(message, type = 'info', duration = 4200) {
  const el = document.createElement('div');
  el.className = `toast ${type}`;
  el.innerHTML = `${icon(TOAST_ICON[type] || 'zap')}<span class="toast-msg"></span>`;
  el.querySelector('.toast-msg').textContent = message;
  toastContainer.appendChild(el);
  const remove = () => {
    el.classList.add('leaving');
    el.addEventListener('animationend', () => el.remove(), { once: true });
  };
  setTimeout(remove, duration);
}

// Toast de logro desbloqueado — antes compartía el mismo componente genérico
// que "mod instalado" o "carpeta creada" (Fase 4, pulido): un logro es el
// único aviso que un jugador quiere que se sienta como un evento, así que
// tiene su propio look (dorado, trofeo grande, más tiempo en pantalla) en
// vez de reusar showToast() con el ícono de rayo genérico.
function showAchievementToast(a) {
  const el = document.createElement('div');
  el.className = 'toast achievement';
  // Antes "de qué juego/qué significa" solo vivía en el atributo title
  // (tooltip nativo al pasar el mouse) — un toast que desaparece solo en
  // unos segundos nunca llega a mostrar un hover, así que esa info nunca se
  // veía de verdad. gameTitle solo viene para logros por-juego (steamgame/
  // retrogame) — los globales (rachas, etc.) no tienen uno y esa línea se omite.
  el.innerHTML = `
    ${icon('trophy')}
    <span class="toast-ach-body">
      <span class="toast-ach-eyebrow">Logro desbloqueado</span>
      ${a.gameTitle ? `<span class="toast-ach-game"></span>` : ''}
      <span class="toast-msg"></span>
      ${a.description ? `<span class="toast-ach-desc"></span>` : ''}
    </span>`;
  el.querySelector('.toast-msg').textContent = a.title;
  if (a.gameTitle) el.querySelector('.toast-ach-game').textContent = a.gameTitle;
  if (a.description) el.querySelector('.toast-ach-desc').textContent = a.description;
  toastContainer.appendChild(el);
  const remove = () => {
    el.classList.add('leaving');
    el.addEventListener('animationend', () => el.remove(), { once: true });
  };
  setTimeout(remove, 6500);
}

// Nunca se re-avisa el mismo logro 2 veces en la misma sesión, aunque
// fetchMhAchievements() se llame de nuevo (abrir Logros, abrir otra ficha de
// juego, etc. todos comparten mhAchCache).
const toastedAchievementIds = new Set();
function toastNewlyUnlockedAchievements(list) {
  if (!Array.isArray(list)) return;
  for (const a of list) {
    if (!isRecentlyEarned(a) || toastedAchievementIds.has(a.id)) continue;
    toastedAchievementIds.add(a.id);
    showAchievementToast(a);
  }
}

/* ---- Portada compartida por los modos ---- */

// Renderiza SIEMPRE desde cero (usar solo cuando llega una portada nueva de
// verdad — build inicial o backfill —, nunca en cada render() de refresco).
function renderCoverInto(slot, game) {
  slot.innerHTML = '';
  slot.dataset.renderedFor = game.coverUrl || '';
  const trySrc = (src, isFallback) => {
    const img = document.createElement('img');
    const fail = () => {
      // Si el slot ya no contiene esta imagen (otro render la reemplazó
      // mientras esta seguía cargando), no pisar lo que haya ahora.
      if (!slot.contains(img)) return;
      const meta = metaById[game.id];
      const fallbackUrl = !isFallback && game.platform === 'steam' && meta && meta.headerImage && meta.headerImage !== src
        ? meta.headerImage : null;
      if (fallbackUrl) { game.lastTriedFallback = fallbackUrl; trySrc(fallbackUrl, true); return; }
      game.coverFailed = true;
      slot.innerHTML = '';
      slot.appendChild(makePlaceholder(game));
      retryCoverViaExternalFallback(game);
    };
    img.loading = 'lazy';
    img.onerror = fail;
    img.onload = () => {
      // Algunas CDNs (visto en Steam para lanzamientos muy nuevos) devuelven 200
      // con una imagen "no disponible" minúscula en vez de un 404 real.
      if (img.naturalWidth < 40 || img.naturalHeight < 40) { fail(); return; }
      // El respaldo header_image (banner ANCHO horizontal de la ficha de
      // Steam) puede ser la única imagen que exista para un lanzamiento muy
      // reciente — la cápsula vertical library_600x900 a veces se sube recién
      // días/semanas después (visto en vivo con Resident Evil Requiem y Halo:
      // Campaign Evolved). Se ve mal recortada en un slot vertical, pero
      // antes se quedaba así para siempre porque "cargó bien" y nadie volvía
      // a intentar nada. Ahora, en cuanto se muestra ese recorte de urgencia,
      // se pide en silencio una portada vertical real (SteamGridDB si el
      // usuario tiene key, si no Wikipedia) y la reemplaza sola si aparece —
      // sin bloquear lo que ya se ve mientras tanto.
      if (isFallback && game.platform === 'steam') retryCoverViaExternalFallback(game);
    };
    // NOTA: se probó un timeout fijo acá como red de seguridad para portadas
    // que ni cargan ni fallan — se revirtió porque con una biblioteca grande
    // muchas imágenes en cola (límite de conexiones concurrentes del propio
    // navegador hacia el CDN de Steam, no un error real) tardan de sobra más
    // que cualquier timeout razonable, y terminaban reemplazadas por el
    // placeholder de golpe aunque la portada fuera perfectamente válida.
    img.src = src;
    slot.appendChild(img);
  };
  if (game.coverUrl) trySrc(game.coverUrl, false);
  else slot.appendChild(makePlaceholder(game));
}

// Usado en cada render(): evita recrear el <img> (y por tanto el parpadeo) si
// ya se está mostrando lo correcto; solo re-renderiza si hay algo nuevo que
// probar (portada distinta, o llegó un header_image de respaldo que aún no
// habíamos intentado tras un fallo previo).
function syncCoverSlot(slot, game) {
  const hasImg = !!slot.querySelector('img');
  const desired = game.coverUrl || '';
  if (hasImg && slot.dataset.renderedFor === desired) return;
  if (!game.coverUrl) {
    if (slot.querySelector('.placeholder')) {
      const label = slot.querySelector('.placeholder .plat-title');
      if (label) label.textContent = game.title;
      return;
    }
    renderCoverInto(slot, game);
    return;
  }
  if (game.coverFailed) {
    const meta = metaById[game.id];
    const hasNewFallback = game.platform === 'steam' && meta && meta.headerImage && meta.headerImage !== game.lastTriedFallback;
    if (!hasNewFallback) return; // ya falló y no hay nada nuevo que probar
  }
  renderCoverInto(slot, game);
}

/* ---- Modo Dock (estilo iPhone), vista principal ---- */

function buildDockIcon(game) {
  const wrap = document.createElement('div');
  wrap.dataset.platform = game.platform;
  wrap.dataset.id = game.id;

  const face = document.createElement('div');
  face.className = 'icon-face';
  wrap.appendChild(face);

  const label = document.createElement('div');
  label.className = 'icon-label';
  wrap.appendChild(label);

  wrap.addEventListener('click', () => selectById(game.id));
  wrap.addEventListener('dblclick', () => primaryAction());

  updateDockIcon(wrap, game);
  return wrap;
}

function updateDockIcon(wrap, game) {
  wrap.className = 'dock-icon' + (game.installed ? ' installed' : ' not-installed');
  const label = wrap.querySelector('.icon-label');
  if (label) label.innerHTML = highlightMatch(game.title, filters.search);
  syncCoverSlot(wrap.querySelector('.icon-face'), game);
  syncPlaytimeBadge(wrap, game);
}

// Badge de horas jugadas en la esquina del tile — SOLO Steam (único dato de
// playtime real y preciso que MegaHUB tiene, ver comentario del handler
// get-steam-playtime-map). No inventa un número para el resto de launchers.
function syncPlaytimeBadge(wrap, game) {
  let badge = wrap.querySelector('.icon-playtime');
  if (game.platform !== 'steam') { if (badge) badge.remove(); return; }
  const appid = String(game.id).replace(/^steam-/, '');
  const info = steamPlaytimeMap[appid];
  if (!info || !info.playtimeMinutes) { if (badge) badge.remove(); return; }
  if (!badge) {
    badge = document.createElement('span');
    badge.className = 'icon-playtime';
    wrap.querySelector('.icon-face').appendChild(badge);
  }
  badge.textContent = formatHours(info.playtimeMinutes);
}

/* ---- Modo Lista ---- */

function buildListRow(game) {
  const row = document.createElement('div');
  row.dataset.platform = game.platform;
  row.dataset.id = game.id;

  const thumb = document.createElement('div');
  thumb.className = 'thumb';
  row.appendChild(thumb);

  const info = document.createElement('div');
  info.className = 'info';
  info.innerHTML = '<div class="row-title"></div><div class="row-meta"></div>';
  row.appendChild(info);

  const state = document.createElement('div');
  state.className = 'row-state';
  row.appendChild(state);

  row.addEventListener('click', () => selectById(game.id));
  row.addEventListener('dblclick', () => primaryAction());

  updateListRow(row, game);
  return row;
}

function updateListRow(row, game) {
  row.className = 'list-row' + (game.installed ? '' : ' not-installed');
  syncCoverSlot(row.querySelector('.thumb'), game);

  row.querySelector('.row-title').innerHTML = highlightMatch(game.title, filters.search);

  const meta = metaById[game.id];
  const bits = [`<span class="row-badge">${escapeHtml(PLAT_LABEL[game.platform] || game.platform)}</span>`];
  const genres = gameGenres(game);
  if (genres && genres.length) bits.push(`<span class="row-badge">${escapeHtml(genres[0])}</span>`);
  if (meta && meta.releaseDate) bits.push(`<span class="row-badge">${escapeHtml(meta.releaseDate)}</span>`);
  // Solo el valor ya conocido del scan (Steam/Epic/Battle.net/Ubisoft/EA/
  // Rockstar) — nunca se dispara el cálculo bajo demanda (GOG/Xbox) acá, para
  // no recorrer carpetas de decenas de juegos con cada render de la lista.
  if (game.installSizeBytes != null) bits.push(`<span class="row-badge">${formatBytes(game.installSizeBytes)}</span>`);
  if (game.platform === 'steam') {
    const info = steamPlaytimeMap[String(game.id).replace(/^steam-/, '')];
    if (info && info.playtimeMinutes) bits.push(`<span class="row-badge row-badge-playtime">${formatHours(info.playtimeMinutes)}</span>`);
  }
  row.querySelector('.row-meta').innerHTML = bits.join('');

  const state = row.querySelector('.row-state');
  state.textContent = game.installed ? '✔ Instalado' : '⬇ Biblioteca';
  state.className = 'row-state ' + (game.installed ? 'installed' : 'not-installed');
}

/* ---- Selección / navegación compartidas ---- */

function activeContainer() {
  return viewMode === 'dock' ? dock : list;
}
function activeChildren() {
  return [...activeContainer().children].filter(c => !c.classList.contains('empty'));
}

// Selección "confirmada" por click: además de mover el cursor, habilita el
// video (solo se muestra cuando el usuario clica de verdad, no al navegar).
function selectById(id) {
  const idx = visible.findIndex(g => g.id === id);
  if (idx !== -1) { selectedIndex = idx; videoAllowedFor = id; refreshSelection(); }
}

function refreshSelection() {
  [dock, list].forEach(container => {
    [...container.children].forEach((c, i) => {
      if (c.classList.contains('empty')) return;
      c.classList.toggle('selected', i === selectedIndex);
    });
  });
  const sel = activeChildren()[selectedIndex];
  if (sel) sel.scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: 'smooth' });
  renderDetails(visible[selectedIndex] || null);
}

