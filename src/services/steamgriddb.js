// Portadas para juegos que no tienen carátula propia (Battle.net, Riot, Rockstar,
// Ubisoft, EA...). Usa SteamGridDB (steamgriddb.com/api/v2), el mismo servicio que
// usan Playnite/Heroic. Requiere una API key gratuita del usuario (Preferencias >
// API en steamgriddb.com) — sin ella, esta función simplemente no hace nada y el
// juego se queda con su placeholder de plataforma.
const store = require('../util/store');

function getKey() {
  const cfg = store.load('sgdb-key');
  return cfg && cfg.key ? cfg.key : null;
}

function setKey(key) {
  store.save('sgdb-key', { key: key || null });
}

function hasKey() {
  return !!getKey();
}

function getCache() {
  return store.load('sgdb-cache', {});
}

async function getCover(title) {
  const key = getKey();
  if (!key || !title) return null;
  const norm = title.toLowerCase().trim();
  const cache = getCache();
  if (Object.prototype.hasOwnProperty.call(cache, norm)) return cache[norm];

  let result = null;
  try {
    const searchRes = await fetch(`https://www.steamgriddb.com/api/v2/search/autocomplete/${encodeURIComponent(title)}`, {
      headers: { Authorization: `Bearer ${key}` },
    });
    if (searchRes.ok) {
      const searchData = await searchRes.json();
      const gameId = searchData.data && searchData.data[0] && searchData.data[0].id;
      if (gameId) {
        const gridRes = await fetch(`https://www.steamgriddb.com/api/v2/grids/game/${gameId}?dimensions=600x900&limit=1`, {
          headers: { Authorization: `Bearer ${key}` },
        });
        if (gridRes.ok) {
          const gridData = await gridRes.json();
          result = (gridData.data && gridData.data[0] && gridData.data[0].url) || null;
        }
      }
    }
  } catch {
    result = null;
  }
  // Solo se cachean resultados positivos (mismo criterio que wikipediaCover.js)
  // — antes se guardaba también `null` para siempre: un juego recién salido
  // que todavía no tenía grid en SteamGridDB quedaba "sin portada" de forma
  // permanente, aunque el juego se agregara a SGDB una semana después.
  if (result) {
    cache[norm] = result;
    store.save('sgdb-cache', cache);
  }
  return result;
}

module.exports = { getKey, setKey, hasKey, getCover };
