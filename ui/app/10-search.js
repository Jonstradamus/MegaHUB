/* exported markConnected */
/* global PLAT_LABEL, allGames, applyRetroFilters, buildPlatformChips, currentConsole, dealKeyOf, dealsIndex, dockEls, escapeHtml, fetchMhAchievements, filterConsoleGridByName, filters, icon:writable, listEls, mhAchCache, mhAchLoading, rebuildGenreChips, render, renderRetroGameDetails, rescan, retroFilteredCatalog, retroGameEls, retroSearchTerm:writable, retroSelectedIndex, searchInput, selectById, selectDeal, selectedIndex:writable, sgdbInput, sgdbSaveBtn, showToast, switchViewMode, syncChips, updateDockIcon, updateListRow, updateRetroGameCard, viewMode, visible, widgetRefreshTile */
/* ================= Búsqueda global (Fase 6) =================
   Aparte del filtrado normal de #search (contextual a la vista actual, ver
   más abajo) — cruza biblioteca completa + logros + ofertas YA CARGADOS en
   un desplegable, para saltar de una vista a otra sin tener que cambiarla a
   mano primero. No escanea nada nuevo: allGames y dealsIndex ya están en
   memoria, y mhAchCache se pide la primera vez que hace falta (mismo
   fetchMhAchievements() que ya usan el dashboard de Logros y la ficha de
   cada juego). */

function resetLibraryFilters() {
  filters.platform = 'all'; filters.state = 'all'; filters.genre = 'all';
  buildPlatformChips();
  rebuildGenreChips();
  const stateBox = document.getElementById('state-filters');
  syncChips(stateBox, stateBox.querySelector('[data-state="all"]'));
  render();
}

function gotoGame(id) {
  const jump = () => {
    if (!visible.some(g => g.id === id)) resetLibraryFilters();
    selectById(id);
  };
  if (viewMode === 'dock' || viewMode === 'list') jump();
  else { switchViewMode('dock'); setTimeout(jump, 550); }
}

function gotoDeal(key) {
  const jump = () => {
    selectDeal(key);
    const el = document.querySelector(`.deal-card[data-deal-key="${CSS.escape(key)}"]`);
    if (el) el.scrollIntoView({ block: 'center', behavior: 'smooth' });
  };
  if (viewMode === 'deals') jump();
  else { switchViewMode('deals'); setTimeout(jump, 550); }
}

function buildSearchResultGroups(term) {
  const q = term.toLowerCase();
  const library = allGames
    .filter(g => g.title.toLowerCase().includes(q))
    .sort((a, b) => a.title.localeCompare(b.title, 'es'))
    .slice(0, 6);
  const achievements = (Array.isArray(mhAchCache) ? mhAchCache : [])
    .filter(a => a.title.toLowerCase().includes(q))
    .slice(0, 6);
  const deals = [...dealsIndex.values()]
    .filter(d => d.title.toLowerCase().includes(q))
    .slice(0, 6);
  return { library, achievements, deals };
}

function searchLibraryRowHtml(g) {
  const initial = escapeHtml((g.title || '?').trim().charAt(0).toUpperCase() || '?');
  return `<button type="button" class="search-result" data-kind="game" data-id="${escapeHtml(g.id)}">
    <span class="search-result-icon">${g.coverUrl ? `<img src="${escapeHtml(g.coverUrl)}" alt="" loading="lazy">` : initial}</span>
    <span class="search-result-info">
      <span class="search-result-title">${escapeHtml(g.title)}</span>
      <span class="search-result-meta">${escapeHtml(PLAT_LABEL[g.platform] || g.platform)}</span>
    </span>
  </button>`;
}
function searchDealRowHtml(d) {
  const key = dealKeyOf(d);
  return `<button type="button" class="search-result" data-kind="deal" data-key="${escapeHtml(key)}">
    <span class="search-result-icon">${d.thumb ? `<img src="${escapeHtml(d.thumb)}" alt="" loading="lazy">` : icon('tag')}</span>
    <span class="search-result-info">
      <span class="search-result-title">${escapeHtml(d.title)}</span>
      <span class="search-result-meta">${escapeHtml(d.storeName || 'Oferta')}</span>
    </span>
  </button>`;
}
function searchAchievementRowHtml(a) {
  return `<button type="button" class="search-result" data-kind="achievement">
    <span class="search-result-icon">${icon('trophy')}</span>
    <span class="search-result-info">
      <span class="search-result-title">${escapeHtml(a.title)}</span>
      <span class="search-result-meta">${a.earned ? 'Desbloqueado' : 'Pendiente'}</span>
    </span>
  </button>`;
}

