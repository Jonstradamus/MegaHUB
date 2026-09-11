/* exported escapeHtml, formatBytes, highlightMatch, makePlaceholder, render, skeletonCardsHtml, skeletonLinesHtml */
/* global PLAT_ABBR, applyFilters, buildDockIcon, buildListRow, countEl, dock, dockEls, icon, list, listEls, refreshSelection, selectedIndex:writable, updateDockIcon, updateListRow, visible:writable */
/* ================= Render (compartido por los 2 modos) ================= */

// Sincroniza un contenedor con `visible` reutilizando los nodos ya creados (con su
// <img> ya cargada) y solo reordenando/creando/borrando lo estrictamente necesario.
// Evita que cualquier modo "parpadee" y pierda la carátula visible cada vez que
// llega metadata o una portada en segundo plano.
function syncContainer(container, elementsMap, buildFn, updateFn, emptyMsg) {
  if (!visible.length) {
    elementsMap.forEach(el => el.remove());
    elementsMap.clear();
    if (!container.querySelector('.empty')) container.innerHTML = `<div class="empty">${emptyMsg}</div>`;
    return;
  }
  const emptyDiv = container.querySelector('.empty');
  if (emptyDiv) emptyDiv.remove();

  const seen = new Set();
  visible.forEach((game, i) => {
    seen.add(game.id);
    let el = elementsMap.get(game.id);
    if (!el) { el = buildFn(game); elementsMap.set(game.id, el); }
    else updateFn(el, game);
    if (container.children[i] !== el) container.insertBefore(el, container.children[i] || null);
  });
  for (const [id, el] of elementsMap) {
    if (!seen.has(id)) { el.remove(); elementsMap.delete(id); }
  }
}

function render() {
  visible = applyFilters();
  selectedIndex = Math.min(selectedIndex, Math.max(0, visible.length - 1));
  countEl.textContent = visible.length ? `${visible.length} juegos` : '';

  const emptyMsg = 'No hay juegos con estos filtros.';
  syncContainer(dock, dockEls, buildDockIcon, updateDockIcon, emptyMsg);
  syncContainer(list, listEls, buildListRow, updateListRow, emptyMsg);

  refreshSelection();
}

// Cuando un juego no tiene carátula (ni propia ni de respaldo), en vez de un
// cuadro casi vacío con la abreviatura de plataforma se muestra un placeholder
// de marca: mando + "MEGAHUB". Igual que el que usa DERIVA web para los juegos
// vistos vía MegaHUB sin arte.
function makePlaceholder(game) {
  const div = document.createElement('div');
  div.className = 'placeholder';
  const abbr = game.placeholderAbbr || PLAT_ABBR[game.platform] || '';
  if (game.placeholderAbbr) div.classList.add('placeholder-retro');
  div.innerHTML =
    `<span class="ph-mark">${icon('gamepad')}</span>` +
    `<span class="ph-brand">MEGA<b>HUB</b></span>` +
    (abbr ? `<span class="plat-abbr">${escapeHtml(abbr)}</span>` : '') +
    `<span class="plat-title">${escapeHtml(game.title)}</span>`;
  return div;
}
function escapeHtml(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function formatBytes(bytes) {
  if (bytes == null || Number.isNaN(bytes)) return null;
  if (bytes < 1024) return `${bytes} B`;
  const units = ['KB', 'MB', 'GB', 'TB'];
  let val = bytes / 1024, i = 0;
  while (val >= 1024 && i < units.length - 1) { val /= 1024; i++; }
  return `${val >= 100 ? Math.round(val) : val.toFixed(1)} ${units[i]}`;
}

// Envuelve la primera coincidencia de `term` dentro de `text` en un <mark>,
// para resaltar visualmente qué parte del título coincidió con la búsqueda.
function highlightMatch(text, term) {
  const s = String(text);
  if (!term) return escapeHtml(s);
  const idx = s.toLowerCase().indexOf(String(term).toLowerCase());
  if (idx === -1) return escapeHtml(s);
  return escapeHtml(s.slice(0, idx)) +
    '<mark class="search-hl">' + escapeHtml(s.slice(idx, idx + term.length)) + '</mark>' +
    escapeHtml(s.slice(idx + term.length));
}

function skeletonCardsHtml(count = 10) {
  return Array.from({ length: count },
    () => '<div class="skeleton-card"><div class="skeleton skeleton-cover"></div><div class="skeleton skeleton-title"></div></div>'
  ).join('');
}
function skeletonLinesHtml(widths = ['long', 'medium', 'short']) {
  return widths.map(w => `<span class="skeleton skeleton-line ${w}"></span>`).join('');
}

