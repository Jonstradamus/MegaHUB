/* exported applyFilters, gameGenres */
/* global allGames, disabledPlatforms, filters, hiddenGameIds, metaById */
/* ================= Filtros / orden ================= */

function applyFilters() {
  let list_ = allGames.filter(g => !disabledPlatforms.has(g.platform));
  // "Ocultos" es la única vista que SÍ muestra los juegos ocultos (para poder
  // revisarlos y volver a mostrarlos) — en cualquier otro estado quedan fuera.
  list_ = filters.state === 'hidden'
    ? list_.filter(g => hiddenGameIds.has(g.id))
    : list_.filter(g => !hiddenGameIds.has(g.id));
  if (filters.platform !== 'all') list_ = list_.filter(g => g.platform === filters.platform);
  if (filters.state === 'installed') list_ = list_.filter(g => g.installed);
  if (filters.state === 'library') list_ = list_.filter(g => !g.installed);
  if (filters.genre !== 'all') {
    list_ = list_.filter(g => {
      const genres = gameGenres(g);
      return genres && genres.includes(filters.genre);
    });
  }
  if (filters.search) {
    const q = filters.search.toLowerCase();
    list_ = list_.filter(g => g.title.toLowerCase().includes(q));
  }
  if (filters.sort === 'date') {
    list_ = [...list_].sort((a, b) => (gameReleaseTs(b) || 0) - (gameReleaseTs(a) || 0));
  } else {
    list_ = [...list_].sort((a, b) => a.title.localeCompare(b.title, 'es'));
  }
  return list_;
}

function gameGenres(g) {
  if (g.genre) return [g.genre];
  const m = metaById[g.id];
  return m && m.genres && m.genres.length ? m.genres : null;
}
function gameReleaseTs(g) {
  const m = metaById[g.id];
  return m ? m.releaseTs : null;
}