function hideSearchResults() {
  document.getElementById('search-results').hidden = true;
}
function renderSearchResults(term) {
  const box = document.getElementById('search-results');
  if (!term || term.length < 2) { box.hidden = true; box.innerHTML = ''; return; }
  const { library, achievements, deals } = buildSearchResultGroups(term);
  const groups = [];
  if (library.length) groups.push({ title: 'Biblioteca', rows: library.map(searchLibraryRowHtml) });
  if (deals.length) groups.push({ title: 'Ofertas', rows: deals.map(searchDealRowHtml) });
  if (achievements.length) groups.push({ title: 'Logros', rows: achievements.map(searchAchievementRowHtml) });
  if (!groups.length) {
    box.innerHTML = '<div class="search-results-empty">Sin resultados</div>';
    box.hidden = false;
    return;
  }
  box.innerHTML = groups.map(g => `
    <div class="search-group">
      <div class="search-group-title">${escapeHtml(g.title)}</div>
      ${g.rows.join('')}
    </div>`).join('');
  box.hidden = false;
}
document.getElementById('search-results').addEventListener('click', (e) => {
  const btn = e.target.closest('.search-result');
  if (!btn) return;
  const kind = btn.dataset.kind;
  if (kind === 'game') gotoGame(btn.dataset.id);
  else if (kind === 'deal') gotoDeal(btn.dataset.key);
  else if (kind === 'achievement') switchViewMode('achievements');
  hideSearchResults();
  searchInput.blur();
});
searchInput.addEventListener('focus', () => {
  const term = searchInput.value.trim();
  if (term.length >= 2) renderSearchResults(term);
});
// Delay corto: sin esto, el blur (al clickear un resultado) esconde el
// desplegable ANTES de que el click delegado de arriba llegue a dispararse.
searchInput.addEventListener('blur', () => setTimeout(hideSearchResults, 150));

// El buscador de la barra superior es contextual: filtra la biblioteca normal,
// o — si estás en modo retro — busca consolas (sin elegir ninguna aún) o juegos
// dentro del catálogo de la consola abierta. Nunca ambos a la vez. El
// desplegable de búsqueda global (arriba) es aparte y funciona en cualquier
// vista, así que se actualiza siempre, sin importar la rama de abajo.
searchInput.addEventListener('input', () => {
  const term = searchInput.value.trim();
  renderSearchResults(term);
  // mhAchCache se pide recién la primera vez que hace falta para buscar —
  // igual que ya hacía la ficha de un juego (renderDetailsAchievements).
  if (term.length >= 2 && !mhAchCache.length && !mhAchLoading) {
    fetchMhAchievements().then(() => { if (searchInput.value.trim() === term) renderSearchResults(term); });
  }
  if (viewMode === 'retro') {
    if (currentConsole) {
      retroSearchTerm = term.toLowerCase();
      applyRetroFilters();
    } else {
      filterConsoleGridByName(term);
    }
    return;
  }
  filters.search = term;
  selectedIndex = 0;
  render();
});

/* ---- Cuentas ---- */

function markConnected(platform, count) {
  // querySelectorAll, no solo el primero: el mismo botón "Conectar GOG/Epic"
  // vive duplicado en el sidebar Y en el onboarding de primer uso — los dos
  // tienen que reflejar el estado, no solo el que se ve por defecto al cargar.
  document.querySelectorAll(`.account-btn[data-account="${platform}"]`).forEach((btn) => {
    btn.classList.add('connected');
    btn.querySelector('.account-state').textContent = count == null ? 'conectado' : `${count} juegos`;
  });
}

document.querySelectorAll('.account-btn').forEach(btn => {
  btn.addEventListener('click', async () => {
    if (btn.classList.contains('disabled')) return;
    const platform = btn.dataset.account;
    btn.querySelector('.account-state').textContent = 'conectando…';
    const res = await window.megahub.connectAccount(platform);
    if (res.ok) {
      markConnected(platform, res.count);
      showToast(`${PLAT_LABEL[platform] || platform} conectado — ${res.count ?? 0} juegos.`, 'success');
      await rescan();
    } else {
      btn.querySelector('.account-state').textContent = 'conectar';
      showToast(`No se pudo conectar con ${PLAT_LABEL[platform] || platform}.`, 'error');
    }
  });
});

/* ---- SteamGridDB (portadas) ---- */

async function initSgdb() {
  const has = await window.megahub.sgdbHasKey();
  if (has) {
    sgdbSaveBtn.textContent = 'Guardada ✓';
    sgdbSaveBtn.classList.add('saved');
    sgdbInput.placeholder = 'Clave guardada (rellena para cambiarla)';
  }
}
sgdbSaveBtn.addEventListener('click', async () => {
  const key = sgdbInput.value.trim();
  if (!key) return;
  await window.megahub.sgdbSetKey(key);
  sgdbInput.value = '';
  sgdbSaveBtn.textContent = 'Guardada ✓';
  sgdbSaveBtn.classList.add('saved');
  sgdbInput.placeholder = 'Clave guardada (rellena para cambiarla)';
  enrichCovers();
});

const tgdbInput = document.getElementById('tgdb-key');
const tgdbSaveBtn = document.getElementById('tgdb-save');
async function initTgdb() {
  const has = await window.megahub.tgdbHasKey();
  if (has) {
    tgdbSaveBtn.textContent = 'Guardada ✓';
    tgdbSaveBtn.classList.add('saved');
    tgdbInput.placeholder = 'Clave guardada (rellena para cambiarla)';
  }
}
tgdbSaveBtn.addEventListener('click', async () => {
  const key = tgdbInput.value.trim();
  if (!key) return;
  await window.megahub.tgdbSetKey(key);
  tgdbInput.value = '';
  tgdbSaveBtn.textContent = 'Guardada ✓';
  tgdbSaveBtn.classList.add('saved');
  tgdbInput.placeholder = 'Clave guardada (rellena para cambiarla)';
});

/* ---- Respaldo (exportar/importar ajustes en .json) ---- */

const BACKUP_LOCALSTORAGE_KEYS = [
  'megahub-view', 'megahub-disabled-platforms', 'megahub-retro-enabled',
  'megahub-retro-console-sort', 'megahub-hidden-games',
];
function collectLocalStorageSnapshot() {
  const out = {};
  for (const key of BACKUP_LOCALSTORAGE_KEYS) {
    const v = localStorage.getItem(key);
    if (v !== null) out[key] = v;
  }
  return out;
}

const backupStatusEl = document.getElementById('backup-status');

document.getElementById('backup-export-btn').addEventListener('click', async () => {
  backupStatusEl.textContent = 'Exportando…';
  const res = await window.megahub.backupExport(collectLocalStorageSnapshot());
  if (res && res.canceled) { backupStatusEl.textContent = ''; return; }
  if (res && res.error) { backupStatusEl.textContent = `Error: ${res.error}`; return; }
  backupStatusEl.textContent = `Guardado en ${res.path}`;
  showToast('Ajustes exportados.', 'success');
});

document.getElementById('backup-import-btn').addEventListener('click', async () => {
  backupStatusEl.textContent = 'Importando…';
  const res = await window.megahub.backupImport();
  if (res && res.canceled) { backupStatusEl.textContent = ''; return; }
  if (res && res.error) { backupStatusEl.textContent = `Error: ${res.error}`; return; }
  for (const [key, value] of Object.entries(res.localStorage || {})) localStorage.setItem(key, value);
  backupStatusEl.textContent = `Importado desde ${res.path} — reinicia MegaHUB para aplicar todos los cambios.`;
  showToast('Ajustes importados — reinicia MegaHUB para verlos aplicados.', 'success', 7000);
});

function applyCoverToElements(game) {
  const icon = dockEls.get(game.id);
  if (icon) updateDockIcon(icon, game);
  const row = listEls.get(game.id);
  if (row) updateListRow(row, game);
  if (widgetRefreshTile) widgetRefreshTile(game);
  // Entradas del catálogo retro (sin `.id`, solo `.title`) no viven en
  // dockEls/listEls — sin esto, una portada de respaldo (Wikipedia/SGDB) que
  // llegaba tarde por un 404 inicial del thumbnail nunca se reflejaba en la
  // tarjeta de la grilla (quedaba pegada al placeholder), aunque el panel de
  // detalle sí la mostrara bien al abrirlo después (ese se repinta de cero
  // leyendo el dato ya actualizado en cada clic).
  if (game.id === undefined && game.title) {
    const retroCard = retroGameEls.get(game.title);
    if (retroCard) updateRetroGameCard(retroCard, game);
    if (viewMode === 'retro' && retroFilteredCatalog[retroSelectedIndex] === game) renderRetroGameDetails(game);
  }
}

// Primero SteamGridDB si el usuario puso su key (mejor calidad, carátula
// vertical dedicada), y Wikipedia como respaldo sin key.
async function fetchExternalCover(game, hasSgdb) {
  try {
    if (hasSgdb) {
      const url = await window.megahub.getCover(game);
      if (url) return url;
    }
    return await window.megahub.getWikipediaCover(game.title);
  } catch { return null; }
}

async function enrichCovers() {
  // Juegos de RetroArch: portada gratis vía libretro-thumbnails, sin key.
  const retroTargets = allGames.filter(g => g.platform === 'retroarch' && !g.coverUrl && g.system).slice(0, 300);
  for (const g of retroTargets) {
    try {
      const url = await window.megahub.getRetroCover({ system: g.system, title: g.title });
      if (url) { g.coverUrl = url; applyCoverToElements(g); }
    } catch {}
  }

  // El resto (Battle.net, Riot, Rockstar, Ubisoft, EA...): estos arrancan sin
  // coverUrl, así que se enriquecen acá de una. Steam en cambio SIEMPRE
  // arranca con una URL "predicha" (steamcdn-a.akamaihd.net/.../library_600x900.jpg)
  // aunque no exista de verdad todavía — lanzamientos nuevos o juegos "coming
  // soon" (ej. Resident Evil Requiem, o cualquier título sin cápsula vertical
  // publicada aún) no la tienen — por eso Steam NO entra en este filtro
  // `!g.coverUrl` y se resuelve en cambio desde retryCoverViaExternalFallback()
  // cuando el <img> real confirma que esa URL falla (ver renderCoverInto).
  const hasSgdb = await window.megahub.sgdbHasKey();
  const targets = allGames.filter(g => g.platform !== 'retroarch' && g.platform !== 'steam' && !g.coverUrl).slice(0, 150);
  for (const g of targets) {
    g.gridFallbackAttempted = true;
    const url = await fetchExternalCover(g, hasSgdb);
    if (url) { g.coverUrl = url; applyCoverToElements(g); }
  }
}

// Cuando un juego de Steam agota su portada predicha Y el respaldo
// header_image (ambos fallaron de verdad, confirmado por el <img> del DOM,
// no solo "no tenía URL"), se intenta UNA vez más vía SteamGridDB/Wikipedia
// — el mismo respaldo que ya reciben el resto de plataformas, para que un
// juego recién salido no se quede con el placeholder para siempre.
async function retryCoverViaExternalFallback(game) {
  if (game.gridFallbackAttempted) return;
  game.gridFallbackAttempted = true;
  const hasSgdb = await window.megahub.sgdbHasKey();
  const url = await fetchExternalCover(game, hasSgdb);
  if (url) {
    game.coverUrl = url;
    game.coverFailed = false;
    applyCoverToElements(game);
  }
}

